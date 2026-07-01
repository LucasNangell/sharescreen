/**
 * STUN/TURN para WebRTC — usado só quando o servidor envia turnServers.
 * iceTransportPolicy permanece "all" (direto primeiro, TURN como fallback).
 */
export function buildIceServers(videoQuality = {}) {
  const servers = [];

  for (const entry of videoQuality.stunServers || []) {
    if (!entry?.urls) continue;
    servers.push({ urls: entry.urls });
  }

  for (const entry of videoQuality.turnServers || []) {
    if (!entry?.urls) continue;
    const urls = Array.isArray(entry.urls) ? entry.urls : [entry.urls];
    const server = { urls: urls.filter(Boolean) };
    if (!server.urls.length) continue;
    if (entry.username) server.username = entry.username;
    if (entry.credential) server.credential = entry.credential;
    servers.push(server);
  }

  return servers;
}

export function hasTurnServers(videoQuality = {}) {
  return (videoQuality.turnServers || []).some((entry) => {
    const urls = entry?.urls;
    if (Array.isArray(urls)) return urls.length > 0;
    return !!urls;
  });
}
