import {
  createUser,
  findUserByUsername,
  findUserById,
  createSession,
  getSession,
  revokeSession,
  pruneExpiredSessions,
  countUsers,
  updateUserPasswordHashByUsername
} from './client-db.js';
import { validateRecordingUpload } from './auth-dev.js';
import { hashPassword, verifyPassword } from './password.js';
import { logger } from './logger.js';
import fs from 'fs';

const SESSION_COOKIE = 'ss_session';
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 7 * 24 * 60 * 60 * 1000;

export { hashPassword, verifyPassword };

function syncUsersFromJson(usersJsonPath, defaultPassword) {
  if (!usersJsonPath || !fs.existsSync(usersJsonPath)) {
    return { ok: true, skipped: true, imported: 0, updated: 0 };
  }
  const raw = fs.readFileSync(usersJsonPath, 'utf8');
  const data = JSON.parse(raw);
  const users = Array.isArray(data.users) ? data.users : [];
  let imported = 0;
  let updated = 0;
  for (const entry of users) {
    const username = String(entry.user || entry.name || '').trim();
    if (!username) continue;
    const existing = findUserByUsername(username);
    if (!existing) {
      const created = createUser({
        username,
        passwordHash: hashPassword(defaultPassword),
        role: 'user',
        displayName: username
      });
      if (created.ok) imported += 1;
      continue;
    }
    const changed = updateUserPasswordHashByUsername(username, hashPassword(defaultPassword));
    if (changed.ok) updated += 1;
  }
  return { ok: true, imported, updated, total: users.length };
}

export function initAuth({ usersJsonPath = '', defaultUsersPassword = '12345' } = {}) {
  pruneExpiredSessions();
  const syncResult = syncUsersFromJson(usersJsonPath, defaultUsersPassword);
  if (!syncResult.ok) return syncResult;
  if (countUsers() > 0) {
    return { ok: true, skipped: true, ...syncResult };
  }
  const username = String(process.env.SHARESCREEN_ADMIN_USER || 'admin').trim();
  const password = String(process.env.SHARESCREEN_ADMIN_PASSWORD || 'changeme');
  const result = createUser({
    username,
    passwordHash: hashPassword(password),
    role: 'admin',
    displayName: username
  });
  if (result.ok) {
    logger.warn('Usuário admin inicial criado — altere a senha em produção', { username });
  }
  return { ...result, ...syncResult };
}

function parseCookies(header) {
  const out = {};
  if (!header || typeof header !== 'string') return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

function sessionCookieOptions(req) {
  const secure =
    req?.secure ||
    req?.protocol === 'https' ||
    String(req?.headers?.['x-forwarded-proto'] || '').includes('https');
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_TTL_MS
  };
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge != null) parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`);
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
}

export function setSessionCookie(res, req, sessionId) {
  res.setHeader(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE, sessionId, sessionCookieOptions(req))
  );
}

export function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    })
  );
}

export function getSessionIdFromRequest(req) {
  const cookies = parseCookies(req?.headers?.cookie || '');
  return cookies[SESSION_COOKIE] || '';
}

function rowToAuthUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    role: row.role || 'user',
    displayName: row.display_name || row.username
  };
}

export function resolveSessionUser(req) {
  const sessionId = getSessionIdFromRequest(req);
  if (!sessionId) return null;
  const session = getSession(sessionId);
  if (!session) return null;
  const user = findUserById(session.userId);
  if (!user || !user.is_active) return null;
  return rowToAuthUser(user);
}

export function loginUser(username, password) {
  const trimmed = String(username || '').trim();
  if (!trimmed || !password) return { ok: false, erro: 'Usuário e senha são obrigatórios' };
  const user = findUserByUsername(trimmed);
  if (!user || !user.is_active) return { ok: false, erro: 'Credenciais inválidas' };
  if (!verifyPassword(password, user.password_hash)) {
    return { ok: false, erro: 'Credenciais inválidas' };
  }
  const session = createSession(user.id, SESSION_TTL_MS);
  return {
    ok: true,
    sessionId: session.id,
    user: rowToAuthUser(user)
  };
}

export function logoutUser(req) {
  const sessionId = getSessionIdFromRequest(req);
  if (sessionId) revokeSession(sessionId);
  return { ok: true };
}

export function requireAuth(req, res, next) {
  const user = resolveSessionUser(req);
  if (!user) {
    res.status(401).json({ ok: false, erro: 'Não autenticado' });
    return;
  }
  req.user = user;
  next();
}

export function optionalAuth(req, _res, next) {
  req.user = resolveSessionUser(req) || null;
  next();
}

export function requireAuthOrHostToken(req, res, next) {
  const user = resolveSessionUser(req);
  if (user) {
    req.user = user;
    next();
    return;
  }
  if (validateRecordingUpload(req)) {
    next();
    return;
  }
  res.status(403).json({ ok: false, erro: 'Não autorizado' });
}

export function validateWsSession(req) {
  return resolveSessionUser(req);
}

export function hasAnyUsers() {
  return countUsers() > 0;
}
