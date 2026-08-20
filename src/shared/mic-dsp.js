/** Filtros DSP de microfone compartilhados (publicação WebRTC e monitor local). */

import {
  computeNearFieldMetrics,
  combineNearFieldScore,
  normalizeNearFieldGate
} from './near-field-analyzer.js';

export const MIC_FILTER_DEFAULTS = {
  volume: 0,
  bass: 0,
  treble: 0,
  highpass: true,
  highpassFreq: 85,
  presence: false,
  presenceFreq: 3000,
  presenceGain: 3,
  compressor: 'light',
  limiter: true,
  noiseReduction: 'medium',
  gateMode: 'auto',
  gateThreshold: -45,
  roomIsolation: 'off',
  roomIsolationStrength: 0.5,
  humFilter: 'off',
  clickSuppression: 'medium'
};

export const SHARED_ROOM_MIC_PRESET = {
  volume: 0.8,
  bass: 0,
  treble: 0,
  highpass: true,
  highpassFreq: 90,
  presence: false,
  presenceFreq: 3000,
  presenceGain: 2,
  compressor: 'light',
  limiter: true,
  noiseReduction: 'medium',
  gateMode: 'auto',
  gateThreshold: -45,
  roomIsolation: 'soft',
  roomIsolationStrength: 0.5,
  humFilter: 'off',
  clickSuppression: 'medium'
};

export const HOST_MIC_PUBLISH_DEFAULTS = {
  volume: 1.6,
  bass: 0,
  treble: 0,
  highpass: true,
  highpassFreq: 85,
  presence: true,
  presenceFreq: 3000,
  presenceGain: 2,
  compressor: 'light',
  limiter: true,
  noiseReduction: 'medium',
  gateMode: 'auto',
  gateThreshold: -45,
  roomIsolation: 'off',
  roomIsolationStrength: 0.5,
  humFilter: 'off',
  clickSuppression: 'medium'
};

export const CLIENT_MIC_PUBLISH_DEFAULTS = {
  volume: 1.2,
  bass: 0,
  treble: 0,
  highpass: true,
  highpassFreq: 85,
  presence: false,
  presenceFreq: 3000,
  presenceGain: 3,
  compressor: 'light',
  limiter: true,
  noiseReduction: 'medium',
  gateMode: 'auto',
  gateThreshold: -45,
  roomIsolation: 'off',
  roomIsolationStrength: 0.5,
  humFilter: 'off',
  clickSuppression: 'medium'
};

export const MIC_FILTER_PRESETS = {
  clean: {
    label: 'Voz limpa',
    prefs: {
      ...MIC_FILTER_DEFAULTS,
      noiseReduction: 'medium',
      gateMode: 'auto',
      highpass: true,
      compressor: 'light',
      limiter: true,
      clickSuppression: 'medium'
    }
  },
  shared: {
    label: 'Sala compartilhada',
    prefs: { ...SHARED_ROOM_MIC_PRESET }
  },
  noisy: {
    label: 'Ambiente ruidoso',
    prefs: {
      ...MIC_FILTER_DEFAULTS,
      noiseReduction: 'high',
      gateMode: 'auto',
      highpass: true,
      highpassFreq: 100,
      humFilter: '60',
      compressor: 'medium',
      limiter: true,
      roomIsolation: 'soft',
      roomIsolationStrength: 0.55,
      clickSuppression: 'high'
    }
  },
  bypass: {
    label: 'Sem processamento',
    prefs: {
      volume: 0,
      bass: 0,
      treble: 0,
      highpass: false,
      highpassFreq: 85,
      presence: false,
      presenceFreq: 3000,
      presenceGain: 3,
      compressor: 'off',
      limiter: false,
      noiseReduction: 'off',
      gateMode: 'off',
      gateThreshold: -45,
      roomIsolation: 'off',
      roomIsolationStrength: 0.5,
      humFilter: 'off',
      clickSuppression: 'off'
    }
  }
};

const NOISE_REDUCTION_MODES = new Set(['off', 'low', 'medium', 'high']);
const GATE_MODES = new Set(['off', 'auto', 'manual']);
const ROOM_ISOLATION_MODES = new Set(['off', 'soft', 'strict']);
const COMPRESSOR_MODES = new Set(['off', 'light', 'medium', 'strong']);
const HUM_FILTER_MODES = new Set(['off', '50', '60']);
const CLICK_SUPPRESSION_MODES = new Set(['off', 'low', 'medium', 'high']);
const VOICE_GATE_WORKLET_URL = '/shared/worklets/voice-gate-processor.js';
const VOICE_GATE_PROCESSOR_NAME = 'VoiceGateProcessor';
const CLICK_GUARD_WORKLET_URL = '/shared/worklets/click-guard-processor.js';
const CLICK_GUARD_PROCESSOR_NAME = 'ClickGuardProcessor';
const TARGET_SAMPLE_RATE = 48000;

