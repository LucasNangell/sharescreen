/**
 * Testes unitários leves da política de áudio (Node).
 */
import {
  pickAntiEchoSources,
  resolvePublishAudioSources,
  resolvePlaybackSources
} from '../src/shared/audio-policy.js';
import { normalizeRemoteAudioSources } from '../src/shared/audio-sources.js';

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

console.log('\n=== Checklist manual (2 máquinas + fones) ===');
console.log('1. Client mic+system marcados → só mic publicado');
console.log('2. Client aba com áudio → system publicado; Meet bridge exclui system na reprodução');
console.log('3. Client tela inteira com áudio → sem track publicado + aviso');
console.log('4. Host aplica preset → primeiro áudio já filtrado');
console.log('5. Gravação com 2 clients → sem duplicação mic+system');
console.log('6. Trocar filtro em tempo real → rebuild sem reconectar');

if (failed) {
  console.error(`\n${failed} falha(s)`);
  process.exit(1);
}
console.log('\nTodos os testes de política de áudio passaram.');
