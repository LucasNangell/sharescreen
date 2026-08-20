/**
 * Expansor / noise gate adaptativo — roda na thread de áudio (imune a throttling de aba).
 * Aceita bias de VAD e near-field via port messages.
 */
const PROCESSOR_NAME = 'VoiceGateProcessor';

class VoiceGateProcessor extends AudioWorkletProcessor {
  constructor(options = {}) {
    super();
    const opts = options.processorOptions || {};
    this._mode = String(opts.mode || 'auto'); // auto | manual | off
    this._thresholdDb = Number.isFinite(opts.thresholdDb) ? opts.thresholdDb : -45;
    this._maxAttenuationDb = Number.isFinite(opts.maxAttenuationDb) ? opts.maxAttenuationDb : 28;
    this._floorMarginDb = Number.isFinite(opts.floorMarginDb) ? opts.floorMarginDb : 10;
    this._attackSec = Number.isFinite(opts.attackSec) ? opts.attackSec : 0.008;
    this._holdSec = Number.isFinite(opts.holdSec) ? opts.holdSec : 0.18;
    this._releaseSec = Number.isFinite(opts.releaseSec) ? opts.releaseSec : 0.22;
    this._kneeDb = Number.isFinite(opts.kneeDb) ? opts.kneeDb : 6;

    this._noiseFloorDb = -55;
    this._envelopeDb = -80;
    this._gainLin = 1;
    this._holdUntil = 0;
    this._open = true;

    this._vadSpeaking = true;
    this._vadBias = 0; // 0..1 extra open preference when speaking
    this._nearFieldScore = 1; // 0..1
    this._nearFieldMode = 'off'; // off | soft | strict
    this._nearFieldStrength = 0.5;

    this._frameSamples = 0;
    this._sumSq = 0;
    this._peak = 0;
    this._framesSincePost = 0;
    this._postEvery = Math.max(1, Math.round((sampleRate || 48000) / 128 / 100)); // ~10 ms

    this.port.onmessage = (event) => {
      const msg = event.data || {};
      if (msg.type === 'config') {
        if (msg.mode !== undefined) this._mode = String(msg.mode);
        if (Number.isFinite(msg.thresholdDb)) this._thresholdDb = msg.thresholdDb;
        if (Number.isFinite(msg.maxAttenuationDb)) this._maxAttenuationDb = msg.maxAttenuationDb;
        if (Number.isFinite(msg.floorMarginDb)) this._floorMarginDb = msg.floorMarginDb;
        if (Number.isFinite(msg.attackSec)) this._attackSec = msg.attackSec;
        if (Number.isFinite(msg.holdSec)) this._holdSec = msg.holdSec;
        if (Number.isFinite(msg.releaseSec)) this._releaseSec = msg.releaseSec;
        if (Number.isFinite(msg.kneeDb)) this._kneeDb = msg.kneeDb;
        if (msg.nearFieldMode !== undefined) this._nearFieldMode = String(msg.nearFieldMode);
        if (Number.isFinite(msg.nearFieldStrength)) this._nearFieldStrength = msg.nearFieldStrength;
      } else if (msg.type === 'vad') {
        this._vadSpeaking = !!msg.speaking;
        if (Number.isFinite(msg.bias)) this._vadBias = Math.max(0, Math.min(1, msg.bias));
      } else if (msg.type === 'nearField') {
        if (Number.isFinite(msg.score)) this._nearFieldScore = Math.max(0, Math.min(1, msg.score));
        if (msg.mode !== undefined) this._nearFieldMode = String(msg.mode);
        if (Number.isFinite(msg.strength)) this._nearFieldStrength = msg.strength;
      }
    };
  }

  _db(lin) {
    return 20 * Math.log10(Math.max(lin, 1e-8));
  }

  _lin(db) {
    return Math.pow(10, db / 20);
  }

  _smoothToward(current, target, timeConstantSec, blockSec) {
    if (timeConstantSec <= 0) return target;
    const alpha = 1 - Math.exp(-blockSec / timeConstantSec);
    return current + (target - current) * alpha;
  }

