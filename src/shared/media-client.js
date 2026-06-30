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
import { buildIceServers, buildTransportIceOptions, hasTurnServers } from './ice-servers.js';
const MIC_FILTER_DEFAULTS = {
  gain: 1,
  bass: 0,
  treble: 0,
  highpass: false,
  highpassFreq: 80,
  peaking: false,
  peakingFreq: 3000,
  peakingGain: 3,
  compressor: false,
  noiseGate: false,
  noiseGateThreshold: -45,
  micCaptureDistance: 6
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeMicrophoneFilterPrefs(prefs = {}) {
  const merged = { ...MIC_FILTER_DEFAULTS, ...(prefs || {}) };
  return {
    gain: clamp(Number(merged.gain ?? 1), 0, 3),
    bass: clamp(Number(merged.bass ?? 0), -12, 12),
    treble: clamp(Number(merged.treble ?? 0), -12, 12),
    highpass: !!merged.highpass,
    highpassFreq: clamp(Number(merged.highpassFreq ?? 80), 50, 300),
    peaking: !!merged.peaking,
    peakingFreq: clamp(Number(merged.peakingFreq ?? 3000), 1000, 5000),
    peakingGain: clamp(Number(merged.peakingGain ?? 3), 0, 12),
    compressor: !!merged.compressor,
    noiseGate: !!merged.noiseGate,
    noiseGateThreshold: clamp(Number(merged.noiseGateThreshold ?? -45), -70, -20),
    micCaptureDistance: clamp(Number(merged.micCaptureDistance ?? 6), 1, 10)
  };
}

function hasActiveMicrophoneFilter(prefs) {
  const p = normalizeMicrophoneFilterPrefs(prefs);
  return (
    Math.abs(p.gain - 1) > 0.01 ||
    Math.abs(p.bass) > 0.01 ||
    Math.abs(p.treble) > 0.01 ||
    p.highpass ||
    p.peaking ||
    p.compressor ||
    p.noiseGate
  );
}

function closeMicrophoneFilterGraph(graph) {
  if (!graph) return;
  if (graph.rafId) cancelAnimationFrame(graph.rafId);
  for (const node of graph.nodes || []) {
    try { node.disconnect?.(); } catch (_) {}
  }
  for (const track of graph.outputTracks || []) {
    try { track.stop(); } catch (_) {}
  }
  try { graph.ctx?.close?.(); } catch (_) {}
}

function gateThresholdDb(prefs) {
  const distanceShift = (6 - prefs.micCaptureDistance) * 3;
  return clamp(prefs.noiseGateThreshold + distanceShift, -70, -18);
}

function createMicrophoneFilterGraph(inputTrack, prefs) {
  const normalized = normalizeMicrophoneFilterPrefs(prefs);
  if (!inputTrack || inputTrack.readyState !== 'live' || !hasActiveMicrophoneFilter(normalized)) {
    return { track: inputTrack, graph: null };
  }

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return { track: inputTrack, graph: null };

  try {
  const ctx = new AudioContextCtor({ latencyHint: 'interactive' });
  const inputStream = new MediaStream([inputTrack]);
  const sourceNode = ctx.createMediaStreamSource(inputStream);
  const highpassNode = ctx.createBiquadFilter();
  const bassNode = ctx.createBiquadFilter();
  const trebleNode = ctx.createBiquadFilter();
  const peakingNode = ctx.createBiquadFilter();
  const compressorNode = ctx.createDynamicsCompressor();
  const gateGainNode = ctx.createGain();
  const gainNode = ctx.createGain();
  const analyserNode = ctx.createAnalyser();
  const dest = ctx.createMediaStreamDestination();

  highpassNode.type = 'highpass';
  highpassNode.frequency.value = normalized.highpass ? normalized.highpassFreq : 20;
  bassNode.type = 'lowshelf';
  bassNode.frequency.value = 150;
  bassNode.gain.value = normalized.bass;
  trebleNode.type = 'highshelf';
  trebleNode.frequency.value = 4000;
  trebleNode.gain.value = normalized.treble;
  peakingNode.type = 'peaking';
  peakingNode.frequency.value = normalized.peakingFreq;
  peakingNode.Q.value = 1.2;
  peakingNode.gain.value = normalized.peaking ? normalized.peakingGain : 0;
  compressorNode.threshold.value = normalized.compressor ? -26 : 0;
  compressorNode.knee.value = normalized.compressor ? 24 : 0;
  compressorNode.ratio.value = normalized.compressor ? 5 : 1;
  compressorNode.attack.value = 0.004;
  compressorNode.release.value = 0.16;
  gateGainNode.gain.value = 1;
  gainNode.gain.value = normalized.gain;
  analyserNode.fftSize = 512;
  analyserNode.smoothingTimeConstant = 0.55;

  sourceNode.connect(highpassNode);
  highpassNode.connect(bassNode);
  bassNode.connect(trebleNode);
  trebleNode.connect(peakingNode);
  peakingNode.connect(compressorNode);
  compressorNode.connect(analyserNode);
  compressorNode.connect(gateGainNode);
  gateGainNode.connect(gainNode);
  gainNode.connect(dest);

  const graph = {
    ctx,
    nodes: [sourceNode, highpassNode, bassNode, trebleNode, peakingNode, compressorNode, analyserNode, gateGainNode, gainNode],
    outputTracks: dest.stream.getAudioTracks(),
    rafId: null
  };

  if (normalized.noiseGate) {
    const data = new Uint8Array(analyserNode.fftSize);
    let gateOpen = true;
    let lastOpenAt = performance.now();
    const openDb = gateThresholdDb(normalized);
    const closeDb = openDb - 8;
    const holdMs = 180;
    const tick = () => {
      analyserNode.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const n = (data[i] - 128) / 128;
        sum += n * n;
      }
      const rms = Math.sqrt(sum / data.length) || 0.000001;
      const db = 20 * Math.log10(rms);
      const now = performance.now();
      if (db >= openDb) {
        gateOpen = true;
        lastOpenAt = now;
        gateGainNode.gain.setTargetAtTime(1, ctx.currentTime, 0.015);
      } else if (gateOpen && db < closeDb && now - lastOpenAt > holdMs) {
        gateOpen = false;
        gateGainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.045);
      }
      gainNode.gain.setTargetAtTime(normalized.gain, ctx.currentTime, 0.02);
      graph.rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return { track: graph.outputTracks[0] || inputTrack, graph };
  } catch (err) {
    console.warn('[MediaClient] Filtro de microfone indisponivel, publicando audio original:', err);
    return { track: inputTrack, graph: null };
  }
}

/**
 * Sess?fio mediasoup: transports, produce, consume, cleanup e baixa lat?fincia.
 */
export class MediaClient {
  constructor(signaling, { onLog, onIceState, splitRecvTransports = false, forceTurnRelay = false } = {}) {
    this.signaling = signaling;
    this.onLog = onLog || (() => {});
    this.onIceState = onIceState || (() => {});
    this.splitRecvTransports = splitRecvTransports;
    this.forceTurnRelay = forceTurnRelay;
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.recvTransports = new Map();
    this._creatingTransports = new Map();
    this.producers = { video: null, microphone: null, system: null, mixed: null };
    this.remoteConsumers = { video: null, audio: null };
    this.videoConsumersByProducerId = new Map();
    this.currentActiveVideoProducerId = null;
    this.auxAudioConsumers = new Map();
    this.consumeGeneration = 0;
    this.localScreenStream = null;
    this._micTrack = null;
    this._micFilterPrefs = normalizeMicrophoneFilterPrefs();
    this._micFilterGraph = null;
    this.localMicTracks = [];
    this.videoQuality = {};
    this.capturePrefs = { systemAudio: true, microphone: false };
    this._producing = false;
    this._publishedMicMuted = false;
    this._mediaOps = Promise.resolve();
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
    if (track) track.enabled = !muted;
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
    Object.assign(
      transportOptions,
      buildTransportIceOptions(this.videoQuality, {
        forceRelay: this.forceTurnRelay && direction === 'recv'
      })
    );

    const transport =
      direction === 'send'
        ? this.device.createSendTransport(transportOptions)
        : this.device.createRecvTransport(transportOptions);

    if (hasTurnServers(this.videoQuality) && direction === 'recv') {
      this.onLog(
        this.forceTurnRelay
          ? 'Espectador externo: midia via TURN (443)'
          : 'TURN disponivel — fallback se conexao direta falhar',
        'info'
      );
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
        if (hasTurnServers(this.videoQuality) && this.forceTurnRelay) {
          msg += ' — verifique TURN (eturnal TURNS:443) e reinicie start-producao.bat';
        } else {
          const ice =
            transport.iceCandidates?.map((c) => c.ip).filter(Boolean).join(', ') ||
            this.videoQuality?.serverHost ||
            '?';
          const ports = this.videoQuality?.rtcPortRange || '40000-40100';
          msg += ` — verifique firewall UDP ${ports} em ${ice}`;
        }
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
    }
    if (key === 'microphone' && stopMicTrack) {
      if (this._micTrack) {
        try {
          this._micTrack.stop();
        } catch (_) {}
        this._micTrack = null;
      }
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
      existing.track?.readyState === 'live'
    ) {
      return true;
    }

    if (existing && !existing.closed) {
      if (key === 'microphone' && typeof existing.replaceTrack === 'function') {
        await existing.replaceTrack({ track: audioTrack });
        if (key === 'microphone' && this._publishedMicMuted) audioTrack.enabled = false;
        return true;
      }
      existing.close();
      this.producers[key] = null;
    }

    const audioOpts = buildAudioProduceOptions(this.device, this.videoQuality);
    audioOpts.track = audioTrack;
    this.producers[key] = await this.sendTransport.produce({
      ...audioOpts,
      appData: { source: key }
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

  async publishMicrophone(capturePrefs) {
    this.setCapturePrefs(capturePrefs);
    if (!capturePrefs?.microphone) {
      return this.stopMicrophone();
    }

    let track = capturePrefs.prefetchedMicTrack || this._micTrack || null;
    if (!track || track.readyState !== 'live') {
      track = await acquireMicrophoneTrack(
        capturePrefs.microphoneDeviceId || '',
        this.onLog
      );
    }

    this._micTrack = track;
    if (!this.localMicTracks.includes(track)) {
      this.localMicTracks.push(track);
    }

    const prepared = createMicrophoneFilterGraph(track, this._micFilterPrefs);
    const previousGraph = this._micFilterGraph;
    const ok = await this._publishAudioTrack(prepared.track, 'microphone');
    if (ok) {
      this._micFilterGraph = prepared.graph;
      closeMicrophoneFilterGraph(previousGraph);
      this.onLog(prepared.graph ? 'Microfone publicado com filtros' : 'Microfone publicado', 'info');
    } else {
      closeMicrophoneFilterGraph(prepared.graph);
      throw new Error('Falha ao publicar microfone no servidor');
    }
    return ok;
  }

  async setMicrophoneFilterPrefs(prefs) {
    this._micFilterPrefs = normalizeMicrophoneFilterPrefs(prefs || {});
    if (this.capturePrefs?.microphone && this._micTrack?.readyState === 'live') {
      return this.publishMicrophone({ ...this.capturePrefs, microphone: true });
    }
    return true;
  }

  async stopMicrophone() {
    await this._closeAudioProducerBySource('microphone', { stopMicTrack: true });
    this.onLog('Microfone encerrado', 'info');
    return false;
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

  /** Sincroniza microfone e ?fiudio do sistema conforme prefs (sem mixar). */
  async syncPublishedAudio(capturePrefs, displayStream = null) {
    this.setCapturePrefs(capturePrefs);
    let micOk = true;
    let sysOk = true;

    if (capturePrefs.microphone) {
      micOk = await this.publishMicrophone(capturePrefs);
    } else if (this.hasPublishedMicrophone()) {
      await this.stopMicrophone();
    }

    const screenStream = displayStream ?? this.localScreenStream ?? null;
    if (screenStream && capturePrefs.systemAudio !== false) {
      sysOk = await this.publishSystemAudioFromDisplay(screenStream);
    } else if (this.hasPublishedSystemAudio()) {
      await this.stopSystemAudio();
    }

    return micOk || sysOk;
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

    this.setCapturePrefs(capturePrefs);
    await this.ensureSendTransport();

    if (this.producers.video && !this.producers.video.closed) {
      this.producers.video.close();
      this.producers.video = null;
    }

    if (this.localScreenStream && this.localScreenStream !== displayStream) {
      for (const track of this.localScreenStream.getTracks()) {
        try {
          track.stop();
        } catch (_) {}
      }
      await this.stopSystemAudio();
    }

    const videoTrack = displayStream.getVideoTracks()[0];
    if (!videoTrack || videoTrack.readyState !== 'live') {
      throw new Error('Pista de v?fideo indispon?fivel i?,???? selecione a tela novamente');
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

      if (capturePrefs.systemAudio !== false) {
        await this.publishSystemAudioFromDisplay(displayStream);
      } else {
        await this.stopSystemAudio();
      }

      if (capturePrefs.microphone) {
        await this.publishMicrophone(capturePrefs);
      }

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

  async _resumeRemoteConsumer(consumer) {
    if (!consumer || consumer.closed) return;
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
        const text = String(msg.payload?.mensagem || '').toLowerCase();
        const consumeRelated =
          text.includes('consumir') ||
          text.includes('producer') ||
          text.includes('capacidades') ||
          text.includes('transport');
        if (!consumeRelated) return;
        cleanup();
        reject(new Error(msg.payload?.mensagem || 'Erro ao consumir m?fidia'));
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
    return this._runMediaOp(async () => {
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
    return this._runMediaOp(async () => {
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
    return this._runMediaOp(async () => {
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
    return this._runMediaOp(async () => {
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
