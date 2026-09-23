import { readFileSync } from 'node:fs';
import { RoomRegistry } from '../server/room-registry.js';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    failed += 1;
    return;
  }
  console.log(`[OK] ${message}`);
}

function createManager(roomId) {
  return {
    roomId,
    peers: new Map(),
    hostActive: false,
    hasActiveHost() {
      return this.hostActive;
    },
    removePeer(peerId) {
      this.peers.delete(peerId);
    },
    refreshTransmissionIfSelected() {},
    destroy() {
      this.destroyed = true;
    }
  };
}

const registry = new RoomRegistry({ createManager });
const alpha = registry.createOrResumeHost({ roomPin: 'alpha-123', ownerUserId: 'host-a' });
const beta = registry.createOrResumeHost({ roomPin: 'beta-456', ownerUserId: 'host-b' });

assert(alpha.id !== beta.id, 'PINs diferentes criam salas independentes');
assert(alpha.hostToken !== beta.hostToken, 'cada sala recebe token opaco próprio');
assert(!JSON.stringify(alpha).includes('alpha-123'), 'o PIN não é retido em texto claro');

alpha.manager.hostActive = true;
beta.manager.hostActive = true;
assert(registry.getForClient('alpha-123').id === alpha.id, 'client com PIN alpha entra apenas na sala alpha');
assert(registry.getForClient('beta-456').id === beta.id, 'client com PIN beta entra apenas na sala beta');

let wrongPinRejected = false;
try {
  registry.getForClient('gamma-789');
} catch (_) {
  wrongPinRejected = true;
}
assert(wrongPinRejected, 'PIN inexistente é recusado');

let duplicateHostRejected = false;
try {
  registry.createOrResumeHost({ roomPin: 'alpha-123' });
} catch (_) {
  duplicateHostRejected = true;
}
assert(duplicateHostRejected, 'segundo host não ocupa uma sala já ativa');

alpha.manager.hostActive = false;
alpha.manager.peers.set('viewer-1', {});
assert(
  registry.createOrResumeHost({ roomPin: 'alpha-123', roomToken: alpha.hostToken }).id === alpha.id,
  'host original pode retomar a sala com clients conectados'
);

let takeoverRejected = false;
try {
  registry.createOrResumeHost({ roomPin: 'alpha-123', roomToken: 'token-errado' });
} catch (_) {
  takeoverRejected = true;
}
assert(takeoverRejected, 'token errado não assume sala em reconexão');

assert(registry.canManageRoom(alpha.id, alpha.hostToken), 'token da sala autoriza link externo da própria sala');
assert(!registry.canManageRoom(alpha.id, beta.hostToken), 'token de outra sala não autoriza link externo');

const clientHtml = readFileSync(new URL('../public/client/index.html', import.meta.url), 'utf8');
const clientSource = readFileSync(new URL('../src/client/app.js', import.meta.url), 'utf8');
assert(clientHtml.includes('id="room-pin-input"'), 'entrada do convidado mantém o campo de PIN da sala');
assert(!clientHtml.includes('client-pin-input'), 'entrada do convidado não exibe um segundo campo de PIN');
assert(!clientHtml.includes('PIN de acesso'), 'rótulo legado de PIN de acesso foi removido');
assert(clientSource.includes('roomPin: roomPin || undefined'), 'cliente envia o PIN da sala ao servidor');
assert(!clientSource.includes('clientAccessPin'), 'cliente não mantém nem envia o PIN de acesso legado');

const authModuleUrl = new URL('../server/auth-dev.js', import.meta.url).href;
const authProbe = await import(`${authModuleUrl}?client-pin-disabled=${Date.now()}`);
assert(
  JSON.stringify(authProbe.validateJoinAuth({ papel: 'client', pin: 'qualquer-valor' })) === '{}',
  'servidor não exige um PIN global adicional do convidado'
);

if (failed) {
  console.error(`\n${failed} teste(s) falharam`);
  process.exit(1);
}
console.log('\nroom-registry smoke: todos os testes passaram');
