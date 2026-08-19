import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';
import { logger } from './logger.js';
import { hashPassword } from './password.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const dbPath = path.join(dataDir, 'sharescreen.db');
const ltDir = path.join(dataDir, 'lower-thirds');

let db = null;
let dbReadonly = false;

function isReadonlySqliteError(err) {
  return (
    err?.code === 'SQLITE_READONLY' ||
    String(err?.message || '').toLowerCase().includes('readonly')
  );
}

export function isDbReadonly() {
  if (!db) getDb();
  return dbReadonly;
}

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

function applySchema(database) {
  database.exec(`
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
      CREATE TABLE IF NOT EXISTS audio_filter_presets (
        subject_kind TEXT NOT NULL,
        subject_name TEXT NOT NULL COLLATE NOCASE,
        prefs_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (subject_kind, subject_name)
      );
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'user',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT NOT NULL,
        namespace TEXT NOT NULL,
        key TEXT NOT NULL,
        value_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, namespace, key)
      );
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        revoked_at INTEGER,
        created_at INTEGER NOT NULL
      );
    `);
  migrateClientSchema(database);
  migrateAuthSchema(database);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_clients_computer ON clients(computer_name)`);
}

function openDatabase() {
  ensureDirs();
  let conn = new Database(dbPath);
  try {
    conn.pragma('journal_mode = WAL');
    applySchema(conn);
    dbReadonly = false;
    return conn;
  } catch (err) {
    try {
      conn.close();
    } catch (_) {}
    if (isReadonlySqliteError(err)) {
      logger.warn(
        'SQLite sem permissao de escrita em data/ — modo somente leitura. ' +
          'Cadastro, LT e filtros de audio nao serao persistidos no servidor. ' +
          'Execute fix-data-permissoes.bat no servidor.',
        { dbPath, error: err.message }
      );
      dbReadonly = true;
      return new Database(dbPath, { readonly: true });
    }
    throw err;
  }
}

function getDb() {
  if (!db) {
    db = openDatabase();
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

function migrateAuthSchema(database) {
  const audioCols = database.prepare('PRAGMA table_info(audio_filter_presets)').all();
  if (!audioCols.some((c) => c.name === 'user_id')) {
    database.exec(`ALTER TABLE audio_filter_presets ADD COLUMN user_id TEXT`);
    database.exec(
      `CREATE INDEX IF NOT EXISTS idx_audio_filter_user ON audio_filter_presets(subject_kind, user_id)`
    );
  }
  database.exec(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at)`);
}

function userScopedAudioName(userId) {
  return `__uid__:${String(userId || '').trim()}`;
}

