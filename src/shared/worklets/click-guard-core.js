/**
 * Detector + ducker de transientes (cliques de teclado/mouse).
 * JS puro — sem globais de AudioWorklet — para testes em Node.
 */

export const CLICK_SUPPRESSION_MODES = ['off', 'low', 'medium', 'high'];

export const CLICK_GUARD_PROFILES = {
  low: {
    depthDb: 9,
    riseDb: 12,
    hfRatio: 0.5,
    crest: 3.0,
    holdMs: 20,
    floorDb: -52
  },
  medium: {
    depthDb: 14,
    riseDb: 9,
    hfRatio: 0.42,
    crest: 2.6,
    holdMs: 28,
    floorDb: -55
  },
  high: {
    depthDb: 20,
    riseDb: 7,
    hfRatio: 0.35,
    crest: 2.2,
    holdMs: 38,
    floorDb: -58
  }
};

const LOOKAHEAD_MS = 6;
const SUSTAIN_ABORT_MS = 55;
const REFRACTORY_MS = 120;
const MAX_CLICKS_PER_SEC = 20;
const DUTY_CAP = 0.35;
const DROP_MS = 1;
const RETURN_MS = 35;
const VAD_DEPTH_SCALE = 0.6;
const VAD_RISE_BIAS_DB = 3;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function db(lin) {
  return 20 * Math.log10(Math.max(lin, 1e-8));
}

function lin(dbVal) {
  return Math.pow(10, dbVal / 20);
}

function envCoeff(ms, sampleRate) {
  if (ms <= 0) return 1;
  return 1 - Math.exp(-1 / ((ms / 1000) * sampleRate));
}

/**
 * @param {{ sampleRate?: number, mode?: string }} opts
 */
