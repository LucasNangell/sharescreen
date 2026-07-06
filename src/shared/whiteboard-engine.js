import { drawElementFixed } from './drawing-primitives.js';

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_FPS = 30;
const BACKGROUND = '#ffffff';

export const WhiteboardEngine = {
  start(opts = {}) {
    const width = opts.width || DEFAULT_WIDTH;
    const height = opts.height || DEFAULT_HEIGHT;
    const fps = opts.fps || DEFAULT_FPS;
    const ownerDocument = opts.ownerDocument || document;

    const canvas = opts.canvas || ownerDocument.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    /** @type {object[]} */
    let elements = [];
    let rafId = null;
    let running = true;

    function render() {
      if (!ctx) return;
      ctx.fillStyle = BACKGROUND;
      ctx.fillRect(0, 0, width, height);
      for (const el of elements) {
        drawElementFixed(ctx, el, width, height);
      }
    }

    function tick() {
      if (!running) return;
      render();
      rafId = requestAnimationFrame(tick);
    }

    render();
    rafId = requestAnimationFrame(tick);

    const stream = canvas.captureStream(fps);

    return {
      canvas,
      stream,
      getElements() {
        return elements.slice();
      },
      setElements(next) {
        elements = Array.isArray(next) ? next.slice() : [];
        render();
      },
      addElement(el) {
        if (!el) return;
        const existing = elements.findIndex((e) => e.id === el.id);
        if (existing >= 0) {
          elements[existing] = el;
        } else {
          elements.push(el);
        }
        render();
      },
      removeElement(id) {
        elements = elements.filter((e) => e.id !== id);
        render();
      },
      clear() {
        elements = [];
        render();
      },
      stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        for (const track of stream.getTracks()) {
          try {
            track.stop();
          } catch (_) {}
        }
      }
    };
  }
};
