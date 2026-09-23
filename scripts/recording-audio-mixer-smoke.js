/**
 * Smoke do mixer de gravação: mic e sistema entram juntos, excludeSystem omite só o sistema.
 */
import {
  collectOwnAudioTracks,
  collectMonitorAudioTracks
} from '../src/shared/recording-audio-mixer.js';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    failed += 1;
    return;
  }
  console.log(`[OK] ${message}`);
}

function liveTrack(id) {
  return { id, readyState: 'live' };
}

const micTrack = liveTrack('mic');
const systemTrack = liveTrack('sys');
const displayAudio = liveTrack('display');

const mediaBoth = {
  producers: {
    microphone: { track: micTrack },
    system: { track: systemTrack }
  },
  localScreenStream: { getAudioTracks: () => [displayAudio] },
  getLocalMicrophoneTrack: () => micTrack
};

const ownBoth = collectOwnAudioTracks(mediaBoth);
assert(
  ownBoth.some((s) => s.track === micTrack) && ownBoth.some((s) => s.track === systemTrack),
  'gravação própria inclui mic e sistema juntos'
);
assert(
  ownBoth.some((s) => s.track === displayAudio),
  'gravação própria inclui audio do display quando distinto'
);

const ownExclude = collectOwnAudioTracks(mediaBoth, { excludeSystem: true });
assert(
  ownExclude.some((s) => s.track === micTrack) &&
    !ownExclude.some((s) => s.track === systemTrack) &&
    !ownExclude.some((s) => s.track === displayAudio),
  'excludeSystem omite só o áudio de sistema/aba'
);

const mediaMicOnly = {
  producers: { microphone: { track: micTrack }, system: { track: null } },
  localScreenStream: { getAudioTracks: () => [] },
  getLocalMicrophoneTrack: () => micTrack
};
const ownMic = collectOwnAudioTracks(mediaMicOnly);
assert(
  ownMic.length === 1 && ownMic[0].track === micTrack,
  'gravação só com microfone permanece inalterada'
);

const remoteMic = liveTrack('remote-mic');
const remoteSys = liveTrack('remote-sys');
const monitor = {
  channels: new Map([
    ['a:microphone', { peerId: 'a', consumer: { track: remoteMic } }],
    ['a:system', { peerId: 'a', consumer: { track: remoteSys } }],
    ['b:microphone', { peerId: 'b', consumer: { track: liveTrack('b-mic') } }]
  ])
};

const allRemote = collectMonitorAudioTracks(monitor, []);
assert(allRemote.length === 3, 'monitor coleta mic e sistema de todos os peers');

const mutedB = collectMonitorAudioTracks(monitor, ['b']);
assert(
  mutedB.length === 2 && mutedB.every((s) => s.track.id !== 'b-mic'),
  'peer silenciado nao entra no mix da gravacao'
);

const onlyA = collectMonitorAudioTracks(monitor, [], 'a');
assert(
  onlyA.length === 2 && onlyA.every((s) => s.track.id.startsWith('remote')),
  'restrictToPeerId mantem mic e sistema do peer'
);

if (failed) {
  console.error(`\n${failed} falha(s)`);
  process.exit(1);
}
console.log('\nTodos os testes do mixer de gravacao passaram.');
