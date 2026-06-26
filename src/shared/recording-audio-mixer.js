function liveAudioTrack(track) {
  return track?.readyState === 'live' ? track : null;
}

function addTrackOnce(list, track) {
  const live = liveAudioTrack(track);
  if (!live || list.some((item) => item.track === live || item.track.id === live.id)) return;
  list.push({ track: live });
}

function collectOwnAudioTracks(media) {
  const tracks = [];
  addTrackOnce(tracks, media?.producers?.system?.track);
  addTrackOnce(tracks, media?.localScreenStream?.getAudioTracks?.()[0]);
  addTrackOnce(tracks, media?.producers?.microphone?.track);
  addTrackOnce(tracks, media?.getLocalMicrophoneTrack?.());
  return tracks;
}

export const RecordingAudioMixer = {
  async build({ hostAudioMonitor, media, own = false } = {}) {
    await hostAudioMonitor?.resume?.();

    const sources = [];
    addTrackOnce(sources, hostAudioMonitor?.getMixedOutputTrack?.());
    if (own) {
      for (const source of collectOwnAudioTracks(media)) {
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
