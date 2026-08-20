/**
 * Smoke: ClickGuardCore — voz sustentada não deve duckar; clique deve.
 */
import { createClickGuardCore } from '../src/shared/worklets/click-guard-core.js';
import { normalizeMicrophoneFilterPrefs, MIC_FILTER_DEFAULTS, MIC_FILTER_PRESETS } from '../src/shared/mic-dsp.js';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    failed += 1;
    return;
  }
  console.log(`[OK] ${message}`);
}

const SR = 48000;
const BLOCK = 128;

function fillTone(buf, freq, amp, phase0, t0) {
  let phase = phase0;
  const dp = (2 * Math.PI * freq) / SR;
  for (let i = 0; i < buf.length; i++) {
    // Fundamental + harmônicos baixos (voz sonora)
    const t = t0 + i / SR;
    void t;
    buf[i] =
      amp * Math.sin(phase) +
      amp * 0.35 * Math.sin(phase * 2) +
      amp * 0.15 * Math.sin(phase * 3);
    phase += dp;
  }
  return phase;
}

function addClick(buf, atSample, amp) {
  // Burst ~8 ms (realista para tecla mecânica), com energia HF
  const len = Math.min(buf.length - atSample, Math.round(0.008 * SR));
  for (let i = 0; i < len; i++) {
    const env = Math.exp(-i / (len * 0.35));
    const noise = (Math.random() * 2 - 1) * amp * env;
    const tick = i < 3 ? amp * (1 - i / 3) * 0.5 : 0;
    const idx = atSample + i;
    if (idx >= 0 && idx < buf.length) buf[idx] += noise + tick;
  }
}

function runBlocks(core, seconds, fillFn) {
  const nBlocks = Math.ceil((seconds * SR) / BLOCK);
  const input = new Float32Array(BLOCK);
  const output = new Float32Array(BLOCK);
  let maxDepth = 0;
  let lastMeter = null;
  let t = 0;
  let phase = 0;
  for (let b = 0; b < nBlocks; b++) {
    phase = fillFn(input, phase, t) ?? phase;
    lastMeter = core.process(input, output, t);
    if ((lastMeter?.depthDb || 0) > maxDepth) maxDepth = lastMeter.depthDb;
    t += BLOCK / SR;
  }
  return { maxDepth, lastMeter, t };
}

// Prefs defaults
const defaults = normalizeMicrophoneFilterPrefs(MIC_FILTER_DEFAULTS);
assert(defaults.clickSuppression === 'medium', 'default clickSuppression medium');
assert(
  normalizeMicrophoneFilterPrefs(MIC_FILTER_PRESETS.noisy.prefs).clickSuppression === 'high',
  'noisy preset clickSuppression high'
);
assert(
  normalizeMicrophoneFilterPrefs(MIC_FILTER_PRESETS.bypass.prefs).clickSuppression === 'off',
  'bypass clickSuppression off'
);
assert(
  normalizeMicrophoneFilterPrefs({}).clickSuppression === 'medium',
  'prefs sem chave → medium via default'
);

// 1) Tom sustentado: duck < 1 dB
{
  const core = createClickGuardCore({ sampleRate: SR, mode: 'medium' });
  const { maxDepth } = runBlocks(core, 0.6, (buf, phase, t) => {
    // Rampa inicial suave de nível
    const amp = t < 0.05 ? 0.02 + (t / 0.05) * 0.18 : 0.2;
    return fillTone(buf, 200, amp, phase, t);
  });
  assert(maxDepth < 1, `tom 200 Hz: duck máximo ${maxDepth.toFixed(2)} dB < 1`);
}

// 2) Clique sobre tom: duck > 6 dB e recuperação < 1 dB em 100 ms
{
  const core = createClickGuardCore({ sampleRate: SR, mode: 'medium' });
  // Warm-up com tom
  runBlocks(core, 0.35, (buf, phase, t) => fillTone(buf, 200, 0.18, phase, t));

  let maxDuringClick = 0;
  const input = new Float32Array(BLOCK);
  const output = new Float32Array(BLOCK);
  let phase = 0;
  let t = 0.35;

  // Um bloco com clique forte no meio
  phase = fillTone(input, 200, 0.18, phase, t);
  addClick(input, 40, 0.95);
  addClick(input, 55, 0.85);
  let meter = core.process(input, output, t);
  maxDuringClick = Math.max(maxDuringClick, meter.depthDb || 0);
  t += BLOCK / SR;

  // Continua alguns blocos com possíveis cliques residuais no envelope
  for (let i = 0; i < 8; i++) {
    phase = fillTone(input, 200, 0.18, phase, t);
    if (i < 2) addClick(input, 20 + i * 10, 0.9);
    meter = core.process(input, output, t);
    maxDuringClick = Math.max(maxDuringClick, meter.depthDb || 0);
    t += BLOCK / SR;
  }

  assert(maxDuringClick > 6, `clique: duck máximo ${maxDuringClick.toFixed(2)} dB > 6`);

  // Recuperação: 100 ms só com tom
  const recoverBlocks = Math.ceil((0.1 * SR) / BLOCK);
  for (let i = 0; i < recoverBlocks + 20; i++) {
    phase = fillTone(input, 200, 0.18, phase, t);
    meter = core.process(input, output, t);
    t += BLOCK / SR;
  }
  assert(
    (meter.depthDb || 0) < 1,
    `recuperação: duck ${Number(meter.depthDb || 0).toFixed(2)} dB < 1 após ~100 ms+`
  );
}

// 3) Modo off: zero duck mesmo com clique
{
  const core = createClickGuardCore({ sampleRate: SR, mode: 'off' });
  const input = new Float32Array(BLOCK);
  const output = new Float32Array(BLOCK);
  fillTone(input, 200, 0.2, 0, 0);
  addClick(input, 30, 1);
  const meter = core.process(input, output, 0);
  assert((meter.depthDb || 0) < 0.01, 'modo off: sem duck');
  let same = true;
  for (let i = 0; i < BLOCK; i++) {
    if (Math.abs(output[i] - input[i]) > 1e-9) {
      same = false;
      break;
    }
  }
  assert(same, 'modo off: passthrough bit-exato');
}

if (failed) {
  console.error(`\n${failed} falha(s)`);
  process.exit(1);
}
console.log('\nclick-guard smoke OK');
