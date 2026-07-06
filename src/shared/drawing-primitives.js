export const DRAWING_SHAPES = ['stroke', 'line', 'rect', 'ellipse', 'arrow', 'text'];

export const DEFAULT_DRAW_COLOR = '#e53935';
export const DEFAULT_DRAW_WIDTH = 3;
export const DEFAULT_FONT_SIZE = 0.04;

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

/** Mapeia coordenada normalizada 0–1 para pixels no canvas de overlay. */
export function normalizedToCanvas(x, y, contentRect) {
  return {
    x: contentRect.x + x * contentRect.width,
    y: contentRect.y + y * contentRect.height
  };
}

/** Mapeia coordenada normalizada 0–1 para pixels em canvas de tamanho fixo (quadro branco). */
export function normalizedToFixedCanvas(x, y, width, height) {
  return { x: x * width, y: y * height };
}

function resolveShapeType(element) {
  return element.type || element.shape || 'stroke';
}

function drawArrowHead(ctx, fromX, fromY, toX, toY, headLen) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLen * Math.cos(angle - Math.PI / 6),
    toY - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLen * Math.cos(angle + Math.PI / 6),
    toY - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

/**
 * Desenha um elemento no contexto 2D.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} element - { type, points, color, width, text, fontSize, opacity }
 * @param {{ x: number, y: number, width: number, height: number }} contentRect - área de desenho em pixels
 */
export function drawElement(ctx, element, contentRect) {
  if (!ctx || !element?.points?.length) return;

  const shape = resolveShapeType(element);
  const color = element.color || DEFAULT_DRAW_COLOR;
  const width = element.width || DEFAULT_DRAW_WIDTH;
  const opacity = element.opacity ?? 1;
  const points = element.points;

  const toCanvas = (p) => normalizedToCanvas(p.x, p.y, contentRect);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (shape === 'text' && element.text) {
    const anchor = toCanvas(points[0]);
    const fontSize = Math.max(
      10,
      (element.fontSize || DEFAULT_FONT_SIZE) * contentRect.height
    );
    ctx.font = `${fontSize}px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(String(element.text), anchor.x, anchor.y);
    ctx.restore();
    return;
  }

  if (shape === 'rect' && points.length >= 2) {
    const p1 = toCanvas(points[0]);
    const p2 = toCanvas(points[1]);
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x);
    const h = Math.abs(p2.y - p1.y);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
    return;
  }

  if (shape === 'ellipse' && points.length >= 2) {
    const p1 = toCanvas(points[0]);
    const p2 = toCanvas(points[1]);
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    const rx = Math.abs(p2.x - p1.x) / 2;
    const ry = Math.abs(p2.y - p1.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (shape === 'line' && points.length >= 2) {
    const p1 = toCanvas(points[0]);
    const p2 = toCanvas(points[1]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (shape === 'arrow' && points.length >= 2) {
    const p1 = toCanvas(points[0]);
    const p2 = toCanvas(points[1]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    const headLen = Math.max(8, width * 3);
    drawArrowHead(ctx, p1.x, p1.y, p2.x, p2.y, headLen);
    ctx.restore();
    return;
  }

  if (points.length >= 2) {
    ctx.beginPath();
    const first = toCanvas(points[0]);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < points.length; i++) {
      const p = toCanvas(points[i]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Desenha elemento em canvas de tamanho fixo (quadro branco).
 */
export function drawElementFixed(ctx, element, canvasWidth, canvasHeight) {
  drawElement(ctx, element, {
    x: 0,
    y: 0,
    width: canvasWidth,
    height: canvasHeight
  });
}

export function isTwoPointShape(shape) {
  return ['line', 'rect', 'ellipse', 'arrow'].includes(shape);
}

export function normalizeShape(shape) {
  if (DRAWING_SHAPES.includes(shape)) return shape;
  if (shape === 'stroke') return 'stroke';
  return 'stroke';
}
