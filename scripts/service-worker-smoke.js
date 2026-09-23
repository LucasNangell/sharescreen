import fs from 'fs';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    failed += 1;
    return;
  }
  console.log(`[OK] ${message}`);
}

for (const file of ['public/client/sw.js', 'public/host/sw.js']) {
  const source = fs.readFileSync(file, 'utf8');
  assert(!/addEventListener\(['"]fetch['"]/.test(source), `${file} não intercepta requisições de rede`);
  assert(source.includes("self.skipWaiting()"), `${file} ativa a nova versão imediatamente`);
}

if (failed) {
  console.error(`\n${failed} teste(s) falharam`);
  process.exit(1);
}
console.log('\nservice-worker smoke: todos os testes passaram');
