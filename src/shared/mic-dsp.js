/** Filtros DSP de microfone compartilhados (publicação WebRTC e monitor local). */

import {
  createNearFieldGateLoop,
  normalizeNearFieldGate
} from './near-field-analyzer.js';

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
  micCaptureDistance: 6,
  speechGate: 'off',
  noiseSuppressionMl: false,
  nearFieldGate: 'off',
  nearFieldThreshold: 0.5
};

export const SHARED_ROOM_MIC_PRESET = {
  gain: 1.1,
  bass: 0,
  treble: 0,
  highpass: false,
  highpassFreq: 80,
  peaking: false,
  peakingFreq: 3000,
  peakingGain: 2,
  compressor: true,
  noiseGate: false,
  noiseGateThreshold: -45,
  micSensitivity: false,
  micCaptureDistance: 6,
  speechGate: 'soft',
  noiseSuppressionMl: true,
  nearFieldGate: 'soft',
  nearFieldThreshold: 0.5
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
  micCaptureDistance: 6,
  speechGate: 'off',
  noiseSuppressionMl: false,
  nearFieldGate: 'off',
  nearFieldThreshold: 0.5
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
  micCaptureDistance: 6,
  speechGate: 'off',
  noiseSuppressionMl: false,
  nearFieldGate: 'off',
  nearFieldThreshold: 0.5
};

const SPEECH_GATE_MODES = new Set(['off', 'soft', 'hard']);

let audioMlModulePromise = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeSpeechGate(value) {
  const mode = String(value || 'off').toLowerCase();
  return SPEECH_GATE_MODES.has(mode) ? mode : 'off';
}

function needsAdvancedAudioProcessing(prefs) {
  const p = normalizeMicrophoneFilterPrefs(prefs);
  return p.speechGate !== 'off' || p.noiseSuppressionMl;
}

async function loadAudioMlModule() {
  if (!audioMlModulePromise) {
    audioMlModulePromise = import('/shared/audio-ml.bundle.js').catch((err) => {
      audioMlModulePromise = null;
      console.warn('[mic-dsp] Modulo audio ML indisponivel:', err);
      throw err;
    });
  }
  return audioMlModulePromise;
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
    micCaptureDistance: clamp(Number(merged.micCaptureDistance ?? 6), 1, 10),
    speechGate: normalizeSpeechGate(merged.speechGate),
    noiseSuppressionMl: !!merged.noiseSuppressionMl,
    nearFieldGate: normalizeNearFieldGate(merged.nearFieldGate),
    nearFieldThreshold: clamp(Number(merged.nearFieldThreshold ?? 0.5), 0.35, 0.75)
  };
}

/** Indica se algum portão (VAD, proximidade ou RMS) pode zerar o sinal publicado. */
export function hasActiveMicrophoneGate(prefs) {
  const p = normalizeMicrophoneFilterPrefs(prefs);
  return (
    p.speechGate !== 'off' ||
    p.nearFieldGate !== 'off' ||
    p.noiseGate ||
    p.micSensitivity
  );
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
    p.micSensitivity ||
    p.speechGate !== 'off' ||
    p.noiseSuppressionMl ||
    p.nearFieldGate !== 'off'
  );
}

/** Resolve o preset de publicação do host: API → cache local → ganho legado → defaults. */
export function resolveHostMicFilterPrefs({
  apiPrefs = null,
  cachedPrefs = null,
  legacyGain = null,
  defaults = HOST_MIC_PUBLISH_DEFAULTS
} = {}) {
  if (apiPrefs && typeof apiPrefs === 'object') {
    return normalizeMicrophoneFilterPrefs(apiPrefs);
  }
  if (cachedPrefs && typeof cachedPrefs === 'object') {
    return normalizeMicrophoneFilterPrefs(cachedPrefs);
  }
  const gain = Number(legacyGain);
  if (Number.isFinite(gain)) {
    return normalizeMicrophoneFilterPrefs({ ...defaults, gain });
  }
  return normalizeMicrophoneFilterPrefs(defaults);
}

export function closeMicrophoneFilterGraph(graph) {
  if (!graph) return;
  if (graph.rafId) cancelAnimationFrame(graph.rafId);
  try {
    graph.nearFieldStop?.();
  } catch (_) {}
  try {
    graph.vadController?.destroy?.();
  } catch (_) {}
  for (const node of graph.nodes || []) {
    try { node.disconnect?.(); } catch (_) {}
  }
  for (const track of graph.outputTracks || []) {
    try { track.stop(); } catch (_) {}
  }
  try { graph.ctx?.close?.(); } catch (_) {}
}

export function micGraphIsRunning(graph) {
  return graph?.ctx?.state === 'running';
}

export async function resumeMicrophoneFilterGraph(graph) {
  const ctx = graph?.ctx;
  if (!ctx || ctx.state === 'closed') return false;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (_) {}
  }
  return ctx.state === 'running';
}

