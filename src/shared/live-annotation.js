const DEFAULT_COLOR = '#e53935';
const DEFAULT_WIDTH = 3;
const FADE_DELAY_MS = 3000;
const FADE_DURATION_MS = 400;
const SEND_THROTTLE_MS = 32;

/**
 * Calcula o retângulo do vídeo renderizado com object-fit: contain.
 */
export function getVideoContentRect(videoEl, containerEl) {
  const container = containerEl || videoEl?.parentElement;
  if (!container) return { x: 0, y: 0, width: 0, height: 0 };

  const cw = container.clientWidth;
  const ch = container.clientHeight;
  if (!cw || !ch) return { x: 0, y: 0, width: cw, height: ch };

  const vw = videoEl?.videoWidth || cw;
  const vh = videoEl?.videoHeight || ch;
  if (!vw || !vh) return { x: 0, y: 0, width: cw, height: ch };

  const scale = Math.min(cw / vw, ch / vh);
  const width = vw * scale;
  const height = vh * scale;
  const x = (cw - width) / 2;
  const y = (ch - height) / 2;
  return { x, y, width, height };
}

function clientToNormalized(clientX, clientY, videoEl, containerEl) {
  const container = containerEl || videoEl?.parentElement;
  if (!container) return null;
  const rect = container.getBoundingClientRect();
  const content = getVideoContentRect(videoEl, container);
  const localX = clientX - rect.left - content.x;
  const localY = clientY - rect.top - content.y;
  if (content.width <= 0 || content.height <= 0) return null;
  if (localX < 0 || localY < 0 || localX > content.width || localY > content.height) return null;
  return { x: localX / content.width, y: localY / content.height };
}

function normalizedToCanvas(x, y, contentRect) {
  return {
    x: contentRect.x + x * contentRect.width,
    y: contentRect.y + y * contentRect.height
  };
}

