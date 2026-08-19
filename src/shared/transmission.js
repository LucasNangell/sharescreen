/**
 * Normaliza payload de transmissaoAtiva (compatível com versão só vídeo).
 */
export function normalizeTransmission(payload = {}) {
  const p = payload ?? {};
  const producerIds = p.producerIds || {
    video: p.producerId ?? null,
    audio: null
  };
  return {
    selectedPeerId: p.selectedPeerId ?? null,
    producerId: producerIds.video,
    producerIds,
    peerName: p.peerName ?? null,
    paused: !!p.paused,
    lowerThird: p.lowerThird ?? null,
    interrompidaPor: p.interrompidaPor ?? null,
    finalizadaPor: p.finalizadaPor ?? null,
    sourceKind: p.sourceKind ?? null
  };
}

export function hasActiveVideo(payload) {
  if (payload == null) return false;
  const { producerIds } = normalizeTransmission(payload);
  return !!producerIds.video;
}

function roomClientEntryScore(c) {
  let score = 0;
  if (c?.displayName) score += 2;
  if (c?.mediaReady?.video) score += 4;
  if (c?.producerIds?.video || c?.producerId) score += 4;
  if (c?.hasVideo || c?.isProducing) score += 2;
  if (c?.selectable) score += 1;
  return score;
}

/** Mescla duas entradas do mesmo peer, preferindo a mais completa. */
export function mergeRoomClientEntry(a, b) {
  if (!a) return b ? { ...b } : null;
  if (!b) return { ...a };
  const primary = roomClientEntryScore(a) >= roomClientEntryScore(b) ? a : b;
  const secondary = primary === a ? b : a;
  return {
    ...secondary,
    ...primary,
    producerIds: { ...(secondary.producerIds || {}), ...(primary.producerIds || {}) },
    mediaReady: { ...(secondary.mediaReady || {}), ...(primary.mediaReady || {}) },
    permissions: { ...(secondary.permissions || {}), ...(primary.permissions || {}) }
  };
}

/** Une listas de participantes por id sem duplicar entradas. */
export function mergeRoomClients(existing = [], incoming = []) {
  return reconcileRoomClients(existing, incoming, { allowRemovals: false });
}

/** Snapshot de sala com roster completo (clients/peers do servidor). */
export function hasAuthoritativeRoomRoster(snapshot = {}) {
  return Array.isArray(snapshot.clients) || Array.isArray(snapshot.peers);
}

/**
 * Reconcilia participantes locais com o snapshot.
 * allowRemovals: só ids do incoming (saída de peer some); senão une sem apagar.
 */
export function reconcileRoomClients(existing = [], incoming = [], { allowRemovals = false } = {}) {
  if (!allowRemovals) {
    const byId = new Map();
    for (const c of existing) {
      if (c?.id) byId.set(String(c.id), { ...c });
    }
    for (const c of incoming) {
      if (!c?.id) continue;
      const key = String(c.id);
      const prev = byId.get(key);
      byId.set(key, prev ? mergeRoomClientEntry(prev, c) : { ...c });
    }
    return [...byId.values()];
  }

  const existingById = new Map();
  for (const c of existing) {
    if (c?.id) existingById.set(String(c.id), c);
  }
  const seen = new Set();
  const next = [];
  for (const c of incoming) {
    if (!c?.id) continue;
    const key = String(c.id);
    if (seen.has(key)) continue;
    seen.add(key);
    const prev = existingById.get(key);
    next.push(prev ? mergeRoomClientEntry(prev, c) : { ...c });
  }
  return next;
}

/** Monta lista de participantes/fontes a partir de clients, peers ou videoProducers. */
export function resolveRoomClients(snapshot = {}, parsed = null) {
  const p = parsed || parseRoomSnapshot(snapshot);
  const byId = new Map();

  const addClient = (c) => {
    if (!c?.id) return;
    const key = String(c.id);
    const existing = byId.get(key);
    byId.set(key, existing ? mergeRoomClientEntry(existing, c) : { ...c });
  };

  for (const c of snapshot.clients || []) addClient(c);
  for (const c of snapshot.peers || []) addClient(c);
  if (!byId.size) {
    for (const c of p.peers || []) addClient(c);
  }

  for (const vp of snapshot.videoProducers || []) {
    const id = vp.peerId || vp.id;
    if (!id) continue;
    const key = String(id);
    const existing = byId.get(key);
    if (existing) {
      if (!existing.producerIds?.video && vp.producerId) {
        addClient({
          ...existing,
          producerIds: { ...(existing.producerIds || {}), video: vp.producerId },
          producerId: existing.producerId || vp.producerId,
          hasVideo: !!(existing.hasVideo || vp.producerId),
          isProducing: !!(existing.isProducing || vp.producerId)
        });
      }
    } else {
      addClient({
        id,
        displayName: vp.name || 'Fonte',
        producerIds: { video: vp.producerId },
        producerId: vp.producerId,
        hasVideo: !!vp.producerId,
        isProducing: !!vp.producerId,
        status: 'transmitindo'
      });
    }
  }

  const tx = p.transmission || normalizeTransmission(snapshot.transmission || {});
  if (hasActiveVideo(tx) && tx.selectedPeerId) {
    const key = String(tx.selectedPeerId);
    if (!byId.has(key)) {
      addClient({
        id: tx.selectedPeerId,
        displayName: tx.peerName || 'Fonte',
        producerIds: tx.producerIds,
        producerId: tx.producerId,
        hasVideo: true,
        isProducing: true,
        selecionado: true,
        status: 'transmitindo'
      });
    }
  }

  return [...byId.values()];
}

