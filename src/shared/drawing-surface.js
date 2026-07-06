import {
  drawElement,
  getVideoContentRect,
  DEFAULT_DRAW_COLOR,
  DEFAULT_DRAW_WIDTH,
  DEFAULT_FONT_SIZE,
  isTwoPointShape,
  normalizeShape
} from './drawing-primitives.js';

const FADE_DELAY_MS = 3000;
const FADE_DURATION_MS = 400;
const SEND_THROTTLE_MS = 32;

function clientToNormalized(clientX, clientY, videoEl, containerEl, useFullArea) {
  const container = containerEl || videoEl?.parentElement;
  if (!container) return null;
  const rect = container.getBoundingClientRect();
  if (useFullArea) {
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    if (rect.width <= 0 || rect.height <= 0) return null;
    if (localX < 0 || localY < 0 || localX > rect.width || localY > rect.height) return null;
    return { x: localX / rect.width, y: localY / rect.height };
  }
  const content = getVideoContentRect(videoEl, container);
  const localX = clientX - rect.left - content.x;
  const localY = clientY - rect.top - content.y;
  if (content.width <= 0 || content.height <= 0) return null;
  if (localX < 0 || localY < 0 || localX > content.width || localY > content.height) return null;
  return { x: localX / content.width, y: localY / content.height };
}

export { getVideoContentRect };