export function createLiveAnnotation({
  previewArea,
  videoEl,
  canvasEl,
  btnDraw,
  getPeerId,
  getPeerName,
  onSegment,
  onModeChange
}) {
  let active = false;
  let drawing = false;
  let strokeId = null;
  let strokeSeq = 0;
  let lastPoint = null;
  let pendingPoints = [];
  let lastSendAt = 0;
  let resizeObserver = null;

  /** @type {Map<string, { points: {x:number,y:number}[], color: string, width: number, opacity: number, fadeTimer?: number, removeTimer?: number }>} */
  const strokes = new Map();

  const ctx = canvasEl?.getContext('2d');

  function getContentRect() {
    return getVideoContentRect(videoEl, previewArea);
  }

  function resizeCanvas() {
    if (!canvasEl || !previewArea) return;
    const w = previewArea.clientWidth;
    const h = previewArea.clientHeight;
    if (canvasEl.width !== w || canvasEl.height !== h) {
      canvasEl.width = w;
      canvasEl.height = h;
      redrawAll();
    }
  }

  function redrawAll() {
    if (!ctx || !canvasEl) return;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    const content = getContentRect();
    for (const stroke of strokes.values()) {
      drawStrokePath(stroke, content);
    }
  }

  function drawStrokePath(stroke, content) {
    if (!ctx || stroke.points.length < 2) return;
    ctx.save();
    ctx.globalAlpha = stroke.opacity;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const first = normalizedToCanvas(stroke.points[0].x, stroke.points[0].y, content);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < stroke.points.length; i++) {
      const p = normalizedToCanvas(stroke.points[i].x, stroke.points[i].y, content);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function appendPoints(stroke, points) {
    if (!points?.length) return;
    for (const p of points) {
      const last = stroke.points[stroke.points.length - 1];
      if (last && last.x === p.x && last.y === p.y) continue;
      stroke.points.push({ x: p.x, y: p.y });
    }
  }

  function scheduleFade(strokeIdKey) {
    const stroke = strokes.get(strokeIdKey);
    if (!stroke) return;
    if (stroke.fadeTimer) clearTimeout(stroke.fadeTimer);
    if (stroke.removeTimer) cancelAnimationFrame(stroke.removeTimer);
    stroke.opacity = 1;

    stroke.fadeTimer = window.setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const strokeRef = strokes.get(strokeIdKey);
        if (!strokeRef) return;
        const t = Math.min(1, (now - start) / FADE_DURATION_MS);
        strokeRef.opacity = 1 - t;
        redrawAll();
        if (t < 1) {
          strokeRef.removeTimer = requestAnimationFrame(tick);
        } else {
          strokes.delete(strokeIdKey);
          redrawAll();
        }
      };
      const strokeRef = strokes.get(strokeIdKey);
      if (strokeRef) strokeRef.removeTimer = requestAnimationFrame(tick);
    }, FADE_DELAY_MS);
  }

  function receiveSegment(payload) {
    if (!payload?.strokeId || !Array.isArray(payload.points)) return;
    const { strokeId: id, points, color = DEFAULT_COLOR, width = DEFAULT_WIDTH, final = false } = payload;
    let stroke = strokes.get(id);
    if (!stroke) {
      stroke = { points: [], color, width, opacity: 1 };
      strokes.set(id, stroke);
    }
    appendPoints(stroke, points);
    redrawAll();
    if (final) scheduleFade(id);
  }

  function flushSend(force = false) {
    if (!onSegment || !strokeId || pendingPoints.length === 0) return;
    const now = Date.now();
    if (!force && now - lastSendAt < SEND_THROTTLE_MS) return;
    lastSendAt = now;
    const batch = pendingPoints.splice(0, pendingPoints.length);
    onSegment({
      strokeId,
      peerId: getPeerId?.() || '',
      peerName: getPeerName?.() || '',
      points: batch,
      color: DEFAULT_COLOR,
      width: DEFAULT_WIDTH,
      final: false
    });
  }

  function beginStroke(clientX, clientY) {
    const norm = clientToNormalized(clientX, clientY, videoEl, previewArea);
    if (!norm) return;
    drawing = true;
    strokeSeq += 1;
    strokeId = `${getPeerId?.() || 'local'}-${Date.now()}-${strokeSeq}`;
    lastPoint = norm;
    pendingPoints = [norm];
    const stroke = { points: [norm], color: DEFAULT_COLOR, width: DEFAULT_WIDTH, opacity: 1 };
    strokes.set(strokeId, stroke);
    redrawAll();
  }

  function extendStroke(clientX, clientY) {
    if (!drawing || !strokeId) return;
    const norm = clientToNormalized(clientX, clientY, videoEl, previewArea);
    if (!norm) return;
    const stroke = strokes.get(strokeId);
    if (!stroke) return;
    appendPoints(stroke, [norm]);
    pendingPoints.push(norm);
    lastPoint = norm;
    redrawAll();
    flushSend(false);
  }

  function endStroke() {
    if (!drawing || !strokeId) return;
    drawing = false;
    const id = strokeId;
    flushSend(true);
    if (onSegment) {
      const tail = pendingPoints.length ? pendingPoints.splice(0) : lastPoint ? [lastPoint] : [];
      if (tail.length) {
        onSegment({
          strokeId: id,
          peerId: getPeerId?.() || '',
          peerName: getPeerName?.() || '',
          points: tail,
          color: DEFAULT_COLOR,
          width: DEFAULT_WIDTH,
          final: true
        });
      } else {
        onSegment({
          strokeId: id,
          peerId: getPeerId?.() || '',
          peerName: getPeerName?.() || '',
          points: lastPoint ? [lastPoint] : [],
          color: DEFAULT_COLOR,
          width: DEFAULT_WIDTH,
          final: true
        });
      }
    }
    pendingPoints = [];
    scheduleFade(id);
    strokeId = null;
    lastPoint = null;
  }

  function setActive(next) {
    active = !!next;
    if (canvasEl) {
      canvasEl.classList.toggle('is-draw-active', active);
      canvasEl.style.pointerEvents = active ? 'auto' : 'none';
    }
    if (previewArea) {
      previewArea.classList.toggle('is-draw-mode', active);
    }
    if (btnDraw) {
      btnDraw.classList.toggle('is-active', active);
      btnDraw.setAttribute('aria-pressed', String(active));
      btnDraw.title = active ? 'Desativar anotacoes' : 'Anotar na tela';
    }
    if (!active && drawing) endStroke();
    onModeChange?.(active);
  }

  function toggle() {
    setActive(!active);
    return active;
  }

  function isActive() {
    return active;
  }

  function updateButtonVisibility(visible) {
    if (!btnDraw) return;
    btnDraw.hidden = !visible;
  }

  function onPointerDown(e) {
    if (!active || e.button !== 0) return;
    e.preventDefault();
    canvasEl?.setPointerCapture?.(e.pointerId);
    beginStroke(e.clientX, e.clientY);
  }

  function onPointerMove(e) {
    if (!active || !drawing) return;
    e.preventDefault();
    extendStroke(e.clientX, e.clientY);
  }

  function onPointerUp(e) {
    if (!drawing) return;
    e.preventDefault();
    try {
      canvasEl?.releasePointerCapture?.(e.pointerId);
    } catch (_) {}
    endStroke();
  }

  canvasEl?.addEventListener('pointerdown', onPointerDown);
  canvasEl?.addEventListener('pointermove', onPointerMove);
  canvasEl?.addEventListener('pointerup', onPointerUp);
  canvasEl?.addEventListener('pointercancel', onPointerUp);
  canvasEl?.addEventListener('pointerleave', (e) => {
    if (drawing && e.buttons === 0) endStroke();
  });

  btnDraw?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  if (previewArea && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(previewArea);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  return {
    toggle,
    setActive,
    isActive,
    receive: receiveSegment,
    updateButtonVisibility,
    resize: resizeCanvas,
    dispose() {
      setActive(false);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resizeCanvas);
      canvasEl?.removeEventListener('pointerdown', onPointerDown);
      canvasEl?.removeEventListener('pointermove', onPointerMove);
      canvasEl?.removeEventListener('pointerup', onPointerUp);
      canvasEl?.removeEventListener('pointercancel', onPointerUp);
      for (const stroke of strokes.values()) {
        if (stroke.fadeTimer) clearTimeout(stroke.fadeTimer);
        if (stroke.removeTimer) cancelAnimationFrame(stroke.removeTimer);
      }
      strokes.clear();
    }
  };
}
