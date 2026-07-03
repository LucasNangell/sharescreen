import fs from 'fs';
import path from 'path';
import config from '../config/default.js';
import { isValidRecordingFilename } from '../src/shared/recording-filename.js';
import { logger } from './logger.js';

export function resolveRecordingDir(customDir = '') {
  const dir = customDir ? path.resolve(customDir) : config.recordingsDir;
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    return { ok: false, erro: `Pasta de gravações inacessível: ${err.message}` };
  }
  return { ok: true, dir: path.resolve(dir) };
}

export function saveRecording(buffer, filename, customDir = '') {
  const base = path.basename(String(filename));
  if (!isValidRecordingFilename(base)) {
    return { ok: false, erro: 'Nome de arquivo inválido' };
  }
  if (!buffer?.length) {
    return { ok: false, erro: 'Arquivo vazio' };
  }

  const resolved = resolveRecordingDir(customDir);
  if (!resolved.ok) return resolved;
  const dir = resolved.dir;

  const fullPath = path.join(dir, base);
  if (path.dirname(path.resolve(fullPath)) !== dir) {
    return { ok: false, erro: 'Caminho inválido' };
  }

  try {
    fs.writeFileSync(fullPath, buffer);
    logger.info('Gravação salva', { path: fullPath, bytes: buffer.length });
    return { ok: true, path: fullPath, filename: base };
  } catch (err) {
    logger.error('Falha ao salvar gravação', { error: err.message, dir });
    return { ok: false, erro: err.message || 'Falha ao gravar arquivo' };
  }
}