let audioMlModulePromise = null;
let voiceGateWorkletPromise = null;
let clickGuardWorkletPromise = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function volumeDbToGain(volumeDb) {
  const db = clamp(Number(volumeDb) || 0, -40, 9.5);
  return Math.pow(10, db / 20);
}

export function gainToVolumeDb(gain) {
  const g = Math.max(1e-4, Number(gain) || 1);
  return clamp(20 * Math.log10(g), -40, 9.5);
}

function normalizeNoiseReduction(value) {
  const mode = String(value || 'off').toLowerCase();
  return NOISE_REDUCTION_MODES.has(mode) ? mode : 'off';
}

function normalizeGateMode(value) {
  const mode = String(value || 'off').toLowerCase();
  return GATE_MODES.has(mode) ? mode : 'off';
}

function normalizeRoomIsolation(value) {
  const mode = String(value || 'off').toLowerCase();
  return ROOM_ISOLATION_MODES.has(mode) ? mode : 'off';
}

function normalizeCompressor(value) {
  if (value === true) return 'light';
  if (value === false || value == null) return 'off';
  const mode = String(value).toLowerCase();
  return COMPRESSOR_MODES.has(mode) ? mode : 'off';
}

function normalizeHumFilter(value) {
  if (value === true) return '60';
  if (value === false || value == null || value === 'off') return 'off';
  const mode = String(value);
  return HUM_FILTER_MODES.has(mode) ? mode : 'off';
}

function normalizeClickSuppression(value) {
  const mode = String(value ?? 'medium').toLowerCase();
  return CLICK_SUPPRESSION_MODES.has(mode) ? mode : 'medium';
}

/**
 * Migra prefs legadas (gain, peaking*, noiseGate*, speechGate, nearField*, etc.)
 * para o modelo canônico e devolve objeto normalizado.
 */
export function migrateLegacyMicrophoneFilterPrefs(prefs = {}) {
  const raw = prefs && typeof prefs === 'object' ? { ...prefs } : {};

  if (raw.volume === undefined && raw.gain !== undefined) {
    raw.volume = gainToVolumeDb(raw.gain);
  }

  if (raw.presence === undefined && raw.peaking !== undefined) {
    raw.presence = !!raw.peaking;
  }
  if (raw.presenceFreq === undefined && raw.peakingFreq !== undefined) {
    raw.presenceFreq = raw.peakingFreq;
  }
  if (raw.presenceGain === undefined && raw.peakingGain !== undefined) {
    raw.presenceGain = raw.peakingGain;
  }

  if (raw.noiseReduction === undefined) {
    const hasLegacyNrKey =
      'noiseSuppressionMl' in raw ||
      'speechGate' in raw ||
      'noiseGate' in raw ||
      'micSensitivity' in raw;
    if (raw.noiseSuppressionMl) {
      raw.noiseReduction = raw.speechGate && raw.speechGate !== 'off' ? 'medium' : 'low';
      if (raw.noiseGate || raw.micSensitivity) raw.noiseReduction = 'high';
    } else if (raw.speechGate && raw.speechGate !== 'off') {
      raw.noiseReduction = 'low';
    } else if (raw.noiseGate || raw.micSensitivity) {
      raw.noiseReduction = 'low';
    } else if (hasLegacyNrKey) {
      raw.noiseReduction = 'off';
    }
  }

  if (raw.gateMode === undefined) {
    const hasLegacyGateKey =
      'noiseGate' in raw || 'micSensitivity' in raw || 'speechGate' in raw || 'noiseReduction' in raw;
    if (raw.noiseGate || raw.micSensitivity || (raw.speechGate && raw.speechGate !== 'off')) {
      raw.gateMode = raw.noiseGate ? 'manual' : 'auto';
    } else if (raw.noiseReduction && raw.noiseReduction !== 'off') {
      raw.gateMode = 'auto';
    } else if (hasLegacyGateKey) {
      raw.gateMode = 'off';
    }
  }

  if (raw.gateThreshold === undefined && raw.noiseGateThreshold !== undefined) {
    raw.gateThreshold = raw.noiseGateThreshold;
  }

  if (raw.roomIsolation === undefined) {
    if (raw.nearFieldGate && raw.nearFieldGate !== 'off') {
      raw.roomIsolation = raw.nearFieldGate === 'strict' ? 'strict' : 'soft';
    } else if ('nearFieldGate' in raw) {
      raw.roomIsolation = 'off';
    }
  }

  if (raw.roomIsolationStrength === undefined) {
    if (raw.nearFieldThreshold !== undefined) {
      raw.roomIsolationStrength = raw.nearFieldThreshold;
    } else if (raw.micCaptureDistance !== undefined) {
      // 1 = só próxima → strength alta; 10 = amplo → strength baixa
      raw.roomIsolationStrength = clamp(0.35 + ((10 - Number(raw.micCaptureDistance)) / 9) * 0.4, 0.35, 0.75);
    }
  }

  if (raw.compressor === true) raw.compressor = 'light';
  if (raw.compressor === false) raw.compressor = 'off';

  if (raw.limiter === undefined) {
    const hasDynHint =
      raw.noiseReduction !== undefined ||
      raw.compressor !== undefined ||
      'noiseSuppressionMl' in raw ||
      'noiseGate' in raw;
    if (hasDynHint) {
      raw.limiter =
        (raw.noiseReduction && raw.noiseReduction !== 'off') ||
        (raw.compressor && raw.compressor !== 'off');
    }
  }

  return raw;
}

