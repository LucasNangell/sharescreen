/**
 * Testes unitários leves da política de áudio (Node).
 */
import {
  pickAntiEchoSources,
  resolvePublishAudioSources,
  resolvePlaybackSources
} from '../src/shared/audio-policy.js';
import { isOwnAudioSource, normalizeRemoteAudioSources, liveProducerId } from '../src/shared/audio-sources.js';
import {
  combineNearFieldScore,
  computeNearFieldMetrics,
  normalizeNearFieldGate
} from '../src/shared/near-field-analyzer.js';
import { normalizeMicrophoneFilterPrefs, micGraphIsRunning, resolveHostMicFilterPrefs, HOST_MIC_PUBLISH_DEFAULTS } from '../src/shared/mic-dsp.js';
import { evaluateMicPublishHealth } from '../src/shared/mic-publish-health.js';
import {
  classifyServerMessage,
  ErrorCodes,
  isTransientServerError,
  isUnrecoverableConsumeError
} from '../src/shared/error-manager.js';
import {
  buildMicrophoneDeviceChoices,
  describeMicrophoneAccessIssue,
  resolveDefaultMicrophoneDeviceId
} from '../src/shared/audio-manager.js';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    failed += 1;
    return;
  }
  console.log(`[OK] ${message}`);
}

const peerA = 'peer-a';
const peerB = 'peer-b';

// excludeSourceTypes
const mixedSources = [
  { peerId: peerA, producerId: 'p1', source: 'microphone' },
  { peerId: peerA, producerId: 'p2', source: 'system' },
  { peerId: peerB, producerId: 'p3', source: 'system' }
];
const withoutSystem = normalizeRemoteAudioSources(mixedSources, {
  excludeSourceTypes: ['system']
});
assert(withoutSystem.length === 1 && withoutSystem[0].source === 'microphone', 'excludeSourceTypes remove system');

// pickAntiEchoSources
const antiEcho = pickAntiEchoSources(mixedSources);
assert(
  antiEcho.length === 2 &&
    antiEcho.find((s) => s.peerId === peerA)?.source === 'microphone',
  'pickAntiEchoSources prefere microfone por peer'
);

// resolvePublishAudioSources mic-wins
const micWins = resolvePublishAudioSources(
  { microphone: true, systemAudio: true },
  { dualPublishPolicy: 'mic-wins' }
);
assert(micWins.microphone && !micWins.systemAudio && micWins.blockedReason === 'mic-wins', 'mic-wins bloqueia system');

const allowBoth = resolvePublishAudioSources(
  { microphone: true, systemAudio: true },
  { dualPublishPolicy: 'allow-both' }
);
assert(allowBoth.microphone && allowBoth.systemAudio && !allowBoth.blockedReason, 'allow-both publica mic e system');

// monitor sem áudio
const monitorBlock = resolvePublishAudioSources(
  { microphone: false, systemAudio: true },
  { displaySurface: 'monitor', dualPublishPolicy: 'mic-wins' }
);
assert(!monitorBlock.systemAudio && monitorBlock.blockedReason === 'monitor-no-audio', 'monitor bloqueia áudio');

// meet bridge
const meet = resolvePublishAudioSources(
  { microphone: true, systemAudio: false },
  { meetBridgeLiveMode: true }
);
assert(!meet.microphone && meet.systemAudio && meet.blockedReason === 'meet-bridge', 'meet bridge força system');

// resolvePlaybackSources
const playback = resolvePlaybackSources(mixedSources, { excludeSourceTypes: ['system'] });
assert(playback.length === 1 && playback[0].source === 'microphone', 'playback combina exclude + anti-eco');

const dualPlayback = resolvePlaybackSources(mixedSources, { allowDualPeerAudio: true });
assert(
  dualPlayback.length === 3 &&
    dualPlayback.some((s) => s.peerId === peerA && s.source === 'microphone') &&
    dualPlayback.some((s) => s.peerId === peerA && s.source === 'system'),
  'allowDualPeerAudio preserva mic+system do mesmo peer'
);

