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

const workletPath = 'public/shared/rnnoise/NoiseSuppressorWorklet.js';
const source = fs.readFileSync(workletPath, 'utf8');

assert(source.includes('registerProcessor'), 'worklet RNNoise registra o processador');
assert(
  !/^\s*import\s/m.test(source),
  'worklet RNNoise não depende de imports relativos no navegador'
);
assert(
  !/from\s*["']\.\//.test(source),
  'worklet RNNoise não referencia módulos sem extensão'
);

if (failed) {
  console.error(`\n${failed} teste(s) falharam`);
  process.exit(1);
}

console.log('\naudio-ml-assets smoke: todos os testes passaram');