export function normalizeMicrophoneFilterPrefs(prefs = {}) {
  const merged = {
    ...MIC_FILTER_DEFAULTS,
    ...migrateLegacyMicrophoneFilterPrefs(prefs)
  };

  const volume = clamp(Number(merged.volume ?? 0), -40, 9.5);
  const noiseReduction = normalizeNoiseReduction(merged.noiseReduction);
  const gateMode = normalizeGateMode(merged.gateMode);
  const roomIsolation = normalizeRoomIsolation(merged.roomIsolation);
  const compressor = normalizeCompressor(merged.compressor);
  const humFilter = normalizeHumFilter(merged.humFilter);
  const clickSuppression = normalizeClickSuppression(merged.clickSuppression);

  const normalized = {
    volume,
    bass: clamp(Number(merged.bass ?? 0), -12, 12),
    treble: clamp(Number(merged.treble ?? 0), -12, 12),
    highpass: !!merged.highpass,
    highpassFreq: clamp(Number(merged.highpassFreq ?? 85), 50, 300),
    presence: !!merged.presence,
    presenceFreq: clamp(Number(merged.presenceFreq ?? 3000), 1000, 5000),
    presenceGain: clamp(Number(merged.presenceGain ?? 3), 0, 12),
    compressor,
    limiter: !!merged.limiter,
    noiseReduction,
    gateMode,
    gateThreshold: clamp(Number(merged.gateThreshold ?? -45), -70, -20),
    roomIsolation,
    roomIsolationStrength: clamp(Number(merged.roomIsolationStrength ?? 0.5), 0.35, 0.75),
    humFilter,
    clickSuppression,
    // Compatibilidade com código que ainda lê o modelo legado
    gain: volumeDbToGain(volume),
    peaking: !!merged.presence,
    peakingFreq: clamp(Number(merged.presenceFreq ?? 3000), 1000, 5000),
    peakingGain: clamp(Number(merged.presenceGain ?? 3), 0, 12),
    noiseSuppressionMl: noiseReduction !== 'off',
    speechGate: gateMode !== 'off' && noiseReduction !== 'off' ? 'soft' : 'off',
    noiseGate: gateMode === 'manual',
    noiseGateThreshold: clamp(Number(merged.gateThreshold ?? -45), -70, -20),
    micSensitivity: false,
    micCaptureDistance: 6,
    nearFieldGate: roomIsolation === 'off' ? 'off' : roomIsolation,
    nearFieldThreshold: clamp(Number(merged.roomIsolationStrength ?? 0.5), 0.35, 0.75)
  };

  return normalized;
}

export function microphoneFilterPrefsSignature(prefs) {
  const p = normalizeMicrophoneFilterPrefs(prefs || {});
  const canonical = {
    volume: p.volume,
    bass: p.bass,
    treble: p.treble,
    highpass: p.highpass,
    highpassFreq: p.highpassFreq,
    presence: p.presence,
    presenceFreq: p.presenceFreq,
    presenceGain: p.presenceGain,
    compressor: p.compressor,
    limiter: p.limiter,
    noiseReduction: p.noiseReduction,
    gateMode: p.gateMode,
    gateThreshold: p.gateThreshold,
    roomIsolation: p.roomIsolation,
    roomIsolationStrength: p.roomIsolationStrength,
    humFilter: p.humFilter,
    clickSuppression: p.clickSuppression
  };
  return JSON.stringify(canonical);
}

export function hasActiveMicrophoneGate(prefs) {
  const p = normalizeMicrophoneFilterPrefs(prefs);
  return p.gateMode !== 'off' || p.roomIsolation !== 'off' || p.noiseReduction !== 'off';
}

