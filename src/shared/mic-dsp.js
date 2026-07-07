/** Filtros DSP de microfone compartilhados (publicação WebRTC e monitor local). */

export const MIC_FILTER_DEFAULTS = {
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
  micSensitivity: false,
  micCaptureDistance: 6
};

export function microphoneFilterPrefsSignature(prefs) {
  return JSON.stringify(normalizeMicrophoneFilterPrefs(prefs || {}));
}

export const HOST_MIC_PUBLISH_DEFAULTS = {
  gain: 1.2,
  bass: 0,
  treble: 0,
  highpass: false,
  highpassFreq: 80,
  peaking: true,
  peakingFreq: 3000,
  peakingGain: 2,
  compressor: true,
  noiseGate: false,
  noiseGateThreshold: -45,
  micSensitivity: false,
  micCaptureDistance: 6
};

export const CLIENT_MIC_PUBLISH_DEFAULTS = {
  gain: 1.15,
  bass: 0,
  treble: 0,
  highpass: false,
  highpassFreq: 80,
  peaking: false,
  peakingFreq: 3000,
  peakingGain: 3,
  compressor: true,
  noiseGate: false,
  noiseGateThreshold: -45,
  micSensitivity: false,
  micCaptureDistance: 6
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeMicrophoneFilterPrefs(prefs = {}) {
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
    micSensitivity: !!merged.micSensitivity,
    micCaptureDistance: clamp(Number(merged.micCaptureDistance ?? 6), 1, 10)
  };
}

export function hasActiveMicrophoneFilter(prefs) {
  const p = normalizeMicrophoneFilterPrefs(prefs);
  return (
    Math.abs(p.gain - 1) > 0.01 ||
    Math.abs(p.bass) > 0.01 ||
    Math.abs(p.treble) > 0.01 ||
    p.highpass ||
    p.peaking ||
    p.compressor ||
    p.noiseGate ||
    p.micSensitivity
  );
}

export function closeMicrophoneFilterGraph(graph) {
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

/** Limiar de abertura do portão de proximidade (1 = só fala próxima, 10 = ambiente amplo). */
export function proximityGateThresholdDb(prefs) {
  const normalized = normalizeMicrophoneFilterPrefs(prefs);
  const distance = normalized.micCaptureDistance;
  return clamp(-18 - (10 - distance) * 4, -60, -18);
}

function noiseGateThresholdDb(prefs) {
  const normalized = normalizeMicrophoneFilterPrefs(prefs);
  const distanceShift = (6 - normalized.micCaptureDistance) * 3;
  return clamp(normalized.noiseGateThreshold + distanceShift, -70, -18);
}

/** Limiar combinado quando noise gate e/ou sensibilidade estão ativos (mais restritivo vence). */
export function combinedGateOpenThresholdDb(prefs) {
  const normalized = normalizeMicrophoneFilterPrefs(prefs);
  const thresholds = [];
  if (normalized.micSensitivity) {
    thresholds.push(proximityGateThresholdDb(normalized));
  }
  if (normalized.noiseGate) {
    thresholds.push(noiseGateThresholdDb(normalized));
  }
  if (!thresholds.length) return -100;
  return Math.max(...thresholds);
}

export function createMicrophoneFilterGraph(inputTrack, prefs) {
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

    const gateActive = normalized.noiseGate || normalized.micSensitivity;
    if (gateActive) {
      const data = new Uint8Array(analyserNode.fftSize);
      let gateOpen = true;
      let lastOpenAt = performance.now();
      const holdMs = 180;
      const tick = () => {
        const openDb = combinedGateOpenThresholdDb(normalized);
        const closeDb = openDb - 8;
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
    console.warn('[mic-dsp] Filtro de microfone indisponivel:', err);
    return { track: inputTrack, graph: null };
  }
}
