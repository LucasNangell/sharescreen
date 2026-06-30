/**
 * STUN/TURN para WebRTC.
 * forceRelay: espectador externo (/meet?token=) — usa TURN:443, nao UDP direto.
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

export function buildTransportIceOptions(videoQuality = {}, { forceRelay = false } = {}) {
  const options = {};
  const iceServers = buildIceServers(videoQuality);
  if (iceServers.length) options.iceServers = iceServers;
  if (forceRelay && hasTurnServers(videoQuality)) {
    options.iceTransportPolicy = 'relay';
  }
  return options;
}

export function hasTurnServers(videoQuality = {}) {
  return (videoQuality.turnServers || []).some((entry) => {
    const urls = entry?.urls;
    if (Array.isArray(urls)) return urls.length > 0;
    return !!urls;
  });
}
