import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const dbPath = path.join(dataDir, 'sharescreen.db');
const ltDir = path.join(dataDir, 'lower-thirds');

let db = null;

function ensureDirs() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(ltDir, { recursive: true });
}

function runDbWrite(label, fn) {
  try {
    return fn();
  } catch (err) {
    const readonly =
      err?.code === 'SQLITE_READONLY' ||
      String(err?.message || '').toLowerCase().includes('readonly');
    logger.warn('Falha ao escrever no SQLite', {
      op: label,
      dbPath,
      error: err?.message || String(err),
      readonly
    });
    if (readonly) return { ok: false, readonly: true, erro: 'Banco de dados sem permissão de escrita' };
    throw err;
  }
}

export function verifyDataDirWritable() {
  ensureDirs();
  const probe = path.join(dataDir, '.write-probe');
  try {
    fs.writeFileSync(probe, String(Date.now()));
    fs.unlinkSync(probe);
    return { ok: true };
  } catch (err) {
    logger.error('Pasta data/ sem permissão de escrita', { dataDir, error: err.message });
    return { ok: false, erro: err.message, dataDir };
  }
}

function getDb() {
  if (!db) {
    ensureDirs();
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        name TEXT PRIMARY KEY COLLATE NOCASE,
        ip TEXT NOT NULL,
        computer_name TEXT NOT NULL DEFAULT '',
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_clients_ip ON clients(ip);
      CREATE TABLE IF NOT EXISTS lower_thirds (
        client_name TEXT PRIMARY KEY COLLATE NOCASE,
        filename TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        orig_width INTEGER NOT NULL,
        orig_height INTEGER NOT NULL,
        chroma_color TEXT NOT NULL DEFAULT '#00FF00',
        chroma_tolerance INTEGER NOT NULL DEFAULT 40,
        updated_at INTEGER NOT NULL
      );
    `);
    migrateClientSchema(db);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_clients_computer ON clients(computer_name)`);
  }
  return db;
}

function migrateClientSchema(database) {
  const cols = database.prepare('PRAGMA table_info(clients)').all();
  if (!cols.some((c) => c.name === 'computer_name')) {
    database.exec(`ALTER TABLE clients ADD COLUMN computer_name TEXT NOT NULL DEFAULT ''`);
    database.exec(`CREATE INDEX IF NOT EXISTS idx_clients_computer ON clients(computer_name)`);
  }
}

export function getLowerThirdsDir() {
  ensureDirs();
  return ltDir;
}

export function normalizeClientIp(raw) {
  if (!raw) return '';
  return String(raw).replace(/^::ffff:/, '').trim();
}

function rowToClient(row) {
  if (!row) return null;
  return {
    name: row.name,
    ip: row.ip,
    computerName: row.computer_name || '',
    updatedAt: row.updated_at
  };
}

export function lookupClientByIp(ip) {
  const normalized = normalizeClientIp(ip);
  if (!normalized) return null;
  const row = getDb()
    .prepare('SELECT name, ip, computer_name, updated_at FROM clients WHERE ip = ?')
    .get(normalized);
  return rowToClient(row);
}

export function lookupClientByName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;
  const row = getDb()
    .prepare(
      'SELECT name, ip, computer_name, updated_at FROM clients WHERE name = ? COLLATE NOCASE'
    )
    .get(trimmed);
  return rowToClient(row);
}

export function listAllClients() {
  const rows = getDb()
    .prepare('SELECT name, ip, computer_name, updated_at FROM clients ORDER BY name COLLATE NOCASE')
    .all();
  return rows.map((row) => {
    const lt = getLowerThirdForDisplayName(row.name);
    return {
      ...rowToClient(row),
      lowerThird: lt
    };
  });
}

