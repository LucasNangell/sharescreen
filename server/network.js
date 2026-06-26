import os from 'os';
import dns from 'dns';
import config from '../config/default.js';

function isBadLanIp(ip) {
  if (!ip || ip === '127.0.0.1') return true;
  if (ip.startsWith('169.254.')) return true;
  return false;
}

function isPrivateIPv4(ip) {
  if (!ip || isBadLanIp(ip)) return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  const m = /^172\.(\d+)\./.exec(ip);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function resolve4ViaServers(hostname, servers, timeoutMs = 4000) {
  const resolver = new dns.Resolver();
  resolver.setServers(servers);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('DNS timeout')), timeoutMs);
    resolver.resolve4(hostname, (err, addresses) => {
      clearTimeout(timer);
      if (err) reject(err);
      else resolve(addresses || []);
    });
  });
}

/**
 * Retorna IPv4 da LAN. Se preferredIp existir em alguma interface, usa esse.
 */
export function getLanIPv4Candidates(preferredIp) {
  const interfaces = os.networkInterfaces();
  const found = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      if (isBadLanIp(iface.address)) continue;
      found.push({ name, address: iface.address });
    }
  }

  const addresses = [];
  if (preferredIp && !isBadLanIp(preferredIp)) addresses.push(preferredIp);
  for (const item of found) addresses.push(item.address);
  return [...new Set(addresses)];
}

export function getLanIPv4(preferredIp) {
  return getLanIPv4Candidates(preferredIp)[0] || '127.0.0.1';
}

/**
 * IP anunciado nos candidatos ICE do WebRTC.
 */
export function resolveAnnouncedIp(explicitIp) {
  const serverHost = (config.serverHost || '').trim().toLowerCase();
  const detectedLanIp = getLanIPv4();
  const hasUsableLan = detectedLanIp !== '127.0.0.1';
  const wantsLocalhost =
    process.env.SHARESCREEN_ICE_LOCALHOST === '1' ||
    (config.dev && (serverHost === '127.0.0.1' || serverHost === 'localhost'));

  if (wantsLocalhost && !hasUsableLan) {
    return '127.0.0.1';
  }

  if (explicitIp && !isBadLanIp(explicitIp)) return explicitIp;

  const fromHost = config.serverHost;
  if (fromHost && !isBadLanIp(fromHost)) {
    const onNic = getLanIPv4(fromHost);
    if (onNic === fromHost) return fromHost;
    return fromHost;
  }

  return getLanIPv4();
}

/**
 * IP pÃƒÆ’Ã‚Âºblico anunciado para espectadores via internet (PUBLIC_URL).
 * Ordem: PUBLIC_ANNOUNCED_IP ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ DNS externo do hostname de PUBLIC_URL.
 */
export async function resolvePublicAnnouncedIp(lanIp) {
  const explicit = (process.env.PUBLIC_ANNOUNCED_IP || config.publicAnnouncedIp || '').trim();
  if (explicit && !isBadLanIp(explicit) && explicit !== lanIp) {
    return explicit;
  }

  const publicUrl = (config.publicUrl || '').trim();
  if (!publicUrl) return null;

  let hostname = '';
  try {
    hostname = new URL(publicUrl).hostname;
  } catch {
    return null;
  }
  if (!hostname || hostname === 'localhost') return null;

  const dnsServers = (process.env.PUBLIC_DNS_SERVERS || '8.8.8.8,1.1.1.1')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const addresses = await resolve4ViaServers(hostname, dnsServers);
    const publicIp = addresses.find((ip) => !isPrivateIPv4(ip));
    if (publicIp && publicIp !== lanIp) return publicIp;
  } catch (_) {}

  return null;
}

export function buildIceListenIps(lanIp, publicIp) {
  const lanCandidates = config.dev
    ? getLanIPv4Candidates(lanIp)
    : [lanIp].filter((ip) => ip && !isBadLanIp(ip));
  const listenIps = lanCandidates.map((announcedIp) => ({ ip: '0.0.0.0', announcedIp }));
  if (!listenIps.length) listenIps.push({ ip: '0.0.0.0', announcedIp: '127.0.0.1' });
  if (publicIp && !lanCandidates.includes(publicIp) && !isBadLanIp(publicIp)) {
    listenIps.push({ ip: '0.0.0.0', announcedIp: publicIp });
  }
  return listenIps;
}
