/**
 * Mede nível RMS de uma MediaStreamTrack sem interferir na reprodução
 * (MediaStreamTrackProcessor lê frames em paralelo ao <audio>).
 */

const DEFAULT_SMOOTHING = 0.68;

function rmsFromFloat32(samples) {
  if (!samples?.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.min(1, Math.sqrt(sum / samples.length) * 5.5);
}

function rmsFromByteFrequency(freqBuf) {
  let sum = 0;
  for (let i = 0; i < freqBuf.length; i++) sum += freqBuf[i];
  return Math.min(1, (sum / freqBuf.length / 255) * 3.2);
}

function rmsFromTimeDomain(timeBuf) {
  let sum = 0;
  for (let i = 0; i < timeBuf.length; i++) {
    const n = (timeBuf[i] - 128) / 128;
    sum += n * n;
  }
  return Math.min(1, Math.sqrt(sum / timeBuf.length) * 5.5);
}

function startProcessorMeter(track, onLevel, smoothing) {
  if (typeof MediaStreamTrackProcessor === 'undefined') return null;

  let stopped = false;
  let smoothed = 0;
  const processor = new MediaStreamTrackProcessor({ track });
  const reader = processor.readable.getReader();
  const scratch = new Float32Array(2048);

  const pump = async () => {
    while (!stopped) {
      let value = null;
      try {
        const { value: val, done } = await reader.read();
        value = val;
        if (done || stopped) break;
        if (value && value.numberOfFrames > 0) {
          const n = Math.min(scratch.length, value.numberOfFrames);
          value.copyTo(scratch.subarray(0, n), { planeIndex: 0, format: 'f32-planar' });
          const raw = rmsFromFloat32(scratch.subarray(0, n));
          smoothed = smoothed * smoothing + raw * (1 - smoothing);
          onLevel(smoothed, raw);
        }
      } catch (e) {
        break;
      } finally {
        value?.close?.();
      }
    }
  };

  pump();

  return () => {
    stopped = true;
    reader.cancel().catch(() => {});
  };
}

function startAnalyserMeter(track, onLevel, smoothing) {
  let stopped = false;
  let smoothed = 0;
  let ctx = null;
  let raf = null;

  try {
    ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.45;
    const silent = ctx.createGain();
    silent.gain.value = 0;
    const stream = new MediaStream([track]);
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.connect(silent);
    silent.connect(ctx.destination);
    ctx.resume().catch(() => {});

    const freqBuf = new Uint8Array(analyser.frequencyBinCount);
    const timeBuf = new Uint8Array(analyser.fftSize);

    const tick = () => {
      if (stopped) return;
      // Reference stream to prevent garbage collection
      const dummy = stream.id;
      analyser.getByteFrequencyData(freqBuf);
      let raw = rmsFromByteFrequency(freqBuf);
      if (raw < 0.01) {
        analyser.getByteTimeDomainData(timeBuf);
        raw = Math.max(raw, rmsFromTimeDomain(timeBuf));
      }
      smoothed = smoothed * smoothing + raw * (1 - smoothing);
      onLevel(smoothed, raw);
      raf = requestAnimationFrame(tick);
    };
    tick();
  } catch {
    return null;
  }

  return () => {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    ctx?.close().catch(() => {});
  };
}

/**
 * @param {MediaStreamTrack} track
 * @param {(level: number, raw: number) => void} onLevel 0–1
 * @returns {() => void} stop
 */
export function startTrackLevelMeter(track, { onLevel, smoothing = DEFAULT_SMOOTHING } = {}) {
  if (!track || track.readyState !== 'live' || typeof onLevel !== 'function') {
    return () => {};
  }

  let stop = startProcessorMeter(track, onLevel, smoothing);
  if (stop) return stop;

  stop = startAnalyserMeter(track, onLevel, smoothing);
  return stop || (() => {});
}
