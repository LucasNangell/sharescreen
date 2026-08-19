import * as mediasoupClient from 'mediasoup-client';
import {
  buildDisplayConstraintsWithAudio,
  buildVideoProduceOptions,
  buildAudioProduceOptions,
  applyContentHint
} from './quality-manager.js';
import {
  acquireMicrophoneTrack
} from './audio-manager.js';
import { normalizeAudioSource, parseAudioChannelKey, audioTrace } from './audio-sources.js';
import {
  applyTabCaptureAudioHints,
  dualPublishPolicyFromQuality,
  resolvePublishAudioSources,
  stripMonitorSystemAudio
} from './audio-policy.js';
import { buildIceServers, hasTurnServers } from './ice-servers.js';
import {
  MIC_FILTER_DEFAULTS,
  HOST_MIC_PUBLISH_DEFAULTS,
  CLIENT_MIC_PUBLISH_DEFAULTS,
  normalizeMicrophoneFilterPrefs,
  hasActiveMicrophoneFilter,
  closeMicrophoneFilterGraph,
  createMicrophoneFilterGraph,
  microphoneFilterPrefsSignature,
  resumeMicrophoneFilterGraph,
  micGraphIsRunning
} from './mic-dsp.js';

/** Acima deste ganho o portão é considerado aberto (o modo `soft` atenua para 0.16). */
const MIC_GATE_OPEN_MIN = 0.5;
const MIC_FILTER_RESTORE_MAX_ATTEMPTS = 3;
import {
  evaluateMicPublishHealth,
  rmsFromAnalyser,
  sampleTrackRms
} from './mic-publish-health.js';

/**
 * Sess?fio mediasoup: transports, produce, consume, cleanup e baixa lat?fincia.
 */
export class MediaClient {
  constructor(signaling, { onLog, onIceState, splitRecvTransports = false, applyHostMicPublishChain = false, applyMicPublishChain = false } = {}) {
    this.signaling = signaling;
    this.onLog = onLog || (() => {});
    this.onIceState = onIceState || (() => {});
    this.splitRecvTransports = splitRecvTransports;
    this.applyMicPublishChain = !!(applyMicPublishChain || applyHostMicPublishChain);
    this.micPublishDefaults = applyHostMicPublishChain
      ? HOST_MIC_PUBLISH_DEFAULTS
      : CLIENT_MIC_PUBLISH_DEFAULTS;
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.recvTransports = new Map();
    this._creatingTransports = new Map();
    this.producers = { video: null, microphone: null, system: null, mixed: null };
    this.remoteConsumers = { video: null, audio: null };
    this.videoConsumersByProducerId = new Map();
    this.previewVideoConsumers = new Map();
    this._isSyntheticVideo = false;
    this._syntheticStream = null;
    this.currentActiveVideoProducerId = null;
    this.auxAudioConsumers = new Map();
    this.consumeGeneration = 0;
    this.localScreenStream = null;
    this._micTrack = null;
    this._micFilterPrefs = normalizeMicrophoneFilterPrefs();
    this._micFilterPrefsSig = microphoneFilterPrefsSignature(this._micFilterPrefs);
    this._micFilterGraph = null;
    this._displaySurface = null;
    this.localMicTracks = [];
    this.videoQuality = {};
    this.capturePrefs = { systemAudio: false, microphone: false };
    this._producing = false;
    this._publishedMicMuted = false;
    this._mediaOps = Promise.resolve();
    this._videoMediaOps = Promise.resolve();
    this._audioMediaOps = Promise.resolve();
    this.ownPeerId = null;
    this.sharedRoomMode = false;
    this._dominantSpeakerPeerId = null;
    this._dominantEnableTimer = null;
    this._micCaptureAgcOff = null;
    this._micCaptureDeviceId = '';
    this._micPublishDegraded = null;
    this._lastMicPublishHealth = 'ok';
    this._micHealthCheckScheduled = false;
    this._micFiltersDropped = false;
    this._micFiltersRestoreAttempts = 0;
  }

  /** Publicação caiu para trilha crua e ainda há filtros pedidos que podem ser restaurados. */
  hasPendingMicFilterRestore() {
    return (
      this._micFiltersDropped &&
      this._micFiltersRestoreAttempts < MIC_FILTER_RESTORE_MAX_ATTEMPTS
    );
  }

  /** Conta tentativas frustradas de publicar com DSP para não recapturar em laço. */
  _setMicFiltersDropped(dropped) {
    if (dropped) {
      this._micFiltersDropped = true;
      this._micFiltersRestoreAttempts += 1;
      return;
    }
    this._micFiltersDropped = false;
    this._micFiltersRestoreAttempts = 0;
  }

  getMicPublishHealth() {
    const graph = this._micFilterGraph;
    const ctxState = graph?.ctx?.state || 'none';
    const published = this.hasPublishedMicrophone();
    let action = 'ok';
    if (!published) action = 'republish';
    else if (this._micPublishDegraded === 'ctx-suspended' || this._micPublishDegraded === 'silent-graph') {
      action = 'republish-raw';
    } else if (graph && ctxState !== 'running') {
      action = 'republish-raw';
    } else if (this._micPublishDegraded === 'no-input') {
      action = 'no-input';
    }
    return {
      published,
      degraded: this._micPublishDegraded,
      ctxState,
      graphPresent: !!graph,
      action
    };
  }

  isMicPublishDegraded() {
    const health = this.getMicPublishHealth();
    return health.action === 'republish-raw' || health.action === 'republish';
  }

  getOwnAudioProducerIds() {
    return ['microphone', 'system', 'mixed']
      .map((slot) => this.producers[slot])
      .filter((producer) => producer && !producer.closed && producer.id)
      .map((producer) => producer.id);
  }

  setOwnPeerId(peerId) {
    this.ownPeerId = peerId ? String(peerId) : null;
    this._applyDominantSpeakerDucking();
  }

  setSharedRoomMode(enabled) {
    const next = !!enabled;
    if (next === this.sharedRoomMode) return;
    this.sharedRoomMode = next;
    this._applyDominantSpeakerDucking();
  }

  handleDominantSpeaker(payload = {}) {
    const peerId = payload?.peerId ? String(payload.peerId) : null;
    if (peerId === this._dominantSpeakerPeerId) return;
    this._dominantSpeakerPeerId = peerId;
    this._applyDominantSpeakerDucking();
  }

  _applyDominantSpeakerDucking() {
    const track = this.getLocalMicrophoneTrack();
    if (!track) return;
    if (this._dominantEnableTimer) {
      clearTimeout(this._dominantEnableTimer);
      this._dominantEnableTimer = null;
    }
    if (this._publishedMicMuted) {
      track.enabled = false;
      return;
    }
    if (!this.sharedRoomMode || !this.ownPeerId) {
      track.enabled = true;
      return;
    }
    const dominant = this._dominantSpeakerPeerId;
    if (!dominant || String(dominant) === String(this.ownPeerId)) {
      this._dominantEnableTimer = setTimeout(() => {
        this._dominantEnableTimer = null;
        const t = this.getLocalMicrophoneTrack();
        if (!t || this._publishedMicMuted || !this.sharedRoomMode) return;
        const currentDominant = this._dominantSpeakerPeerId;
        if (!currentDominant || String(currentDominant) === String(this.ownPeerId)) {
          t.enabled = true;
        }
      }, 300);
      return;
    }
    track.enabled = false;
  }

  _audioProducer(source) {
    const key = normalizeAudioSource(source, 'mixed');
    return this.producers[key] || null;
  }

  hasPublishedMicrophone() {
    const producer = this.producers.microphone;
    return !!(producer && !producer.closed && producer.track?.readyState === 'live');
  }

