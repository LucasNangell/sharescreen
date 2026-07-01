import config from '../config/default.js';
import { normalizeClientIp } from './client-db.js';

export function isPrivateIPv4(ip) {
  const normalized = normalizeClientIp(ip);
  if (!normalized || normalized === '127.0.0.1') return true;
  if (normalized.startsWith('10.')) return true;
  if (normalized.startsWith('192.168.')) return true;
  const m = /^172\.(\d+)\./.exec(normalized);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

export function isClientOnLan(req) {
  const ip = getClientIpFromRequest(req);
  return !!ip && isPrivateIPv4(ip);
}

export function getClientIpFromRequest(req) {
  if (!req) return '';
  if (config.trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return normalizeClientIp(String(forwarded).split(',')[0].trim());
    }
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return normalizeClientIp(String(realIp).trim());
    }
  }
  const socket = req.socket || req.connection;
  return normalizeClientIp(socket?.remoteAddress || '');
}

export function getClientIpFromWs(ws) {
  if (ws?._clientReq) {
    const ip = getClientIpFromRequest(ws._clientReq);
    if (ip) return ip;
  }
  return normalizeClientIp(ws?._socket?.remoteAddress || ws?.socket?.remoteAddress || '');
}

/** Canal WebSocket ou HTTP (signaling). */
export function getClientIpFromChannel(channel) {
  return getClientIpFromWs(channel);
}
