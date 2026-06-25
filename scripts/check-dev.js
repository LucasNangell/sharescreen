import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;

function ok(msg) {
  console.log(`[OK] ${msg}`);
}

function fail(msg) {
  console.error(`[FAIL] ${msg}`);
  failed += 1;
}

console.log('=== ShareScreen check (DEV) ===\n');

for (const f of fs.readdirSync(path.join(root, 'server')).filter((x) => x.endsWith('.js'))) {
  const r = spawnSync(process.execPath, ['--check', path.join(root, 'server', f)], {
    stdio: 'pipe'
  });
  if (r.status === 0) ok(`server/${f}`);
  else fail(`server/${f} sintaxe inválida`);
}

const required = [
  'src/host/app.js',
  'src/client/app.js',
  'src/shared/signaling-client.js',
  'src/shared/media-client.js',
  'public/host/app.bundle.js',
  'public/client/app.bundle.js'
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) ok(rel);
  else fail(`ausente: ${rel}`);
}

if (failed) {
  console.log(`\n${failed} falha(s)`);
  process.exit(1);
}
console.log('\nTodos os checks passaram.');