  hasPublishedSystemAudio() {
    const producer = this.producers.system;
    return !!(producer && !producer.closed && producer.track?.readyState === 'live');
  }

  hasPublishedAudio() {
    return (
      this.hasPublishedMicrophone() ||
      this.hasPublishedSystemAudio() ||
      !!(this.producers.mixed && !this.producers.mixed.closed)
    );
  }

  isPublishedAudioMuted() {
    return !!this._publishedMicMuted;
  }

  setPublishedAudioMuted(muted) {
    this._publishedMicMuted = !!muted;
    const track = this.getLocalMicrophoneTrack();
    if (track) {
      if (muted) {
        track.enabled = false;
      } else {
        this._applyDominantSpeakerDucking();
      }
    }
    return this._publishedMicMuted;
  }

  togglePublishedAudioMuted() {
    return this.setPublishedAudioMuted(!this.isPublishedAudioMuted());
  }

  getLocalMicrophoneTrack() {
    const published = this.producers.microphone?.track;
    if (published?.readyState === 'live') return published;
    if (this._micTrack?.readyState === 'live') return this._micTrack;
    return this.localMicTracks.find((t) => t.readyState === 'live') || null;
  }

  getLocalAudioTrack() {
    return this.getLocalMicrophoneTrack();
  }

  _runMediaOp(fn) {
    const task = this._mediaOps.then(() => fn());
    this._mediaOps = task.catch(() => {});
    return task;
  }

  _runVideoMediaOp(fn) {
    const task = this._videoMediaOps.then(() => fn());
    this._videoMediaOps = task.catch(() => {});
    return task;
  }

  _runAudioMediaOp(fn) {
    const task = this._audioMediaOps.then(() => fn());
    this._audioMediaOps = task.catch(() => {});
    return task;
  }

  setVideoQuality(quality) {
    if (quality) this.videoQuality = { ...quality };
    if (quality?.systemAudioDefault !== undefined) {
      this.capturePrefs.systemAudio = quality.systemAudioDefault;
    }
    if (quality?.microphoneDefault !== undefined) {
      this.capturePrefs.microphone = quality.microphoneDefault;
    }
  }

  setCapturePrefs(prefs) {
    this.capturePrefs = { ...this.capturePrefs, ...prefs };
  }

  _resolvePublishMicFilterPrefs() {
    const user = normalizeMicrophoneFilterPrefs(this._micFilterPrefs);
    if (!this.applyMicPublishChain) return user;
    const q = this.videoQuality || {};
    const defaults = this.micPublishDefaults || CLIENT_MIC_PUBLISH_DEFAULTS;
    return normalizeMicrophoneFilterPrefs({
      ...defaults,
      gain: Number(q.hostMicPublishGain ?? defaults.gain),
      compressor: q.hostMicCompressor !== false,
      peaking: q.hostMicPeaking !== false,
      peakingGain: 2,
      ...user
    });
  }

  _resolvedPublishPrefs(capturePrefs = {}, displayStream = null) {
    const stream = displayStream ?? this.localScreenStream ?? null;
    const displaySurface =
      this._displaySurface || (stream ? stripMonitorSystemAudio(stream).displaySurface : null);
    return resolvePublishAudioSources(capturePrefs, {
      displaySurface,
      dualPublishPolicy: dualPublishPolicyFromQuality(this.videoQuality),
      meetBridgeLiveMode: !!capturePrefs.meetBridgeLiveMode
    });
  }