assert(
  isOwnAudioSource({ peerId: peerA, producerId: 'p1' }, { excludePeerId: peerA }),
  'isOwnAudioSource exclui peer local'
);
assert(
  isOwnAudioSource({ peerId: peerB, producerId: 'p1' }, { ownProducerIds: ['p1'] }),
  'isOwnAudioSource exclui producer proprio'
);
assert(
  !isOwnAudioSource(
    { peerId: peerB, producerId: 'p3' },
    { excludePeerId: peerA, ownProducerIds: ['p1'] }
  ),
  'isOwnAudioSource permite fonte remota'
);

assert(
  isOwnAudioSource({ peerId: 'old-host', producerId: 'p9' }, { ownPeerIds: ['old-host', 'new-host'] }),
  'isOwnAudioSource exclui peerIds proprios anteriores'
);
assert(
  normalizeRemoteAudioSources(
    [
      { peerId: 'old-host', producerId: 'p9', source: 'microphone' },
      { peerId: peerB, producerId: 'p3', source: 'microphone' }
    ],
    { ownPeerIds: ['old-host'] }
  ).length === 1,
  'normalizeRemoteAudioSources aplica ownPeerIds'
);
assert(
  resolvePlaybackSources(
    [{ peerId: 'old-host', producerId: 'p9', source: 'microphone' }],
    { ownPeerIds: ['old-host'] }
  ).length === 0,
  'resolvePlaybackSources ignora ownPeerIds'
);

assert(liveProducerId({ id: 'a', closed: false }) === 'a', 'liveProducerId retorna id vivo');
assert(liveProducerId({ id: 'a', closed: true }) === null, 'liveProducerId ignora producer fechado');
assert(liveProducerId(null) === null, 'liveProducerId trata producer ausente');

assert(
  classifyServerMessage('Nao e possivel consumir este producer com as capacidades atuais') ===
    ErrorCodes.MEDIASOUP_FAILED,
  'erro de capacidades e classificado como mediasoup'
);
assert(
  classifyServerMessage('Producer indisponivel') === ErrorCodes.MEDIASOUP_FAILED,
  'producer indisponivel e classificado como mediasoup'
);
assert(
  isTransientServerError('Producer indisponivel'),
  'producer indisponivel e transitorio'
);
assert(
  isTransientServerError('Nao e possivel consumir o proprio producer'),
  'consumo do proprio producer e transitorio'
);
assert(
  !isTransientServerError('Nao e possivel consumir este producer com as capacidades atuais'),
  'incompatibilidade real de capacidades nao e transitoria'
);
assert(
  isUnrecoverableConsumeError('Producer indisponivel'),
  'monitor nao retenta producer indisponivel'
);
assert(
  isUnrecoverableConsumeError('Nao e possivel consumir este producer com as capacidades atuais'),
  'monitor nao retenta erro de capacidades'
);

const withoutOwn = normalizeRemoteAudioSources(mixedSources, {
  excludePeerId: peerA,
  ownProducerIds: ['p3']
});
assert(withoutOwn.length === 0, 'normalizeRemoteAudioSources aplica exclude + ownProducerIds');

// near-field analyzer
assert(normalizeNearFieldGate('soft') === 'soft', 'normalizeNearFieldGate soft');
assert(normalizeNearFieldGate('bogus') === 'off', 'normalizeNearFieldGate invalid');

const fftSize = 2048;
const sampleRate = 48000;
function makeFreqData(energyByBand) {
  const data = new Uint8Array(fftSize / 2);
  const binHz = sampleRate / fftSize;
  for (const [lowHz, highHz, level] of energyByBand) {
    const lowBin = Math.floor(lowHz / binHz);
    const highBin = Math.ceil(highHz / binHz);
    for (let i = lowBin; i <= highBin && i < data.length; i++) {
      data[i] = level;
    }
  }
  return data;
}

function makeTimeData({ rms = 0.1, crest = 4 } = {}) {
  const data = new Uint8Array(fftSize);
  const peak = Math.min(127, Math.round(rms * crest * 128));
  const sampleVal = 128 + peak;
  for (let i = 0; i < data.length; i++) {
    data[i] = i % 2 === 0 ? sampleVal : 128 - peak;
  }
  return data;
}