export function hasActiveMicrophoneFilter(prefs) {
  const p = normalizeMicrophoneFilterPrefs(prefs);
  return (
    Math.abs(p.volume) > 0.05 ||
    Math.abs(p.bass) > 0.01 ||
    Math.abs(p.treble) > 0.01 ||
    p.highpass ||
    p.presence ||
    p.compressor !== 'off' ||
    p.limiter ||
    p.noiseReduction !== 'off' ||
    p.gateMode !== 'off' ||
    p.roomIsolation !== 'off' ||
    p.humFilter !== 'off' ||
    p.clickSuppression !== 'off'
  );
}

export function usesMlNoiseSuppression(prefs) {
  const p = normalizeMicrophoneFilterPrefs(prefs);
  return p.noiseReduction !== 'off';
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
    return normalizeMicrophoneFilterPrefs({ ...defaults, volume: gainToVolumeDb(gain) });
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
  try {
    graph.gateNode?.port?.close?.();
  } catch (_) {}
  try {
    graph.clickGuardNode?.port?.close?.();
  } catch (_) {}
  for (const node of graph.nodes || []) {
    try {
      node.disconnect?.();
    } catch (_) {}
  }
  for (const track of graph.outputTracks || []) {
    try {
      track.stop();
    } catch (_) {}
  }
  try {
    graph.ctx?.close?.();
  } catch (_) {}
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

function ensureVoiceGateWorklet(ctx) {
  if (!ctx?.audioWorklet) return Promise.resolve(false);
  if (voiceGateWorkletPromise) return voiceGateWorkletPromise;
  voiceGateWorkletPromise = ctx.audioWorklet
    .addModule(VOICE_GATE_WORKLET_URL)
    .then(() => true)
    .catch((err) => {
      console.warn('[mic-dsp] voice-gate worklet indisponivel:', err);
      voiceGateWorkletPromise = null;
      return false;
    });
  return voiceGateWorkletPromise;
}

function ensureClickGuardWorklet(ctx) {
  if (!ctx?.audioWorklet) return Promise.resolve(false);
  if (clickGuardWorkletPromise) return clickGuardWorkletPromise;
  clickGuardWorkletPromise = ctx.audioWorklet
    .addModule(CLICK_GUARD_WORKLET_URL)
    .then(() => true)
    .catch((err) => {
      console.warn('[mic-dsp] click-guard worklet indisponivel:', err);
      clickGuardWorkletPromise = null;
      return false;
    });
  return clickGuardWorkletPromise;
}

function createAudioContextPrefer48k() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return { ctx: null, sampleRateOk: false };
  try {
    const ctx = new AudioContextCtor({
      sampleRate: TARGET_SAMPLE_RATE,
      latencyHint: 'interactive'
    });
    const ok = Math.abs((ctx.sampleRate || 0) - TARGET_SAMPLE_RATE) < 100;
    return { ctx, sampleRateOk: ok };
  } catch (_) {
    try {
      const ctx = new AudioContextCtor({ latencyHint: 'interactive' });
      const ok = Math.abs((ctx.sampleRate || 0) - TARGET_SAMPLE_RATE) < 100;
      return { ctx, sampleRateOk: ok };
    } catch (err) {
      console.warn('[mic-dsp] AudioContext indisponivel:', err);
      return { ctx: null, sampleRateOk: false };
    }
  }
}

function compressorParams(mode) {
  switch (mode) {
    case 'light':
      return { threshold: -28, knee: 18, ratio: 2.5, attack: 0.006, release: 0.18 };
    case 'medium':
      return { threshold: -26, knee: 20, ratio: 4, attack: 0.004, release: 0.16 };
    case 'strong':
      return { threshold: -24, knee: 12, ratio: 8, attack: 0.003, release: 0.14 };
    default:
      return { threshold: 0, knee: 0, ratio: 1, attack: 0.003, release: 0.1 };
  }
}

function noiseReductionProfile(mode) {
  switch (mode) {
    case 'low':
      return { rnnoise: true, maxAttenuationDb: 16, floorMarginDb: 12, vadAssist: true };
    case 'medium':
      return { rnnoise: true, maxAttenuationDb: 26, floorMarginDb: 10, vadAssist: true };
    case 'high':
      return { rnnoise: true, maxAttenuationDb: 34, floorMarginDb: 8, vadAssist: true };
    default:
      return { rnnoise: false, maxAttenuationDb: 0, floorMarginDb: 12, vadAssist: false };
  }
}

