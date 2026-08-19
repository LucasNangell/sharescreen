/** Análise near-field: fala próxima vs voz distante/reverberante (single mic). */

const NEAR_FIELD_GATE_MODES = new Set(['off', 'soft', 'strict']);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeNearFieldGate(value) {
  const mode = String(value || 'off').toLowerCase();
  return NEAR_FIELD_GATE_MODES.has(mode) ? mode : 'off';
}

function binRangeEnergy(freqData, sampleRate, fftSize, lowHz, highHz) {
  const binHz = sampleRate / fftSize;
  const lowBin = Math.max(0, Math.floor(lowHz / binHz));
  const highBin = Math.min(freqData.length - 1, Math.ceil(highHz / binHz));
  if (highBin < lowBin) return 0;
  let sum = 0;
  for (let i = lowBin; i <= highBin; i++) {
    const amp = freqData[i] / 255;
    sum += amp * amp;
  }
  return sum / (highBin - lowBin + 1);
}

/**
 * Métricas puras (testáveis em Node) a partir de buffers do AnalyserNode.
 */
export function computeNearFieldMetrics({ freqData, sampleRate, fftSize, timeData }) {
  const bass = binRangeEnergy(freqData, sampleRate, fftSize, 80, 250);
  const presence = binRangeEnergy(freqData, sampleRate, fftSize, 2000, 4500);
  const mid = binRangeEnergy(freqData, sampleRate, fftSize, 400, 1200);
  const bassTrebleRatio = presence > 0.00001 ? bass / presence : bass * 12;
  const lowMidRatio = mid > 0.00001 ? bass / mid : bass * 8;

  let sum = 0;
  let peak = 0;
  for (let i = 0; i < timeData.length; i++) {
    const n = (timeData[i] - 128) / 128;
    sum += n * n;
    peak = Math.max(peak, Math.abs(n));
  }
  const rms = Math.sqrt(sum / timeData.length) || 0.000001;
  const crest = peak / rms;

  return { bassTrebleRatio, lowMidRatio, crest, rms };
}

/**
 * Combina métricas em score 0–1 (maior = mais provável fala próxima).
 * @param {number} tailScore - proxy DRR: decaimento rápido pós-pico ≈ 1, cauda longa ≈ 0
 */
export function combineNearFieldScore(metrics, { tailScore = 0.55 } = {}) {
  const bassScore = clamp((metrics.bassTrebleRatio - 0.12) / 0.9, 0, 1);
  const lowMidScore = clamp((metrics.lowMidRatio - 0.2) / 1.1, 0, 1);
  const crestScore = clamp((metrics.crest - 2.2) / 5.5, 0, 1);
  const tail = clamp(tailScore, 0, 1);
  return clamp(bassScore * 0.28 + lowMidScore * 0.22 + crestScore * 0.28 + tail * 0.22, 0, 1);
}

function applyNearFieldGain(gateGainNode, ctx, mode, open, duckLevel = null) {
  const softLevel = duckLevel ?? 0.12;
  const target = open ? 1 : mode === 'soft' ? softLevel : 0;
  const timeConstant = open ? 0.02 : mode === 'soft' ? 0.09 : 0.05;
  gateGainNode.gain.setTargetAtTime(target, ctx.currentTime, timeConstant);
}

function resolveGateState({
  mode,
  speechGateMode = 'off',
  speechState,
  gateOpen,
  smoothedScore,
  threshold,
  closeHysteresis
}) {
  const vadSoftLevel = 0.16;
  const nearSoftLevel = 0.12;

  if (speechState && speechGateMode !== 'off') {
    if (!speechState.speaking) {
      return {
        open: false,
        duckLevel: speechGateMode === 'soft' ? vadSoftLevel : 0,
        effectiveMode: speechGateMode === 'soft' ? 'soft' : 'hard'
      };
    }
    if (mode === 'strict') {
      return { open: gateOpen, duckLevel: nearSoftLevel, effectiveMode: mode };
    }
    const distantSpeech =
      smoothedScore < threshold - closeHysteresis && !gateOpen;
    if (distantSpeech) {
      return { open: false, duckLevel: nearSoftLevel, effectiveMode: 'soft' };
    }
    return { open: gateOpen, duckLevel: nearSoftLevel, effectiveMode: 'soft' };
  }

  return { open: gateOpen, duckLevel: nearSoftLevel, effectiveMode: mode };
}

/**
 * Loop RAF que atenua sinal quando o score near-field está abaixo do limiar.
 * @param {object} [options.speechState] - ref `{ speaking: boolean }` para combo com VAD
 * @param {'off'|'soft'|'hard'} [options.speechGateMode='off'] - modo VAD quando combinado
 */
export function createNearFieldGateLoop({
  graph,
  analyserNode,
  gateGainNode,
  gainNode,
  ctx,
  mode = 'soft',
  threshold = 0.5,
  outputGain = 1,
  speechState = null,
  speechGateMode = 'off',
  onScore = null
} = {}) {
  if (!analyserNode || !gateGainNode || !ctx) {
    return () => {};
  }

  const fftSize = analyserNode.fftSize;
  const sampleRate = ctx.sampleRate || 48000;
  const freqData = new Uint8Array(analyserNode.frequencyBinCount || Math.floor(fftSize / 2));
  const timeData = new Uint8Array(fftSize);

  let smoothedScore = 0.55;
  let gateOpen = true;
  let lastOpenAt = performance.now();
  let lastPeakAt = 0;
  let lastPeakRms = 0;
  let tailScore = 0.55;
  const holdMs = 400;
  const closeHysteresis = 0.08;
  let stopped = false;

  const tick = () => {
    if (stopped) return;

    analyserNode.getByteFrequencyData(freqData);
    analyserNode.getByteTimeDomainData(timeData);
    const metrics = computeNearFieldMetrics({ freqData, sampleRate, fftSize, timeData });
    const now = performance.now();
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
    onScore?.(smoothedScore, rawScore);

    const openThreshold = threshold;
    const closeThreshold = threshold - closeHysteresis;

    if (smoothedScore >= openThreshold) {
      gateOpen = true;
      lastOpenAt = now;
    } else if (gateOpen && smoothedScore < closeThreshold && now - lastOpenAt > holdMs) {
      gateOpen = false;
    }

    const { open: shouldOpen, duckLevel, effectiveMode } = resolveGateState({
      mode,
      speechGateMode,
      speechState,
      gateOpen,
      smoothedScore,
      threshold,
      closeHysteresis
    });

    applyNearFieldGain(gateGainNode, ctx, effectiveMode, shouldOpen, duckLevel);
    if (gainNode) {
      gainNode.gain.setTargetAtTime(outputGain, ctx.currentTime, 0.02);
    }

    graph.rafId = requestAnimationFrame(tick);
  };

  tick();

  return () => {
    stopped = true;
    if (graph.rafId) {
      cancelAnimationFrame(graph.rafId);
      graph.rafId = null;
    }
  };
}
