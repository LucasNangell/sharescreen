export function parseHexColor(hex) {
  const raw = String(hex || '#00FF00').trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(raw);
  if (!m) return { r: 0, g: 255, b: 0 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [r, g, b]
      .map((v) => clamp(v).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function applyChromaKey(imageData, chromaRgb, tolerance = 40) {
  const d = imageData.data;
  const { r: cr, g: cg, b: cb } = chromaRgb;
  const tol = Math.max(5, Number(tolerance) || 40);
  const tolSq = tol * tol;
  for (let i = 0; i < d.length; i += 4) {
    const dr = d[i] - cr;
    const dg = d[i + 1] - cg;
    const db = d[i + 2] - cb;
    if (dr * dr + dg * dg + db * db <= tolSq) {
      d[i + 3] = 0;
    }
  }
  return imageData;
}

export function createChromaRenderer({ video, canvas, chromaColor, chromaTolerance = 40 }) {
  let rafId = 0;
  let chromaRgb = parseHexColor(chromaColor);
  let tolerance = chromaTolerance;
  const ctx = canvas.getContext('2d', { alpha: true });

  function drawFrame() {
    if (!video || video.readyState < 2) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    applyChromaKey(imageData, chromaRgb, tolerance);
    ctx.putImageData(imageData, 0, 0);
  }

  function loop() {
    drawFrame();
    rafId = requestAnimationFrame(loop);
  }

  return {
    setChromaColor(color) {
      chromaRgb = parseHexColor(color);
    },
    setTolerance(value) {
      tolerance = value;
    },
    start() {
      if (rafId) return;
      rafId = requestAnimationFrame(loop);
    },
    stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    },
    drawOnce: drawFrame
  };
}