function wireNearFieldBias(graph, normalised, analyserNode, gateNode, ctx) {
  if (!analyserNode || !gateNode || normalised.roomIsolation === 'off') {
    return () => {};
  }

  const fftSize = analyserNode.fftSize;
  const sampleRate = ctx.sampleRate || 48000;
  const freqData = new Uint8Array(analyserNode.frequencyBinCount || Math.floor(fftSize / 2));
  const timeData = new Uint8Array(fftSize);
  let smoothedScore = 0.55;
  let lastPeakAt = 0;
  let lastPeakRms = 0;
  let tailScore = 0.55;
  let stopped = false;
  let lastPost = 0;

  const onMeter = (event) => {
    if (stopped || event.data?.type !== 'meter') return;
    const now = performance.now();
    if (now - lastPost < 30) return;
    lastPost = now;

    analyserNode.getByteFrequencyData(freqData);
    analyserNode.getByteTimeDomainData(timeData);
    const metrics = computeNearFieldMetrics({ freqData, sampleRate, fftSize, timeData });
    const rms = metrics.rms;
    if (rms > lastPeakRms * 1.15 && rms > 0.02) {
      lastPeakRms = rms;
      lastPeakAt = now;
    } else if (lastPeakAt && now - lastPeakAt > 50 && now - lastPeakAt < 180) {
      const decay = rms / (lastPeakRms || 0.0001);
      tailScore = clamp(decay * 1.4, 0, 1);
    } else if (now - lastPeakAt > 250) {
      lastPeakRms = rms;
      tailScore = 0.5;
    }

    const rawScore = combineNearFieldScore(metrics, { tailScore });
    smoothedScore = smoothedScore * 0.72 + rawScore * 0.28;
    try {
      gateNode.port.postMessage({
        type: 'nearField',
        score: smoothedScore,
        mode: normalised.roomIsolation,
        strength: normalised.roomIsolationStrength
      });
    } catch (_) {}
  };

  gateNode.port.addEventListener('message', onMeter);
  try {
    gateNode.port.start?.();
  } catch (_) {}

  return () => {
    stopped = true;
    try {
      gateNode.port.removeEventListener('message', onMeter);
    } catch (_) {}
  };
}

function applyGateConfig(gateNode, normalised, profile) {
  if (!gateNode?.port) return;
  const gateMode =
    normalised.gateMode !== 'off'
      ? normalised.gateMode
      : normalised.noiseReduction !== 'off'
        ? 'auto'
        : 'off';
  try {
    gateNode.port.postMessage({
      type: 'config',
      mode: gateMode,
      thresholdDb: normalised.gateThreshold,
      maxAttenuationDb: profile.maxAttenuationDb || (gateMode === 'off' ? 0 : 20),
      floorMarginDb: profile.floorMarginDb,
      nearFieldMode: normalised.roomIsolation,
      nearFieldStrength: normalised.roomIsolationStrength,
      attackSec: 0.008,
      holdSec: 0.18,
      releaseSec: 0.22,
      kneeDb: 6
    });
  } catch (_) {}
}

function applyClickGuardConfig(clickNode, normalised) {
  if (!clickNode?.port) return;
  try {
    clickNode.port.postMessage({
      type: 'config',
      mode: normalised.clickSuppression || 'off'
    });
  } catch (_) {}
}

async function wireVadBias(graph, normalised, profile, inputStream, audioMl, gateNode, clickGuardNode) {
  const wantVad =
    (profile.vadAssist && normalised.noiseReduction !== 'off') ||
    (clickGuardNode && normalised.clickSuppression !== 'off');
  if (!wantVad || !audioMl) {
    return;
  }
  if (!gateNode && !clickGuardNode) return;
  try {
    const controller = await audioMl.createSpeechVadController({
      stream: inputStream,
      hangoverMs: 420,
      onSpeechChange: (isSpeaking) => {
        const msg = {
          type: 'vad',
          speaking: !!isSpeaking,
          bias: isSpeaking ? 0.7 : 0
        };
        try {
          gateNode?.port?.postMessage(msg);
        } catch (_) {}
        try {
          clickGuardNode?.port?.postMessage(msg);
        } catch (_) {}
      }
    });
    graph.vadController = controller;
    if (!controller) {
      const fallback = { type: 'vad', speaking: true, bias: 0 };
      try {
        gateNode?.port?.postMessage(fallback);
      } catch (_) {}
      try {
        clickGuardNode?.port?.postMessage(fallback);
      } catch (_) {}
    }
  } catch (err) {
    console.warn('[mic-dsp] VAD indisponivel:', err);
    const fallback = { type: 'vad', speaking: true, bias: 0 };
    try {
      gateNode?.port?.postMessage(fallback);
    } catch (_) {}
    try {
      clickGuardNode?.port?.postMessage(fallback);
    } catch (_) {}
  }
}