const nearMetrics = computeNearFieldMetrics({
  freqData: makeFreqData([[80, 250, 200], [2000, 4500, 40], [400, 1200, 60]]),
  sampleRate,
  fftSize,
  timeData: makeTimeData({ rms: 0.12, crest: 5.5 })
});
const distantMetrics = computeNearFieldMetrics({
  freqData: makeFreqData([[80, 250, 30], [2000, 4500, 120], [400, 1200, 100]]),
  sampleRate,
  fftSize,
  timeData: makeTimeData({ rms: 0.1, crest: 2.5 })
});
const nearScore = combineNearFieldScore(nearMetrics, { tailScore: 0.85 });
const distantScore = combineNearFieldScore(distantMetrics, { tailScore: 0.25 });
assert(nearScore > distantScore, `near-field score (${nearScore.toFixed(2)}) > distant (${distantScore.toFixed(2)})`);

const roomPreset = normalizeMicrophoneFilterPrefs({
  speechGate: 'soft',
  noiseSuppressionMl: true,
  nearFieldGate: 'soft',
  nearFieldThreshold: 0.5,
  micSensitivity: false
});
assert(roomPreset.roomIsolation === 'soft', 'preset sala roomIsolation soft');
assert(roomPreset.nearFieldGate === 'soft', 'preset sala nearFieldGate soft (compat)');
assert(roomPreset.noiseReduction !== 'off', 'preset sala noiseReduction ativo');
assert(roomPreset.nearFieldThreshold === 0.5, 'preset sala nearFieldThreshold');
assert(roomPreset.micSensitivity === false, 'preset sala micSensitivity off (compat)');

assert(evaluateMicPublishHealth({ producerLive: false }) === 'republish', 'health: producer ausente republica');
assert(
  evaluateMicPublishHealth({
    producerLive: true,
    publishedEnergy: 0.02,
    rawEnergy: 0.02,
    ctxState: 'running',
    graphPresent: true
  }) === 'ok',
  'health: energia publicada ok'
);
assert(
  evaluateMicPublishHealth({
    producerLive: true,
    publishedEnergy: 0,
    rawEnergy: 0.02,
    ctxState: 'running',
    graphPresent: true
  }) === 'republish-raw',
  'health: grafo silencioso e raw com energia republica sem DSP'
);
assert(
  evaluateMicPublishHealth({
    producerLive: true,
    publishedEnergy: 0,
    rawEnergy: 0,
    ctxState: 'suspended',
    graphPresent: true
  }) === 'republish-raw',
  'health: AudioContext suspenso republica track crua'
);
assert(
  evaluateMicPublishHealth({
    producerLive: true,
    publishedEnergy: null,
    rawEnergy: null,
    ctxState: 'running',
    graphPresent: true
  }) === 'ok',
  'health: energia inconclusiva nao republica'
);
assert(
  evaluateMicPublishHealth({
    producerLive: true,
    publishedEnergy: null,
    rawEnergy: null,
    ctxState: 'suspended',
    graphPresent: false
  }) === 'ok',
  'health: medicao falhou sem grafo nao republica'
);
assert(
  evaluateMicPublishHealth({
    producerLive: true,
    publishedEnergy: 0,
    rawEnergy: 0,
    ctxState: 'running',
    graphPresent: true
  }) === 'no-input',
  'health: silencio no raw e no publicado e no-input'
);
assert(
  evaluateMicPublishHealth({
    producerLive: true,
    publishedEnergy: 0,
    rawEnergy: 0.02,
    ctxState: 'running',
    graphPresent: true,
    gateActive: true,
    gateOpenObserved: false
  }) === 'ok',
  'health: portao fechado com ruido na entrada nao derruba os filtros'
);
assert(
  evaluateMicPublishHealth({
    producerLive: true,
    publishedEnergy: 0,
    rawEnergy: 0.02,
    ctxState: 'running',
    graphPresent: true,
    gateActive: true,
    gateOpenObserved: true
  }) === 'republish-raw',
  'health: portao aberto com saida muda ainda republica sem DSP'
);
assert(
  evaluateMicPublishHealth({
    producerLive: true,
    publishedEnergy: 0,
    rawEnergy: 0.02,
    ctxState: 'suspended',
    graphPresent: true,
    gateActive: true,
    gateOpenObserved: false
  }) === 'republish-raw',
  'health: AudioContext suspenso vence a excecao do portao'
);

