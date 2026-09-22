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

export function createViewerLinkToken() {
  pruneViewerLinkTokens();
  const token = crypto.randomBytes(24).toString('base64url');
  viewerLinkTokens.set(token, { expiresAt: Date.now() + VIEWER_LINK_TTL_MS });
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

export function getSessionHostToken() {
  return sessionHostToken;
}

/**
 * Valida PIN/host na entrada.
 *
 * Compatibilidade: SHARESCREEN_ROOM_PIN continua protegendo ambos os papéis.
 * SHARESCREEN_CLIENT_ROOM_PIN e SHARESCREEN_HOST_PIN permitem separar os
 * acessos quando o host é protegido por um proxy reverso.
 */
export function validateJoinAuth(payload = {}) {
  const { papel, pin, hostToken, viewerToken } = payload;
  const requiredClientPin = (config.clientRoomPin || '').trim();
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

  if (requiredClientPin && String(pin || '').trim() !== requiredClientPin) {
    throw new Error('PIN inválido');
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
