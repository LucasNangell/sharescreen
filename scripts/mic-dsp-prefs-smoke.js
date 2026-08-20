/**
 * Normalização e migração do modelo canônico de filtros de microfone.
 */
import {
  normalizeMicrophoneFilterPrefs,
  migrateLegacyMicrophoneFilterPrefs,
  microphoneFilterPrefsSignature,
  volumeDbToGain,
  gainToVolumeDb,
  hasActiveMicrophoneFilter,
  usesMlNoiseSuppression,
  MIC_FILTER_DEFAULTS,
  HOST_MIC_PUBLISH_DEFAULTS,
  CLIENT_MIC_PUBLISH_DEFAULTS,
  SHARED_ROOM_MIC_PRESET,
  MIC_FILTER_PRESETS
} from '../src/shared/mic-dsp.js';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    failed += 1;
    return;
  }
  console.log(`[OK] ${message}`);
}

assert(Math.abs(volumeDbToGain(0) - 1) < 1e-9, '0 dB = gain 1');
assert(Math.abs(gainToVolumeDb(1)) < 1e-6, 'gain 1 = 0 dB');
assert(Math.abs(volumeDbToGain(gainToVolumeDb(2.1)) - 2.1) < 0.02, 'roundtrip gain↔dB');

const fromLegacy = normalizeMicrophoneFilterPrefs({
  gain: 2,
  peaking: true,
  peakingFreq: 2800,
  peakingGain: 4,
  compressor: true,
  noiseSuppressionMl: true,
  speechGate: 'soft',
  noiseGate: true,
  noiseGateThreshold: -50,
  nearFieldGate: 'strict',
  nearFieldThreshold: 0.6
});

assert(Math.abs(fromLegacy.volume - gainToVolumeDb(2)) < 0.05, 'migra gain→volume');
assert(fromLegacy.presence === true, 'migra peaking→presence');
assert(fromLegacy.presenceFreq === 2800, 'migra peakingFreq');
assert(fromLegacy.noiseReduction !== 'off', 'migra ML NS → noiseReduction');
assert(fromLegacy.gateMode === 'manual', 'noiseGate legado → gateMode manual');
assert(fromLegacy.gateThreshold === -50, 'migra limiar do gate');
assert(fromLegacy.roomIsolation === 'strict', 'migra nearField→roomIsolation');
assert(fromLegacy.compressor === 'light', 'compressor true → light');
assert(fromLegacy.noiseSuppressionMl === true, 'alias noiseSuppressionMl');
assert(fromLegacy.peaking === true, 'alias peaking');

const migrated = migrateLegacyMicrophoneFilterPrefs({ gain: 1.5, micSensitivity: true });
assert(migrated.volume !== undefined, 'migrateLegacy preenche volume');
assert(migrated.gateMode === 'manual' || migrated.gateMode === 'auto', 'migrateLegacy define gate');

const clean = normalizeMicrophoneFilterPrefs(MIC_FILTER_DEFAULTS);
assert(clean.noiseReduction === 'medium', 'default noiseReduction medium');
assert(clean.highpass === true, 'default highpass on');
assert(clean.gateMode === 'auto', 'default gate auto');
assert(clean.limiter === true, 'default limiter on');
assert(clean.clickSuppression === 'medium', 'default clickSuppression medium');
assert(usesMlNoiseSuppression(clean) === true, 'defaults usam ML NS');
assert(hasActiveMicrophoneFilter(clean) === true, 'defaults sao filtros ativos');

const bypass = normalizeMicrophoneFilterPrefs(MIC_FILTER_PRESETS.bypass.prefs);
assert(hasActiveMicrophoneFilter(bypass) === false, 'preset bypass inativo');
assert(usesMlNoiseSuppression(bypass) === false, 'bypass sem ML');
assert(bypass.clickSuppression === 'off', 'bypass clickSuppression off');

const noisy = normalizeMicrophoneFilterPrefs(MIC_FILTER_PRESETS.noisy.prefs);
assert(noisy.clickSuppression === 'high', 'noisy clickSuppression high');

const onlyClick = normalizeMicrophoneFilterPrefs({
  ...MIC_FILTER_PRESETS.bypass.prefs,
  clickSuppression: 'medium'
});
assert(hasActiveMicrophoneFilter(onlyClick) === true, 'só clickSuppression ativa o grafo');

const sigClickA = microphoneFilterPrefsSignature({ clickSuppression: 'medium' });
const sigClickB = microphoneFilterPrefsSignature({ clickSuppression: 'high' });
assert(sigClickA !== sigClickB, 'signature distingue clickSuppression');

const host = normalizeMicrophoneFilterPrefs(HOST_MIC_PUBLISH_DEFAULTS);
const client = normalizeMicrophoneFilterPrefs(CLIENT_MIC_PUBLISH_DEFAULTS);
const shared = normalizeMicrophoneFilterPrefs(SHARED_ROOM_MIC_PRESET);
assert(host.presence === true, 'host default presence');
assert(client.noiseReduction === 'medium', 'client default NR');
assert(shared.roomIsolation === 'soft', 'shared room isolation');

const sig1 = microphoneFilterPrefsSignature({ volume: 1, bass: 2 });
const sig2 = microphoneFilterPrefsSignature({ volume: 1, bass: 2, gain: 999 });
assert(sig1 === sig2, 'signature ignora gain legado quando volume presente');

assert(normalizeMicrophoneFilterPrefs({ volume: -40 }).gain < 0.02, 'volume -40 dB quase mudo');
assert(normalizeMicrophoneFilterPrefs({ volume: 9.5 }).gain > 2.5, 'volume +9.5 dB alto');

if (failed) {
  console.error(`\n${failed} falha(s)`);
  process.exit(1);
}
console.log('\nmic-dsp prefs smoke OK');
