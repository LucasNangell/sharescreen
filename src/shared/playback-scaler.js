import { getVideoContentRect } from './drawing-primitives.js';

const SCALE_ON_THRESHOLD = 0.98;

export function shouldPresentScaled(videoW, videoH, cssW, cssH, dpr = 1) {
  const vw = Number(videoW) || 0;
  const vh = Number(videoH) || 0;
  const cw = Number(cssW) || 0;
  const ch = Number(cssH) || 0;
  const ratio = Number(dpr) > 0 ? Number(dpr) : 1;
  if (vw < 2 || vh < 2 || cw < 2 || ch < 2) return false;
  return Math.min(cw / vw, ch / vh) * ratio < SCALE_ON_THRESHOLD;
}

export function attachPlaybackScaler({ video, container } = {}) {
  const host = container || video?.parentElement;
  if (!video || !host || typeof document === 'undefined') {
    return { detach() {} };
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'playback-scale-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  if (video.nextSibling) host.insertBefore(canvas, video.nextSibling);
  else host.appendChild(canvas);

  const ctx = canvas.getContext('2d', { alpha: false });
  let stopped = false;
  let active = false;
  let rvfcHandle = null;
  let rafHandle = 0;
  let resizeObserver = null;

  function setCanvasActive(next) {
    if (active === next) return;
    active = next;
    canvas.hidden = !next;
    video.style.opacity = next ? '0' : '';
    if (!next && ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function cancelLoop() {
    if (rvfcHandle != null && typeof video.cancelVideoFrameCallback === 'function') {
      try {
        video.cancelVideoFrameCallback(rvfcHandle);
      } catch (_) {}
    }
    rvfcHandle = null;
    if (rafHandle) cancelAnimationFrame(rafHandle);
    rafHandle = 0;
  }

  function scheduleNext() {
    if (stopped) return;
    if (typeof video.requestVideoFrameCallback === 'function') {
      rvfcHandle = video.requestVideoFrameCallback(() => drawFrame());
      return;
    }
    rafHandle = requestAnimationFrame(() => drawFrame());
  }

  function drawFrame() {
    if (stopped) return;
    rvfcHandle = null;
    rafHandle = 0;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cssW = host.clientWidth;
    const cssH = host.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    const wantScaled =
      !document.hidden &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      shouldPresentScaled(vw, vh, cssW, cssH, dpr);

    if (!wantScaled || !ctx) {
      setCanvasActive(false);
      scheduleNext();
      return;
    }

    setCanvasActive(true);
    const bw = Math.max(1, Math.round(cssW * dpr));
    const bh = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }

    const rect = getVideoContentRect(video, host);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (rect.width > 0 && rect.height > 0) {
      ctx.drawImage(video, rect.x, rect.y, rect.width, rect.height);
    }
    scheduleNext();
  }

  function onVisibility() {
    if (stopped) return;
    cancelLoop();
    scheduleNext();
  }

  canvas.hidden = true;
  video.addEventListener('loadedmetadata', onVisibility);
  video.addEventListener('resize', onVisibility);
  video.addEventListener('play', onVisibility);
  video.addEventListener('playing', onVisibility);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', onVisibility);
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => onVisibility());
    resizeObserver.observe(host);
  }
  scheduleNext();

  return {
    detach() {
      if (stopped) return;
      stopped = true;
      cancelLoop();
      setCanvasActive(false);
      video.style.opacity = '';
      video.removeEventListener('loadedmetadata', onVisibility);
      video.removeEventListener('resize', onVisibility);
      video.removeEventListener('play', onVisibility);
      video.removeEventListener('playing', onVisibility);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onVisibility);
      resizeObserver?.disconnect();
      resizeObserver = null;
      canvas.remove();
    }
  };
}