export function createClickGuardCore(opts = {}) {
  const sampleRate = Math.max(8000, Number(opts.sampleRate) || 48000);
  let mode = String(opts.mode || 'medium');
  if (!CLICK_GUARD_PROFILES[mode] && mode !== 'off') mode = 'medium';

  let profile = CLICK_GUARD_PROFILES[mode] || CLICK_GUARD_PROFILES.medium;

  let envFast = 1e-8;
  let envSlow = 1e-8;
  let envHf = 1e-8;
  let prevSample = 0;

  const aFastAtk = envCoeff(0.25, sampleRate);
  const aFastRel = envCoeff(15, sampleRate);
  const aSlowAtk = envCoeff(150, sampleRate);
  const aSlowRel = envCoeff(400, sampleRate);
  const aHfAtk = envCoeff(0.25, sampleRate);
  const aHfRel = envCoeff(12, sampleRate);

  let gainLin = 1;
  let targetGainLin = 1;
  let duckUntil = 0;
  let duckStart = 0;
  let refractoryUntil = 0;
  let inDuck = false;
  let currentTime = 0;

  let vadSpeaking = false;
  let vadBias = 0;

  const clickTimes = [];
  let duckSamplesAccum = 0;
  let samplesWindow = 0;
  const windowSamples = Math.round(sampleRate);

  let lastMeter = {
    type: 'clickMeter',
    active: false,
    depthDb: 0,
    riseDb: 0,
    hfRatio: 0,
    crest: 0,
    gainLin: 1
  };

  const dropSamples = Math.max(1, Math.round((DROP_MS / 1000) * sampleRate));
  const returnSamples = Math.max(1, Math.round((RETURN_MS / 1000) * sampleRate));
  let rampSamplesLeft = 0;
  let rampFrom = 1;
  let rampTo = 1;

  function setMode(next) {
    const m = String(next || 'off');
    if (m === 'off' || CLICK_GUARD_PROFILES[m]) mode = m;
    else mode = 'medium';
    profile = CLICK_GUARD_PROFILES[mode] || null;
    if (mode === 'off') {
      targetGainLin = 1;
      gainLin = 1;
      inDuck = false;
    }
  }

  function setVad({ speaking, bias } = {}) {
    vadSpeaking = !!speaking;
    if (Number.isFinite(bias)) vadBias = clamp(bias, 0, 1);
  }

  function configure(cfg = {}) {
    if (cfg.mode !== undefined) setMode(cfg.mode);
  }

  function dutyFactor() {
    if (samplesWindow <= 0) return 0;
    return duckSamplesAccum / samplesWindow;
  }

  function rateOk(now) {
    while (clickTimes.length && now - clickTimes[0] > 1) clickTimes.shift();
    return clickTimes.length < MAX_CLICKS_PER_SEC;
  }

  function startDuck(now, depthDb) {
    let depth = depthDb;
    if (vadSpeaking) depth *= VAD_DEPTH_SCALE;
    if (dutyFactor() > DUTY_CAP) depth *= 0.4;
    if (!rateOk(now)) depth *= 0.35;
    depth = Math.max(0, depth);
    if (depth < 1) return;

    targetGainLin = lin(-depth);
    rampFrom = gainLin;
    rampTo = targetGainLin;
    rampSamplesLeft = dropSamples;
    inDuck = true;
    duckStart = now;
    duckUntil = now + (profile?.holdMs || 28) / 1000;
    clickTimes.push(now);
  }

  function releaseDuck() {
    targetGainLin = 1;
    rampFrom = gainLin;
    rampTo = 1;
    rampSamplesLeft = returnSamples;
    inDuck = false;
  }

  function abortAsSpeech(now) {
    releaseDuck();
    refractoryUntil = now + REFRACTORY_MS / 1000;
  }

  /**
   * Analisa `detectInput` e aplica ganho em `applyInput` → `output`.
   * Para lookahead: detectInput = vivo, applyInput = atrasado.
   * @param {Float32Array} detectInput
   * @param {Float32Array} output
   * @param {number} [blockTime]
   * @param {Float32Array} [applyInput] defaults to detectInput
   */
  function process(detectInput, output, blockTime, applyInput) {
    const input = detectInput;
    const apply = applyInput || detectInput;
    const n = input.length;
    if (!n) return lastMeter;

    if (mode === 'off' || !profile) {
      if (output !== apply) output.set(apply);
      gainLin = 1;
      lastMeter = {
        type: 'clickMeter',
        active: false,
        depthDb: 0,
        riseDb: 0,
        hfRatio: 0,
        crest: 0,
        gainLin: 1
      };
      currentTime = (blockTime ?? currentTime) + n / sampleRate;
      return lastMeter;
    }

    const now0 = blockTime ?? currentTime;
    const sampleSec = 1 / sampleRate;

    let riseThr = profile.riseDb;
    let hfThr = profile.hfRatio;
    let crestThr = profile.crest;
    if (vadSpeaking) {
      riseThr += VAD_RISE_BIAS_DB + vadBias * 2;
      hfThr += 0.08;
      crestThr += 0.4;
    }

    let peakRiseDb = 0;
    let peakHfRatio = 0;
    let blockPeak = 0;
    let sumSq = 0;
    let triggeredThisBlock = false;

    for (let i = 0; i < n; i++) {
      const now = now0 + i * sampleSec;
      const x = input[i];
      const ax = Math.abs(x);
      sumSq += x * x;
      if (ax > blockPeak) blockPeak = ax;

      const aFast = ax > envFast ? aFastAtk : aFastRel;
      envFast += (ax - envFast) * aFast;

      const aSlow = ax > envSlow ? aSlowAtk : aSlowRel;
      envSlow += (ax - envSlow) * aSlow;

      const d = Math.abs(x - prevSample);
      prevSample = x;
      const aHf = d > envHf ? aHfAtk : aHfRel;
      envHf += (d - envHf) * aHf;

      const riseDb = db(envFast) - db(Math.max(envSlow, 1e-8));
      const hfRatio = envHf / Math.max(envFast, 1e-8);
      if (riseDb > peakRiseDb) peakRiseDb = riseDb;
      if (hfRatio > peakHfRatio) peakHfRatio = hfRatio;

      // Crest aproximado local: amostra vs envelope lento
      const localCrest = ax / Math.max(envSlow, 1e-8);

      const levelDb = db(envFast);
      const canTrigger =
        !triggeredThisBlock &&
        now >= refractoryUntil &&
        !inDuck &&
        levelDb > profile.floorDb &&
        riseDb >= riseThr &&
        hfRatio >= hfThr &&
        localCrest >= crestThr;

      if (canTrigger) {
        startDuck(now, profile.depthDb);
        triggeredThisBlock = true;
      }

      if (inDuck) {
        const sustained = envFast > envSlow * 1.15 && now - duckStart > SUSTAIN_ABORT_MS / 1000;
        if (sustained) {
          abortAsSpeech(now);
        } else if (now >= duckUntil && gainLin <= targetGainLin * 1.05) {
          releaseDuck();
        }
      }

      if (rampSamplesLeft > 0) {
        const total = Math.max(
          1,
          rampTo < rampFrom - 1e-6 ? dropSamples : rampTo > rampFrom + 1e-6 ? returnSamples : dropSamples
        );
        const progressed = total - rampSamplesLeft;
        const t = clamp(progressed / total, 0, 1);
        const eased = t * t * (3 - 2 * t);
        gainLin = rampFrom + (rampTo - rampFrom) * eased;
        rampSamplesLeft -= 1;
        if (rampSamplesLeft <= 0) gainLin = rampTo;
      } else {
        gainLin = targetGainLin;
      }

      output[i] = apply[i] * gainLin;
      if (gainLin < 0.98) duckSamplesAccum += 1;
    }

    samplesWindow += n;
    if (samplesWindow >= windowSamples) {
      duckSamplesAccum = Math.floor(duckSamplesAccum * 0.5);
      samplesWindow = Math.floor(samplesWindow * 0.5);
    }

    currentTime = now0 + n / sampleRate;
    const rms = Math.sqrt(sumSq / n) || 1e-8;
    const crest = blockPeak / rms;
    const depthNow = -db(gainLin);
    lastMeter = {
      type: 'clickMeter',
      active: depthNow > 1,
      depthDb: depthNow,
      riseDb: peakRiseDb,
      hfRatio: peakHfRatio,
      crest,
      gainLin
    };
    return lastMeter;
  }

  return {
    LOOKAHEAD_MS,
    get sampleRate() {
      return sampleRate;
    },
    get mode() {
      return mode;
    },
    getMeter() {
      return { ...lastMeter };
    },
    setMode,
    setVad,
    configure,
    process
  };
}

export function normalizeClickSuppression(value) {
  const mode = String(value ?? 'medium').toLowerCase();
  return CLICK_SUPPRESSION_MODES.includes(mode) ? mode : 'medium';
}
