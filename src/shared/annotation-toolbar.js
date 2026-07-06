import { DEFAULT_DRAW_COLOR, DEFAULT_DRAW_WIDTH } from './drawing-primitives.js';

const TOOL_DEFS = [
  {
    id: 'stroke',
    label: 'Lápis',
    title: 'Desenho livre',
    svg: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>'
  },
  {
    id: 'line',
    label: 'Reta',
    title: 'Linha reta',
    svg: '<line x1="5" y1="19" x2="19" y2="5"/>'
  },
  {
    id: 'rect',
    label: 'Retângulo',
    title: 'Retângulo',
    svg: '<rect x="4" y="6" width="16" height="12" rx="1"/>'
  },
  {
    id: 'ellipse',
    label: 'Elipse',
    title: 'Elipse / círculo',
    svg: '<ellipse cx="12" cy="12" rx="9" ry="7"/>'
  },
  {
    id: 'arrow',
    label: 'Seta',
    title: 'Seta',
    svg: '<line x1="5" y1="19" x2="19" y2="5"/><polyline points="12 5 19 5 19 12"/>'
  },
  {
    id: 'text',
    label: 'Texto',
    title: 'Inserir texto',
    svg: '<path d="M4 7V4h16v3"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/>'
  }
];

/**
 * Barra de ferramentas colapsável para desenho/anotações.
 */
export function createAnnotationToolbar({
  rootEl,
  toggleEl,
  panelEl,
  colorEl,
  widthEl,
  clearEl,
  getCanClear,
  onToolChange,
  onColorChange,
  onWidthChange,
  onClear
}) {
  /** @type {null | string} */
  let activeTool = null;
  let expanded = false;

  function buildToolButtons() {
    if (!panelEl || panelEl.childElementCount > 0) return;
    for (const def of TOOL_DEFS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'annotation-tool-btn';
      btn.dataset.tool = def.id;
      btn.setAttribute('aria-label', def.label);
      btn.title = def.title;
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${def.svg}</svg>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setTool(activeTool === def.id ? null : def.id);
      });
      panelEl.appendChild(btn);
    }
  }

  function syncToolButtons() {
    if (!panelEl) return;
    for (const btn of panelEl.querySelectorAll('.annotation-tool-btn')) {
      const tool = btn.dataset.tool;
      const isActive = activeTool === tool;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    }
  }

  function setExpanded(next) {
    expanded = !!next;
    if (rootEl) {
      rootEl.classList.toggle('is-collapsed', !expanded);
      rootEl.classList.toggle('is-expanded', expanded);
    }
    if (toggleEl) {
      toggleEl.setAttribute('aria-expanded', String(expanded));
      toggleEl.title = expanded ? 'Recolher ferramentas' : 'Ferramentas de desenho';
    }
    if (panelEl) panelEl.hidden = !expanded;
    if (colorEl?.parentElement) colorEl.parentElement.hidden = !expanded;
  }

  function setTool(tool) {
    activeTool = tool || null;
    syncToolButtons();
    const isActive = activeTool !== null;
    onToolChange?.(activeTool, isActive);
    return activeTool;
  }

  function getTool() {
    return activeTool;
  }

  function getColor() {
    return colorEl?.value || DEFAULT_DRAW_COLOR;
  }

  function getWidth() {
    const w = Number(widthEl?.value);
    return Number.isFinite(w) && w > 0 ? w : DEFAULT_DRAW_WIDTH;
  }

  function syncClearVisibility() {
    if (!clearEl) return;
    const canClear = getCanClear?.() ?? false;
    clearEl.hidden = !canClear || !expanded;
  }

  function setVisible(visible) {
    if (rootEl) rootEl.hidden = !visible;
  }

  toggleEl?.addEventListener('click', (e) => {
    e.stopPropagation();
    setExpanded(!expanded);
    syncClearVisibility();
  });

  colorEl?.addEventListener('input', () => {
    onColorChange?.(getColor());
  });

  widthEl?.addEventListener('input', () => {
    onWidthChange?.(getWidth());
  });

  clearEl?.addEventListener('click', (e) => {
    e.stopPropagation();
    onClear?.();
  });

  buildToolButtons();
  setExpanded(false);

  return {
    setTool,
    getTool,
    getColor,
    getWidth,
    setExpanded,
    isExpanded: () => expanded,
    setVisible,
    syncClearVisibility,
    deactivate() {
      setTool(null);
    },
    dispose() {
      setTool(null);
      setVisible(false);
    }
  };
}
