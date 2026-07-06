import { defaultFramesForLayout, FULL_FRAME } from './studio-state.js';

function getLiveVideoTrack(stream) {
  return stream?.getVideoTracks?.().find((track) => track.readyState === 'live') || null;
}

function createHiddenVideo(stream, ownerDocument = document) {
  if (!getLiveVideoTrack(stream)) return null;
  const video = ownerDocument.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.style.cssText =
    'position:fixed;left:-9999px;top:0;width:1920px;height:1080px;opacity:0;pointer-events:none';
  video.srcObject = stream;
  video.play().catch(() => {});
  return video;
}

function toPixelRect(rect, canvasW, canvasH) {
  return {
    x: Math.round(rect.x * canvasW),
    y: Math.round(rect.y * canvasH),
    w: Math.max(2, Math.round(rect.w * canvasW)),
    h: Math.max(2, Math.round(rect.h * canvasH))
  };
}

function drawVideoWithCropAndFrame(ctx, canvas, source, crop, frame) {
  if (!source || source.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;
  const vw = source.videoWidth;
  const vh = source.videoHeight;
  if (!vw || !vh) return false;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const c = crop || FULL_FRAME;
  const f = frame || FULL_FRAME;

  const sx = Math.round(c.x * vw);
  const sy = Math.round(c.y * vh);
  const sw = Math.max(2, Math.round(c.w * vw));
  const sh = Math.max(2, Math.round(c.h * vh));

  const dest = toPixelRect(f, canvas.width, canvas.height);

  ctx.drawImage(source, sx, sy, sw, sh, dest.x, dest.y, dest.w, dest.h);
  return true;
}

/** @deprecated use defaultFramesForLayout from studio-state */
export function layoutRectsFor(layout, slotCount) {
  return defaultFramesForLayout(layout, slotCount);
}

/** Dimensões de saída do compositor com base nas fontes reais (preserva qualidade). */
export function resolveCompositorDimensions(sources = [], { maxWidth = 1920, maxHeight = 1080 } = {}) {
  let srcW = 1280;
  let srcH = 720;

  for (const src of sources) {
    const video = src.videoEl || null;
    const stream = src.stream || video?.srcObject;
    const track = stream?.getVideoTracks?.()?.[0];
    const settings = track?.getSettings?.() || {};

    if (video?.videoWidth > 0 && video?.videoHeight > 0) {
      srcW = Math.max(srcW, video.videoWidth);
      srcH = Math.max(srcH, video.videoHeight);
    } else if (settings.width && settings.height) {
      srcW = Math.max(srcW, settings.width);
      srcH = Math.max(srcH, settings.height);
    }
  }

  const aspect = srcW / Math.max(1, srcH);
  let width = Math.min(maxWidth, Math.max(1280, srcW));
  let height = Math.round(width / aspect);
  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspect);
  }
  width = Math.max(2, width - (width % 2));
  height = Math.max(2, height - (height % 2));
  return { width, height };
}

function resolveFrameForSlot(slot, layout, slotCount, index) {
  if (slot?.frameEdited && slot?.frame) return slot.frame;
  if (slot?.frame && (slotCount === 1 || slot.frameEdited)) return slot.frame;
  const defaults = defaultFramesForLayout(layout, slotCount);
  return defaults[index] || slot?.frame || FULL_FRAME;
}

export const StudioCompositor = {
  /**
   * @param {Object} opts
   * @param {HTMLCanvasElement} [opts.canvas]
   * @param {Document} [opts.ownerDocument]
   * @param {Array<{ videoEl?: HTMLVideoElement, stream?: MediaStream, slot?: object }>} opts.sources
   * @param {string} [opts.layout]
   * @param {number} [opts.fps]
   */
  start({
    canvas,
    sources = [],
    layout = 'full',
    fps = 30,
    width = 1280,
    height = 720,
    ownerDocument = document
  } = {}) {
    const doc = ownerDocument || document;
    const targetCanvas = canvas || doc.createElement('canvas');
    targetCanvas.width = width;
    targetCanvas.height = height;
    const ctx = targetCanvas.getContext('2d', { alpha: false });
    if (!ctx || typeof targetCanvas.captureStream !== 'function') {
      return null;
    }

    const slotCount = sources.length;
    const entries = sources.map((src, i) => {
      let video = src.videoEl || null;
      if (!video && src.stream) {
        video = createHiddenVideo(src.stream, doc);
      }
      const frame = resolveFrameForSlot(src.slot, layout, slotCount, i);
      const crop = src.slot?.crop || FULL_FRAME;
      return {
        video,
        crop,
        frame,
        hidden: video && !src.videoEl ? video : null
      };
    });

    let raf = 0;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
      for (const entry of entries) {
        if (entry.video) {
          drawVideoWithCropAndFrame(ctx, targetCanvas, entry.video, entry.crop, entry.frame);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    const capturedStream = targetCanvas.captureStream(fps);

    return {
      stream: capturedStream,
      canvas: targetCanvas,
      stop() {
        stopped = true;
        if (raf) cancelAnimationFrame(raf);
        for (const track of capturedStream.getTracks()) {
          try {
            track.stop();
          } catch (_) {}
        }
        for (const entry of entries) {
          if (entry.hidden) {
            entry.hidden.pause();
            entry.hidden.srcObject = null;
          }
        }
      }
    };
  }
};