function createPassthroughGainFallback(ctx, sourceNode, destNode, gainValue) {
  const gainNode = ctx.createGain();
  gainNode.gain.value = gainValue;
  sourceNode.connect(gainNode);
  gainNode.connect(destNode);
  return gainNode;
}

export async function createMicrophoneFilterGraph(inputTrack, prefs) {
  const normalised = normalizeMicrophoneFilterPrefs(prefs);
  if (!inputTrack || inputTrack.readyState !== 'live' || !hasActiveMicrophoneFilter(normalised)) {
    return { track: inputTrack, graph: null };
  }

  const { ctx, sampleRateOk } = createAudioContextPrefer48k();
  if (!ctx) return { track: inputTrack, graph: null };

  const profile = noiseReductionProfile(normalised.noiseReduction);
  const wantRnnoise = profile.rnnoise && sampleRateOk;
  const wantVadForClick = normalised.clickSuppression !== 'off';
  let audioMl = null;
  if (wantRnnoise || profile.vadAssist || wantVadForClick) {
    try {
      audioMl = await loadAudioMlModule();
    } catch (_) {
      audioMl = null;
    }
  }

  const inputStream = new MediaStream([inputTrack]);
  const sourceNode = ctx.createMediaStreamSource(inputStream);
  const highpassA = ctx.createBiquadFilter();
  const highpassB = ctx.createBiquadFilter();
  const notch1 = ctx.createBiquadFilter();
  const notch2 = ctx.createBiquadFilter();
  const notch3 = ctx.createBiquadFilter();
  const bassNode = ctx.createBiquadFilter();
  const presenceNode = ctx.createBiquadFilter();
  const trebleNode = ctx.createBiquadFilter();
  const compressorNode = ctx.createDynamicsCompressor();
  const limiterNode = ctx.createDynamicsCompressor();
  const volumeNode = ctx.createGain();
  const nearFieldAnalyser = ctx.createAnalyser();
  const inputAnalyser = ctx.createAnalyser();
  const outputAnalyser = ctx.createAnalyser();
  const dest = ctx.createMediaStreamDestination();

  const hpFreq = normalised.highpass ? normalised.highpassFreq : 20;
  highpassA.type = 'highpass';
  highpassA.frequency.value = hpFreq;
  highpassA.Q.value = 0.707;
  highpassB.type = 'highpass';
  highpassB.frequency.value = hpFreq;
  highpassB.Q.value = 0.707;

  const humHz = normalised.humFilter === '50' ? 50 : normalised.humFilter === '60' ? 60 : 0;
  const configureNotch = (node, freq) => {
    node.type = 'notch';
    node.frequency.value = freq || 20;
    node.Q.value = freq ? 30 : 0.1;
  };
  if (humHz) {
    configureNotch(notch1, humHz);
    configureNotch(notch2, humHz * 2);
    configureNotch(notch3, humHz * 3);
  } else {
    configureNotch(notch1, 20);
    configureNotch(notch2, 20);
    configureNotch(notch3, 20);
  }

  bassNode.type = 'lowshelf';
  bassNode.frequency.value = 150;
  bassNode.gain.value = normalised.bass;

  presenceNode.type = 'peaking';
  presenceNode.frequency.value = normalised.presenceFreq;
  presenceNode.Q.value = 1.2;
  presenceNode.gain.value = normalised.presence ? normalised.presenceGain : 0;

  trebleNode.type = 'highshelf';
  trebleNode.frequency.value = 4000;
  trebleNode.gain.value = normalised.treble;

  const comp = compressorParams(normalised.compressor);
  compressorNode.threshold.value = comp.threshold;
  compressorNode.knee.value = comp.knee;
  compressorNode.ratio.value = comp.ratio;
  compressorNode.attack.value = comp.attack;
  compressorNode.release.value = comp.release;

  if (normalised.limiter) {
    limiterNode.threshold.value = -1.5;
    limiterNode.knee.value = 0;
    limiterNode.ratio.value = 20;
    limiterNode.attack.value = 0.001;
    limiterNode.release.value = 0.05;
  } else {
    limiterNode.threshold.value = 0;
    limiterNode.knee.value = 0;
    limiterNode.ratio.value = 1;
    limiterNode.attack.value = 0.003;
    limiterNode.release.value = 0.1;
  }

  volumeNode.gain.value = normalised.gain;
  nearFieldAnalyser.fftSize = 2048;
  nearFieldAnalyser.smoothingTimeConstant = 0.45;
  inputAnalyser.fftSize = 512;
  inputAnalyser.smoothingTimeConstant = 0.5;
  outputAnalyser.fftSize = 512;
  outputAnalyser.smoothingTimeConstant = 0.55;

  const nodes = [
    sourceNode,
    highpassA,
    highpassB,
    notch1,
    notch2,
    notch3,
    bassNode,
    presenceNode,
    trebleNode,
    compressorNode,
    limiterNode,
    volumeNode,
    nearFieldAnalyser,
    inputAnalyser,
    outputAnalyser
  ];

  let head = sourceNode;
  sourceNode.connect(inputAnalyser);

  if (wantRnnoise && audioMl) {
    const rnnoiseNode = await audioMl.createRnnoiseNode(ctx, sourceNode, highpassA);
    if (rnnoiseNode) {
      nodes.push(rnnoiseNode);
      head = highpassA;
    } else {
      sourceNode.connect(highpassA);
      head = highpassA;
    }
  } else {
    sourceNode.connect(highpassA);
    head = highpassA;
  }

  highpassA.connect(highpassB);
  highpassB.connect(notch1);
  notch1.connect(notch2);
  notch2.connect(notch3);

  let clickGuardNode = null;
  let postClickNode = notch3;
  if (normalised.clickSuppression !== 'off') {
    const clickOk = await ensureClickGuardWorklet(ctx);
    if (clickOk) {
      try {
        clickGuardNode = new AudioWorkletNode(ctx, CLICK_GUARD_PROCESSOR_NAME, {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 1,
          processorOptions: {
            mode: normalised.clickSuppression
          }
        });
        nodes.push(clickGuardNode);
        notch3.connect(clickGuardNode);
        postClickNode = clickGuardNode;
        applyClickGuardConfig(clickGuardNode, normalised);
      } catch (err) {
        console.warn('[mic-dsp] falha ao criar click-guard:', err);
        clickGuardNode = null;
        postClickNode = notch3;
      }
    }
  }

  let gateNode = null;
  const gateOk = await ensureVoiceGateWorklet(ctx);
  if (gateOk) {
    try {
      gateNode = new AudioWorkletNode(ctx, VOICE_GATE_PROCESSOR_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
        processorOptions: {
          mode:
            normalised.gateMode !== 'off'
              ? normalised.gateMode
              : normalised.noiseReduction !== 'off'
                ? 'auto'
                : 'off',
          thresholdDb: normalised.gateThreshold,
          maxAttenuationDb: profile.maxAttenuationDb || 20,
          floorMarginDb: profile.floorMarginDb,
          nearFieldMode: normalised.roomIsolation,
          nearFieldStrength: normalised.roomIsolationStrength
        }
      });
      nodes.push(gateNode);
      postClickNode.connect(gateNode);
      gateNode.connect(bassNode);
      if (normalised.roomIsolation !== 'off') {
        postClickNode.connect(nearFieldAnalyser);
      }
    } catch (err) {
      console.warn('[mic-dsp] falha ao criar voice-gate:', err);
      gateNode = null;
      const fallbackGain = createPassthroughGainFallback(ctx, postClickNode, bassNode, 1);
      nodes.push(fallbackGain);
      if (normalised.roomIsolation !== 'off') {
        postClickNode.connect(nearFieldAnalyser);
      }
    }
  } else {
    const fallbackGain = createPassthroughGainFallback(ctx, postClickNode, bassNode, 1);
    nodes.push(fallbackGain);
    if (normalised.roomIsolation !== 'off') {
      postClickNode.connect(nearFieldAnalyser);
    }
  }

  bassNode.connect(presenceNode);
  presenceNode.connect(trebleNode);
  trebleNode.connect(compressorNode);
  compressorNode.connect(limiterNode);
  limiterNode.connect(volumeNode);
  volumeNode.connect(dest);
  volumeNode.connect(outputAnalyser);

  const graph = {
    ctx,
    nodes,
    outputTracks: dest.stream.getAudioTracks(),
    rafId: null,
    vadController: null,
    nearFieldStop: null,
    gateNode,
    clickGuardNode,
    meterAnalyser: inputAnalyser,
    outputAnalyser,
    inputAnalyser,
    gateActive: hasActiveMicrophoneGate(normalised),
    sampleRateOk,
    lastMeter: null,
    prefs: normalised
  };

  const mergeMeter = (partial) => {
    graph.lastMeter = { ...(graph.lastMeter || {}), ...partial };
  };

  if (gateNode) {
    applyGateConfig(gateNode, normalised, profile);
    gateNode.port.onmessage = (event) => {
      if (event.data?.type === 'meter') {
        mergeMeter({ ...event.data, click: graph.lastMeter?.click });
      }
    };
    try {
      gateNode.port.start?.();
    } catch (_) {}
    graph.nearFieldStop = wireNearFieldBias(graph, normalised, nearFieldAnalyser, gateNode, ctx);
  }

  if (clickGuardNode) {
    clickGuardNode.port.onmessage = (event) => {
      if (event.data?.type === 'clickMeter') {
        mergeMeter({ click: event.data });
      }
    };
    try {
      clickGuardNode.port.start?.();
    } catch (_) {}
  }

  if (gateNode || clickGuardNode) {
    await wireVadBias(graph, normalised, profile, inputStream, audioMl, gateNode, clickGuardNode);
  }

  void head;
  return finalizeMicrophoneFilterGraph(inputTrack, graph);
}

