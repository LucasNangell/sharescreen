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

/** Chave canônica só do vídeo ativo (sem áudio) — usada para troca de transmissão. */
export function activeVideoTransmissionKey(transmission) {
  const t = normalizeTransmission(transmission);
  return `${t.selectedPeerId || ''}:${t.producerIds?.video || ''}:${t.paused ? '1' : '0'}`;
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
          this.onStateChange(tx.paused ? 'paused' : viewerOnly ? 'waiting' : 'sharing', tx);
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
        } else if (!nextVideoProducer || tx.paused) {
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
