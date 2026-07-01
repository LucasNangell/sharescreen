import { hasActiveMicrophoneFilter } from './mic-dsp.js';

function liveAudioTrack(track) {
  return track?.readyState === 'live' ? track : null;
}

function addTrackOnce(list, track) {
  const live = liveAudioTrack(track);
  if (!live || list.some((item) => item.track === live || item.track.id === live.id)) return;
  list.push({ track: live });
}

function matchesPeerFilter(peerId, restrictToPeerId) {
  if (!restrictToPeerId) return true;
  return String(peerId) === String(restrictToPeerId);
}

function collectOwnAudioTracks(media, { excludeSystem = false } = {}) {
  const tracks = [];
  if (!excludeSystem) {
    addTrackOnce(tracks, media?.producers?.system?.track);
    addTrackOnce(tracks, media?.localScreenStream?.getAudioTracks?.()[0]);
  }
  addTrackOnce(tracks, media?.producers?.microphone?.track);
  addTrackOnce(tracks, media?.getLocalMicrophoneTrack?.());
  return tracks;
}

function collectMonitorAudioTracks(hostAudioMonitor, mutedClients, restrictToPeerId = null) {
  const sources = [];
  if (!hostAudioMonitor) return sources;

  const muted = new Set([...(mutedClients || [])].map(String));
  const peerFilter = restrictToPeerId ? String(restrictToPeerId) : null;

  if (!peerFilter) {
    addTrackOnce(sources, hostAudioMonitor.getMixedOutputTrack?.());
  }

  for (const ch of hostAudioMonitor.channels?.values() || []) {
    if (muted.has(String(ch.peerId))) continue;
    if (peerFilter && !matchesPeerFilter(ch.peerId, peerFilter)) continue;
    const prefs = hostAudioMonitor.getFilterPrefs?.(ch.peerId) || {};
    if (hasActiveMicrophoneFilter(prefs)) continue;
    addTrackOnce(sources, ch.consumer?.track);
  }

  if (!sources.length) {
    for (const ch of hostAudioMonitor.channels?.values() || []) {
      if (muted.has(String(ch.peerId))) continue;
      if (peerFilter && !matchesPeerFilter(ch.peerId, peerFilter)) continue;
      addTrackOnce(sources, ch.consumer?.track);
    }
  }

  if (!sources.length && !peerFilter) {
    for (const track of hostAudioMonitor.stream?.getAudioTracks?.() || []) {
      addTrackOnce(sources, track);
    }
  }

  return sources;
}

export const RecordingAudioMixer = {
  async build({
    hostAudioMonitor,
    media,
    own = false,
    mutedClients,
    excludeOwnSystem = false,
    restrictToPeerId = null
  } = {}) {
    await hostAudioMonitor?.resume?.();

    const sources = collectMonitorAudioTracks(hostAudioMonitor, mutedClients, restrictToPeerId);
    if (own) {
      for (const source of collectOwnAudioTracks(media, { excludeSystem: excludeOwnSystem })) {
        addTrackOnce(sources, source.track);
      }
    }

    if (!sources.length) {
      return { track: null, stop() {} };
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return { track: sources[0].track, stop() {} };
    }

    const ctx = new AudioContextCtor();
    const dest = ctx.createMediaStreamDestination();
    const nodes = [];

    for (const source of sources) {
      try {
        const stream = new MediaStream([source.track]);
        const input = ctx.createMediaStreamSource(stream);
        const gain = ctx.createGain();
        gain.gain.value = 1;
        input.connect(gain);
        gain.connect(dest);
        nodes.push({ input, gain });
      } catch (err) {
        console.warn('[RecordingAudioMixer] falha ao conectar audio', err);
      }
    }

    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    const track = dest.stream.getAudioTracks()[0] || null;
    return {
      track: liveAudioTrack(track),
      stop() {
        for (const node of nodes) {
          try {
            node.input.disconnect();
          } catch (_) {}
          try {
            node.gain.disconnect();
          } catch (_) {}
        }
        ctx.close().catch(() => {});
      }
    };
  }
};
