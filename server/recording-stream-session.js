import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { resolveRecordingDir } from './recording-save.js';
import { isValidRecordingFilename } from '../src/shared/recording-filename.js';
import { logger } from './logger.js';

const STALE_MS = 24 * 60 * 60 * 1000;
const STREAMING_SUBDIR = '.streaming';

/** @type {Map<string, object>} */
const sessions = new Map();

function writeToStream(stream, buffer) {
  return new Promise((resolve, reject) => {
    const canContinue = stream.write(buffer, (err) => {
      if (err) reject(err);
    });
    if (canContinue) {
      resolve();
    } else {
      stream.once('drain', resolve);
      stream.once('error', reject);
    }
  });
}

function closeWriteStream(stream) {
  return new Promise((resolve, reject) => {
    stream.once('finish', resolve);
    stream.once('error', reject);
    stream.end();
  });
}

function buildIncompleteFilename(filename = '') {
  const trimmed = String(filename || '').trim();
  if (trimmed) {
    const base = path.basename(trimmed.replace(/\\/g, '/'));
    if (base.toLowerCase().endsWith('.webm')) {
      return base.replace(/\.webm$/i, '_incompleto.webm');
    }
    return `${base}_incompleto.webm`;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `gravacao_incompleta_${stamp}.webm`;
}

function validateTargetPath(dir, filename) {
  const base = path.basename(String(filename));
  if (!isValidRecordingFilename(base)) {
    return { ok: false, erro: 'Nome de arquivo inválido' };
  }
  const fullPath = path.join(dir, base);
  if (path.dirname(path.resolve(fullPath)) !== dir) {
    return { ok: false, erro: 'Caminho inválido' };
  }
  return { ok: true, fullPath, filename: base };
}

async function closeSessionStream(session) {
  if (!session.stream || session.streamClosed) return;
  session.streamClosed = true;
  try {
    await closeWriteStream(session.stream);
  } catch (err) {
    logger.warn('Erro ao fechar stream de gravação', { sessionId: session.id, error: err.message });
  }
  session.stream = null;
}

export function startSession({ customDir = '' } = {}) {
  const resolved = resolveRecordingDir(customDir);
  if (!resolved.ok) return resolved;

  const streamingDir = path.join(resolved.dir, STREAMING_SUBDIR);
  try {
    fs.mkdirSync(streamingDir, { recursive: true });
  } catch (err) {
    return { ok: false, erro: `Pasta temporária inacessível: ${err.message}` };
  }

  const sessionId = randomUUID();
  const partPath = path.join(streamingDir, `${sessionId}.part`);

  let stream;
  try {
    stream = fs.createWriteStream(partPath, { flags: 'a' });
  } catch (err) {
    return { ok: false, erro: err.message || 'Falha ao criar arquivo de gravação' };
  }

  const session = {
    id: sessionId,
    dir: resolved.dir,
    customDir,
    partPath,
    stream,
    streamClosed: false,
    nextChunkIndex: 0,
    bytesWritten: 0,
    createdAt: Date.now(),
    lastChunkAt: Date.now(),
    finished: false
  };

  stream.on('error', (err) => {
    logger.error('Erro no stream de gravação', { sessionId, error: err.message });
  });

  sessions.set(sessionId, session);
  logger.info('Sessão de gravação streaming iniciada', { sessionId, dir: resolved.dir });
  return { ok: true, sessionId };
}

export async function appendChunk(sessionId, chunkIndex, buffer) {
  const session = sessions.get(sessionId);
  if (!session || session.finished) {
    return { ok: false, erro: 'Sessão não encontrada' };
  }
  if (!buffer?.length) {
    return { ok: false, erro: 'Chunk vazio' };
  }

  const index = Number(chunkIndex);
  if (!Number.isInteger(index) || index < 0) {
    return { ok: false, erro: 'Índice de chunk inválido' };
  }

  if (index < session.nextChunkIndex) {
    return { ok: true, received: index, bytesWritten: session.bytesWritten, duplicate: true };
  }
  if (index > session.nextChunkIndex) {
    return {
      ok: false,
      erro: `Chunk fora de ordem (esperado ${session.nextChunkIndex}, recebido ${index})`
    };
  }

  try {
    await writeToStream(session.stream, Buffer.from(buffer));
    session.bytesWritten += buffer.length;
    session.nextChunkIndex = index + 1;
    session.lastChunkAt = Date.now();
    return { ok: true, received: index, bytesWritten: session.bytesWritten };
  } catch (err) {
    logger.error('Falha ao gravar chunk', { sessionId, chunkIndex: index, error: err.message });
    return { ok: false, erro: err.message || 'Falha ao gravar chunk' };
  }
}

export async function finishSession(sessionId, filename = '', { incomplete = false } = {}) {
  const session = sessions.get(sessionId);
  if (!session) {
    return { ok: false, erro: 'Sessão não encontrada' };
  }
  if (session.finished) {
    return { ok: false, erro: 'Sessão já finalizada' };
  }

  session.finished = true;
  await closeSessionStream(session);

  if (!session.bytesWritten) {
    try {
      fs.unlinkSync(session.partPath);
    } catch (_) {}
    sessions.delete(sessionId);
    return { ok: false, erro: 'Gravação vazia' };
  }

  const targetName = incomplete ? buildIncompleteFilename(filename) : path.basename(String(filename));
  const validated = validateTargetPath(session.dir, targetName);
  if (!validated.ok) {
    sessions.delete(sessionId);
    return validated;
  }

  try {
    if (fs.existsSync(validated.fullPath)) {
      fs.unlinkSync(validated.fullPath);
    }
    fs.renameSync(session.partPath, validated.fullPath);
    sessions.delete(sessionId);
    logger.info(incomplete ? 'Gravação incompleta salva' : 'Gravação streaming finalizada', {
      sessionId,
      path: validated.fullPath,
      bytes: session.bytesWritten,
      incomplete
    });
    return {
      ok: true,
      path: validated.fullPath,
      filename: validated.filename,
      incomplete: !!incomplete,
      bytes: session.bytesWritten
    };
  } catch (err) {
    logger.error('Falha ao finalizar gravação streaming', { sessionId, error: err.message });
    return { ok: false, erro: err.message || 'Falha ao finalizar gravação' };
  }
}

export async function abortSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return { ok: true, ignorado: true };

  session.finished = true;
  await closeSessionStream(session);

  try {
    if (session.bytesWritten === 0 && fs.existsSync(session.partPath)) {
      fs.unlinkSync(session.partPath);
    }
  } catch (_) {}

  sessions.delete(sessionId);
  return { ok: true };
}

