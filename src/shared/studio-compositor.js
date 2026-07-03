function getLiveVideoTrack(stream) {
  return stream?.getVideoTracks?.().find((track) => track.readyState === 'live') || null;
}

function createHiddenVideo(stream) {
  if (!getLiveVideoTrack(stream)) return null;
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.srcObject = stream;
  video.play().catch(() => {});
  return video;
}

function drawVideoIntoRect(ctx, canvas, source, rect) {
  if (!source || source.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;
  if (!source.videoWidth || !source.videoHeight) return false;
  const x = rect.x * canvas.width;
  const y = rect.y * canvas.height;
  const w = rect.w * canvas.width;
  const h = rect.h * canvas.height;
  ctx.drawImage(source, x, y, w, h);
  return true;
}

/** Layout rects normalizados (0–1) por índice de slot. */
export function layoutRectsFor(layout, slotCount) {
  const n = Math.max(1, Math.min(slotCount, 4));
  if (layout === 'split-h' && n >= 2) {
    return [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 }
    ].slice(0, n);
  }
  if (layout === 'split-v' && n >= 2) {
    return [
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 }
    ].slice(0, n);
  }
  if (layout === 'pip-br' && n >= 2) {
    const rects = [{ x: 0, y: 0, w: 1, h: 1 }];
    for (let i = 1; i < n; i++) {
      rects.push({ x: 0.62, y: 0.62, w: 0.36, h: 0.36 });
    }
    return rects;
  }
  if (layout === 'pip-bl' && n >= 2) {
    const rects = [{ x: 0, y: 0, w: 1, h: 1 }];
    for (let i = 1; i < n; i++) {
      rects.push({ x: 0.02, y: 0.62, w: 0.36, h: 0.36 });
    }
    return rects;
  }
  return [{ x: 0, y: 0, w: 1, h: 1 }];
}

export const StudioCompositor = {
  /**
   * @param {Object} opts
   * @param {HTMLCanvasElement} [opts.canvas]
   * @param {Array<{ videoEl?: HTMLVideoElement, stream?: MediaStream }>} opts.sources
   * @param {string} [opts.layout]
   * @param {number} [opts.fps]
   */
  start({ canvas, sources = [], layout = 'full', fps = 30, width = 1280, height = 720 } = {}) {
    const targetCanvas = canvas || document.createElement('canvas');
    targetCanvas.width = width;
    targetCanvas.height = height;
    const ctx = targetCanvas.getContext('2d', { alpha: false });
    if (!ctx || typeof targetCanvas.captureStream !== 'function') {
      return null;
    }

    const rects = layoutRectsFor(layout, sources.length);
    const entries = sources.map((src, i) => {
      let video = src.videoEl || null;
      if (!video && src.stream) {
        video = createHiddenVideo(src.stream);
      }
      return { video, rect: rects[i] || rects[0], hidden: video && !src.videoEl ? video : null };
    });

    let raf = 0;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
      for (const entry of entries) {
        if (entry.video) {
          drawVideoIntoRect(ctx, targetCanvas, entry.video, entry.rect);
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
