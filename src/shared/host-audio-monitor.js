/**
 * Áudio remoto: reprodução direta no <audio> + VU por track (MediaStreamTrackProcessor).
 */

import { startTrackLevelMeter } from './audio-level-meter.js';
import {
  audioChannelKey,
  audioTrace,
  normalizeRemoteAudioSources
} from './audio-sources.js';
import {
  MIC_FILTER_DEFAULTS,
  hasActiveMicrophoneFilter,
  normalizeMicrophoneFilterPrefs
} from './mic-dsp.js';

function loadPresetFromLocalStorage(name) {
  try {
    const raw = localStorage.getItem('sharescreen_audio_presets');
    if (!raw) return null;
    const presets = JSON.parse(raw);
    return presets[name] || null;
  } catch {
    return null;
  }
}

export function savePresetToLocalStorage(name, prefs) {
  try {
    const raw = localStorage.getItem('sharescreen_audio_presets') || '{}';
    const presets = JSON.parse(raw);
    presets[name] = prefs;
    localStorage.setItem('sharescreen_audio_presets', JSON.stringify(presets));
  } catch {}
}

function waitForPlayingTrack(track, timeoutMs = 8000) {
  if (!track) return Promise.resolve(null);
  const ready = () => track.readyState === 'live';
  if (ready()) return Promise.resolve(track);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      if (track.readyState === 'live') resolve(track);
      else reject(new Error('track não ficou live'));
    }, timeoutMs);

    const tryResolve = () => {
      if (ready()) {
        cleanup();
        resolve(track);
      }
    };

    const cleanup = () => {
      clearTimeout(timer);
      track.removeEventListener('unmute', tryResolve);
      track.removeEventListener('ended', onEnded);
    };

    const onEnded = () => {
      cleanup();
      reject(new Error('track encerrada'));
    };

    track.addEventListener('unmute', tryResolve);
    track.addEventListener('ended', onEnded);
    tryResolve();
  });
}

export class HostAudioMonitor {
  constructor(media, options = {}) {
    this.media = media;
    this.opts = options;
    this.excludePeerId = options.excludePeerId ? String(options.excludePeerId) : null;
    this.channels = new Map();
    this.outputEl = null;
    this.masterVolume = 1;
    this.onLevels = null;
    this._outputStream = null;
    this._levelsRaf = null;
    this._mutedPeerIds = new Set();
    this._autoplayBlocked = false;
    this.ctx = null;
    this.dest = null;
    this.filterPrefs = new Map();
    this.stream = new MediaStream();
    this.peerNames = new Map();
  }

  _log(event, data = {}) {
    audioTrace(event, data);
    this.opts.onLog?.(event, data);
  }

  setManualMuted(mutedPeerIds) {
    this._mutedPeerIds = new Set(
      [...(mutedPeerIds || [])].map((id) => String(id))
    );
    for (const ch of this.channels.values()) {
      const track = ch.consumer?.track;
      if (track) {
        const silenced = this._isChannelMuted(ch.peerId);
        track.enabled = !silenced;
      }
      this._applyChannelFilters(ch);
    }
    this._refreshDirectOutput();
  }