export function upsertClient({ name, ip, computerName = '' }) {
  const trimmed = String(name || '').trim();
  const normalizedIp = normalizeClientIp(ip);
  const computer = String(computerName || '').trim().toUpperCase();
  if (!trimmed || !normalizedIp) return { ok: false, erro: 'Nome e IP são obrigatórios' };

  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO clients (name, ip, computer_name, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET
         ip = excluded.ip,
         computer_name = excluded.computer_name,
         updated_at = excluded.updated_at`
    )
    .run(trimmed, normalizedIp, computer, now);

  logger.info('Client cadastrado/atualizado', { name: trimmed, ip: normalizedIp, computer });
  return { ok: true, client: lookupClientByName(trimmed) };
}

export function updateClientIp(name, ip) {
  const trimmed = String(name || '').trim();
  const normalizedIp = normalizeClientIp(ip);
  if (!trimmed || !normalizedIp) return { ok: false, erro: 'Nome ou IP inválido' };
  const now = Date.now();
  const result = getDb()
    .prepare('UPDATE clients SET ip = ?, updated_at = ? WHERE name = ? COLLATE NOCASE')
    .run(normalizedIp, now, trimmed);
  if (!result.changes) return { ok: false, erro: 'Usuário não encontrado' };
  return { ok: true, client: lookupClientByName(trimmed) };
}

export function registerClientByName(name, ip, computerName = '') {
  const trimmed = String(name || '').trim();
  const normalizedIp = normalizeClientIp(ip);
  if (!trimmed || !normalizedIp) return { ok: false, erro: 'Nome ou IP inválido' };

  const now = Date.now();
  const computer = String(computerName || '').trim().toUpperCase();
  const byName = lookupClientByName(trimmed);
  if (byName) {
    const writeResult = runDbWrite('registerClientByName:update-by-name', () => {
      const updates = ['ip = ?', 'updated_at = ?'];
      const params = [normalizedIp, now];
      if (computer) {
        updates.push('computer_name = ?');
        params.push(computer);
      }
      params.push(trimmed);
      getDb()
        .prepare(`UPDATE clients SET ${updates.join(', ')} WHERE name = ? COLLATE NOCASE`)
        .run(...params);
      return { ok: true };
    });
    if (writeResult?.readonly) return { ok: false, erro: writeResult.erro, name: trimmed, ip: normalizedIp };
    if (byName.ip !== normalizedIp) {
      logger.info('IP do client atualizado', { name: trimmed, ip: normalizedIp });
    }
    return { ok: true, name: trimmed, ip: normalizedIp, updated: true };
  }

  const byIp = lookupClientByIp(normalizedIp);
  if (byIp) {
    const writeResult = runDbWrite('registerClientByName:update-by-ip', () => {
      getDb()
        .prepare(
          'UPDATE clients SET name = ?, computer_name = ?, updated_at = ? WHERE name = ? COLLATE NOCASE'
        )
        .run(trimmed, computer || byIp.computerName || '', now, byIp.name);
      return { ok: true };
    });
    if (writeResult?.readonly) return { ok: false, erro: writeResult.erro, name: trimmed, ip: normalizedIp };
    logger.info('Nome do client atualizado por IP', { name: trimmed, ip: normalizedIp });
    return { ok: true, name: trimmed, ip: normalizedIp, updated: true };
  }

  const writeResult = runDbWrite('registerClientByName:insert', () => {
    getDb()
      .prepare('INSERT INTO clients (name, ip, computer_name, updated_at) VALUES (?, ?, ?, ?)')
      .run(trimmed, normalizedIp, computer, now);
    return { ok: true };
  });
  if (writeResult?.readonly) return { ok: false, erro: writeResult.erro, name: trimmed, ip: normalizedIp };
  logger.info('Client registrado', { name: trimmed, ip: normalizedIp });
  return { ok: true, name: trimmed, ip: normalizedIp, created: true };
}

export function seedUsersFromJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return { ok: false, erro: 'Arquivo não encontrado' };
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const users = data.users || [];
  let imported = 0;
  for (const u of users) {
    const name = String(u.user || u.name || '').trim();
    const ip = normalizeClientIp(u.ip);
    const computerName = String(u.computer_name || u.computerName || '').trim().toUpperCase();
    if (!name || !ip) continue;
    upsertClient({ name, ip, computerName });
    imported += 1;
  }
  return { ok: true, imported };
}

export function seedUsersIfEmpty(usersJsonPath) {
  const count = getDb().prepare('SELECT COUNT(*) AS n FROM clients').get().n;
  if (count > 0) return { ok: true, skipped: true };
  return seedUsersFromJsonFile(usersJsonPath);
}

function safeBasename(name) {
  return String(name || 'client')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 64);
}

export function getLowerThirdForDisplayName(displayName) {
  const trimmed = String(displayName || '').trim();
  if (!trimmed) return null;
  const row = getDb()
    .prepare(
      `SELECT client_name, filename, width, height, orig_width, orig_height,
              chroma_color, chroma_tolerance, updated_at
       FROM lower_thirds WHERE client_name = ? COLLATE NOCASE`
    )
    .get(trimmed);
  if (!row) return null;
  const filePath = path.join(ltDir, row.filename);
  if (!fs.existsSync(filePath)) return null;
  return {
    clientName: row.client_name,
    videoUrl: `/lt-videos/${encodeURIComponent(row.filename)}`,
    width: row.width,
    height: row.height,
    origWidth: row.orig_width,
    origHeight: row.orig_height,
    chromaColor: row.chroma_color,
    chromaTolerance: row.chroma_tolerance,
    updatedAt: row.updated_at
  };
}

export function saveLowerThird(displayName, buffer, meta = {}) {
  const trimmed = String(displayName || '').trim();
  if (!trimmed) return { ok: false, erro: 'Nome do client inválido' };
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { ok: false, erro: 'Arquivo de vídeo inválido' };
  }

  const width = Math.max(1, Math.round(Number(meta.width) || 640));
  const height = Math.max(1, Math.round(Number(meta.height) || 360));
  const origWidth = Math.max(1, Math.round(Number(meta.origWidth) || width));
  const origHeight = Math.max(1, Math.round(Number(meta.origHeight) || height));
  const chromaColor = String(meta.chromaColor || '#00FF00').trim();
  const chromaTolerance = Math.min(120, Math.max(5, Math.round(Number(meta.chromaTolerance) || 40)));

  ensureDirs();
  const existing = getLowerThirdForDisplayName(trimmed);
  if (existing?.videoUrl) {
    const oldFile = path.basename(decodeURIComponent(existing.videoUrl));
    const oldPath = path.join(ltDir, oldFile);
    if (fs.existsSync(oldPath)) {
      try {
        fs.unlinkSync(oldPath);
      } catch (_) {}
    }
  }

  const filename = `${safeBasename(trimmed)}_${Date.now()}.webm`;
  const filePath = path.join(ltDir, filename);
  fs.writeFileSync(filePath, buffer);

  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO lower_thirds
        (client_name, filename, width, height, orig_width, orig_height, chroma_color, chroma_tolerance, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(client_name) DO UPDATE SET
         filename = excluded.filename,
         width = excluded.width,
         height = excluded.height,
         orig_width = excluded.orig_width,
         orig_height = excluded.orig_height,
         chroma_color = excluded.chroma_color,
         chroma_tolerance = excluded.chroma_tolerance,
         updated_at = excluded.updated_at`
    )
    .run(trimmed, filename, width, height, origWidth, origHeight, chromaColor, chromaTolerance, now);

  logger.info('Lower Third salvo', { clientName: trimmed, filename, width, height });
  return { ok: true, lowerThird: getLowerThirdForDisplayName(trimmed) };
}