async function finalizeMicrophoneFilterGraph(inputTrack, graph) {
  const running = await resumeMicrophoneFilterGraph(graph);
  if (running) {
    return { track: graph.outputTracks?.[0] || inputTrack, graph };
  }
  closeMicrophoneFilterGraph(graph);
  return { track: inputTrack, graph: null, degraded: 'ctx-suspended' };
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

function startLegacyRmsGateLoop(graph, normalized, analyserNode, gateGainNode, gainNode, ctx) {
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

function applySpeechGateGain(gateGainNode, ctx, mode, speaking) {
  const softLevel = 0.16;
  const target = speaking ? 1 : mode === 'soft' ? softLevel : 0;
  const timeConstant = speaking ? 0.02 : mode === 'soft' ? 0.08 : 0.045;
  gateGainNode.gain.setTargetAtTime(target, ctx.currentTime, timeConstant);
}

function wirePublishGates(graph, normalized, {
  gateGainNode,
  gainNode,
  ctx,
  nearFieldAnalyser,
  rmsAnalyser,
  inputStream,
  audioMl = null
}) {
  const nearFieldActive = normalized.nearFieldGate !== 'off';
  const speechGateActive = normalized.speechGate !== 'off';
  const legacyGateActive =
    !nearFieldActive && !speechGateActive && (normalized.noiseGate || normalized.micSensitivity);

  const speechState = { speaking: true };

  if (nearFieldActive) {
    graph.nearFieldStop = createNearFieldGateLoop({
      graph,
      analyserNode: nearFieldAnalyser,
      gateGainNode,
      gainNode,
      ctx,
      mode: normalized.nearFieldGate,
      threshold: normalized.nearFieldThreshold,
      outputGain: normalized.gain,
      speechState: speechGateActive ? speechState : null,
      speechGateMode: speechGateActive ? normalized.speechGate : 'off'
    });
  }

  if (speechGateActive && audioMl) {
    if (nearFieldActive) {
      graph.vadController = null;
      audioMl
        .createSpeechVadController({
          stream: inputStream,
          hangoverMs: normalized.speechGate === 'soft' ? 420 : 300,
          onSpeechChange: (isSpeaking) => {
            speechState.speaking = isSpeaking;
          }
        })
        .then((controller) => {
          graph.vadController = controller;
          if (!controller) {
            speechState.speaking = true;
            console.warn('[mic-dsp] VAD indisponivel, gate aberto');
          }
        })
        .catch((err) => {
          speechState.speaking = true;
          console.warn('[mic-dsp] VAD indisponivel, gate aberto:', err);
        });
    } else {
      applySpeechGateGain(gateGainNode, ctx, normalized.speechGate, true);
      audioMl
        .createSpeechVadController({
          stream: inputStream,
          hangoverMs: normalized.speechGate === 'soft' ? 420 : 300,
          onSpeechChange: (isSpeaking) => {
            applySpeechGateGain(gateGainNode, ctx, normalized.speechGate, isSpeaking);
          }
        })
        .then((controller) => {
          graph.vadController = controller;
          if (!controller) {
            console.warn('[mic-dsp] VAD indisponivel, gate aberto');
            gateGainNode.gain.value = 1;
          }
        })
        .catch((err) => {
          console.warn('[mic-dsp] VAD indisponivel, gate aberto:', err);
          gateGainNode.gain.value = 1;
        });
    }
  } else if (legacyGateActive && rmsAnalyser) {
    startLegacyRmsGateLoop(graph, normalized, rmsAnalyser, gateGainNode, gainNode, ctx);
  } else if (!nearFieldActive && gainNode) {
    gainNode.gain.value = normalized.gain;
  }
}

async function createLegacyMicrophoneFilterGraph(inputTrack, normalized) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return { track: inputTrack, graph: null };

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
  const nearFieldAnalyser = ctx.createAnalyser();
  const rmsAnalyser = ctx.createAnalyser();
  const outputAnalyser = ctx.createAnalyser();
  const dest = ctx.createMediaStreamDestination();
  const nearFieldActive = normalized.nearFieldGate !== 'off';

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
  nearFieldAnalyser.fftSize = 2048;
  nearFieldAnalyser.smoothingTimeConstant = 0.45;
  rmsAnalyser.fftSize = 512;
  rmsAnalyser.smoothingTimeConstant = 0.55;
  outputAnalyser.fftSize = 512;
  outputAnalyser.smoothingTimeConstant = 0.55;

  sourceNode.connect(highpassNode);
  highpassNode.connect(bassNode);
  bassNode.connect(trebleNode);
  trebleNode.connect(peakingNode);
  if (nearFieldActive) {
    peakingNode.connect(nearFieldAnalyser);
    nearFieldAnalyser.connect(compressorNode);
    compressorNode.connect(gateGainNode);
  } else {
    peakingNode.connect(compressorNode);
    compressorNode.connect(rmsAnalyser);
    compressorNode.connect(gateGainNode);
  }
  gateGainNode.connect(gainNode);
  gainNode.connect(dest);
  gainNode.connect(outputAnalyser);

  const graph = {
    ctx,
    nodes: [
      sourceNode,
      highpassNode,
      bassNode,
      trebleNode,
      peakingNode,
      nearFieldAnalyser,
      compressorNode,
      rmsAnalyser,
      gateGainNode,
      gainNode,
      outputAnalyser
    ],
    outputTracks: dest.stream.getAudioTracks(),
    rafId: null,
    vadController: null,
    nearFieldStop: null,
    meterAnalyser: nearFieldActive ? nearFieldAnalyser : rmsAnalyser,
    outputAnalyser,
    gateGainNode,
    gateActive: hasActiveMicrophoneGate(normalized)
  };

  wirePublishGates(graph, normalized, {
    gateGainNode,
    gainNode,
    ctx,
    nearFieldAnalyser,
    rmsAnalyser: nearFieldActive ? null : rmsAnalyser,
    inputStream,
    audioMl: null
  });

  return finalizeMicrophoneFilterGraph(inputTrack, graph);
}

async function createAdvancedMicrophoneFilterGraph(inputTrack, normalized) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return { track: inputTrack, graph: null };

  const audioMl = await loadAudioMlModule();
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
  const nearFieldAnalyser = ctx.createAnalyser();
  const rmsAnalyser = ctx.createAnalyser();
  const outputAnalyser = ctx.createAnalyser();
  const dest = ctx.createMediaStreamDestination();
  const nearFieldActive = normalized.nearFieldGate !== 'off';
  const nodes = [
    sourceNode,
    highpassNode,
    bassNode,
    trebleNode,
    peakingNode,
    nearFieldAnalyser,
    compressorNode,
    rmsAnalyser,
    gateGainNode,
    gainNode,
    outputAnalyser
  ];

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
  nearFieldAnalyser.fftSize = 2048;
  nearFieldAnalyser.smoothingTimeConstant = 0.45;
  rmsAnalyser.fftSize = 512;
  rmsAnalyser.smoothingTimeConstant = 0.55;
  outputAnalyser.fftSize = 512;
  outputAnalyser.smoothingTimeConstant = 0.55;

  if (normalized.noiseSuppressionMl) {
    const rnnoiseNode = await audioMl.createRnnoiseNode(ctx, sourceNode, highpassNode);
    if (rnnoiseNode) {
      nodes.push(rnnoiseNode);
    } else {
      sourceNode.connect(highpassNode);
    }
  } else {
    sourceNode.connect(highpassNode);
  }

  highpassNode.connect(bassNode);
  bassNode.connect(trebleNode);
  trebleNode.connect(peakingNode);
  if (nearFieldActive) {
    peakingNode.connect(nearFieldAnalyser);
    nearFieldAnalyser.connect(compressorNode);
    compressorNode.connect(gateGainNode);
  } else {
    peakingNode.connect(compressorNode);
    compressorNode.connect(rmsAnalyser);
    compressorNode.connect(gateGainNode);
  }
  gateGainNode.connect(gainNode);
  gainNode.connect(dest);
  gainNode.connect(outputAnalyser);

  const graph = {
    ctx,
    nodes,
    outputTracks: dest.stream.getAudioTracks(),
    rafId: null,
    vadController: null,
    nearFieldStop: null,
    meterAnalyser: nearFieldActive ? nearFieldAnalyser : rmsAnalyser,
    outputAnalyser,
    gateGainNode,
    gateActive: hasActiveMicrophoneGate(normalized)
  };

  wirePublishGates(graph, normalized, {
    gateGainNode,
    gainNode,
    ctx,
    nearFieldAnalyser,
    rmsAnalyser: nearFieldActive ? null : rmsAnalyser,
    inputStream,
    audioMl
  });

  return finalizeMicrophoneFilterGraph(inputTrack, graph);
}

export async function createMicrophoneFilterGraph(inputTrack, prefs) {
  const normalized = normalizeMicrophoneFilterPrefs(prefs);
  if (!inputTrack || inputTrack.readyState !== 'live' || !hasActiveMicrophoneFilter(normalized)) {
    return { track: inputTrack, graph: null };
  }

  try {
    if (needsAdvancedAudioProcessing(normalized)) {
      return await createAdvancedMicrophoneFilterGraph(inputTrack, normalized);
    }
    return await createLegacyMicrophoneFilterGraph(inputTrack, normalized);
  } catch (err) {
    console.warn('[mic-dsp] Filtro avancado indisponivel, usando legado:', err);
    try {
      const fallbackPrefs = {
        ...normalized,
        speechGate: 'off',
        noiseSuppressionMl: false,
        nearFieldGate: 'off'
      };
      return await createLegacyMicrophoneFilterGraph(inputTrack, fallbackPrefs);
    } catch (fallbackErr) {
      console.warn('[mic-dsp] Filtro de microfone indisponivel:', fallbackErr);
      return { track: inputTrack, graph: null };
    }
  }
}