assert(micGraphIsRunning({ ctx: { state: 'running' } }) === true, 'micGraphIsRunning running');
assert(micGraphIsRunning({ ctx: { state: 'suspended' } }) === false, 'micGraphIsRunning suspended');
assert(micGraphIsRunning(null) === false, 'micGraphIsRunning null');

const hostFromApi = resolveHostMicFilterPrefs({
  apiPrefs: { gain: 2, noiseSuppressionMl: true },
  cachedPrefs: { gain: 0.5 },
  legacyGain: 1.9
});
assert(Math.abs(hostFromApi.gain - 2) < 0.02, 'host prefs: API vence cache e ganho legado');
assert(hostFromApi.noiseSuppressionMl === true, 'host prefs: API preserva RNNoise');
const hostFromCache = resolveHostMicFilterPrefs({
  cachedPrefs: { bass: 4, compressor: false },
  legacyGain: 1.9
});
assert(hostFromCache.bass === 4, 'host prefs: cache quando API vazia');
assert(Math.abs(hostFromCache.gain - 1) < 0.02, 'host prefs: cache nao herda ganho legado');
const hostFromLegacy = resolveHostMicFilterPrefs({ legacyGain: 1.8 });
assert(Math.abs(hostFromLegacy.gain - 1.8) < 0.02, 'host prefs: ganho legado entra nos defaults');
assert(hostFromLegacy.compressor === 'light', 'host prefs: legado mantem compressor padrao do host');
const hostDefaults = resolveHostMicFilterPrefs({});
assert(hostDefaults.presence === HOST_MIC_PUBLISH_DEFAULTS.presence, 'host prefs: defaults sem fonte');
assert(hostDefaults.peaking === true, 'host prefs: peaking compat espelha presence');

const deviceChoices = buildMicrophoneDeviceChoices([{ deviceId: 'dev-1', label: '  USB Mic  ' }]);
assert(deviceChoices[0].deviceId === '' && deviceChoices[0].label.includes('Microfone'), 'lista de mics sempre inclui padrao');
assert(deviceChoices[1].deviceId === 'dev-1' && deviceChoices[1].label === 'USB Mic', 'lista de mics preserva dispositivo');
assert(
  buildMicrophoneDeviceChoices([]).length === 1,
  'lista vazia ainda tem microfone padrao'
);
assert(
  resolveDefaultMicrophoneDeviceId([
    { deviceId: 'default', groupId: 'grupo-b' },
    { deviceId: 'dev-a', groupId: 'grupo-a' },
    { deviceId: 'dev-b', groupId: 'grupo-b' }
  ]) === 'dev-b',
  'padrao do sistema resolve para o deviceId concreto do mesmo grupo'
);
assert(
  resolveDefaultMicrophoneDeviceId([
    { deviceId: 'dev-a', groupId: 'grupo-a' },
    { deviceId: 'dev-b', groupId: 'grupo-b' }
  ]) === 'dev-a',
  'sem entrada default usa o primeiro dispositivo concreto'
);
assert(resolveDefaultMicrophoneDeviceId([]) === '', 'lista vazia nao resolve microfone padrao');
assert(
  /HTTPS|localhost/i.test(describeMicrophoneAccessIssue({ isSecureContext: false }) || ''),
  'contexto inseguro explica HTTPS'
);
assert(
  /permiss/i.test(
    describeMicrophoneAccessIssue({
      isSecureContext: true,
      permissionError: new Error('denied'),
      deviceCount: 0
    }) || ''
  ),
  'permissao bloqueada explica bloqueio'
);
assert(
  describeMicrophoneAccessIssue({ isSecureContext: true, deviceCount: 2 }) === null,
  'sem erro de acesso quando ha dispositivos'
);

console.log('\n=== Checklist manual (2 máquinas, mesma sala) ===');
console.log('1. Ativar Modo sala + Preset Sala compartilhada em ambos clients');
console.log('2. A fala perto do PC A → B não deve transmitir voz de A (ou muito atenuada)');
console.log('3. A fala perto do próprio mic → sem cortes de sílabas (soft + histerese)');
console.log('4. nearFieldGate off → áudio idêntico ao comportamento anterior');
console.log('5. npm run build → bundle host sem ONNX no app.bundle principal');

if (failed) {
  console.error(`\n${failed} falha(s)`);
  process.exit(1);
}
console.log('\nTodos os testes de política de áudio passaram.');
