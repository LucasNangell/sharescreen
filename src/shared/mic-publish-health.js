/** Avaliação pura da saúde da publicação de microfone. */

export const MIC_ENERGY_THRESHOLD = 0.004;

function isKnownEnergy(value) {
  return value != null && Number.isFinite(Number(value));
}

/**
 * `gateActive` indica que o grafo tem portão (VAD, proximidade ou RMS); nesse caso o
 * silêncio na saída só é anômalo se o portão foi observado aberto na janela de medição.
 *
 * @param {{
 *   producerLive?: boolean,
 *   publishedEnergy?: number | null,
 *   rawEnergy?: number | null,
 *   ctxState?: string,
 *   graphPresent?: boolean,
 *   gateActive?: boolean,
 *   gateOpenObserved?: boolean
 * }} snapshot
 * @returns {'ok' | 'republish-raw' | 'republish' | 'no-input'}
 */
export function evaluateMicPublishHealth({
  producerLive = false,
  publishedEnergy,
  rawEnergy,
  ctxState = 'none',
  graphPresent = false,
  gateActive = false,
  gateOpenObserved = true
} = {}) {
  if (!producerLive) return 'republish';

  const publishedKnown = isKnownEnergy(publishedEnergy);
  const publishedOk = publishedKnown && Number(publishedEnergy) > MIC_ENERGY_THRESHOLD;
  if (publishedOk) return 'ok';

  const ctxBad =
    !!graphPresent && ctxState && ctxState !== 'running' && ctxState !== 'none';
  if (ctxBad) return 'republish-raw';

  if (!publishedKnown) return 'ok';

  if (gateActive && !gateOpenObserved) return 'ok';

  const rawKnown = isKnownEnergy(rawEnergy);
  const rawOk = rawKnown && Number(rawEnergy) > MIC_ENERGY_THRESHOLD;
  if (rawOk) return 'republish-raw';
  return 'no-input';
}

export function rmsFromTimeDomain(timeBuf) {
  if (!timeBuf?.length) return 0;
  let sum = 0;
  for (let i = 0; i < timeBuf.length; i++) {
    const n = (timeBuf[i] - 128) / 128;
    sum += n * n;
  }
  return Math.sqrt(sum / timeBuf.length) || 0;
}

export function rmsFromAnalyser(analyser) {
  if (!analyser?.getByteTimeDomainData) return 0;
  const buf = new Uint8Array(analyser.fftSize || 512);
  analyser.getByteTimeDomainData(buf);
  return rmsFromTimeDomain(buf);
}

export async function sampleTrackRms(track, durationMs = 1200) {
  if (!track || track.readyState !== 'live') return 0;
  const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextCtor) return null;
  let ctx = null;
  let max = 0;
  let measured = false;
  try {
    ctx = new AudioContextCtor({ latencyHint: 'interactive' });
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    if (ctx.state !== 'running') return null;
    const src = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    const end = Date.now() + Math.max(200, durationMs);
    while (Date.now() < end) {
      const rms = rmsFromAnalyser(analyser);
      measured = true;
      if (rms > max) max = rms;
      await new Promise((r) => setTimeout(r, 200));
    }
  } catch (_) {
    return measured ? max : null;
  } finally {
    try {
      await ctx?.close?.();
    } catch (_) {}
  }
  return measured ? max : null;
}
