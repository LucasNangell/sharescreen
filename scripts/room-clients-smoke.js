/**
 * Smoke: reconciliação do roster de participantes (saída de client).
 */
import {
  hasAuthoritativeRoomRoster,
  mergeRoomClientEntry,
  mergeRoomClients,
  reconcileRoomClients,
  resolveRoomClients
} from '../src/shared/transmission.js';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    failed += 1;
    return;
  }
  console.log(`[OK] ${message}`);
}

const a = { id: 'a', displayName: 'Alice', producerIds: { video: 'v-a' } };
const b = { id: 'b', displayName: 'Bob' };
const c = { id: 'c', displayName: 'Carol' };
const mergedAudio = mergeRoomClientEntry(
  {
    id: 'a',
    displayName: 'Alice',
    hasAudio: true,
    hasMicrophone: true,
    producerIds: { microphone: 'm-a' }
  },
  {
    id: 'a',
    displayName: 'Alice',
    hasVideo: true,
    hasAudio: false,
    producerIds: { video: 'v-a' }
  }
);
assert(mergedAudio.producerIds?.microphone === 'm-a', 'merge preserva producer de microfone frente a snapshot so-video');
assert(mergedAudio.producerIds?.video === 'v-a', 'merge une producer de video ao de audio');
assert(mergedAudio.hasAudio === true, 'hasAudio derivado permanece true com microphone vivo');
assert(mergedAudio.hasMicrophone === true, 'hasMicrophone derivado permanece true com microphone vivo');

const stoppedMic = mergeRoomClientEntry(
  {
    id: 'a',
    hasAudio: true,
    hasMicrophone: true,
    producerIds: { video: 'v-a', microphone: 'm-a' }
  },
  {
    id: 'a',
    hasVideo: true,
    hasAudio: false,
    producerIds: { video: 'v-a', microphone: null }
  }
);
assert(!stoppedMic.producerIds?.microphone, 'snapshot autoritativo com microphone null remove o slot');
assert(stoppedMic.hasAudio === false, 'hasAudio derivado fica false sem producer de audio');

const existing = [a, b, c];
const incomingTwo = [
  { id: 'a', displayName: 'Alice' },
  { id: 'b', displayName: 'Bob' }
];

const removed = reconcileRoomClients(existing, incomingTwo, { allowRemovals: true });
assert(removed.length === 2, 'roster autoritativo 3→2 remove o client que saiu');
assert(!removed.some((p) => p.id === 'c'), 'id removido nao volta na lista');
assert(removed.find((p) => p.id === 'a')?.producerIds?.video === 'v-a', 'campos locais do id restante sao mesclados');

const kept = reconcileRoomClients(existing, incomingTwo, { allowRemovals: false });
assert(kept.length === 3, 'merge aditivo preserva ids ausentes no incoming');
assert(kept.some((p) => p.id === 'c'), 'merge aditivo mantem o client que sairia');

const merged = mergeRoomClients(existing, incomingTwo);
assert(merged.length === 3, 'mergeRoomClients continua sem remover ids');

assert(hasAuthoritativeRoomRoster({ clients: [] }), 'clients vazio ainda e roster autoritativo');
assert(hasAuthoritativeRoomRoster({ peers: [] }), 'peers vazio ainda e roster autoritativo');
assert(!hasAuthoritativeRoomRoster({ videoProducers: [{ peerId: 'x', producerId: 'p' }] }), 'so videoProducers nao e autoritativo');

const fromPartial = resolveRoomClients({
  videoProducers: [{ peerId: 'c', producerId: 'v-c', name: 'Carol' }]
});
const additive = reconcileRoomClients(existing, fromPartial, { allowRemovals: false });
assert(additive.some((p) => p.id === 'a') && additive.some((p) => p.id === 'b'), 'snapshot parcial nao apaga o restante da lista');

const promoted = mergeRoomClientEntry(
  {
    id: 'a',
    displayName: 'Alice',
    isCoHost: false,
    hasVideo: true,
    producerIds: { video: 'v-a', microphone: 'm-a' }
  },
  {
    id: 'a',
    displayName: 'Alice',
    isCoHost: true,
    permissions: { isCoHost: true },
    hasVideo: true,
    producerIds: { video: 'v-a' }
  }
);
assert(promoted.isCoHost === true, 'snapshot incoming isCoHost vence score local');
assert(promoted.permissions?.isCoHost === true, 'permissions.isCoHost incoming vence merge');

const demoted = mergeRoomClientEntry(
  {
    id: 'a',
    isCoHost: true,
    hasVideo: true,
    producerIds: { video: 'v-a', microphone: 'm-a' }
  },
  {
    id: 'a',
    isCoHost: false,
    permissions: { isCoHost: false },
    hasVideo: true,
    producerIds: { video: 'v-a' }
  }
);
assert(demoted.isCoHost === false, 'snapshot incoming isCoHost false revoga co-host');

if (failed) {
  console.error(`\n${failed} falha(s)`);
  process.exit(1);
}
console.log('\nTodos os testes de roster de participantes passaram.');
