import { buildIceListenIps, resolveAnnouncedIp } from '../server/network.js';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    failed += 1;
    return;
  }
  console.log(`[OK] ${message}`);
}

const publicIp = '203.0.113.42';
const announced = resolveAnnouncedIp(publicIp);
assert(announced === publicIp, 'ANNOUNCED_IP explícito é preservado para ICE');

const candidates = buildIceListenIps('10.0.0.8', publicIp);
assert(
  candidates.some((entry) => entry.announcedIp === publicIp),
  'candidato ICE público é incluído para clients externos'
);
assert(
  candidates.every((entry) => entry.ip === '0.0.0.0'),
  'mediasoup escuta em todas as interfaces locais'
);

if (failed) {
  console.error(`\n${failed} teste(s) falharam`);
  process.exit(1);
}
console.log('\nice-config smoke: todos os testes passaram');