  async loadDevice(rtpCapabilities) {
    this.device = new mediasoupClient.Device();
    await Promise.race([
      this.device.load({ routerRtpCapabilities: rtpCapabilities }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao carregar dispositivo de m?fidia')), 20000);
      })
    ]);
    this.onLog('Dispositivo mediasoup carregado', 'info');
  }

  _videoRecvTag() {
    return this.splitRecvTransports ? 'video' : 'default';
  }

  _previewRecvTag() {
    return 'studio-preview';
  }

  _audioRecvTag() {
    return this.splitRecvTransports ? 'audio' : 'default';
  }

  async createTransport(direction, tag = 'default') {
    const recvTag = direction === 'recv' ? tag : 'default';
    const createdPromise = this.signaling.onceType(
      'transporteCriado',
      (m) =>
        m.payload?.direction === direction &&
        (m.payload?.tag || 'default') === recvTag
    );
    this.signaling.send('criarTransporte', {
      direction,
      tag: direction === 'recv' ? recvTag : undefined
    });
    const payload = await createdPromise;

    const transportOptions = {
      id: payload.id,
      iceParameters: payload.iceParameters,
      iceCandidates: payload.iceCandidates,
      dtlsParameters: payload.dtlsParameters
    };
    const iceServers = buildIceServers(this.videoQuality);
    if (iceServers.length) {
      transportOptions.iceServers = iceServers;
    }

    const transport =
      direction === 'send'
        ? this.device.createSendTransport(transportOptions)
        : this.device.createRecvTransport(transportOptions);

    if (hasTurnServers(this.videoQuality) && direction === 'recv') {
      this.onLog('TURN dispon?fivel i?,???? fallback se conex?fio direta falhar', 'info');
    }

    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
      try {
        const connectedPromise = this.signaling.onceType(
          'transporteConectado',
          (m) => m.payload?.transportId === transport.id
        );
        this.signaling.send('conectarTransporte', {
          transportId: transport.id,
          dtlsParameters,
          direction
        });
        connectedPromise.then(() => callback()).catch((e) => errback(e));
      } catch (e) {
        errback(e);
      }
    });

    transport.on('connectionstatechange', (state) => {
      const level = state === 'failed' ? 'error' : 'info';
      let msg = `Transport ${direction}${recvTag !== 'default' ? `/${recvTag}` : ''}: ${state}`;
      if (state === 'failed') {
        const ice =
          transport.iceCandidates?.map((c) => c.ip).filter(Boolean).join(', ') ||
          this.videoQuality?.serverHost ||
          '?';
        const ports = this.videoQuality?.rtcPortRange || '40000-40100';
        msg += ` i?,???? verifique firewall UDP ${ports} em ${ice}`;
        this.onIceState?.('failed', direction);
      } else if (state === 'connected') {
        this.onIceState?.('connected', direction);
      }
      this.onLog(msg, level);
    });

    if (direction === 'send') {
      transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
        try {
          const source = appData?.source || null;
          const producedPromise = this.signaling.onceType(
            'produzido',
            (m) => {
              if (m.payload?.kind !== kind) return false;
              if (kind === 'audio' && source) {
                return m.payload?.source === source;
              }
              return true;
            }
          );
          this.signaling.send('produzir', {
            transportId: transport.id,
            kind,
            rtpParameters,
            appData
          });
          producedPromise
            .then((p) => callback({ id: p.id }))
            .catch((e) => errback(e));
        } catch (e) {
          errback(e);
        }
      });
      this.sendTransport = transport;
    } else {
      this.recvTransports.set(recvTag, transport);
      if (recvTag === 'default') this.recvTransport = transport;
    }

    return transport;
  }

  async ensureSendTransport() {
    if (this.sendTransport) return;
    const key = 'send/default';
    if (this._creatingTransports.has(key)) {
      await this._creatingTransports.get(key);
      return;
    }
    const promise = this.createTransport('send');
    this._creatingTransports.set(key, promise);
    try {
      await promise;
    } finally {
      this._creatingTransports.delete(key);
    }
  }

  async ensureRecvTransport(tag = 'default') {
    const existing = this.recvTransports.get(tag);
    if (existing && !existing.closed) {
      return existing;
    }
    if (existing?.closed) {
      this.recvTransports.delete(tag);
      if (tag === 'default') this.recvTransport = null;
    }
    const key = `recv/${tag}`;
    if (this._creatingTransports.has(key)) {
      await this._creatingTransports.get(key);
      return this.recvTransports.get(tag);
    }
    const promise = this.createTransport('recv', tag);
    this._creatingTransports.set(key, promise);
    try {
      await promise;
    } finally {
      this._creatingTransports.delete(key);
    }
    return this.recvTransports.get(tag);
  }

  hasVideoProducer() {
    const producer = this.producers.video;
    return !!(producer && !producer.closed && producer.track?.readyState === 'live');
  }

  isSharingVideo() {
    return this.hasVideoProducer();
  }

  /** Verifica producer de vídeo do host; solicita keyframe se track live mas congelada aparente. */
  async repairHostVideoIfNeeded() {
    const producer = this.producers.video;
    if (!producer || producer.closed) return { ok: false, reason: 'no-producer' };
    const track = producer.track;
    if (!track || track.readyState !== 'live') {
      return { ok: false, reason: 'track-not-live', trackState: track?.readyState || 'none' };
    }
    try {
      await producer.requestKeyFrame();
    } catch (_) {}
    return { ok: true };
  }

  getHostVideoTrackState() {
    const track = this.producers.video?.track;
    return track?.readyState || 'none';
  }

  _stopLocalMicTracks(keepTrack = null) {
    const kept = [];
    for (const track of this.localMicTracks) {
      if (keepTrack && track === keepTrack) {
        kept.push(track);
        continue;
      }
      if (this._micTrack && track === this._micTrack) continue;
      try {
        track.stop();
      } catch (_) {}
    }
    this.localMicTracks = kept;
  }

  async _closeAudioProducerBySource(source, { stopMicTrack = false } = {}) {
    const key = normalizeAudioSource(source, 'mixed');
    const producer = this.producers[key];
    if (producer && !producer.closed) {
      audioTrace('producer fechado', {
        source: key,
        producerId: producer.id?.slice(0, 8)
      });
      producer.close();
    }
    this.producers[key] = null;
    if (key === 'microphone') {
      closeMicrophoneFilterGraph(this._micFilterGraph);
      this._micFilterGraph = null;
      this._micPublishDegraded = null;
      this._lastMicPublishHealth = 'ok';
      this._micFiltersDropped = false;
      this._micFiltersRestoreAttempts = 0;
    }
    if (key === 'microphone' && stopMicTrack) {
      if (this._micTrack) {
        try {
          this._micTrack.stop();
        } catch (_) {}
        this._micTrack = null;
      }
      this._micCaptureAgcOff = null;
      this._micCaptureDeviceId = '';
      this._stopLocalMicTracks();
    }
  }

  async _publishAudioTrack(audioTrack, source) {
    const key = normalizeAudioSource(source, 'mixed');
    if (!audioTrack || audioTrack.readyState !== 'live') return false;

    await this.ensureSendTransport();

    const existing = this.producers[key];
    if (
      existing &&
      !existing.closed &&
      existing.track === audioTrack &&
      existing.track?.readyState === 'live' &&
      key !== 'microphone'
    ) {
      return true;
    }

    if (existing && !existing.closed) {
      existing.close();
      this.producers[key] = null;
    }

    const audioOpts = buildAudioProduceOptions(this.device, this.videoQuality, key);
    audioOpts.track = audioTrack;
    this.producers[key] = await this.sendTransport.produce({
      ...audioOpts,
      appData: { source: key, displaySurface: this._displaySurface || undefined }
    });
    audioTrace('producer criado', {
      source: key,
      producerId: this.producers[key]?.id?.slice(0, 8)
    });

    if (key === 'microphone' && this._publishedMicMuted) {
      audioTrack.enabled = false;
    }

    return true;
  }

  _canReuseMicTrack(track, { deviceId = '', agcOff = false } = {}) {
    if (!track || track.readyState !== 'live') return false;
    const settings = track.getSettings?.() || {};
    const knownAgcOff = this._micCaptureAgcOff;
    const trackAgcOff =
      knownAgcOff != null ? knownAgcOff : settings.autoGainControl === false;
    if (!!trackAgcOff !== !!agcOff) return false;
    const wantId = deviceId || '';
    const activeId = settings.deviceId || '';
    if (wantId && activeId && wantId !== activeId) return false;
    return true;
  }

  async _samplePublishedMicEnergy(durationMs = 1200) {
    const producer = this.producers.microphone;
    const track = producer?.track;
    if (!track || track.readyState !== 'live') return 0;
    const statsPromise = (async () => {
      if (!producer?.getStats) return 0;
      const end = Date.now() + durationMs;
      let max = 0;
      while (Date.now() < end) {
        try {
          const stats = await producer.getStats();
          for (const report of stats.values()) {
            const level = Number(report.audioLevel);
            if (Number.isFinite(level)) max = Math.max(max, level);
          }
        } catch (_) {}
        await new Promise((r) => setTimeout(r, 200));
      }
      return max;
    })();
    const analyserPromise = sampleTrackRms(track, durationMs);
    const [fromStats, fromAnalyser] = await Promise.all([statsPromise, analyserPromise]);
    if (fromAnalyser == null && !(fromStats > 0)) return null;
    return Math.max(fromStats || 0, fromAnalyser || 0);
  }

  _sampleRawMicEnergy() {
    const graph = this._micFilterGraph;
    if (graph?.meterAnalyser) return rmsFromAnalyser(graph.meterAnalyser);
    if (!graph && this._micTrack?.readyState === 'live') return 0;
    return 0;
  }

  /**
   * Mede a saída real do grafo (pós-ganho) apenas nos instantes em que o portão está
   * aberto, além da energia pré-portão. Sem isso um portão fechado — que é justamente
   * o comportamento esperado de VAD/proximidade — pareceria um grafo mudo.
   */
  async _sampleMicGraphWindow(durationMs = 1200) {
    const graph = this._micFilterGraph;
    if (!graph?.outputAnalyser) return null;
    const end = Date.now() + Math.max(200, durationMs);
    let outputEnergy = 0;
    let rawEnergy = 0;
    let gateOpenObserved = false;
    let measured = false;
    while (Date.now() < end) {
      if (graph.ctx?.state !== 'running') break;
      const gateOpen =
        !graph.gateActive ||
        Number(graph.gateGainNode?.gain?.value ?? 1) > MIC_GATE_OPEN_MIN;
      rawEnergy = Math.max(rawEnergy, rmsFromAnalyser(graph.meterAnalyser));
      if (gateOpen) {
        gateOpenObserved = true;
        outputEnergy = Math.max(outputEnergy, rmsFromAnalyser(graph.outputAnalyser));
      }
      measured = true;
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!measured) return null;
    return { outputEnergy, rawEnergy, gateOpenObserved, gateActive: !!graph.gateActive };
  }

  async _republishRawMicrophone() {
    const track = this._micTrack;
    if (!track || track.readyState !== 'live') return false;
    const wantedFilters = hasActiveMicrophoneFilter(this._resolvePublishMicFilterPrefs());
    closeMicrophoneFilterGraph(this._micFilterGraph);
    this._micFilterGraph = null;
    const ok = await this._publishAudioTrack(track, 'microphone');
    if (ok) {
      this._micPublishDegraded = null;
      this._lastMicPublishHealth = 'ok';
      this._setMicFiltersDropped(wantedFilters);
      this.onLog('Microfone publicado sem filtros (recuperacao)', 'warn');
      audioTrace('mic-publish-recover', { reason: 'raw', filtersDropped: wantedFilters });
    }
    return ok;
  }

  /** Refaz a publicação com DSP depois de um fallback para trilha crua. */
  async _restoreMicFilterPublication() {
    if (!this.hasPendingMicFilterRestore()) return false;
    audioTrace('mic-publish-restore-filters', {
      attempt: this._micFiltersRestoreAttempts + 1
    });
    return this._publishMicrophoneUnlocked({ ...this.capturePrefs, microphone: true });
  }

  _scheduleMicPublishHealthCheck() {
    if (this._micHealthCheckScheduled) return;
    this._micHealthCheckScheduled = true;
    setTimeout(() => {
      this._micHealthCheckScheduled = false;
      this._runAudioMediaOp(async () => {
        if (!this.hasPublishedMicrophone() || this._publishedMicMuted) return;
        await this._verifyAndRecoverMicPublish();
      }).catch(() => {});
    }, 0);
  }

  async _verifyAndRecoverMicPublish() {
    if (this._publishedMicMuted) return;
    const graph = this._micFilterGraph;
    if (graph && !micGraphIsRunning(graph)) {
      const resumed = await resumeMicrophoneFilterGraph(graph);
      if (!resumed) {
        this._micPublishDegraded = 'ctx-suspended';
        this._lastMicPublishHealth = 'republish-raw';
        audioTrace('mic-publish-recover', { reason: 'ctx-suspended' });
        await this._republishRawMicrophone();
        return;
      }
    }

    const sampled = await this._sampleMicGraphWindow(1200);
    const publishedEnergy = sampled
      ? sampled.outputEnergy
      : await this._samplePublishedMicEnergy(1200);
    const rawEnergy = sampled ? sampled.rawEnergy : this._sampleRawMicEnergy();
    const gateActive = sampled ? sampled.gateActive : false;
    const gateOpenObserved = sampled ? sampled.gateOpenObserved : true;
    const action = evaluateMicPublishHealth({
      producerLive: this.hasPublishedMicrophone(),
      publishedEnergy,
      rawEnergy,
      ctxState: this._micFilterGraph?.ctx?.state || 'none',
      graphPresent: !!this._micFilterGraph,
      gateActive,
      gateOpenObserved
    });
    this._lastMicPublishHealth = action;
    audioTrace('mic-publish-health', {
      action,
      publishedEnergy,
      rawEnergy,
      gateActive,
      gateOpenObserved,
      ctxState: this._micFilterGraph?.ctx?.state || 'none'
    });
    if (action === 'republish-raw') {
      this._micPublishDegraded = 'silent-graph';
      await this._republishRawMicrophone();
    } else if (action === 'ok') {
      this._micPublishDegraded = null;
    } else if (action === 'no-input') {
      this._micPublishDegraded = null;
    }
  }

  async _publishMicrophoneUnlocked(capturePrefs, { skipDsp = false, skipHealth = false } = {}) {
    this.setCapturePrefs(capturePrefs);
    if (!capturePrefs?.microphone) {
      return this._stopMicrophoneUnlocked();
    }

    await this.ensureSendTransport();

    const publishPrefs = this._resolvePublishMicFilterPrefs();
    const needsAgcOff = this.applyMicPublishChain && hasActiveMicrophoneFilter(publishPrefs);
    const micCaptureOptions = needsAgcOff ? { disableAutoGainControl: true } : {};
    const wantDeviceId = capturePrefs.microphoneDeviceId || '';

    const candidates = [capturePrefs.prefetchedMicTrack, this._micTrack].filter(Boolean);
    let track = candidates.find((candidate) =>
      this._canReuseMicTrack(candidate, { deviceId: wantDeviceId, agcOff: needsAgcOff })
    ) || null;

    let previousToStop = null;
    if (!track || track.readyState !== 'live') {
      previousToStop = this._micTrack;
      track = await acquireMicrophoneTrack(wantDeviceId, this.onLog, micCaptureOptions);
      this._micCaptureAgcOff = needsAgcOff;
    }
    this._micCaptureDeviceId = wantDeviceId;

    this._micTrack = track;
    if (!this.localMicTracks.includes(track)) {
      this.localMicTracks.push(track);
    }

    let prepared;
    if (skipDsp) {
      prepared = { track, graph: null };
    } else {
      prepared = await createMicrophoneFilterGraph(track, publishPrefs);
    }
    const previousGraph = this._micFilterGraph;
    const ok = await this._publishAudioTrack(prepared.track, 'microphone');
    if (ok) {
      this._micFilterGraph = prepared.graph || null;
      closeMicrophoneFilterGraph(previousGraph);
      this._setMicFiltersDropped(!prepared.graph && hasActiveMicrophoneFilter(publishPrefs));
      if (prepared.degraded) {
        this._micPublishDegraded = prepared.degraded;
        audioTrace('mic-publish-degraded', { reason: prepared.degraded });
      } else {
        this._micPublishDegraded = null;
      }
      this.onLog(prepared.graph ? 'Microfone publicado com filtros' : 'Microfone publicado', 'info');
      if (
        previousToStop &&
        previousToStop !== track &&
        previousToStop !== capturePrefs.prefetchedMicTrack
      ) {
        try { previousToStop.stop(); } catch (_) {}
      }
      if (!skipHealth && !this._publishedMicMuted) {
        this._scheduleMicPublishHealthCheck();
      }
    } else {
      closeMicrophoneFilterGraph(prepared.graph);
      throw new Error('Falha ao publicar microfone no servidor');
    }
    return ok;
  }

  async _stopMicrophoneUnlocked() {
    await this._closeAudioProducerBySource('microphone', { stopMicTrack: true });
    this.onLog('Microfone encerrado', 'info');
    return false;
  }

  async _ensureMicrophonePublicationUnlocked(prefs = {}, { force = false } = {}) {
    const capturePrefs = { ...this.capturePrefs, ...prefs };
    this.setCapturePrefs(capturePrefs);
    if (!capturePrefs.microphone) {
      if (this.hasPublishedMicrophone()) await this._stopMicrophoneUnlocked();
      return { ok: false, reason: 'disabled' };
    }
    try {
      const wantDeviceId = capturePrefs.microphoneDeviceId || '';
      const graphOk = !this._micFilterGraph || micGraphIsRunning(this._micFilterGraph);
      if (
        !force &&
        !this._micPublishDegraded &&
        !this.hasPendingMicFilterRestore() &&
        graphOk &&
        this.hasPublishedMicrophone() &&
        this._micTrack?.readyState === 'live'
      ) {
        const activeId =
          this._micCaptureDeviceId || this._micTrack.getSettings?.().deviceId || '';
        if (wantDeviceId === activeId) {
          return { ok: true, reason: null };
        }
      }
      await this.ensureSendTransport();
      const ok = await this._publishMicrophoneUnlocked({ ...capturePrefs, microphone: true });
      return { ok: !!ok, reason: ok ? null : 'produce' };
    } catch (err) {
      const name = String(err?.name || '');
      const reason =
        name === 'NotFoundError' || name === 'OverconstrainedError'
          ? 'device'
          : name === 'NotAllowedError' || name === 'NotReadableError' || name === 'SecurityError'
            ? 'permission'
            : 'produce';
      this.onLog(err?.message || 'Falha ao publicar microfone', 'error');
      return { ok: false, reason, error: err };
    }
  }

  async publishMicrophone(capturePrefs) {
    return this._runAudioMediaOp(() => this._publishMicrophoneUnlocked(capturePrefs));
  }

  async ensureMicrophonePublication(prefs = {}, { force = false } = {}) {
    return this._runAudioMediaOp(() => this._ensureMicrophonePublicationUnlocked(prefs, { force }));
  }

  async recoverMicPublicationIfNeeded() {
    return this._runAudioMediaOp(async () => {
      if (!this.capturePrefs?.microphone) return { ok: false, reason: 'disabled' };
      if (this._micFilterGraph) {
        const resumed = await resumeMicrophoneFilterGraph(this._micFilterGraph);
        if (resumed) {
          this._micPublishDegraded = null;
          this._lastMicPublishHealth = 'ok';
          return { ok: true, reason: 'resumed' };
        }
      }
      if (this.hasPendingMicFilterRestore()) {
        const restored = await this._restoreMicFilterPublication();
        if (restored && this._micFilterGraph) {
          return { ok: true, reason: 'filters-restored' };
        }
      }
      const health = this.getMicPublishHealth();
      if (health.action === 'ok' || health.action === 'no-input') {
        return { ok: true, reason: health.action };
      }
      if (health.action === 'republish-raw' && this._micTrack?.readyState === 'live') {
        this._micPublishDegraded = this._micPublishDegraded || 'ctx-suspended';
        const ok = await this._republishRawMicrophone();
        return { ok, reason: ok ? 'raw' : 'produce' };
      }
      return this._ensureMicrophonePublicationUnlocked(this.capturePrefs, { force: true });
    });
  }

  async setMicrophoneFilterPrefs(prefs) {
    return this._runAudioMediaOp(async () => {
      const next = normalizeMicrophoneFilterPrefs(prefs || {});
      const nextSig = microphoneFilterPrefsSignature(next);
      const changed = nextSig !== this._micFilterPrefsSig;
      this._micFilterPrefs = next;
      this._micFilterPrefsSig = nextSig;
      if (changed) this._micFiltersRestoreAttempts = 0;
      if (this.capturePrefs?.microphone && this._micTrack?.readyState === 'live' && changed) {
        return this._publishMicrophoneUnlocked({ ...this.capturePrefs, microphone: true });
      }
      return true;
    });
  }

  async ensureMicPublishFilters(fallbackPrefs = null) {
    const fallback = fallbackPrefs || this.micPublishDefaults || CLIENT_MIC_PUBLISH_DEFAULTS;
    if (!hasActiveMicrophoneFilter(this._micFilterPrefs)) {
      await this.setMicrophoneFilterPrefs(fallback);
    }
    return this._micFilterPrefs;
  }

  applyAudioPolicyFromServer(payload = {}) {
    return this._runAudioMediaOp(async () => {
      const closed = payload?.closed || payload?.blocked;
      if (closed === 'microphone' || payload?.blocked === 'microphone') {
        return this._stopMicrophoneUnlocked();
      }
      if (closed === 'system' || payload?.blocked === 'system') {
        return this.stopSystemAudio();
      }
      return false;
    });
  }

  async stopMicrophone() {
    return this._runAudioMediaOp(() => this._stopMicrophoneUnlocked());
  }

  async publishSystemAudioFromDisplay(displayStream = null) {
    const stream = displayStream ?? this.localScreenStream;
    if (!stream || this.capturePrefs.systemAudio === false) {
      return this.stopSystemAudio();
    }

    const systemTrack = stream
      .getAudioTracks()
      .find((t) => t.readyState === 'live');
    if (!systemTrack) {
      this.onLog(
        '?fiudio do sistema n?fio capturado i?,???? marque "Compartilhar ?fiudio" no di?filogo do Chrome',
        'warn'
      );
      return this.stopSystemAudio();
    }

    const ok = await this._publishAudioTrack(systemTrack, 'system');
    if (ok) this.onLog('?fiudio do sistema publicado', 'info');
    return ok;
  }

  async stopSystemAudio() {
    await this._closeAudioProducerBySource('system');
    this.onLog('?fiudio do sistema encerrado', 'info');
    return false;
  }

  /** Sincroniza microfone e áudio do sistema conforme prefs (sem mixar). */
  async _syncPublishedAudioUnlocked(capturePrefs, displayStream = null) {
    this.setCapturePrefs(capturePrefs);
    const resolved = this._resolvedPublishPrefs(capturePrefs, displayStream);
    if (resolved.blockedReason === 'mic-wins' && capturePrefs.systemAudio !== false) {
      this.onLog('Áudio da aba/janela omitido — microfone ativo (anti-eco)', 'info');
    }
    if (resolved.blockedReason === 'monitor-no-audio' && capturePrefs.systemAudio !== false) {
      this.onLog('Áudio indisponível em tela inteira — use aba ou janela', 'warn');
    }

    let micOk = true;
    let sysOk = true;

    if (resolved.microphone) {
      micOk = await this._publishMicrophoneUnlocked({ ...capturePrefs, microphone: true });
    } else if (this.hasPublishedMicrophone()) {
      await this._stopMicrophoneUnlocked();
    }

    const screenStream = displayStream ?? this.localScreenStream ?? null;
    if (screenStream && resolved.systemAudio) {
      sysOk = await this.publishSystemAudioFromDisplay(screenStream);
    } else if (this.hasPublishedSystemAudio()) {
      await this.stopSystemAudio();
    }

    return micOk || sysOk;
  }

  async syncPublishedAudio(capturePrefs, displayStream = null) {
    return this._runAudioMediaOp(() => this._syncPublishedAudioUnlocked(capturePrefs, displayStream));
  }

  async ensureAudioPublished(capturePrefs) {
    return this.syncPublishedAudio(capturePrefs);
  }

  /** @deprecated Use syncPublishedAudio / publishMicrophone */
  async refreshPublishedAudio(capturePrefs, displayStream = null) {
    return this.syncPublishedAudio(capturePrefs, displayStream);
  }

  async stopVideoShare() {
    if (this.producers.video && !this.producers.video.closed) {
      this.producers.video.close();
      this.producers.video = null;
    }

    await this.stopSystemAudio();

    if (this.localScreenStream) {
      for (const track of this.localScreenStream.getTracks()) {
        try {
          track.stop();
        } catch (_) {}
      }
      this.localScreenStream = null;
    }

    this._producing = this.hasVideoProducer();
  }

  async requestDisplayCapture(capturePrefs) {
    this.setCapturePrefs(capturePrefs);
    const constraints = buildDisplayConstraintsWithAudio(
      this.videoQuality,
      capturePrefs.systemAudio !== false
    );
    this.onLog('Solicitando captura de telai?,?i', 'info');
    return navigator.mediaDevices.getDisplayMedia(constraints);
  }

  async publishDisplayStream(displayStream, capturePrefs) {
    if (!displayStream) throw new Error('Nenhuma captura de tela fornecida');

    const { displaySurface, systemAudioBlocked } = stripMonitorSystemAudio(
      displayStream,
      (message, level) => this.onLog(message, level)
    );
    this._displaySurface = displaySurface;
    await applyTabCaptureAudioHints(displayStream);

    this.setCapturePrefs(capturePrefs);
    await this.ensureSendTransport();

    if (this.producers.video && !this.producers.video.closed) {
      this.producers.video.close();
      this.producers.video = null;
    }

    if (this.localScreenStream && this.localScreenStream !== displayStream) {
      const keepTrackIds = new Set(displayStream.getTracks().map((t) => t.id));
      for (const track of this.localScreenStream.getTracks()) {
        if (keepTrackIds.has(track.id)) continue;
        try {
          track.stop();
        } catch (_) {}
      }
      await this.stopSystemAudio();
    }

    const videoTrack = displayStream.getVideoTracks().find((t) => t.readyState === 'live');
    if (!videoTrack) {
      throw new Error('Pista de video indisponivel - selecione a tela novamente');
    }

    this.localScreenStream = displayStream;

    try {
      applyContentHint(videoTrack, this.videoQuality.contentHint || 'detail');

      const settings = videoTrack.getSettings?.() || {};
      if (settings.width && settings.height) {
        this.onLog(
          `Captura: ${settings.width}?f??"${settings.height} @ ${settings.frameRate || '?'}fps`,
          'info'
        );
      }

      videoTrack.addEventListener('ended', () => {
        window.dispatchEvent(new CustomEvent('sharescreen-ended'));
      });

      const videoOpts = buildVideoProduceOptions(videoTrack, this.device, this.videoQuality);
      videoOpts.track = videoTrack;
      this.producers.video = await this.sendTransport.produce(videoOpts);

      try {
        await this.producers.video.requestKeyFrame();
      } catch (_) {}

      await this.syncPublishedAudio(capturePrefs, displayStream);

      this._producing = true;
      this.onLog('Tela compartilhada com sucesso', 'info');
      return displayStream;
    } catch (err) {
      if (!this.hasVideoProducer()) {
        this.localScreenStream = null;
        this._producing = false;
      }
      throw err;
    }
  }

  async startScreenShare(capturePrefs) {
    await this.stopVideoShare();
    this.setCapturePrefs(capturePrefs);
    await this.ensureSendTransport();

    const displayStream = await this.requestDisplayCapture(capturePrefs);
    return this.publishDisplayStream(displayStream, capturePrefs);
  }

  applyLowLatencyPlayback(consumer) {
    try {
      const receiver = consumer.rtpReceiver;
      if (receiver && 'playoutDelayHint' in receiver) {
        receiver.playoutDelayHint = 0;
      }
    } catch (_) {}
  }

  async stopScreenShare({ notifyServer = true, stopMicrophone = false } = {}) {
    const hadVideo = this.hasVideoProducer();
    await this.stopVideoShare();
    if (stopMicrophone) {
      await this.stopMicrophone();
    }
    try {
      if (
        notifyServer &&
        hadVideo &&
        !this.hasVideoProducer() &&
        !this.hasPublishedAudio() &&
        this.signaling.connected &&
        this.signaling.authenticated
      ) {
        this.signaling.send('pararProducao', {});
      }
    } catch (_) {}
  }

  _ensureAudioPlaybackContext() {
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return;
      if (!this._playbackAudioCtx) {
        this._playbackAudioCtx = new AudioContextCtor({ latencyHint: 'interactive' });
      }
      if (this._playbackAudioCtx.state === 'suspended') {
        this._playbackAudioCtx.resume().catch(() => {});
      }
    } catch (_) {}
  }

  async _resumeRemoteConsumer(consumer) {
    if (!consumer || consumer.closed) return;
    if (consumer.kind === 'audio' || consumer.track?.kind === 'audio') {
      this._ensureAudioPlaybackContext();
    }
    if (!consumer.paused) return;
    try {
      const resumePromise = this.signaling.onceType(
        'consumerRetomado',
        (m) => m.payload?.consumerId === consumer.id
      );
      this.signaling.send('retomarConsumer', { consumerId: consumer.id });
      await Promise.race([
        resumePromise,
        new Promise((resolve) => setTimeout(resolve, 3000))
      ]);
    } catch (_) {}
    try {
      await consumer.resume();
    } catch (_) {}
  }

  async _consumeOne(producerId, mediaEl, kindHint, consumerTag = 'default') {
    const transport = await this.ensureRecvTransport(consumerTag);
    const payload = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout aguardando: consumido (${producerId.slice(0, 8)})`));
      }, 25000);

      const onConsumido = (msg) => {
        if (msg.type !== 'consumido') return;
        if (msg.payload?.producerId !== producerId) return;
        cleanup();
        resolve(msg.payload);
      };

      const onErro = (msg) => {
        if (msg.type !== 'erro') return;
        const payloadProducerId = msg.payload?.producerId;
        if (payloadProducerId) {
          if (payloadProducerId !== producerId) return;
          cleanup();
          reject(new Error(msg.payload?.mensagem || 'Erro ao consumir midia'));
          return;
        }
        const tipo = msg.payload?.tipo;
        if (tipo && tipo !== 'consumir') return;
        const text = String(msg.payload?.mensagem || '').toLowerCase();
        const consumeRelated =
          text.includes('consumir') ||
          text.includes('producer') ||
          text.includes('capacidades') ||
          text.includes('transport');
        if (!consumeRelated) return;
        cleanup();
        reject(new Error(msg.payload?.mensagem || 'Erro ao consumir midia'));
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.signaling.removeListener(onConsumido);
        this.signaling.removeListener(onErro);
      };

      this.signaling.addListener(onConsumido);
      this.signaling.addListener(onErro);

      try {
        // Registra os listeners antes de pedir o consumo para nio perder a
        // resposta do servidor em redes locais muito ripidas.
        this.signaling.send('consumir', {
          producerId,
          rtpCapabilities: this.device.rtpCapabilities,
          consumerTag
        });
      } catch (err) {
        cleanup();
        reject(err);
      }
    });

    const consumer = await transport.consume({
      id: payload.id,
      producerId: payload.producerId,
      kind: payload.kind,
      rtpParameters: payload.rtpParameters
    });

    consumer.on('trackended', () => {
      this.onLog(`Track remota encerrada (${payload.kind})`, 'warn');
    });

    const stream = new MediaStream([consumer.track]);
    consumer.appStream = stream;
    const isAudio = payload.kind === 'audio' || kindHint === 'audio';

    if (mediaEl) {
      mediaEl.srcObject = stream;
      mediaEl.playsInline = true;
      if (isAudio) {
        mediaEl.muted = false;
      } else {
        mediaEl.muted = true;
      }
      try {
        await mediaEl.play();
      } catch (playErr) {
        if (isAudio) {
          const err = new Error('Autoplay bloqueado para ?fiudio');
          err.name = 'NotAllowedError';
          throw err;
        }
        mediaEl.muted = true;
        await mediaEl.play();
      }
    }

    if (this.videoQuality.lowLatency !== false) {
      this.applyLowLatencyPlayback(consumer);
    }
    await this._resumeRemoteConsumer(consumer);
    if (isAudio) {
      this._ensureAudioPlaybackContext();
      if (consumer.track) consumer.track.enabled = true;
    }
    if (!isAudio) {
      try {
        await consumer.requestKeyFrame();
      } catch (_) {}
    }

    return consumer;
  }

  async closeActiveVideoConsumer({ videoEl = null, notifyServer = true } = {}) {
    return this._runVideoMediaOp(async () => {
      const currentVideo = this.remoteConsumers.video;
      if (!currentVideo || currentVideo.closed) {
        this.remoteConsumers.video = null;
        this.currentActiveVideoProducerId = null;
        if (videoEl) videoEl.srcObject = null;
        return;
      }
      const producerId = currentVideo.producerId;
      currentVideo.close();
      if (notifyServer && this.signaling.connected) {
        try {
          this.signaling.send('fecharConsumer', { consumerId: currentVideo.id });
        } catch (_) {}
      }
      this.remoteConsumers.video = null;
      if (producerId) this.videoConsumersByProducerId.delete(producerId);
      this.currentActiveVideoProducerId = null;
      if (videoEl) videoEl.srcObject = null;
    });
  }

  async closeRemoteConsumers() {
    return this._runMediaOp(async () => {
      for (const slot of ['video', 'audio']) {
        const consumer = this.remoteConsumers[slot];
        if (!consumer || consumer.closed) continue;
        if (slot === 'video') {
          if (consumer.producerId) this.videoConsumersByProducerId.delete(consumer.producerId);
          this.currentActiveVideoProducerId = null;
        }
        consumer.close();
        try {
          if (this.signaling.connected) {
            this.signaling.send('fecharConsumer', { consumerId: consumer.id });
          }
        } catch (_) {}
        this.remoteConsumers[slot] = null;
      }
    });
  }

  async closeAuxiliaryAudio(peerId, source = null) {
    return this._runAudioMediaOp(async () => {
      const closeEntry = (key, entry) => {
        if (!entry || entry.consumer.closed) return;
        const { source: entrySource } = parseAudioChannelKey(key);
        audioTrace('consumer fechado', {
          peerId: String(peerId).slice(0, 8),
          source: entrySource,
          consumerId: entry.consumer.id?.slice(0, 8)
        });
        entry.consumer.close();
        try {
          if (this.signaling.connected) {
            this.signaling.send('fecharConsumer', { consumerId: entry.consumer.id });
          }
        } catch (_) {}
      };

      if (source) {
        const channelKey = `${String(peerId)}:${normalizeAudioSource(source, 'microphone')}`;
        const entry = this.auxAudioConsumers.get(channelKey);
        if (!entry) return;
        this.auxAudioConsumers.delete(channelKey);
        closeEntry(channelKey, entry);
        return;
      }
      const prefix = `${String(peerId)}:`;
      for (const [key, entry] of [...this.auxAudioConsumers.entries()]) {
        if (!key.startsWith(prefix)) continue;
        this.auxAudioConsumers.delete(key);
        closeEntry(key, entry);
      }
    });
  }

  async closeAllAuxiliaryAudio() {
    for (const channelKey of [...this.auxAudioConsumers.keys()]) {
      const { peerId, source } = parseAudioChannelKey(channelKey);
      await this.closeAuxiliaryAudio(peerId, source);
    }
  }

  async consumeAuxiliaryAudio(peerId, producerId, source = 'microphone') {
    return this._runAudioMediaOp(async () => {
      const channelKey = `${String(peerId)}:${normalizeAudioSource(source, 'microphone')}`;
      const existing = this.auxAudioConsumers.get(channelKey);
      if (
        existing &&
        !existing.consumer.closed &&
        existing.producerId === producerId
      ) {
        return existing.consumer;
      }
      if (existing) {
        this.auxAudioConsumers.delete(channelKey);
        if (!existing.consumer.closed) {
          existing.consumer.close();
          try {
            if (this.signaling.connected) {
              this.signaling.send('fecharConsumer', {
                consumerId: existing.consumer.id
              });
            }
          } catch (_) {}
        }
      }
      await this.ensureRecvTransport(this._audioRecvTag());
      const consumer = await this._consumeOne(
        producerId,
        null,
        'audio',
        this._audioRecvTag()
      );
      this.auxAudioConsumers.set(channelKey, { consumer, producerId, source });
      audioTrace('consumer criado', {
        peerId: String(peerId).slice(0, 8),
        producerId: String(producerId).slice(0, 8),
        source: normalizeAudioSource(source, 'microphone'),
        consumerId: consumer.id?.slice(0, 8)
      });
      return consumer;
    });
  }

  async consumeRemoteMedia(
    producerIds,
    { videoEl = null, audioEl = null, ownProducerIds = null } = {}
  ) {
    return this._runVideoMediaOp(async () => {
      if (producerIds?.video && videoEl) {
        const ownVideoIds = new Set(
          [ownProducerIds?.video, this.producers.video?.id].filter(Boolean)
        );
        if (ownVideoIds.has(producerIds.video)) {
          this.onLog('Ignorando consumo do proprio producer de video', 'warn');
          return;
        }

        const cached = this.videoConsumersByProducerId.get(producerIds.video);
        const currentVideo = this.remoteConsumers.video;
        if (
          cached &&
          !cached.closed &&
          currentVideo?.id === cached.id &&
          currentVideo.producerId === producerIds.video
        ) {
          if (cached.appStream && videoEl.srcObject !== cached.appStream) {
            videoEl.srcObject = cached.appStream;
            videoEl.muted = true;
            try {
              await videoEl.play();
            } catch (_) {}
          }
          this.currentActiveVideoProducerId = producerIds.video;
          return;
        }

        if (
          currentVideo &&
          !currentVideo.closed &&
          currentVideo.producerId === producerIds.video
        ) {
          if (currentVideo.appStream && videoEl.srcObject !== currentVideo.appStream) {
            videoEl.srcObject = currentVideo.appStream;
            videoEl.muted = true;
            try {
              await videoEl.play();
            } catch (_) {}
          }
          this.currentActiveVideoProducerId = producerIds.video;
          this.videoConsumersByProducerId.set(producerIds.video, currentVideo);
          return;
        }

        await this.ensureRecvTransport(this._videoRecvTag());
        if (currentVideo && !currentVideo.closed) {
          if (currentVideo.producerId) {
            this.videoConsumersByProducerId.delete(currentVideo.producerId);
          }
          currentVideo.close();
          try {
            if (this.signaling.connected) {
              this.signaling.send('fecharConsumer', { consumerId: currentVideo.id });
            }
          } catch (_) {}
          this.remoteConsumers.video = null;
        }
        this.remoteConsumers.video = await this._consumeOne(
          producerIds.video,
          videoEl,
          'video',
          this._videoRecvTag()
        );
        this.videoConsumersByProducerId.set(producerIds.video, this.remoteConsumers.video);
        this.currentActiveVideoProducerId = producerIds.video;
      } else if (!producerIds?.video && this.remoteConsumers.video) {
        await this.closeActiveVideoConsumer({ videoEl, notifyServer: true });
      }

      if (producerIds?.audio && audioEl) {
        const currentAudio = this.remoteConsumers.audio;
        if (
          currentAudio &&
          !currentAudio.closed &&
          currentAudio.producerId === producerIds.audio
        ) {
          if (currentAudio.appStream && audioEl.srcObject !== currentAudio.appStream) {
            audioEl.srcObject = currentAudio.appStream;
            audioEl.muted = false;
            try {
              await audioEl.play();
            } catch (playErr) {
              const err = new Error('Autoplay bloqueado para ?fiudio');
              err.name = 'NotAllowedError';
              throw err;
            }
          }
        } else {
          await this.ensureRecvTransport(this._audioRecvTag());
          if (currentAudio && !currentAudio.closed) {
            currentAudio.close();
            try {
              if (this.signaling.connected) {
                this.signaling.send('fecharConsumer', { consumerId: currentAudio.id });
              }
            } catch (_) {}
            this.remoteConsumers.audio = null;
          }
          this.remoteConsumers.audio = await this._consumeOne(
            producerIds.audio,
            audioEl,
            'audio',
            this._audioRecvTag()
          );
        }
      } else if (!producerIds?.audio && this.remoteConsumers.audio) {
        const currentAudio = this.remoteConsumers.audio;
        if (currentAudio && !currentAudio.closed) {
          currentAudio.close();
          try {
            if (this.signaling.connected) {
              this.signaling.send('fecharConsumer', { consumerId: currentAudio.id });
            }
          } catch (_) {}
        }
        this.remoteConsumers.audio = null;
        if (audioEl) {
          audioEl.srcObject = null;
          audioEl.pause?.();
        }
      }
    });
  }

  detachMedia({ videoEl = null, audioEl = null } = {}) {
    if (videoEl) videoEl.srcObject = null;
    if (audioEl) {
      audioEl.srcObject = null;
      audioEl.pause?.();
    }
    return this.closeRemoteConsumers();
  }

  async setRemoteAudioMuted(muted) {
    const consumer = this.remoteConsumers.audio;
    if (!consumer || consumer.closed) return;
    if (muted) {
      if (!consumer.paused) await consumer.pause();
    } else if (consumer.paused) {
      await consumer.resume();
    }
  }

  isRemoteAudioMuted() {
    const consumer = this.remoteConsumers.audio;
    return !!consumer && !consumer.closed && consumer.paused;
  }

  getRecordableStream({ hostPeerId, selectedPeerId } = {}) {
    const own =
      hostPeerId && selectedPeerId && String(selectedPeerId) === String(hostPeerId);

    if (own && this.localScreenStream) {
      const vt = this.localScreenStream.getVideoTracks()[0];
      if (vt?.readyState === 'live') return this.localScreenStream;
    }

    const tracks = [];
    const rv = this.remoteConsumers.video?.track;
    const audioConsumer = this.remoteConsumers.audio;
    const ra = audioConsumer?.track;
    if (rv?.readyState === 'live') tracks.push(rv);
    if (ra?.readyState === 'live' && audioConsumer && !audioConsumer.paused) tracks.push(ra);
    if (tracks.length) return new MediaStream(tracks);

    if (this.localScreenStream) {
      const vt = this.localScreenStream.getVideoTracks()[0];
      if (vt?.readyState === 'live') return this.localScreenStream;
    }
    return null;
  }

  async consumePreviewVideo(producerId, videoEl, { ownProducerIds = null } = {}) {
    if (!producerId || !videoEl) return null;
    const ownVideoIds = new Set(
      [ownProducerIds?.video, this.producers.video?.id].filter(Boolean)
    );
    if (ownVideoIds.has(producerId)) return null;

    return this._runVideoMediaOp(async () => {
      const cached = this.previewVideoConsumers.get(producerId);
      if (cached && !cached.closed) {
        if (cached.appStream && videoEl.srcObject !== cached.appStream) {
          videoEl.srcObject = cached.appStream;
          videoEl.muted = true;
          try {
            await videoEl.play();
          } catch (_) {}
        }
        return cached;
      }

      await this.ensureRecvTransport(this._previewRecvTag());
      const consumer = await this._consumeOne(
        producerId,
        videoEl,
        'video',
        this._previewRecvTag()
      );
      this.previewVideoConsumers.set(producerId, consumer);
      return consumer;
    });
  }

  async closePreviewConsumers() {
    return this._runVideoMediaOp(async () => {
      for (const [producerId, consumer] of [...this.previewVideoConsumers.entries()]) {
        if (consumer && !consumer.closed) {
          consumer.close();
          try {
            if (this.signaling.connected) {
              this.signaling.send('fecharConsumer', { consumerId: consumer.id });
            }
          } catch (_) {}
        }
        this.previewVideoConsumers.delete(producerId);
      }
    });
  }

  async publishSyntheticVideoStream(displayStream) {
    if (!displayStream) throw new Error('Nenhum stream sintetico fornecido');

    const videoTrack = displayStream.getVideoTracks().find((t) => t.readyState === 'live');
    if (!videoTrack) {
      throw new Error('Pista de video sintetica indisponivel');
    }

    await this.ensureSendTransport();
    this._syntheticStream = displayStream;
    this._isSyntheticVideo = true;

    if (this.producers.video && !this.producers.video.closed) {
      if (typeof this.producers.video.replaceTrack === 'function') {
        await this.producers.video.replaceTrack({ track: videoTrack });
        try {
          await this.producers.video.requestKeyFrame();
        } catch (_) {}
        this._producing = true;
        return this.producers.video;
      }
      this.producers.video.close();
      this.producers.video = null;
    }

    try {
      applyContentHint(videoTrack, this.videoQuality.contentHint || 'detail');
      const videoOpts = buildVideoProduceOptions(videoTrack, this.device, this.videoQuality);
      videoOpts.track = videoTrack;
      this.producers.video = await this.sendTransport.produce(videoOpts);
      try {
        await this.producers.video.requestKeyFrame();
      } catch (_) {}
      this._producing = true;
      this.onLog('Producer de video sintetico publicado', 'info');
      return this.producers.video;
    } catch (err) {
      this._isSyntheticVideo = false;
      this._syntheticStream = null;
      throw err;
    }
  }

  async restoreScreenVideoProducer() {
    const videoTrack = this.localScreenStream?.getVideoTracks?.()?.find((t) => t.readyState === 'live');
    if (!videoTrack) return false;

    await this.ensureSendTransport();

    if (this.producers.video && !this.producers.video.closed) {
      if (typeof this.producers.video.replaceTrack === 'function') {
        await this.producers.video.replaceTrack({ track: videoTrack });
        try {
          await this.producers.video.requestKeyFrame();
        } catch (_) {}
        this._producing = true;
        return true;
      }
      this.producers.video.close();
      this.producers.video = null;
    }

    try {
      applyContentHint(videoTrack, this.videoQuality.contentHint || 'detail');
      const videoOpts = buildVideoProduceOptions(videoTrack, this.device, this.videoQuality);
      videoOpts.track = videoTrack;
      this.producers.video = await this.sendTransport.produce(videoOpts);
      try {
        await this.producers.video.requestKeyFrame();
      } catch (_) {}
      this._producing = true;
      this.onLog('Producer de video restaurado a partir da captura de tela', 'info');
      return true;
    } catch (_) {
      return false;
    }
  }

  async stopSyntheticVideo({ notifyServer = false } = {}) {
    if (!this._isSyntheticVideo) return;
    this._isSyntheticVideo = false;
    if (this._syntheticStream) {
      for (const track of this._syntheticStream.getTracks()) {
        try {
          track.stop();
        } catch (_) {}
      }
      this._syntheticStream = null;
    }

    const restored = await this.restoreScreenVideoProducer();
    if (!restored && this.producers.video && !this.producers.video.closed) {
      this.producers.video.close();
      this.producers.video = null;
    }

    this._producing = this.hasVideoProducer();
    if (
      notifyServer &&
      !this.hasVideoProducer() &&
      !this.hasPublishedAudio() &&
      this.signaling.connected &&
      this.signaling.authenticated
    ) {
      try {
        this.signaling.send('pararProducao', {});
      } catch (_) {}
    }
  }

  isSyntheticVideoActive() {
    return !!this._isSyntheticVideo;
  }

  getStatsTargets() {
    const targets = [];
    for (const slot of ['video', 'audio']) {
      const c = this.remoteConsumers[slot];
      if (c && !c.closed) targets.push({ kind: slot, consumer: c });
    }
    if (this.producers.video && !this.producers.video.closed) {
      targets.push({ kind: 'video', producer: this.producers.video });
    }
    for (const source of ['microphone', 'system', 'mixed']) {
      const p = this.producers[source];
      if (p && !p.closed) targets.push({ kind: 'audio', producer: p, source });
    }
    return targets;
  }

  async _closeAllAudioProducers({ stopMicTrack = false } = {}) {
    for (const source of ['microphone', 'system', 'mixed']) {
      await this._closeAudioProducerBySource(source, {
        stopMicTrack: stopMicTrack && source === 'microphone'
      });
    }
  }

  async detachProducers({ notifyServer = false, keepMicTrack = false } = {}) {
    if (this.producers.video && !this.producers.video.closed) {
      this.producers.video.close();
      this.producers.video = null;
    }
    await this.stopSystemAudio();
    if (!keepMicTrack) {
      await this.stopMicrophone();
    }
    this._producing = false;
    if (notifyServer && this.signaling.connected && this.signaling.authenticated) {
      try {
        this.signaling.send('pararProducao', {});
      } catch (_) {}
    }
  }

  async dispose({ notifyServer = false, keepLocalScreenStream = false, keepMicTrack = false } = {}) {
    if (keepLocalScreenStream) {
      await this.detachProducers({ notifyServer, keepMicTrack });
    } else {
      await this.stopScreenShare({ notifyServer, stopMicrophone: !keepMicTrack });
    }
    await this.closeRemoteConsumers();
    await this.closePreviewConsumers();
    await this.stopSyntheticVideo();
    await this.closeAllAuxiliaryAudio();
    this.sendTransport?.close();
    for (const transport of this.recvTransports.values()) {
      transport?.close();
    }
    this.recvTransports.clear();
    this.sendTransport = null;
    this.recvTransport = null;
  }
}