export function createDrawingSurface({
  previewArea,
  videoEl,
  canvasEl,
  getPeerId,
  getPeerName,
  getTool,
  getColor,
  getWidth,
  getMode,
  onSegment,
  onElementCommit,
  onModeChange
}) {
  let drawing = false;
  let strokeId = null;
  let strokeSeq = 0;
  let lastPoint = null;
  let pendingPoints = [];
  let lastSendAt = 0;
  let resizeObserver = null;
  let textInputEl = null;

  /** @type {Map<string, object>} */
  const strokes = new Map();

  const ctx = canvasEl?.getContext('2d');

  function isPersistent() {
    return getMode?.() === 'persistent';
  }

  function useFullArea() {
    return isPersistent();
  }

  function getContentRect() {
    if (useFullArea() && previewArea) {
      return {
        x: 0,
        y: 0,
        width: previewArea.clientWidth,
        height: previewArea.clientHeight
      };
    }
    return getVideoContentRect(videoEl, previewArea);
  }

  function isToolActive() {
    return !!getTool?.();
  }

  function currentColor() {
    return getColor?.() || DEFAULT_DRAW_COLOR;
  }

  function currentWidth() {
    return getWidth?.() || DEFAULT_DRAW_WIDTH;
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
      drawElement(ctx, stroke, content);
    }
  }

  function appendPoints(stroke, points) {
    if (!points?.length) return;
    const shape = normalizeShape(stroke.type || stroke.shape);
    if (isTwoPointShape(shape)) return;
    for (const p of points) {
      const last = stroke.points[stroke.points.length - 1];
      if (last && last.x === p.x && last.y === p.y) continue;
      stroke.points.push({ x: p.x, y: p.y });
    }
  }

  function scheduleFade(strokeIdKey) {
    if (isPersistent()) return;
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

  function buildElementFromStroke(stroke, id) {
    return {
      id,
      type: normalizeShape(stroke.type || stroke.shape),
      points: stroke.points.map((p) => ({ x: p.x, y: p.y })),
      color: stroke.color,
      width: stroke.width,
      text: stroke.text || undefined,
      fontSize: stroke.fontSize || undefined,
      peerId: getPeerId?.() || '',
      peerName: getPeerName?.() || ''
    };
  }

  function receiveSegment(payload) {
    if (!payload?.strokeId || !Array.isArray(payload.points)) return;
    const {
      strokeId: id,
      points,
      color = DEFAULT_DRAW_COLOR,
      width = DEFAULT_DRAW_WIDTH,
      final = false,
      shape = 'stroke',
      text,
      fontSize
    } = payload;
    const type = normalizeShape(shape);
    let stroke = strokes.get(id);
    if (!stroke) {
      stroke = { type, points: [], color, width, opacity: 1, text, fontSize };
      strokes.set(id, stroke);
    }
    stroke.type = type;
    stroke.color = color;
    stroke.width = width;
    if (text) stroke.text = text;
    if (fontSize) stroke.fontSize = fontSize;

    if (type === 'text' && text) {
      stroke.points = points.slice(0, 1).map((p) => ({ x: p.x, y: p.y }));
      stroke.text = text;
      if (fontSize) stroke.fontSize = fontSize;
    } else if (isTwoPointShape(type)) {
      stroke.points = points.slice(0, 2).map((p) => ({ x: p.x, y: p.y }));
    } else {
      appendPoints(stroke, points);
    }
    redrawAll();
    if (final && !isPersistent()) scheduleFade(id);
  }

  function receiveElement(element) {
    if (!element?.id) return;
    const stroke = {
      type: normalizeShape(element.type),
      points: (element.points || []).map((p) => ({ x: p.x, y: p.y })),
      color: element.color || DEFAULT_DRAW_COLOR,
      width: element.width || DEFAULT_DRAW_WIDTH,
      opacity: 1,
      text: element.text,
      fontSize: element.fontSize
    };
    strokes.set(element.id, stroke);
    redrawAll();
  }

  function setPersistentElements(elements) {
    strokes.clear();
    for (const el of elements || []) {
      receiveElement(el);
    }
  }

  function clearPersistentOverlay() {
    strokes.clear();
    redrawAll();
  }

  function sendSegment({ final = false, points = null, text = null, fontSize = null } = {}) {
    if (!onSegment || !strokeId) return;
    const stroke = strokes.get(strokeId);
    const type = normalizeShape(stroke?.type);
    const batch =
      points ||
      (isTwoPointShape(type) && stroke.points.length >= 2
        ? stroke.points.slice(0, 2)
        : pendingPoints.length
          ? pendingPoints.splice(0)
          : lastPoint
            ? [lastPoint]
            : []);
    if (!batch.length && !text) return;
    onSegment({
      strokeId,
      peerId: getPeerId?.() || '',
      peerName: getPeerName?.() || '',
      points: batch.map((p) => ({ x: p.x, y: p.y })),
      color: stroke?.color || currentColor(),
      width: stroke?.width || currentWidth(),
      shape: type,
      text: text || stroke?.text || undefined,
      fontSize: fontSize || stroke?.fontSize || undefined,
      final
    });
  }

  function flushSend(force = false) {
    if (!strokeId || pendingPoints.length === 0) return;
    const now = Date.now();
    if (!force && now - lastSendAt < SEND_THROTTLE_MS) return;
    lastSendAt = now;
    const stroke = strokes.get(strokeId);
    const type = normalizeShape(stroke?.type);
    const batch =
      isTwoPointShape(type) && stroke.points.length >= 2
        ? stroke.points.slice(0, 2)
        : pendingPoints.splice(0, pendingPoints.length);
    if (!batch.length) return;
    onSegment?.({
      strokeId,
      peerId: getPeerId?.() || '',
      peerName: getPeerName?.() || '',
      points: batch.map((p) => ({ x: p.x, y: p.y })),
      color: stroke?.color || currentColor(),
      width: stroke?.width || currentWidth(),
      shape: type,
      final: false
    });
  }

  function removeTextInput() {
    if (textInputEl) {
      textInputEl.remove();
      textInputEl = null;
    }
  }

  function commitTextAt(clientX, clientY) {
    const norm = clientToNormalized(clientX, clientY, videoEl, previewArea, useFullArea());
    if (!norm) return;
    removeTextInput();

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'drawing-text-input';
    input.placeholder = 'Digite o texto…';
    input.maxLength = 500;
    const container = previewArea || canvasEl?.parentElement;
    const rect = container.getBoundingClientRect();
    const content = getContentRect();
    const anchor = {
      x: rect.left + content.x + norm.x * content.width,
      y: rect.top + content.y + norm.y * content.height
    };
    input.style.left = `${anchor.x}px`;
    input.style.top = `${anchor.y}px`;
    document.body.appendChild(input);
    textInputEl = input;
    input.focus();

    const commit = () => {
      const text = input.value.trim();
      removeTextInput();
      if (!text) return;
      strokeSeq += 1;
      const id = `${getPeerId?.() || 'local'}-${Date.now()}-${strokeSeq}`;
      const element = {
        id,
        type: 'text',
        points: [norm],
        color: currentColor(),
        width: currentWidth(),
        text,
        fontSize: DEFAULT_FONT_SIZE,
        opacity: 1
      };
      strokes.set(id, { ...element, opacity: 1 });
      redrawAll();

      if (isPersistent()) {
        onElementCommit?.(buildElementFromStroke(element, id));
      } else {
        onSegment?.({
          strokeId: id,
          peerId: getPeerId?.() || '',
          peerName: getPeerName?.() || '',
          points: [{ x: norm.x, y: norm.y }],
          color: element.color,
          width: element.width,
          shape: 'text',
          text,
          fontSize: DEFAULT_FONT_SIZE,
          final: true
        });
        scheduleFade(id);
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        removeTextInput();
      }
    });
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (textInputEl === input) commit();
      }, 100);
    });
  }

  function beginShape(clientX, clientY) {
    const tool = getTool?.();
    if (!tool) return;
    if (tool === 'text') {
      commitTextAt(clientX, clientY);
      return;
    }

    const norm = clientToNormalized(clientX, clientY, videoEl, previewArea, useFullArea());
    if (!norm) return;
    drawing = true;
    strokeSeq += 1;
    strokeId = `${getPeerId?.() || 'local'}-${Date.now()}-${strokeSeq}`;
    lastPoint = norm;
    pendingPoints = [norm];
    const type = normalizeShape(tool);
    const points = isTwoPointShape(type) ? [norm, { ...norm }] : [norm];
    const stroke = {
      type,
      points,
      color: currentColor(),
      width: currentWidth(),
      opacity: 1
    };
    strokes.set(strokeId, stroke);
    redrawAll();
  }

  function extendShape(clientX, clientY) {
    if (!drawing || !strokeId) return;
    const norm = clientToNormalized(clientX, clientY, videoEl, previewArea, useFullArea());
    if (!norm) return;
    const stroke = strokes.get(strokeId);
    if (!stroke) return;
    const type = normalizeShape(stroke.type);

    if (isTwoPointShape(type)) {
      stroke.points = [{ ...stroke.points[0] }, { ...norm }];
      pendingPoints = stroke.points.map((p) => ({ ...p }));
    } else {
      appendPoints(stroke, [norm]);
      pendingPoints.push(norm);
    }
    lastPoint = norm;
    redrawAll();
    flushSend(false);
  }

  function endShape() {
    if (!drawing || !strokeId) return;
    drawing = false;
    const id = strokeId;
    const stroke = strokes.get(id);
    flushSend(true);
    sendSegment({ final: true });

    if (isPersistent() && stroke) {
      onElementCommit?.(buildElementFromStroke(stroke, id));
    } else {
      scheduleFade(id);
    }

    pendingPoints = [];
    strokeId = null;
    lastPoint = null;
  }

  function syncDrawUi() {
    const active = isToolActive();
    if (canvasEl) {
      canvasEl.classList.toggle('is-draw-active', active);
      canvasEl.style.pointerEvents = active ? 'auto' : 'none';
    }
    if (previewArea) {
      previewArea.classList.toggle('is-draw-mode', active);
    }
    onModeChange?.(active, getTool?.());
  }

  function onPointerDown(e) {
    if (!isToolActive() || e.button !== 0) return;
    e.preventDefault();
    canvasEl?.setPointerCapture?.(e.pointerId);
    beginShape(e.clientX, e.clientY);
  }

  function onPointerMove(e) {
    if (!isToolActive() || !drawing) return;
    e.preventDefault();
    extendShape(e.clientX, e.clientY);
  }

  function onPointerUp(e) {
    if (!drawing) return;
    e.preventDefault();
    try {
      canvasEl?.releasePointerCapture?.(e.pointerId);
    } catch (_) {}
    endShape();
  }

  canvasEl?.addEventListener('pointerdown', onPointerDown);
  canvasEl?.addEventListener('pointermove', onPointerMove);
  canvasEl?.addEventListener('pointerup', onPointerUp);
  canvasEl?.addEventListener('pointercancel', onPointerUp);
  canvasEl?.addEventListener('pointerleave', (e) => {
    if (drawing && e.buttons === 0) endShape();
  });

  if (previewArea && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(previewArea);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  return {
    syncDrawUi,
    receive: receiveSegment,
    receiveElement,
    setPersistentElements,
    clearPersistentOverlay,
    resize: resizeCanvas,
    isDrawing: () => drawing,
    dispose() {
      removeTextInput();
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
