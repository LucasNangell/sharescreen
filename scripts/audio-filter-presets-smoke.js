/**
 * Presets de filtro de audio de client chaveados pelo nome de exibicao.
 */
import {
  getAudioFilterPreset,
  saveAudioFilterPreset,
  resolveAudioFilterSubjectName
} from '../server/client-db.js';

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
  resolveAudioFilterSubjectName('client', 'Alice', 'user-1') === 'Alice',
  'client grava pelo displayName mesmo com userId'
);
assert(
  resolveAudioFilterSubjectName('client', ' alice ', 'user-1') === 'alice',
  'client usa nome trimado, nao __uid__'
);
assert(
  resolveAudioFilterSubjectName('host', 'Painel', 'user-host') === '__uid__:user-host',
  'host continua chaveado por userId'
);
assert(resolveAudioFilterSubjectName('host', 'Painel') === 'Painel', 'host sem userId usa o nome');

const stamp = Date.now();
const alice = `SmokeFilter Alice ${stamp}`;
const bob = `SmokeFilter Bob ${stamp}`;
const prefs = { gain: 2.1, compressor: true, highpass: true };

try {
  const saved = saveAudioFilterPreset('client', alice, prefs, 'user-alice');
  if (!saved.ok) {
    console.warn('[WARN] SQLite indisponivel para roundtrip:', saved.erro || 'save falhou');
  } else {
    assert(saved.preset?.name?.toLowerCase() === alice.toLowerCase(), 'subject_name e o displayName');
    assert(!String(saved.preset?.name || '').startsWith('__uid__:'), 'nao usa chave __uid__ para client');

    const byName = getAudioFilterPreset('client', alice.toLowerCase());
    assert(byName?.prefs?.gain === 2.1, 'GET por nome (NOCASE) encontra o preset');

    const otherUser = getAudioFilterPreset('client', alice, 'user-outro');
    assert(otherUser?.prefs?.gain === 2.1, 'nome tem prioridade sobre userId');

    const missing = getAudioFilterPreset('client', bob);
    assert(missing == null, 'nome novo nao tem preset');

    saveAudioFilterPreset('client', alice, { gain: 1 }, null);
  }
} catch (err) {
  const msg = String(err?.message || err);
  if (/NODE_MODULE_VERSION|Could not locate the bindings/.test(msg)) {
    console.warn('[WARN] better-sqlite3 incompativel com este Node; roundtrip SQLite nao executado');
  } else {
    throw err;
  }
}

if (failed) {
  console.error(`\n${failed} falha(s)`);
  process.exit(1);
}
console.log('\nAudio filter name smoke OK');
