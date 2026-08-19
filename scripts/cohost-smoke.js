/**
 * Smoke da persistencia e autorizacao de co-host (sem tocar na transmissao).
 */
import { RoomManager } from '../server/room-manager.js';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    failed += 1;
    return;
  }
  console.log(`[OK] ${message}`);
}

function makeWs(ip = '127.0.0.1') {
  const messages = [];
  return {
    readyState: 1,
    messages,
    _socket: { remoteAddress: ip },
    send(raw) {
      try {
        messages.push(JSON.parse(raw));
      } catch {
        messages.push(raw);
      }
    },
    close() {
      this.readyState = 3;
    }
  };
}

function quietRoom() {
  const room = new RoomManager();
  room.emitRoomState = () => {};
  room.notifyHostState = () => {};
  room.broadcastAudioSources = () => {};
  room.broadcastActiveProducer = () => {};
  room.broadcastToRoom = () => {};
  return room;
}

const room = quietRoom();
const hostWs = makeWs();
const host = room.addPeer(hostWs, 'host', 'Painel');
const clientWs = makeWs();
const client = room.addPeer(clientWs, 'client', 'Alice', 'PC-ALICE');

room.selectedPeerId = client.id;
room.transmissionPaused = false;
const selectedBefore = room.selectedPeerId;
const pausedBefore = room.transmissionPaused;

const hostAsTarget = room.setCoHost(host.id, true);
assert(!hostAsTarget.ok, 'host nao pode ser promovido a co-host');

const first = room.setCoHost(client.id, true);
assert(first.ok && !first.unchanged, 'promocao inicial ok');
assert(client.isCoHost === true, 'flag isCoHost no peer');
assert(room.displayControllerIds.has(client.id), 'co-host entra em displayControllerIds');
assert(room.selectedPeerId === selectedBefore, 'promocao nao altera selectedPeerId');
assert(room.transmissionPaused === pausedBefore, 'promocao nao altera pause');

const promoted = clientWs.messages.filter((m) => m.type === 'promovidoCoHost');
assert(promoted.length === 1, 'envia promovidoCoHost uma vez');
assert(promoted[0].payload?.nome === 'Alice', 'payload inclui nome');
assert(!promoted[0].payload?.hostToken, 'payload nao inclui hostToken');

const again = room.setCoHost(client.id, true);
assert(again.ok && again.unchanged, 'promocao idempotente');
assert(
  clientWs.messages.filter((m) => m.type === 'promovidoCoHost').length === 1,
  'nao reenvia promovidoCoHost se ja era co-host'
);

clientWs.readyState = 3;
const clientWs2 = makeWs();
const client2 = room.addPeer(clientWs2, 'client', 'Alice', 'PC-ALICE');
assert(client2.id !== client.id, 'reconexao gera peerId novo');
assert(client2.isCoHost === true, 'isCoHost restaurado pela identidade');
assert(room.displayControllerIds.has(client2.id), 'display control restaurado no novo peerId');
assert(room.selectedPeerId === selectedBefore || room.selectedPeerId === null, 'reconexao nao promove role');
assert(client2.role === 'client', 'reconexao mantem role client');

const loggedWs = makeWs('10.0.0.8');
const logged = room.addPeer(loggedWs, 'client', 'Bob', 'PC-BOB', { userId: 42 });
room.setCoHost(logged.id, true);
loggedWs.readyState = 3;
const logged2 = room.addPeer(makeWs('10.0.0.8'), 'client', 'Bob', 'PC-BOB', { userId: 42 });
assert(logged2.isCoHost === true, 'identidade por userId sobrevive reconexao');
room.setCoHost(logged2.id, false);

room.selectedPeerId = client2.id;
const selectedLive = room.selectedPeerId;
room.removePeer(host.id);
assert(client2.role === 'client', 'sucesso de host nao muta role do co-host client');
assert(client2.isCoHost === true, 'sucesso de host preserva isCoHost');
assert(room.actingHostPeerId === client2.id, 'actingHostPeerId aponta para o co-host');
assert(room.selectedPeerId === selectedLive, 'saida do host nao derruba a transmissao selecionada');
assert(room.getSnapshotHostPeer()?.id === client2.id, 'snapshot usa acting host como fallback');

const demote = room.setCoHost(client2.id, false);
assert(demote.ok && !demote.unchanged, 'democao ok');
assert(client2.isCoHost === false, 'flag removida');
assert(!room.displayControllerIds.has(client2.id), 'display control revogado');
const demoted = clientWs2.messages.some((m) => m.type === 'demovidoCoHost');
assert(demoted, 'envia demovidoCoHost');

clientWs2.readyState = 3;
const client3 = room.addPeer(makeWs(), 'client', 'Alice', 'PC-ALICE');
assert(client3.isCoHost === false, 'democao remove identidade persistida');

if (failed) {
  console.error(`\n${failed} teste(s) falharam`);
  process.exit(1);
}
console.log('\nco-host smoke: todos os testes passaram');
