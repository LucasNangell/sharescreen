/** Fontes de áudio publicadas (appData.source no mediasoup). */
export const AUDIO_SOURCES = ['microphone', 'system', 'mixed'];

export function isAudioSource(value) {
  return AUDIO_SOURCES.includes(value);
}

export function normalizeAudioSource(value, fallback = 'microphone') {
  return isAudioSource(value) ? value : fallback;
}

export function audioChannelKey(peerId, source = 'microphone') {
  return `${String(peerId)}:${normalizeAudioSource(source, 'microphone')}`;
}

export function parseAudioChannelKey(key) {
  const idx = String(key).lastIndexOf(':');
  if (idx <= 0) return { peerId: String(key), source: 'microphone' };
  return {
    peerId: String(key).slice(0, idx),
    source: normalizeAudioSource(String(key).slice(idx + 1), 'microphone')
  };
}

/** Log curto para pontos críticos de áudio. */
export function audioTrace(event, data = {}) {
  try {
    console.info(`[audio] ${event}`, data);
  } catch (_) {}
}

export function liveProducerId(producer) {
  return producer && !producer.closed ? producer.id || null : null;
}

function ownPeerIdSet({ excludePeerId = null, ownPeerIds = [] } = {}) {
  const ids = new Set((ownPeerIds || []).map((id) => String(id)).filter(Boolean));
  if (excludePeerId) ids.add(String(excludePeerId));
  return ids;
}

export function isOwnAudioSource(
  entry,
  { excludePeerId = null, ownPeerIds = [], ownProducerIds = [] } = {}
) {
  if (!entry) return false;
  const peers = ownPeerIdSet({ excludePeerId, ownPeerIds });
  if (entry.peerId && peers.has(String(entry.peerId))) return true;
  const own = new Set((ownProducerIds || []).filter(Boolean));
  return !!(entry.producerId && own.has(entry.producerId));
}

/**
 * Normaliza fontes remotas: exclui peer local, producer próprio e tipos bloqueados.
 */
export function normalizeRemoteAudioSources(
  sources,
  { excludePeerId = null, excludeSourceTypes = [], ownPeerIds = [], ownProducerIds = [] } = {}
) {
  const excludedTypes = new Set(
    (excludeSourceTypes || []).map((t) => normalizeAudioSource(t, t))
  );
  const ownPeers = ownPeerIdSet({ excludePeerId, ownPeerIds });
  const own = new Set((ownProducerIds || []).filter(Boolean));
  const byProducer = new Map();
  for (const raw of sources || []) {
    const peerId = raw?.peerId || raw?.id;
    const producerId = raw?.producerId || raw?.producerIds?.audio;
    const source = normalizeAudioSource(raw?.source || 'microphone', 'microphone');
    if (!peerId || !producerId) continue;
    if (excludedTypes.has(source)) continue;
    if (ownPeers.has(String(peerId))) continue;
    if (own.has(producerId)) continue;
    if (byProducer.has(producerId)) continue;
    byProducer.set(producerId, {
      peerId: String(peerId),
      producerId,
      source,
      name: raw?.name || raw?.displayName || ''
    });
  }
  return [...byProducer.values()];
}

export function audioSourcesSignature(sources) {
  return normalizeRemoteAudioSources(sources)
    .map((s) => `${s.peerId}:${s.source}:${s.producerId}`)
    .sort()
    .join('|');
}

/** Log de sincronização de fontes (sync-ok / sync-falhou). */
export function audioTraceSync(event, sources, extra = {}) {
  const normalized = normalizeRemoteAudioSources(sources);
  audioTrace(event, {
    signature: audioSourcesSignature(sources),
    sourceCount: normalized.length,
    ...extra
  });
}
