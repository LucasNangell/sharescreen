import { canAccessPendingRecordingDownloads } from '../server/recording-downloads.js';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    failed += 1;
    return;
  }
  console.log(`[OK] ${message}`);
}

assert(
  canAccessPendingRecordingDownloads({ user: { id: 'host-1' } }),
  'sessão autenticada do host acessa a lista sem depender de token em memória'
);
assert(
  canAccessPendingRecordingDownloads({ requiredToken: 'token-legado', suppliedToken: 'token-legado' }),
  'token legado correto continua autorizado'
);
assert(
  !canAccessPendingRecordingDownloads({ requiredToken: 'token-legado', suppliedToken: 'token-incorreto' }),
  'token legado incorreto é recusado'
);
assert(
  !canAccessPendingRecordingDownloads({}),
  'requisição sem sessão nem token é recusada'
);

if (failed) {
  console.error(`\n${failed} teste(s) falharam`);
  process.exit(1);
}
console.log('\nrecording-download access smoke: todos os testes passaram');
