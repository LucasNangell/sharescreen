import os from 'os';
import config from '../config/default.js';

function isBadLanIp(ip) {
  if (!ip || ip === '127.0.0.1') return true;
  if (ip.startsWith('169.254.')) return true;
  return false;
}

/**
 * Retorna IPv4 da LAN. Se preferredIp existir em alguma interface, usa esse.
 */
export function getLanIPv4(preferredIp) {
  const interfaces = os.networkInterfaces();
  const found = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      if (isBadLanIp(iface.address)) continue;
      found.push({ name, address: iface.address });
      if (preferredIp && iface.address === preferredIp) {
        return iface.address;
      }
    }
  }

  if (preferredIp && !isBadLanIp(preferredIp)) {
    return preferredIp;
  }

  return found[0]?.address || '127.0.0.1';
}

/**
 * IP anunciado nos candidatos ICE do WebRTC.
 */
export function resolveAnnouncedIp(explicitIp) {
  if (explicitIp && !isBadLanIp(explicitIp)) return explicitIp;

  const fromHost = config.serverHost;
  if (fromHost && !isBadLanIp(fromHost)) {
    const onNic = getLanIPv4(fromHost);
    if (onNic === fromHost) return fromHost;
    return fromHost;
  }

  return getLanIPv4();
}