  _resolveOpenThresholdDb() {
    if (this._mode === 'off') return -120;
    if (this._mode === 'manual') return this._thresholdDb;

    // auto: floor + margin, with VAD assist lowering threshold when speaking
    let thr = this._noiseFloorDb + this._floorMarginDb;
    if (this._vadSpeaking) {
      thr -= 4 + this._vadBias * 6;
    } else {
      thr += 2;
    }
    return Math.max(-70, Math.min(-18, thr));
  }

  _nearFieldDuckFactor() {
    if (this._nearFieldMode === 'off') return 1;
    const strength = Math.max(0.35, Math.min(0.75, this._nearFieldStrength || 0.5));
    const score = this._nearFieldScore;
    if (score >= strength) return 1;
    const close = strength - 0.08;
    if (score >= close) {
      const t = (score - close) / Math.max(0.001, strength - close);
      return 0.25 + 0.75 * t;
    }
    if (this._nearFieldMode === 'strict') return 0.02;
    return 0.12;
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!input || !output) return true;

    const n = input.length;
    const blockSec = n / (sampleRate || 48000);
    const now = currentTime;

    let sumSq = 0;
    let peak = 0;
    for (let i = 0; i < n; i++) {
      const s = input[i];
      sumSq += s * s;
      const a = Math.abs(s);
      if (a > peak) peak = a;
    }
    const rms = Math.sqrt(sumSq / n) || 1e-8;
    const rmsDb = this._db(rms);

    // Slow noise-floor tracker (min follower)
    if (rmsDb < this._noiseFloorDb) {
      this._noiseFloorDb = this._smoothToward(this._noiseFloorDb, rmsDb, 0.05, blockSec);
    } else {
      this._noiseFloorDb = this._smoothToward(this._noiseFloorDb, rmsDb, 2.5, blockSec);
    }
    this._noiseFloorDb = Math.max(-80, Math.min(-20, this._noiseFloorDb));

    this._envelopeDb = this._smoothToward(
      this._envelopeDb,
      rmsDb,
      rmsDb > this._envelopeDb ? 0.01 : 0.08,
      blockSec
    );

    const openThr = this._resolveOpenThresholdDb();
    const closeThr = openThr - 6;
    const knee = Math.max(1, this._kneeDb);

    let desiredOpen = this._mode === 'off' ? true : this._envelopeDb >= openThr;
    if (this._mode !== 'off' && this._open && this._envelopeDb < closeThr && now > this._holdUntil) {
      desiredOpen = false;
    }
    if (desiredOpen) {
      this._open = true;
      this._holdUntil = now + this._holdSec;
    } else if (now > this._holdUntil) {
      this._open = false;
    }

    // Soft knee expansion below threshold
    let targetGainDb = 0;
    if (this._mode !== 'off') {
      const below = openThr - this._envelopeDb;
      if (below > 0) {
        const soft = below < knee ? (below * below) / (2 * knee) : below - knee / 2;
        const ratio = this._mode === 'manual' ? 2.2 : 1.8;
        targetGainDb = -Math.min(this._maxAttenuationDb, soft * (ratio - 1));
      }
      if (!this._open && this._vadSpeaking === false) {
        targetGainDb = Math.min(targetGainDb, -Math.min(this._maxAttenuationDb, this._maxAttenuationDb * 0.85));
      }
    }

    const nf = this._nearFieldDuckFactor();
    if (nf < 1) {
      targetGainDb += this._db(nf);
    }

    const targetLin = this._lin(Math.max(-this._maxAttenuationDb, Math.min(0, targetGainDb)));
    const tc = targetLin > this._gainLin ? this._attackSec : this._releaseSec;
    this._gainLin = this._smoothToward(this._gainLin, targetLin, tc, blockSec);

    for (let i = 0; i < n; i++) {
      output[i] = input[i] * this._gainLin;
    }

    this._framesSincePost += 1;
    if (this._framesSincePost >= this._postEvery) {
      this._framesSincePost = 0;
      const reductionDb = -this._db(this._gainLin);
      this.port.postMessage({
        type: 'meter',
        inputRmsDb: rmsDb,
        inputPeakDb: this._db(peak),
        noiseFloorDb: this._noiseFloorDb,
        reductionDb,
        open: this._open,
        gainLin: this._gainLin
      });
    }

    return true;
  }
}

registerProcessor(PROCESSOR_NAME, VoiceGateProcessor);
