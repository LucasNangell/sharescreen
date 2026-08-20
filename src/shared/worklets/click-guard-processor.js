/**
 * AudioWorklet: supressor de cliques/teclado com lookahead de 6 ms.
 * Detecta no sinal vivo e aplica o duck no sinal atrasado.
 */
import { createClickGuardCore } from './click-guard-core.js';

const PROCESSOR_NAME = 'ClickGuardProcessor';
const LOOKAHEAD_MS = 6;

class ClickGuardProcessor extends AudioWorkletProcessor {
  constructor(options = {}) {
    super();
    const opts = options.processorOptions || {};
    const sr = sampleRate || 48000;
    this._core = createClickGuardCore({
      sampleRate: sr,
      mode: opts.mode || 'medium'
    });
    this._delaySamples = Math.max(1, Math.round((LOOKAHEAD_MS / 1000) * sr));
    this._delayBuf = new Float32Array(this._delaySamples);
    this._delayWrite = 0;
    this._delayed = null;
    this._framesSincePost = 0;
    this._postEvery = Math.max(1, Math.round(sr / 128 / 50)); // ~20 ms

    this.port.onmessage = (event) => {
      const msg = event.data || {};
      if (msg.type === 'config') {
        if (msg.mode !== undefined) this._core.configure({ mode: msg.mode });
      } else if (msg.type === 'vad') {
        this._core.setVad({ speaking: !!msg.speaking, bias: msg.bias });
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!input || !output) return true;

    const n = input.length;
    if (!this._delayed || this._delayed.length !== n) {
      this._delayed = new Float32Array(n);
    }

    for (let i = 0; i < n; i++) {
      this._delayed[i] = this._delayBuf[this._delayWrite];
      this._delayBuf[this._delayWrite] = input[i];
      this._delayWrite += 1;
      if (this._delayWrite >= this._delaySamples) this._delayWrite = 0;
    }

    this._core.process(input, output, currentTime, this._delayed);

    this._framesSincePost += 1;
    if (this._framesSincePost >= this._postEvery) {
      this._framesSincePost = 0;
      try {
        this.port.postMessage(this._core.getMeter());
      } catch (_) {}
    }

    return true;
  }
}

registerProcessor(PROCESSOR_NAME, ClickGuardProcessor);