  _isChannelMuted(peerId) {
    const key = String(peerId);
    return this._mutedPeerIds.has(key);
  }

  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.outputEl) this.outputEl.volume = this.masterVolume;
  }

  get channelCount() {
    return this.channels.size;
  }

  connectOutput(audioEl) {
    this.outputEl = audioEl;
    if (audioEl && audioEl.srcObject !== this.stream) {
      audioEl.srcObject = this.stream;
    }
    this._refreshDirectOutput();
  }

  async resume() {
    await this._refreshDirectOutput();
    await this._tryPlayOutput();
  }

  async _tryPlayOutput() {
    const el = this.outputEl;
    if (!el || !this.channels.size) return;
    try {
      await el.play();
      if (this._autoplayBlocked) {
        this._autoplayBlocked = false;
      }
    } catch (err) {
      if (err?.name === 'NotAllowedError' || /autoplay/i.test(String(err?.message || ''))) {
        this._autoplayBlocked = true;
        this._log('autoplay bloqueado', { channels: this.channels.size });
        this.opts.onAutoplayBlocked?.(err);
      }
    }
  }

  getOutputTrack() {
    for (const ch of this.channels.values()) {
      const track = ch.consumer?.track;
      if (track?.readyState === 'live') return track;
    }
    return null;
  }

  getMixedOutputTrack() {
    this._ensureAudioContext();
    this._refreshDirectOutput();
    const track = this.dest?.stream?.getAudioTracks?.()[0];
    return track?.readyState === 'live' ? track : null;
  }
  _startLevelsLoop() {
    if (this._levelsRaf) return;
    const tick = () => {
      const levels = new Map();
      for (const ch of this.channels.values()) {
        if (ch.analyserNode) {
          const fftSize = ch.analyserNode.fftSize;
          const timeBuf = new Uint8Array(fftSize);
          ch.analyserNode.getByteTimeDomainData(timeBuf);

          let sum = 0;
          for (let i = 0; i < fftSize; i++) {
            const n = (timeBuf[i] - 128) / 128;
            sum += n * n;
          }
          const raw = Math.min(1, Math.sqrt(sum / fftSize) * 5.5);
          const smoothing = 0.68;
          ch.rawLevel = raw;
          ch.smoothedLevel = (ch.smoothedLevel || 0) * smoothing + raw * (1 - smoothing);
        }

        levels.set(ch.peerId, {
          level: ch.smoothedLevel || 0,
          active: (ch.rawLevel || 0) > 0.015 || (ch.smoothedLevel || 0) > 0.02,
          speaking: (ch.rawLevel || 0) > 0.04 || (ch.smoothedLevel || 0) > 0.05
        });
      }
      if (levels.size) this.onLevels?.(levels);
      this._levelsRaf = requestAnimationFrame(tick);
    };
    tick();
  }

  _stopLevelsLoop() {
    if (!this._levelsRaf) return;
    cancelAnimationFrame(this._levelsRaf);
    this._levelsRaf = null;
  }

  _startChannelMeter(ch) {
    ch.stopMeter?.();
    const track = ch.consumer?.track;
    if (!track) return;

    ch.stopMeter = startTrackLevelMeter(track, {
      onLevel: (smoothed, raw) => {
        ch.smoothedLevel = smoothed;
        ch.rawLevel = raw;
      }
    });
  }

  _ensureAudioContext() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.dest = this.ctx.createMediaStreamDestination();
    } catch (e) {
      console.error('[HostAudioMonitor] Falha ao criar AudioContext:', e);
    }
  }

  _refreshDirectOutput() {
    const el = this.outputEl;
    if (!el) return;

    const tracksToPlay = [];
    const directTracks = [];
    let hasDsp = false;

    for (const ch of this.channels.values()) {
      const track = ch.consumer?.track;
      if (!track || track.readyState !== 'live') continue;

      if (this._hasAnyFilter(ch.peerId)) {
        hasDsp = true;
        this._setupChannelDsp(ch, track);
      } else {
        directTracks.push(track);
      }
    }

    if (hasDsp) {
      this._ensureAudioContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (this.dest && this.ctx?.state !== 'suspended') {
        const dspTracks = this.dest.stream.getAudioTracks();
        if (dspTracks.length > 0) {
          tracksToPlay.push(dspTracks[0]);
        }
      }
    }

    if (!tracksToPlay.length) {
      tracksToPlay.push(...directTracks);
    }
    if (el.srcObject !== this.stream) {
      el.srcObject = this.stream;
    }

    const currentTracks = this.stream.getAudioTracks();

    // Remove old tracks
    for (const t of currentTracks) {
      if (!tracksToPlay.some(p => p.id === t.id)) {
        this.stream.removeTrack(t);
      }
    }

    // Add new tracks
    for (const t of tracksToPlay) {
      if (!currentTracks.some(p => p.id === t.id)) {
        this.stream.addTrack(t);
      }
    }

    el.muted = false;
    el.volume = this.masterVolume;
    this._tryPlayOutput();
  }

  _hasAnyFilter(peerId) {
    return hasActiveMicrophoneFilter(this.getFilterPrefs(peerId));
  }

  _clearChannelDsp(ch) {
    if (ch.gateInterval) {
      clearInterval(ch.gateInterval);
      ch.gateInterval = null;
    }
    if (ch.sourceNode) {
      try {
        ch.sourceNode.disconnect();
      } catch (_) {}
      ch.sourceNode = null;
    }
    if (ch.highpassNode) {
      try { ch.highpassNode.disconnect(); } catch (_) {}
      ch.highpassNode = null;
    }
    if (ch.bassNode) {
      try { ch.bassNode.disconnect(); } catch (_) {}
      ch.bassNode = null;
    }
    if (ch.trebleNode) {
      try { ch.trebleNode.disconnect(); } catch (_) {}
      ch.trebleNode = null;
    }
    if (ch.peakingNode) {
      try { ch.peakingNode.disconnect(); } catch (_) {}
      ch.peakingNode = null;
    }
    if (ch.compressorNode) {
      try { ch.compressorNode.disconnect(); } catch (_) {}
      ch.compressorNode = null;
    }
    if (ch.gainNode) {
      try { ch.gainNode.disconnect(); } catch (_) {}
      ch.gainNode = null;
    }
    if (ch.analyserNode) {
      try { ch.analyserNode.disconnect(); } catch (_) {}
      ch.analyserNode = null;
    }
    if (ch.dummyEl) {
      try {
        ch.dummyEl.srcObject = null;
        ch.dummyEl.remove();
      } catch (_) {}
      ch.dummyEl = null;
    }
    ch.stream = null;
  }

  getFilterPrefs(peerId) {
    const key = String(peerId);
    if (!this.filterPrefs.has(key)) {
      const name = this.peerNames.get(key) || '';
      let saved = null;
      if (name) {
        saved = loadPresetFromLocalStorage(name);
      }
      this.filterPrefs.set(key, saved || { ...MIC_FILTER_DEFAULTS });
    }
    return this.filterPrefs.get(key);
  }

  setFilterPrefs(peerId, prefs) {
    const key = String(peerId);
    this.filterPrefs.set(key, { ...this.getFilterPrefs(key), ...prefs });
    for (const ch of this.channels.values()) {
      if (ch.peerId === key) {
        this._applyChannelFilters(ch);
      }
    }
    this._refreshDirectOutput();
  }

  _setupChannelDsp(ch, track) {
    if (ch.sourceNode) return; // Evita dupla configuração

    this._ensureAudioContext();
    if (!this.ctx || !this.dest) return;

    try {
      const stream = new MediaStream([track]);
      ch.stream = stream; // Armazena a referência contra GC
      ch.sourceNode = this.ctx.createMediaStreamSource(stream);

      // Elemento dummy mutado para forçar a decodificação da track WebRTC no Chrome
      const dummyEl = document.createElement('audio');
      dummyEl.muted = true;
      dummyEl.srcObject = stream;
      dummyEl.play().catch(() => {});
      ch.dummyEl = dummyEl;

      ch.highpassNode = this.ctx.createBiquadFilter();
      ch.highpassNode.type = 'highpass';
      ch.highpassNode.frequency.value = 80;

      ch.bassNode = this.ctx.createBiquadFilter();
      ch.bassNode.type = 'lowshelf';
      ch.bassNode.frequency.value = 150;
      ch.bassNode.gain.value = 0;

      ch.trebleNode = this.ctx.createBiquadFilter();
      ch.trebleNode.type = 'highshelf';
      ch.trebleNode.frequency.value = 4000;
      ch.trebleNode.gain.value = 0;

      ch.peakingNode = this.ctx.createBiquadFilter();
      ch.peakingNode.type = 'peaking';
      ch.peakingNode.frequency.value = 3000;
      ch.peakingNode.Q.value = 1.2;
      ch.peakingNode.gain.value = 3;

      ch.compressorNode = this.ctx.createDynamicsCompressor();
      ch.compressorNode.threshold.value = -24;
      ch.compressorNode.knee.value = 30;
      ch.compressorNode.ratio.value = 4;
      ch.compressorNode.attack.value = 0.003;
      ch.compressorNode.release.value = 0.25;

      ch.gainNode = this.ctx.createGain();
      ch.gainNode.gain.value = 1.0;

      ch.analyserNode = this.ctx.createAnalyser();
      ch.analyserNode.fftSize = 256;

      ch.sourceNode.connect(ch.highpassNode);
      ch.highpassNode.connect(ch.bassNode);
      ch.bassNode.connect(ch.trebleNode);
      ch.trebleNode.connect(ch.peakingNode);
      ch.peakingNode.connect(ch.compressorNode);
      ch.compressorNode.connect(ch.gainNode);
      ch.gainNode.connect(ch.analyserNode);
      ch.gainNode.connect(this.dest);

      this._applyChannelFilters(ch);
      this._startNoiseGateLoop(ch);
    } catch (err) {
      console.warn('[HostAudioMonitor] Erro ao configurar DSP do canal:', err);
    }
  }

  _applyChannelFilters(ch) {
    if (!this.ctx) return;
    const prefs = this.getFilterPrefs(ch.peerId);

    if (ch.gainNode) {
      if (this._isChannelMuted(ch.peerId)) {
        ch.gainNode.gain.value = 0;
      } else {
        ch.gainNode.gain.value = prefs.gain !== undefined ? prefs.gain : 1.0;
      }
    }

    if (ch.bassNode) {
      ch.bassNode.gain.value = prefs.bass !== undefined ? prefs.bass : 0;
    }

    if (ch.trebleNode) {
      ch.trebleNode.gain.value = prefs.treble !== undefined ? prefs.treble : 0;
    }

    if (ch.highpassNode) {
      if (prefs.highpass) {
        ch.highpassNode.frequency.value = prefs.highpassFreq || 80;
      } else {
        ch.highpassNode.frequency.value = 10;
      }
    }

    if (ch.peakingNode) {
      if (prefs.peaking) {
        ch.peakingNode.frequency.value = prefs.peakingFreq || 3000;
        ch.peakingNode.gain.value = prefs.peakingGain !== undefined ? prefs.peakingGain : 3;
      } else {
        ch.peakingNode.gain.value = 0;
      }
    }

    if (ch.compressorNode) {
      if (prefs.compressor) {
        ch.compressorNode.threshold.value = -24;
        ch.compressorNode.ratio.value = 4;
      } else {
        ch.compressorNode.threshold.value = 0;
        ch.compressorNode.ratio.value = 1;
      }
    }
  }

  _startNoiseGateLoop(ch) {
    if (ch.gateInterval) clearInterval(ch.gateInterval);
    let isOpen = true;
    let lastOpenAt = performance.now();
    ch.gateInterval = setInterval(() => {
      if (!ch.gainNode || !this.ctx) return;

      const isMuted = this._isChannelMuted(ch.peerId);
      if (isMuted) {
        ch.gainNode.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.01);
        isOpen = false;
        return;
      }

      const prefs = this.getFilterPrefs(ch.peerId);
      const targetGain = prefs.gain !== undefined ? prefs.gain : 1.0;

      if (!prefs.noiseGate) {
        if (!isOpen) isOpen = true;
        ch.gainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
        return;
      }

      const distance = Math.max(1, Math.min(10, Number(prefs.micCaptureDistance || 6)));
      const baseDb = prefs.noiseGateThreshold !== undefined ? Number(prefs.noiseGateThreshold) : -45;
      const openDb = Math.max(-70, Math.min(-18, baseDb + (6 - distance) * 3));
      const closeDb = openDb - 8;
      const currentLevel = Math.max(ch.rawLevel || 0, 0.000001);
      const currentDb = 20 * Math.log10(currentLevel);
      const now = performance.now();

      if (currentDb >= openDb) {
        isOpen = true;
        lastOpenAt = now;
        ch.gainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.02);
      } else if (isOpen && currentDb < closeDb && now - lastOpenAt > 180) {
        isOpen = false;
        ch.gainNode.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.05);
      }
    }, 35);
  }
  async syncFromSources(sources) {
    if (!this.media) return;

    for (const s of sources || []) {
      if (s.peerId && s.name) {
        this.peerNames.set(String(s.peerId), s.name);
      }
    }

    const list = normalizeRemoteAudioSources(sources, {
      excludePeerId: this.excludePeerId
    });

    const wanted = new Map();
    for (const entry of list) {
      const channelKey = audioChannelKey(entry.peerId, entry.source);
      wanted.set(channelKey, entry);
    }

    for (const channelKey of [...this.channels.keys()]) {
      if (!wanted.has(channelKey)) await this._removeChannel(channelKey);
    }

    for (const [channelKey, entry] of wanted) {
      const ch = this.channels.get(channelKey);
      if (
        ch &&
        ch.producerId === entry.producerId &&
        ch.consumer &&
        !ch.consumer.closed
      ) {
        continue;
      }
      await this._addChannel(channelKey, entry.peerId, entry.producerId, entry.source);
    }

    if (this.channels.size) this._startLevelsLoop();
    else this._stopLevelsLoop();

    this._refreshDirectOutput();
    await this._tryPlayOutput();
  }

  async syncClients(clients, { excludePeerId = null } = {}) {
    const sources = [];
    for (const c of clients || []) {
      if (excludePeerId && String(c.id) === String(excludePeerId)) continue;
      const ids = c.producerIds || {};
      if (ids.microphone) {
        sources.push({ peerId: c.id, producerId: ids.microphone, source: 'microphone' });
      }
      if (ids.system) {
        sources.push({ peerId: c.id, producerId: ids.system, source: 'system' });
      }
      if (ids.mixed) {
        sources.push({ peerId: c.id, producerId: ids.mixed, source: 'mixed' });
      } else if (ids.audio && !ids.microphone && !ids.system) {
        sources.push({ peerId: c.id, producerId: ids.audio, source: 'microphone' });
      }
    }
    return this.syncFromSources(sources);
  }

  async _addChannel(channelKey, peerId, producerId, source = 'microphone', attempt = 0) {
    const existing = this.channels.get(channelKey);
    if (
      existing &&
      existing.producerId === producerId &&
      existing.consumer &&
      !existing.consumer.closed
    ) {
      return;
    }

    if (existing) await this._removeChannel(channelKey);

    try {
      const consumer = await this.media.consumeAuxiliaryAudio(peerId, producerId, source);
      let track = consumer.track;
      if (!track) return;

      this._log('consumer criado', {
        peerId: String(peerId).slice(0, 8),
        producerId: String(producerId).slice(0, 8),
        source
      });

      track.enabled = true;
      await this.media._resumeRemoteConsumer?.(consumer);
      if (consumer.paused) await consumer.resume();

      const onProducerClosed = () => {
        this._log('producer fechado', {
          peerId: String(peerId).slice(0, 8),
          producerId: String(producerId).slice(0, 8),
          source
        });
        this._removeChannel(channelKey).catch(() => {});
      };
      consumer.on('producerclose', onProducerClosed);
      consumer.on('transportclose', onProducerClosed);

      try {
        track = await waitForPlayingTrack(track);
      } catch (err) {
        console.warn('[HostAudioMonitor] aguardando track', channelKey, err?.message || err);
      }

      const ch = {
        peerId: String(peerId),
        channelKey,
        source,
        producerId,
        consumer,
        smoothedLevel: 0,
        rawLevel: 0,
        stopMeter: null,
        sourceNode: null,
        highpassNode: null,
        peakingNode: null,
        compressorNode: null,
        gainNode: null,
        gateInterval: null,
        _onProducerClosed: onProducerClosed
      };
      this.channels.set(channelKey, ch);

      const wireMeter = () => this._startChannelMeter(ch);
      wireMeter();
      track.addEventListener('unmute', wireMeter, { once: false });
      track.addEventListener('ended', () => {
        ch.stopMeter?.();
        this._removeChannel(channelKey).catch(() => {});
      }, { once: true });

      this._refreshDirectOutput();
    } catch (err) {
      const maxAttempts = 5;
      if (attempt < maxAttempts - 1) {
        const delayMs = 400 * (2 ** attempt);
        await new Promise((r) => setTimeout(r, delayMs));
        return this._addChannel(channelKey, peerId, producerId, source, attempt + 1);
      }
      console.warn('[HostAudioMonitor] falha ao consumir áudio', channelKey, err?.message || err);
      this.opts.onConsumeError?.(channelKey, err);
    }
  }

  async removeByConsumerId(consumerId) {
    if (!consumerId) return;
    for (const [channelKey, ch] of this.channels.entries()) {
      if (ch.consumer?.id === consumerId) {
        await this._removeChannel(channelKey);
        return;
      }
    }
  }

  isAutoplayBlocked() {
    return !!this._autoplayBlocked;
  }

  async _removeChannel(channelKey) {
    const ch = this.channels.get(channelKey);
    if (!ch) return;
    ch.stopMeter?.();
    this._clearChannelDsp(ch);

    if (ch.consumer && ch._onProducerClosed) {
      try {
        ch.consumer.off('producerclose', ch._onProducerClosed);
        ch.consumer.off('transportclose', ch._onProducerClosed);
      } catch (_) {}
    }

    if (ch.consumer && !ch.consumer.closed) {
      this._log('consumer fechado', {
        peerId: ch.peerId?.slice(0, 8),
        producerId: ch.producerId?.slice(0, 8),
        source: ch.source
      });
    }

    await this.media?.closeAuxiliaryAudio(ch.peerId, ch.source);
    this.channels.delete(channelKey);

    for (const t of [...this.stream.getAudioTracks()]) {
      if (t.readyState !== 'live') this.stream.removeTrack(t);
    }
    this._refreshDirectOutput();
  }

  async dispose() {
    this._stopLevelsLoop();
    for (const channelKey of [...this.channels.keys()]) {
      await this._removeChannel(channelKey);
    }
    if (this.outputEl) this.outputEl.srcObject = null;
    this.outputEl = null;
    this._outputStream = null;
    if (this.ctx) {
      await this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.dest = null;
    for (const t of this.stream.getTracks()) {
      this.stream.removeTrack(t);
    }
  }
}
