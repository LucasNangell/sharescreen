import { createChromaRenderer } from './lt-chroma.js';

const REF_WIDTH = 1920;

let overlayEl = null;
let canvasEl = null;
let videoEl = null;
let renderer = null;
let currentConfig = null;
let lastSessionKey = null;

function ensureElements() {
  if (!overlayEl) overlayEl = document.getElementById('lt-overlay');
  if (!canvasEl) canvasEl = document.getElementById('lt-overlay-canvas');
  if (!overlayEl || !canvasEl) return false;
  return true;
}

function ensureVideo() {
  if (videoEl) return videoEl;
  videoEl = document.createElement('video');
  videoEl.muted = true;
  videoEl.playsInline = true;
  videoEl.loop = false;
  videoEl.preload = 'auto';
  videoEl.hidden = true;
  document.body.appendChild(videoEl);
  return videoEl;
}

function buildSessionKey(selectedPeerId, config) {
  if (!selectedPeerId || !config) return null;
  return `${selectedPeerId}:${config.updatedAt || config.videoUrl || ''}`;
}

function scaleOverlaySize(config, previewArea) {
  const areaWidth = previewArea?.clientWidth || window.innerWidth;
  const scale = areaWidth / REF_WIDTH;
  const width = Math.max(40, Math.round((config.width || 640) * scale));
  const height = Math.max(24, Math.round((config.height || 360) * scale));
  return { width, height };
}

function applyOverlayLayout(config, previewArea) {
  if (!overlayEl || !config) return;
  const { width, height } = scaleOverlaySize(config, previewArea);
  overlayEl.style.width = `${width}px`;
  overlayEl.style.height = `${height}px`;
  canvasEl.style.width = '100%';
  canvasEl.style.height = '100%';
}

function bindVideoEnded(video) {
  video.onended = () => {
    renderer?.stop();
    renderer?.drawOnce();
  };
}

function startPlayback(video, config, area) {
  applyOverlayLayout(config, area);
  renderer.drawOnce();
  renderer.start();
  overlayEl.hidden = false;
  video.currentTime = 0;
  bindVideoEnded(video);
  video.play().catch(() => {});
}

export function syncLtOverlay(config, { previewArea, active = true, selectedPeerId = null } = {}) {
  if (!ensureElements()) return;

  const area = previewArea || document.getElementById('preview-area') || document.querySelector('.preview-area');

  if (!active || !config?.videoUrl) {
    hideLtOverlay();
    return;
  }

  const sessionKey = buildSessionKey(selectedPeerId, config);
  const isNewSession = sessionKey !== lastSessionKey;
  currentConfig = config;
  const video = ensureVideo();
  video.loop = false;

  if (!isNewSession) {
    applyOverlayLayout(config, area);
    if (video.paused && !video.ended && video.readyState >= 2) {
      renderer?.start();
      video.play().catch(() => {});
    }
    if (!overlayEl.hidden) return;
    if (video.ended) return;
  }

  lastSessionKey = sessionKey;

  if (renderer) {
    renderer.stop();
    renderer = null;
  }

  renderer = createChromaRenderer({
    video,
    canvas: canvasEl,
    chromaColor: config.chromaColor,
    chromaTolerance: config.chromaTolerance
  });

  applyOverlayLayout(config, area);

  const sameSrc = video.dataset.ltSrc === config.videoUrl;
  video.dataset.ltSrc = config.videoUrl;

  const onReady = () => startPlayback(video, config, area);

  if (sameSrc && video.readyState >= 2) {
    onReady();
    return;
  }

  video.onloadeddata = onReady;
  video.src = config.videoUrl;
  video.load();
}

export function pauseLtOverlay() {
  if (videoEl && !videoEl.paused) videoEl.pause();
  renderer?.stop();
  renderer?.drawOnce();
}

export function hideLtOverlay() {
  lastSessionKey = null;
  currentConfig = null;
  if (renderer) {
    renderer.stop();
    renderer = null;
  }
  if (overlayEl) overlayEl.hidden = true;
  if (videoEl) {
    videoEl.onended = null;
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();
    delete videoEl.dataset.ltSrc;
  }
}

export function refreshLtOverlayLayout(previewArea) {
  if (!currentConfig || !overlayEl || overlayEl.hidden) return;
  applyOverlayLayout(currentConfig, previewArea);
}

let resizeBound = false;

export function bindLtOverlayResize(previewArea) {
  if (resizeBound) return;
  resizeBound = true;
  window.addEventListener('resize', () => {
    refreshLtOverlayLayout(previewArea || document.getElementById('preview-area'));
  });
}

export function getLtOverlayConfigFromTransmission(tx) {
  return tx?.lowerThird || null;
}