/** Atualiza parâmetros ao vivo sem republicar (quando o grafo já existe). */
export function updateMicrophoneFilterGraph(graph, prefs) {
  if (!graph?.ctx || graph.ctx.state === 'closed') return false;
  const normalised = normalizeMicrophoneFilterPrefs(prefs);
  const profile = noiseReductionProfile(normalised.noiseReduction);
  graph.prefs = normalised;

  for (const node of graph.nodes || []) {
    if (!(node instanceof BiquadFilterNode) && !(node instanceof DynamicsCompressorNode) && !(node instanceof GainNode)) {
      continue;
    }
  }

  const biquads = (graph.nodes || []).filter((n) => n && n.frequency && n.type);
  const highpasses = biquads.filter((n) => n.type === 'highpass');
  const notches = biquads.filter((n) => n.type === 'notch');
  const lowshelves = biquads.filter((n) => n.type === 'lowshelf');
  const peaks = biquads.filter((n) => n.type === 'peaking');
  const highshelves = biquads.filter((n) => n.type === 'highshelf');
  const compressors = (graph.nodes || []).filter((n) => n instanceof DynamicsCompressorNode);
  const gains = (graph.nodes || []).filter((n) => n instanceof GainNode && n !== graph.gateNode);

  const hpFreq = normalised.highpass ? normalised.highpassFreq : 20;
  for (const hp of highpasses) hp.frequency.value = hpFreq;

  const humHz = normalised.humFilter === '50' ? 50 : normalised.humFilter === '60' ? 60 : 0;
  if (notches.length >= 3) {
    if (humHz) {
      notches[0].frequency.value = humHz;
      notches[0].Q.value = 30;
      notches[1].frequency.value = humHz * 2;
      notches[1].Q.value = 30;
      notches[2].frequency.value = humHz * 3;
      notches[2].Q.value = 30;
    } else {
      for (const n of notches) {
        n.frequency.value = 20;
        n.Q.value = 0.1;
      }
    }
  }

  if (lowshelves[0]) lowshelves[0].gain.value = normalised.bass;
  if (peaks[0]) {
    peaks[0].frequency.value = normalised.presenceFreq;
    peaks[0].gain.value = normalised.presence ? normalised.presenceGain : 0;
  }
  if (highshelves[0]) highshelves[0].gain.value = normalised.treble;

  if (compressors[0]) {
    const comp = compressorParams(normalised.compressor);
    compressors[0].threshold.value = comp.threshold;
    compressors[0].knee.value = comp.knee;
    compressors[0].ratio.value = comp.ratio;
    compressors[0].attack.value = comp.attack;
    compressors[0].release.value = comp.release;
  }
  if (compressors[1]) {
    if (normalised.limiter) {
      compressors[1].threshold.value = -1.5;
      compressors[1].knee.value = 0;
      compressors[1].ratio.value = 20;
      compressors[1].attack.value = 0.001;
      compressors[1].release.value = 0.05;
    } else {
      compressors[1].threshold.value = 0;
      compressors[1].ratio.value = 1;
    }
  }

  const volumeNode = gains[gains.length - 1];
  if (volumeNode) volumeNode.gain.setTargetAtTime(normalised.gain, graph.ctx.currentTime, 0.02);

  if (graph.gateNode) applyGateConfig(graph.gateNode, normalised, profile);
  if (graph.clickGuardNode) applyClickGuardConfig(graph.clickGuardNode, normalised);
  return true;
}

// Re-export helper used by near-field consumers
export { normalizeNearFieldGate };

/** Limiar legado (compat) — mapas a partir do modelo novo. */
export function proximityGateThresholdDb(prefs) {
  const normalised = normalizeMicrophoneFilterPrefs(prefs);
  const strength = normalised.roomIsolationStrength;
  return clamp(-18 - (strength - 0.35) * 40, -60, -18);
}

export function combinedGateOpenThresholdDb(prefs) {
  const normalised = normalizeMicrophoneFilterPrefs(prefs);
  if (normalised.gateMode === 'manual') return normalised.gateThreshold;
  if (normalised.gateMode === 'off') return -100;
  return clamp(-45 + (0.5 - normalised.roomIsolationStrength) * 20, -70, -20);
}