export function resolveAudioFilterSubjectName(kind, name, userId = null) {
  const subjectKind = normalizeAudioFilterKind(kind);
  const trimmed = String(name || '').trim();
  const uid = String(userId || '').trim();
  if (!subjectKind) return '';
  if (subjectKind === 'client' || !uid) return trimmed;
  return userScopedAudioName(uid);
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
    renameAudioFilterPreset('client', byIp.name, trimmed);
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
  try {
    if (isDbReadonly()) {
      return { ok: false, skipped: true, readonly: true };
    }
    const count = getDb().prepare('SELECT COUNT(*) AS n FROM clients').get().n;
    if (count > 0) return { ok: true, skipped: true };
    return seedUsersFromJsonFile(usersJsonPath);
  } catch (err) {
    logger.warn('seedUsersIfEmpty falhou', { error: err.message });
    return { ok: false, erro: err.message };
  }
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

const AUDIO_FILTER_KINDS = new Set(['client', 'host']);

function normalizeAudioFilterKind(kind) {
  const k = String(kind || '').trim().toLowerCase();
  return AUDIO_FILTER_KINDS.has(k) ? k : '';
}

export function getAudioFilterPreset(kind, name, userId = null) {
  const subjectKind = normalizeAudioFilterKind(kind);
  const trimmed = String(name || '').trim();
  const uid = String(userId || '').trim();
  if (!subjectKind) return null;
  try {
    const lookupByName = () => {
      if (!trimmed) return null;
      const row = getDb()
        .prepare(
          `SELECT subject_kind, subject_name, prefs_json, updated_at, user_id
       FROM audio_filter_presets
       WHERE subject_kind = ? AND subject_name = ? COLLATE NOCASE`
        )
        .get(subjectKind, trimmed);
      if (!row) return null;
      return {
        kind: row.subject_kind,
        name: row.subject_name,
        userId: row.user_id || null,
        prefs: JSON.parse(row.prefs_json),
        updatedAt: row.updated_at
      };
    };

    const lookupByUser = () => {
      if (!uid) return null;
      const byUser = getDb()
        .prepare(
          `SELECT subject_kind, subject_name, prefs_json, updated_at, user_id
         FROM audio_filter_presets
         WHERE subject_kind = ? AND user_id = ?`
        )
        .get(subjectKind, uid);
      if (!byUser) return null;
      return {
        kind: byUser.subject_kind,
        name: trimmed || byUser.subject_name,
        userId: byUser.user_id,
        prefs: JSON.parse(byUser.prefs_json),
        updatedAt: byUser.updated_at
      };
    };

    if (subjectKind === 'client') {
      return lookupByName() || lookupByUser();
    }
    return lookupByUser() || lookupByName();
  } catch (err) {
    if (String(err?.message || '').includes('no such table')) return null;
    throw err;
  }
}

export function saveAudioFilterPreset(kind, name, prefs, userId = null) {
  const subjectKind = normalizeAudioFilterKind(kind);
  const trimmed = String(name || '').trim();
  const uid = String(userId || '').trim();
  if (!subjectKind) return { ok: false, erro: 'Tipo inválido' };
  if (!uid && !trimmed) return { ok: false, erro: 'Tipo ou nome inválido' };
  if (!prefs || typeof prefs !== 'object') return { ok: false, erro: 'Prefs inválidos' };

  const now = Date.now();
  const prefsJson = JSON.stringify(prefs);
  const subjectName = resolveAudioFilterSubjectName(subjectKind, trimmed, uid);
  if (!subjectName) return { ok: false, erro: 'Tipo ou nome inválido' };
  const writeResult = runDbWrite('saveAudioFilterPreset', () => {
    getDb()
      .prepare(
        `INSERT INTO audio_filter_presets (subject_kind, subject_name, prefs_json, updated_at, user_id)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(subject_kind, subject_name) DO UPDATE SET
           prefs_json = excluded.prefs_json,
           updated_at = excluded.updated_at,
           user_id = excluded.user_id`
      )
      .run(subjectKind, subjectName, prefsJson, now, uid || null);
    return { ok: true };
  });
  if (writeResult?.readonly) return { ok: false, erro: writeResult.erro };
  return { ok: true, preset: getAudioFilterPreset(subjectKind, trimmed, uid || null) };
}

function deleteAudioFilterPreset(kind, name) {
  const subjectKind = normalizeAudioFilterKind(kind);
  const trimmed = String(name || '').trim();
  if (!subjectKind || !trimmed) return;
  runDbWrite('deleteAudioFilterPreset', () => {
    getDb()
      .prepare(
        `DELETE FROM audio_filter_presets
         WHERE subject_kind = ? AND subject_name = ? COLLATE NOCASE`
      )
      .run(subjectKind, trimmed);
    return { ok: true };
  });
}

export function renameAudioFilterPreset(kind, oldName, newName) {
  const subjectKind = normalizeAudioFilterKind(kind);
  const oldTrimmed = String(oldName || '').trim();
  const newTrimmed = String(newName || '').trim();
  if (!subjectKind || !oldTrimmed || !newTrimmed) return { ok: true, skipped: true };
  if (oldTrimmed.toLowerCase() === newTrimmed.toLowerCase()) return { ok: true, skipped: true };

  const existing = getAudioFilterPreset(subjectKind, oldTrimmed);
  if (!existing?.prefs) return { ok: true, skipped: true };

  const saved = saveAudioFilterPreset(subjectKind, newTrimmed, existing.prefs);
  if (!saved.ok) return saved;
  deleteAudioFilterPreset(subjectKind, oldTrimmed);
  logger.info('Preset de áudio renomeado', { kind: subjectKind, from: oldTrimmed, to: newTrimmed });
  return { ok: true };
}

// --- Auth users / sessions / settings ---

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    password_hash: row.password_hash,
    display_name: row.display_name || row.username,
    role: row.role || 'user',
    is_active: row.is_active !== 0,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function countUsers() {
  return getDb().prepare('SELECT COUNT(*) AS n FROM users').get().n;
}

export function findUserByUsername(username) {
  const trimmed = String(username || '').trim();
  if (!trimmed) return null;
  const row = getDb()
    .prepare(
      `SELECT id, username, password_hash, display_name, role, is_active, created_at, updated_at
       FROM users WHERE username = ? COLLATE NOCASE`
    )
    .get(trimmed);
  return rowToUser(row);
}

export function findUserById(userId) {
  const id = String(userId || '').trim();
  if (!id) return null;
  const row = getDb()
    .prepare(
      `SELECT id, username, password_hash, display_name, role, is_active, created_at, updated_at
       FROM users WHERE id = ?`
    )
    .get(id);
  return rowToUser(row);
}

export function createUser({ username, passwordHash, role = 'user', displayName = '' }) {
  const trimmed = String(username || '').trim();
  if (!trimmed || trimmed.length > 64) return { ok: false, erro: 'Usuário inválido' };
  if (!passwordHash) return { ok: false, erro: 'Senha obrigatória' };
  if (findUserByUsername(trimmed)) return { ok: false, erro: 'Usuário já existe' };
  const now = Date.now();
  const id = randomUUID();

  const writeResult = runDbWrite('createUser', () => {
    getDb()
      .prepare(
        `INSERT INTO users (id, username, password_hash, display_name, role, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        id,
        trimmed,
        passwordHash,
        String(displayName || trimmed).trim(),
        String(role || 'user').trim(),
        now,
        now
      );
    return { ok: true };
  });
  if (writeResult?.readonly) return { ok: false, erro: writeResult.erro };
  return { ok: true, user: findUserById(id) };
}

export function updateUserPasswordHashByUsername(username, passwordHash) {
  const trimmed = String(username || '').trim();
  const hash = String(passwordHash || '').trim();
  if (!trimmed || !hash) return { ok: false, erro: 'Usuário ou hash inválido' };
  const now = Date.now();
  const writeResult = runDbWrite('updateUserPasswordHashByUsername', () => {
    const result = getDb()
      .prepare(
        `UPDATE users
         SET password_hash = ?, updated_at = ?
         WHERE username = ? COLLATE NOCASE`
      )
      .run(hash, now, trimmed);
    return { ok: true, changes: result.changes };
  });
  if (writeResult?.readonly) return { ok: false, erro: writeResult.erro };
  if (!writeResult?.changes) return { ok: false, erro: 'Usuário não encontrado' };
  return { ok: true, user: findUserByUsername(trimmed) };
}

export function findOrCreateUserByUsername(username) {
  const trimmed = String(username || '').trim();
  if (!trimmed || trimmed.length > 64) return { ok: false, erro: 'Nome inválido' };
  const existing = findUserByUsername(trimmed);
  if (existing) {
    if (!existing.is_active) return { ok: false, erro: 'Usuário inativo' };
    return { ok: true, user: existing, created: false };
  }
  const result = createUser({
    username: trimmed,
    passwordHash: hashPassword(randomUUID()),
    role: 'user',
    displayName: trimmed
  });
  if (!result.ok) return result;
  return { ok: true, user: result.user, created: true };
}

export function createSession(userId, ttlMs) {
  const uid = String(userId || '').trim();
  if (!uid) throw new Error('userId obrigatório');
  const now = Date.now();
  const id = randomUUID();
  const expiresAt = now + Math.max(60_000, Number(ttlMs) || 7 * 24 * 60 * 60 * 1000);
  getDb()
    .prepare(
      `INSERT INTO user_sessions (id, user_id, expires_at, revoked_at, created_at)
       VALUES (?, ?, ?, NULL, ?)`
    )
    .run(id, uid, expiresAt, now);
  return { id, userId: uid, expiresAt };
}

export function getSession(sessionId) {
  const id = String(sessionId || '').trim();
  if (!id) return null;
  pruneExpiredSessions();
  const row = getDb()
    .prepare(
      `SELECT id, user_id, expires_at, revoked_at, created_at
       FROM user_sessions WHERE id = ?`
    )
    .get(id);
  if (!row || row.revoked_at || row.expires_at <= Date.now()) return null;
  return { id: row.id, userId: row.user_id, expiresAt: row.expires_at };
}

export function revokeSession(sessionId) {
  const id = String(sessionId || '').trim();
  if (!id) return;
  const now = Date.now();
  runDbWrite('revokeSession', () => {
    getDb()
      .prepare('UPDATE user_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL')
      .run(now, id);
    return { ok: true };
  });
}

export function pruneExpiredSessions() {
  const now = Date.now();
  try {
    getDb()
      .prepare('DELETE FROM user_sessions WHERE expires_at <= ? OR revoked_at IS NOT NULL')
      .run(now);
  } catch (_) {}
}

export function getUserSetting(userId, namespace, key) {
  const uid = String(userId || '').trim();
  const ns = String(namespace || '').trim();
  const k = String(key || '').trim();
  if (!uid || !ns || !k) return null;
  const row = getDb()
    .prepare(
      `SELECT value_json, updated_at FROM user_settings
       WHERE user_id = ? AND namespace = ? AND key = ?`
    )
    .get(uid, ns, k);
  if (!row) return null;
  try {
    return { value: JSON.parse(row.value_json), updatedAt: row.updated_at };
  } catch {
    return null;
  }
}

export function setUserSetting(userId, namespace, key, value) {
  const uid = String(userId || '').trim();
  const ns = String(namespace || '').trim();
  const k = String(key || '').trim();
  if (!uid || !ns || !k) return { ok: false, erro: 'Parâmetros inválidos' };
  const now = Date.now();
  const writeResult = runDbWrite('setUserSetting', () => {
    getDb()
      .prepare(
        `INSERT INTO user_settings (user_id, namespace, key, value_json, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, namespace, key) DO UPDATE SET
           value_json = excluded.value_json,
           updated_at = excluded.updated_at`
      )
      .run(uid, ns, k, JSON.stringify(value), now);
    return { ok: true };
  });
  if (writeResult?.readonly) return { ok: false, erro: writeResult.erro };
  return { ok: true, setting: getUserSetting(uid, ns, k) };
}

export function listUserSettings(userId, namespace = '') {
  const uid = String(userId || '').trim();
  if (!uid) return [];
  const ns = String(namespace || '').trim();
  const rows = ns
    ? getDb()
        .prepare(
          `SELECT namespace, key, value_json, updated_at FROM user_settings
           WHERE user_id = ? AND namespace = ?`
        )
        .all(uid, ns)
    : getDb()
        .prepare(
          `SELECT namespace, key, value_json, updated_at FROM user_settings WHERE user_id = ?`
        )
        .all(uid);
  return rows.map((row) => {
    let value = null;
    try {
      value = JSON.parse(row.value_json);
    } catch (_) {}
    return {
      namespace: row.namespace,
      key: row.key,
      value,
      updatedAt: row.updated_at
    };
  });
}

