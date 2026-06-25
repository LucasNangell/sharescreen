import config from '../config/default.js';
import { normalizeClientIp } from './client-db.js';

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