/** Extrai transmissão e fontes de áudio de roomState, estadoSala ou payload legado. */
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
    mutedPeerIds: snapshot.mutedPeerIds || [],
    version: snapshot.version || 0,
    reason: snapshot.reason || null
  };
}

/** Alias canonico para evento roomState versionado. */
export function parseRoomState(payload = {}) {
  return parseRoomSnapshot(payload);
}

export function roomStateMediaKey(snapshot = {}) {
  const parsed = parseRoomSnapshot(snapshot);
  const version = parsed.version || snapshot.version || 0;
  return `${version}:${roomSnapshotMediaKey(snapshot)}`;
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

/** Chave canônica só do vídeo ativo (sem áudio) — usada para troca de transmissão. */
export function activeVideoTransmissionKey(transmission) {
  const t = normalizeTransmission(transmission);
  return `${t.selectedPeerId || ''}:${t.producerIds?.video || ''}:${t.paused ? '1' : '0'}:${t.sourceKind || 'none'}`;
}

export function remoteVideoConsumeNeeded(
  transmission,
  { currentProducerId = null, isSelfSelected = false, hasVideoElement = false, consumerClosed = false } = {}
) {
  const tx = normalizeTransmission(transmission);
  if (isSelfSelected) return false;
  if (!hasActiveVideo(tx) || tx.paused) return false;
  const nextId = tx.producerIds?.video;
  if (!nextId) return false;
  if (consumerClosed || !currentProducerId || currentProducerId !== nextId) return true;
  return !hasVideoElement;
}

function mergeSourceWithTransmission(source, tx, { isSelected = false } = {}) {
  if (!source) return source;
  const normalized = normalizeTransmission(tx);
  if (!hasActiveVideo(normalized)) return source;

  const videoId = normalized.producerIds?.video || null;
  return {
    ...source,
    selectable: source.selectable ?? source.mediaReady?.video ?? true,
    isProducing: true,
    hasVideo: true,
    producerIds: {
      ...(source.producerIds || {}),
      video: videoId || source.producerIds?.video || source.producerId || null
    },
    producerId: videoId || source.producerIds?.video || source.producerId || null,
    selecionado: !!isSelected,
    pausado: isSelected ? normalized.paused : source.pausado
  };
}

/** Enriquece lista de peers/selecionado com dados da transmissao ativa (corrige lag do estado). */
export function enrichRoomSourcesState(estado = {}, transmission) {
  if (!estado) return estado;
  const tx = normalizeTransmission(transmission || {});
  if (!hasActiveVideo(tx)) return { ...estado };

  const selectedId = tx.selectedPeerId;
  const videoId = tx.producerIds?.video;

  let clients = (estado.clients || []).map((c) => {
    if (selectedId && String(c.id) === String(selectedId)) {
      return mergeSourceWithTransmission(c, tx, { isSelected: true });
    }
    if (videoId && (c.producerIds?.video === videoId || c.producerId === videoId)) {
      return mergeSourceWithTransmission(c, tx);
    }
    return selectedId ? { ...c, selecionado: false } : c;
  });

  let selecionado = estado.selecionado;
  if (selectedId) {
    const match = clients.find((c) => String(c.id) === String(selectedId));
    selecionado = match
      ? { ...match, selecionado: true, pausado: tx.paused }
      : {
          id: selectedId,
          displayName: tx.peerName || 'Fonte',
          isProducing: true,
          hasVideo: true,
          producerIds: tx.producerIds,
          producerId: tx.producerId,
          selecionado: true,
          pausado: tx.paused
        };
    if (!match) {
      clients = [...clients, selecionado];
    }
  } else if (selecionado) {
    selecionado = mergeSourceWithTransmission(selecionado, tx, { isSelected: true });
  }

  return { ...estado, clients, selecionado };
}

/** Enriquece fontes do menu de controle de exibicao com a transmissao ativa. */
export function enrichDisplaySources(sources, transmission) {
  if (!sources?.length || !transmission) return sources || [];
  const tx = normalizeTransmission(transmission);
  if (!hasActiveVideo(tx)) return sources;

  const selectedId = tx.selectedPeerId;
  const videoId = tx.producerIds?.video;

  return sources.map((s) => {
    if (selectedId && String(s.id) === String(selectedId)) {
      return mergeSourceWithTransmission(s, tx, { isSelected: true });
    }
    if (videoId && (s.producerIds?.video === videoId || s.producerId === videoId)) {
      return mergeSourceWithTransmission(s, tx);
    }
    return selectedId ? { ...s, selecionado: false } : s;
  });
}

function transmissionSelectionKey(tx) {
  const n = normalizeTransmission(tx);
  return [
    n.selectedPeerId || '',
    n.producerIds?.video || '',
    n.paused ? '1' : '0'
  ].join(':');
}

/**
 * Sincroniza estado desejado de transmissão → consumer de vídeo aplicado.
 * Fila serial única; chaves de dedup atualizadas somente após sucesso.
 */
export class TransmissionSync {
  constructor({
    getMedia,
    getVideoEl,
    getPeerId,
    isViewerOnly,
    onStateChange,
    onStatus,
    onLtOverlay,
    onAutoplayBlocked,
    onError,
    getInterruptedMessageEl,
    getFinalizedMessageEl,
    getWatchingLabelEl
  } = {}) {
    this.getMedia = getMedia || (() => null);
    this.getVideoEl = getVideoEl || (() => null);
    this.getPeerId = getPeerId || (() => null);
    this.isViewerOnly = isViewerOnly || (() => false);
    this.onStateChange = onStateChange || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onLtOverlay = onLtOverlay || (() => {});
    this.onAutoplayBlocked = onAutoplayBlocked || (() => {});
    this.onError = onError || (() => {});
    this.getInterruptedMessageEl = getInterruptedMessageEl || (() => null);
    this.getFinalizedMessageEl = getFinalizedMessageEl || (() => null);
    this.getWatchingLabelEl = getWatchingLabelEl || (() => null);

    this._work = Promise.resolve();
    this._generation = 0;
    this._desiredTx = null;
    this._appliedVideoKey = '';
    this._lastActiveTransmission = null;
  }

  get lastActiveTransmission() {
    return this._lastActiveTransmission;
  }

  reset() {
    this._generation += 1;
    this._appliedVideoKey = '';
    this._desiredTx = null;
    this._lastActiveTransmission = null;
  }

  clearAppliedState() {
    this._appliedVideoKey = '';
  }

  _needsVideoSync(tx, force) {
    if (force) return true;
    const media = this.getMedia();
    if (!media) return false;

    const activeKey = activeVideoTransmissionKey(tx);
    const peerId = this.getPeerId();
    const videoEl = this.getVideoEl();
    const currentProducerId =
      media.currentActiveVideoProducerId || media.remoteConsumers?.video?.producerId || null;
    const isSelfSelected = String(normalizeTransmission(tx).selectedPeerId) === String(peerId);
    const needsConsume = remoteVideoConsumeNeeded(tx, {
      currentProducerId,
      isSelfSelected,
      hasVideoElement: !!videoEl?.srcObject,
      consumerClosed: !media.remoteConsumers?.video || media.remoteConsumers.video.closed
    });
    const keyChanged = activeKey !== this._appliedVideoKey;

    if (!hasActiveVideo(tx)) return keyChanged || !!currentProducerId;
    if (isSelfSelected) return keyChanged || !!currentProducerId;
    return keyChanged || needsConsume;
  }

  apply(rawTx, { force = false } = {}) {
    const tx = normalizeTransmission(rawTx);
    this._desiredTx = tx;
    this._lastActiveTransmission = tx;

    if (!force && !this._needsVideoSync(tx, false)) {
      this.onLtOverlay(tx);
      return this._work;
    }

    const gen = ++this._generation;
    this._work = this._work
      .then(() => this._runApply(tx, gen))
      .catch((e) => {
        this.onError?.(e);
        throw e;
      });
    return this._work;
  }

  onConsumerClosed(consumerId) {
    const media = this.getMedia();
    if (!media) return this._work;

    const wasVideoConsumer = media.remoteConsumers?.video?.id === consumerId;
    if (wasVideoConsumer) {
      media.remoteConsumers.video = null;
      media.currentActiveVideoProducerId = null;
      if (consumerId && media.videoConsumersByProducerId) {
        for (const [pid, c] of media.videoConsumersByProducerId.entries()) {
          if (c?.id === consumerId) media.videoConsumersByProducerId.delete(pid);
        }
      }
      const videoEl = this.getVideoEl();
      if (videoEl) videoEl.srcObject = null;
      this._appliedVideoKey = '';
    }

    if (this._desiredTx && hasActiveVideo(this._desiredTx)) {
      return this.apply(this._desiredTx, { force: true });
    }
    if (this._desiredTx) {
      return this.apply(this._desiredTx, { force: true });
    }
    return this._work;
  }

  async _runApply(tx, gen) {
    if (gen !== this._generation) return;

    const media = this.getMedia();
    const videoEl = this.getVideoEl();
    const peerId = this.getPeerId();
    const viewerOnly = this.isViewerOnly();
    const selectionKey = transmissionSelectionKey(tx);
    const activeKey = activeVideoTransmissionKey(tx);

    try {
      if (!hasActiveVideo(tx)) {
        this._appliedVideoKey = '';
        await media?.closeActiveVideoConsumer({ videoEl, notifyServer: true });
        this.onLtOverlay(tx);

        if (tx.interrompidaPor) {
          const el = this.getInterruptedMessageEl();
          if (el) el.textContent = `Transmissao interrompida por ${tx.interrompidaPor}`;
          this.onStateChange('interrupted', tx);
        } else if (tx.finalizadaPor) {
          const el = this.getFinalizedMessageEl();
          if (el) el.textContent = `Transmissao finalizada por ${tx.finalizadaPor}`;
          this.onStateChange('finalized', tx);
        } else {
          const prior = this._lastActiveTransmission;
          const keepPriorWatch =
            !viewerOnly &&
            prior &&
            hasActiveVideo(prior) &&
            String(prior.selectedPeerId) !== String(peerId);
          if (!keepPriorWatch) {
            this.onStateChange(tx.paused ? 'paused' : viewerOnly ? 'waiting' : 'sharing', tx);
          }
        }
        return;
      }

      const isSelectedSelf = String(tx.selectedPeerId) === String(peerId);

      this.onStateChange(
        isSelectedSelf && !tx.paused ? 'selected' : tx.paused ? 'paused' : 'watching',
        tx
      );

      if (isSelectedSelf && !tx.paused) {
        this.onStatus('Voce esta selecionado — transmitindo para todos');
        await media?.closeActiveVideoConsumer({ videoEl, notifyServer: true });
        this._appliedVideoKey = selectionKey;
      } else {
        const watchingLabel = this.getWatchingLabelEl();
        if (watchingLabel) {
          watchingLabel.textContent = tx.peerName || 'Transmissao ativa';
        }
        this.onStatus(
          tx.paused ? 'Transmissao pausada pelo host' : `Assistindo: ${tx.peerName || 'fonte'}`
        );

        const nextVideoProducer = tx.producerIds?.video;
        if (nextVideoProducer && !tx.paused && media) {
          if (gen !== this._generation) return;

          const ownProducerId = media.producers?.video?.id || null;
          const currentProducerId =
            media.currentActiveVideoProducerId || media.remoteConsumers?.video?.producerId;
          const needsConsume = remoteVideoConsumeNeeded(tx, {
            currentProducerId,
            isSelfSelected: false,
            hasVideoElement: !!videoEl?.srcObject,
            consumerClosed: !media.remoteConsumers?.video || media.remoteConsumers.video.closed
          });

          if (needsConsume) {
            await media.consumeRemoteMedia(tx.producerIds, {
              videoEl,
              audioEl: null,
              ownProducerIds: { video: ownProducerId }
            });
          }
          try {
            await videoEl?.play?.();
          } catch (_) {}
          this._appliedVideoKey = activeKey;
        } else if (tx.paused) {
          this._appliedVideoKey = activeKey;
        } else if (!nextVideoProducer) {
          await media?.closeActiveVideoConsumer({ videoEl, notifyServer: true });
          this._appliedVideoKey = '';
        }
      }

      this.onLtOverlay(tx);
      this.onStateChange(
        isSelectedSelf && !tx.paused ? 'selected' : tx.paused ? 'paused' : 'watching',
        tx,
        { hideWatchingBanner: true }
      );
    } catch (e) {
      this._appliedVideoKey = '';
      if (e.message?.includes('Autoplay') || e.name === 'NotAllowedError') {
        this.onAutoplayBlocked?.();
      }
      throw e;
    }
  }
}
