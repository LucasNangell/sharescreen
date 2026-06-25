/**
 * Normaliza payload de transmissaoAtiva (compatível com versão só vídeo).
 */
export function normalizeTransmission(payload = {}) {
  const producerIds = payload.producerIds || {
    video: payload.producerId ?? null,
    audio: null
  };
  return {
    selectedPeerId: payload.selectedPeerId ?? null,
    producerId: producerIds.video,
    producerIds,
    peerName: payload.peerName ?? null,
    paused: !!payload.paused,
    lowerThird: payload.lowerThird ?? null,
    interrompidaPor: payload.interrompidaPor ?? null,
    finalizadaPor: payload.finalizadaPor ?? null
  };
}

export function hasActiveVideo(payload) {
  const { producerIds } = normalizeTransmission(payload);
  return !!producerIds.video;
}

/** Extrai transmissão e fontes de áudio de estadoSala ou payload legado. */
export function parseRoomSnapshot(snapshot = {}) {
  const transmission = normalizeTransmission(
    snapshot.transmission || snapshot.transmissaoAtiva || snapshot
  );
  const audioSources =
    snapshot.audioSources ||
    snapshot.audioProducers ||
    snapshot.fontesAudio?.sources ||
    [];
  return {
    transmission,
    audioSources,
    peers: snapshot.peers || snapshot.clients || [],
    host: snapshot.host || null,
    displayControl: snapshot.displayControl || null,
    snapshotAt: snapshot.snapshotAt || 0,
    mutedPeerIds: snapshot.mutedPeerIds || []
  };
}

export function roomSnapshotMediaKey(snapshot = {}) {
  const { transmission, audioSources } = parseRoomSnapshot(snapshot);
  const videoId = transmission.producerIds?.video || '';
  const audioIds = (audioSources || [])
    .map((s) => `${s.peerId || s.id}:${s.producerId}`)
    .sort()
    .join('|');
  return `${transmission.selectedPeerId || ''}:${videoId}:${transmission.paused ? '1' : '0'}:${audioIds}`;
}
