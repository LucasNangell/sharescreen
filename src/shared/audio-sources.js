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

/**
 * Normaliza fontes remotas: exclui peer local, deduplica por producerId.
 */
export function normalizeRemoteAudioSources(sources, { excludePeerId = null } = {}) {
  const byProducer = new Map();
  for (const raw of sources || []) {
    const peerId = raw?.peerId || raw?.id;
    const producerId = raw?.producerId || raw?.producerIds?.audio;
    const source = normalizeAudioSource(raw?.source || 'microphone', 'microphone');
    if (!peerId || !producerId) continue;
    if (excludePeerId && String(peerId) === String(excludePeerId)) continue;
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