export async function pruneStaleSessions() {
  const now = Date.now();
  for (const [sessionId, session] of [...sessions.entries()]) {
    if (session.finished) {
      sessions.delete(sessionId);
      continue;
    }
    if (now - session.lastChunkAt < STALE_MS) continue;

    logger.info('Finalizando sessão de gravação obsoleta', { sessionId });
    await finishSession(sessionId, '', { incomplete: true });
  }

  for (const partPath of listOrphanPartFiles()) {
    try {
      const stat = fs.statSync(partPath);
      if (now - stat.mtimeMs < STALE_MS) continue;
      const parentDir = path.resolve(partPath, '..', '..');
      const stamp = path.basename(partPath, '.part').slice(0, 8);
      const renamed = path.join(parentDir, `gravacao_incompleta_${stamp}.webm`);
      if (!fs.existsSync(renamed)) {
        fs.renameSync(partPath, renamed);
        logger.info('Arquivo .part órfão renomeado', { from: partPath, to: renamed });
      }
    } catch (err) {
      logger.warn('Falha ao podar .part órfão', { path: partPath, error: err.message });
    }
  }
}

function listOrphanPartFiles() {
  const results = [];
  const resolved = resolveRecordingDir('');
  if (!resolved.ok) return results;

  const streamingDir = path.join(resolved.dir, STREAMING_SUBDIR);
  if (!fs.existsSync(streamingDir)) return results;

  for (const name of fs.readdirSync(streamingDir)) {
    if (name.endsWith('.part')) {
      results.push(path.join(streamingDir, name));
    }
  }
  return results;
}
