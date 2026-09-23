import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { resolveRecordingDir } from './recording-save.js';
import { logger } from './logger.js';

const INDEX_FILENAME = '.sharescreen-pending-downloads.json';
const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;
const retentionHours = Number(process.env.SHARESCREEN_RECORDING_DOWNLOAD_TTL_HOURS);
const RETENTION_MS =
  Number.isFinite(retentionHours) && retentionHours > 0
    ? retentionHours * 60 * 60 * 1000
    : DEFAULT_RETENTION_MS;

/**
 * A sessão autenticada do host é a autorização normal do painel. O token é
 * mantido como alternativa para o fluxo legado de host sem cookie.
 */
export function canAccessPendingRecordingDownloads({ user = null, requiredToken = '', suppliedToken = '' } = {}) {
  if (user) return true;
  return !!requiredToken && suppliedToken === requiredToken;
}

function getIndexPath() {
  const resolved = resolveRecordingDir('');
  if (!resolved.ok) throw new Error(resolved.erro || 'Pasta de gravações inacessível');
  return path.join(resolved.dir, INDEX_FILENAME);
}

function readEntries() {
  try {
    const raw = fs.readFileSync(getIndexPath(), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.entries) ? parsed.entries : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    logger.warn('Falha ao ler fila de downloads de gravação', { error: err.message });
    return [];
  }
}

function writeEntries(entries) {
  const indexPath = getIndexPath();
  const tempPath = `${indexPath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify({ entries }, null, 2), { mode: 0o600 });
  fs.renameSync(tempPath, indexPath);
}

function deleteFileQuietly(filePath) {
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      logger.warn('Falha ao apagar gravação pendente', { path: filePath, error: err.message });
    }
    return false;
  }
}

function publicEntry(entry) {
  let size = null;
  try {
    size = fs.statSync(entry.path).size;
  } catch (_) {}
  return {
    id: entry.id,
    filename: entry.filename,
    incomplete: !!entry.incomplete,
    bytes: size,
    createdAt: entry.createdAt,
    expiresAt: entry.expiresAt,
    downloadUrl: `/api/gravacao/download/${entry.id}`
  };
}

export function prunePendingRecordingDownloads() {
  const now = Date.now();
  const entries = readEntries();
  const kept = [];
  let changed = false;

  for (const entry of entries) {
    const expired = !entry?.expiresAt || Number(entry.expiresAt) <= now;
    const missing = !entry?.path || !fs.existsSync(entry.path);
    if (!expired && !missing) {
      kept.push(entry);
      continue;
    }
    if (expired && entry?.path) deleteFileQuietly(entry.path);
    changed = true;
  }

  if (changed) writeEntries(kept);
  return kept.map(publicEntry);
}

export function registerRecordingForDownload(recording = {}) {
  const filePath = path.resolve(String(recording.path || ''));
  const filename = path.basename(String(recording.filename || ''));
  if (!filePath || !filename || !fs.existsSync(filePath)) {
    throw new Error('Gravação finalizada não está disponível para download');
  }

  prunePendingRecordingDownloads();
  const entries = readEntries().filter((entry) => entry.path !== filePath);
  const now = Date.now();
  const entry = {
    id: crypto.randomBytes(32).toString('base64url'),
    path: filePath,
    filename,
    incomplete: !!recording.incomplete,
    createdAt: now,
    expiresAt: now + RETENTION_MS
  };
  entries.push(entry);
  writeEntries(entries);
  return publicEntry(entry);
}

export function listPendingRecordingDownloads() {
  return prunePendingRecordingDownloads();
}

function removeEntry(id, { deleteFile = false } = {}) {
  const entries = readEntries();
  const entry = entries.find((candidate) => candidate.id === id);
  if (!entry) return null;
  if (deleteFile) deleteFileQuietly(entry.path);
  writeEntries(entries.filter((candidate) => candidate.id !== id));
  return entry;
}

export function sendPendingRecordingDownload(id, res) {
  const entries = readEntries();
  const entry = entries.find((candidate) => candidate.id === id);
  if (!entry || Number(entry.expiresAt) <= Date.now() || !fs.existsSync(entry.path)) {
    if (entry) removeEntry(id, { deleteFile: true });
    return { ok: false, status: 404, erro: 'Gravação não encontrada ou expirada' };
  }

  let stat;
  try {
    stat = fs.statSync(entry.path);
  } catch (_) {
    removeEntry(id, { deleteFile: false });
    return { ok: false, status: 404, erro: 'Gravação não encontrada' };
  }

  res.setHeader('Content-Type', 'video/webm');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(entry.filename)}`);
  res.setHeader('Cache-Control', 'no-store');

  const stream = fs.createReadStream(entry.path);
  let completed = false;
  const cleanupAfterTransfer = () => {
    if (completed) return;
    completed = true;
    removeEntry(id, { deleteFile: true });
    logger.info('Gravação baixada e apagada do servidor', {
      filename: entry.filename,
      bytes: stat.size
    });
  };

  stream.on('error', (err) => {
    logger.warn('Falha ao transferir gravação para download', {
      filename: entry.filename,
      error: err.message
    });
    if (!res.headersSent) res.status(500).json({ ok: false, erro: 'Falha ao baixar gravação' });
    else res.destroy(err);
  });
  res.on('finish', cleanupAfterTransfer);
  res.on('close', () => {
    if (!res.writableEnded) stream.destroy();
  });
  stream.pipe(res);
  return { ok: true };
}
