import crypto from 'crypto';
import config from '../config/default.js';

let sessionHostToken = config.hostToken || '';

/** Tokens de link externo (espectador) — reutilizáveis até expirar */
const viewerLinkTokens = new Map();

const VIEWER_LINK_TTL_MS =
  Number(process.env.VIEWER_LINK_TTL_MS) || 24 * 60 * 60 * 1000;

function pruneViewerLinkTokens() {
  const now = Date.now();
  for (const [token, entry] of viewerLinkTokens) {
    if (entry.expiresAt <= now) viewerLinkTokens.delete(token);
  }
}

export function createViewerLinkToken(roomId) {
  if (!roomId || typeof roomId !== 'string') {
    throw new Error('Sala inválida para link externo');
  }
  pruneViewerLinkTokens();
  const token = crypto.randomBytes(24).toString('base64url');
  viewerLinkTokens.set(token, { roomId, expiresAt: Date.now() + VIEWER_LINK_TTL_MS });
  return { token, expiresInMs: VIEWER_LINK_TTL_MS };
}

export function validateViewerLinkToken(token) {
  if (!token || typeof token !== 'string') return false;
  pruneViewerLinkTokens();
  const entry = viewerLinkTokens.get(token);
  if (!entry || entry.expiresAt <= Date.now()) {
    viewerLinkTokens.delete(token);
    return false;
  }
  return true;
}

export function getViewerLinkRoomId(token) {
  if (!validateViewerLinkToken(token)) return null;
  return viewerLinkTokens.get(token)?.roomId || null;
}

export function getSessionHostToken() {
  return sessionHostToken;
}

/**
 * Valida PIN/host na entrada.
 *
 * O convidado é autenticado pelo PIN dinâmico da sala em RoomRegistry.
 * SHARESCREEN_HOST_PIN continua disponível apenas para proteger o host.
 */
export function validateJoinAuth(payload = {}) {
  const { papel, pin, hostToken, viewerToken } = payload;
  const requiredHostPin = (config.hostPin || '').trim();

  if (papel === 'client' && viewerToken) {
    if (validateViewerLinkToken(viewerToken)) {
      return {};
    }
    throw new Error('Link de acesso inválido ou expirado');
  }

  if (papel === 'host') {
    const configuredHost = (config.hostToken || '').trim();
    if (configuredHost && hostToken === configuredHost) {
      sessionHostToken = configuredHost;
      return { hostToken: sessionHostToken };
    }
    if (requiredHostPin && String(pin || '').trim() !== requiredHostPin) {
      throw new Error('PIN inválido para host');
    }
    if (!sessionHostToken) {
      sessionHostToken = configuredHost || crypto.randomBytes(16).toString('hex');
    }
    return { hostToken: sessionHostToken };
  }

  return {};
}

export function assertHostAuthorized(peer, hostTokenHeader) {
  const required = (config.hostToken || sessionHostToken || '').trim();
  if (!required) return true;
  if (peer?.role === 'host') return true;
  return hostTokenHeader === required;
}

export function validateRecordingUpload(req) {
  const token = req.headers['x-host-token'];
  const required = (config.hostToken || sessionHostToken || '').trim();
  if (!required) return true;
  return token === required;
}
