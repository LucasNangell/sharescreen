import crypto from 'crypto';
import config from '../config/default.js';
import { logger } from './logger.js';

const OPENRELAY_HOST = 'staticauth.openrelay.metered.ca';
const OPENRELAY_SECRET = 'openrelayprojectsecret';
const CREDENTIAL_TTL_SEC = 86400;

let cachedOpenRelay = null;
let cachedOpenRelayExpiry = 0;
let cachedMetered = [];
let meteredRefreshTimer = null;

function generateTimedCredential(secret, userLabel = 'sharescreen', ttlSec = CREDENTIAL_TTL_SEC) {
  const expiry = Math.floor(Date.now() / 1000) + ttlSec;
  const username = `${expiry}:${userLabel}`;
  const credential = crypto.createHmac('sha1', secret).update(username).digest('base64');
  return { username, credential, expiry };
}

function getOpenRelayTurnServers() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedOpenRelay && cachedOpenRelayExpiry - now > 3600) {
    return cachedOpenRelay;
  }
  const { username, credential, expiry } = generateTimedCredential(OPENRELAY_SECRET);
  cachedOpenRelay = [
    {
      urls: [
        `turn:${OPENRELAY_HOST}:80`,
        `turn:${OPENRELAY_HOST}:443?transport=tcp`,
        `turns:${OPENRELAY_HOST}:443?transport=tcp`
      ],
      username,
      credential
    }
  ];
  cachedOpenRelayExpiry = expiry;
  return cachedOpenRelay;
}

export function isOpenRelayEnabled() {
  if (process.env.ENABLE_OPENRELAY_TURN === '0') return false;
  if (process.env.ENABLE_OPENRELAY_TURN === '1') return true;
  return !!(config.publicUrl || '').trim();
}

async function refreshMeteredTurn() {
  const apiKey = (process.env.METERED_TURN_API_KEY || '').trim();
  if (!apiKey) return;

  const baseUrl = (process.env.METERED_TURN_API_URL || 'https://openrelay.metered.live').replace(/\/$/, '');
  const url = `${baseUrl}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) throw new Error('resposta vazia');
    cachedMetered = data.map((entry) => ({
      urls: entry.urls,
      username: entry.username,
      credential: entry.credential || entry.password
    }));
    logger.info('TURN metered atualizado', { servers: cachedMetered.length });
  } catch (err) {
    logger.warn('Falha ao buscar TURN metered', { error: err.message });
  }
}

export function initTurnServers() {
  refreshMeteredTurn().catch(() => {});
  if (meteredRefreshTimer) clearInterval(meteredRefreshTimer);
  meteredRefreshTimer = setInterval(() => refreshMeteredTurn().catch(() => {}), 12 * 3600 * 1000);
  meteredRefreshTimer.unref?.();
}

export function getMergedTurnServers() {
  const servers = [...(config.turnServers || [])];
  if (cachedMetered.length) servers.push(...cachedMetered);
  if (isOpenRelayEnabled()) servers.push(...getOpenRelayTurnServers());
  return servers;
}

export function getTurnSources() {
  const sources = [];
  if ((config.turnServers || []).length) sources.push('env');
  if (cachedMetered.length) sources.push('metered-api');
  if (isOpenRelayEnabled()) sources.push('openrelay');
  return sources;
}

export function getVideoQualityForClients() {
  const turnServers = getMergedTurnServers();
  return {
    maxBitrate: config.maxVideoBitrate,
    startBitrateKbps: config.startBitrateKbps,
    targetFrameRate: config.targetFrameRate,
    maxFrameRate: config.maxFrameRate,
    preferH264: config.preferredVideoCodec.toLowerCase().includes('h264'),
    lowLatency: config.lowLatency !== false,
    serverHost: config.serverHost,
    rtcPortRange: `${config.rtcMinPort}-${config.rtcMaxPort}`,
    audioEnabled: config.audio?.enabled !== false,
    systemAudioDefault: config.audio?.systemAudioDefault !== false,
    microphoneDefault: !!config.audio?.microphoneDefault,
    maxAudioBitrate: config.audio?.maxBitrate ?? 128_000,
    stunServers: config.stunServers,
    turnServers,
    turnEnabled: turnServers.length > 0
  };
}
