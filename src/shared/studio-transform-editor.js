import { FULL_FRAME, normalizeRect } from './studio-state.js';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/**
 * Editor overlay estilo OBS para crop (recorte da fonte) e frame (posição no canvas).
 */
export function createStudioTransformEditor({
  container,
  onChange,
  getScene,
  getSelectedPeerId,
  setSelectedPeerId,
  getCropMode,
  setCropMode
} = {}) {
  if (!container) return { refresh: () => {}, dispose: () => {} };

  let debounceTimer = null;
  let dragState = null;

  function debouncedChange(sceneId, peerId, patch) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      onChange?.(sceneId, peerId, patch);
    }, 50);
  }

  function getContainerRect() {
    return container.getBoundingClientRect();
  }

  function clientToNormalized(clientX, clientY) {
    const rect = getContainerRect();
    if (!rect.width || !rect.height) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
    };
  }

  function updateBoxElement(box, rect, cropMode, isSelected) {
    box.style.left = `${rect.x * 100}%`;
    box.style.top = `${rect.y * 100}%`;
    box.style.width = `${rect.w * 100}%`;
    box.style.height = `${rect.h * 100}%`;
    box.classList.toggle('is-crop', cropMode && isSelected);
    box.classList.toggle('is-selected', isSelected);
  }

  function findBox(peerId) {
    return container.querySelector(`.studio-transform-box[data-peer-id="${CSS.escape(String(peerId))}"]`);
  }

  function renderBox(slot, index, selectedPeerId, cropMode) {
    const box = document.createElement('div');
    box.className = 'studio-transform-box';
    box.dataset.peerId = slot.peerId;
    const isSelected = String(slot.peerId) === String(selectedPeerId);
    if (isSelected) box.classList.add('is-selected');

    const editingCrop = cropMode && isSelected;
    const rect = editingCrop ? slot.crop || FULL_FRAME : slot.frame || FULL_FRAME;

    updateBoxElement(box, rect, cropMode, isSelected);

    if (isSelected) {
      for (const h of HANDLES) {
        const handle = document.createElement('span');
        handle.className = `studio-transform-handle studio-transform-handle--${h}`;
        handle.dataset.handle = h;
        box.appendChild(handle);
      }
    }

    box.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      setSelectedPeerId?.(slot.peerId);
      const handle = e.target?.dataset?.handle || null;
      const useCrop = cropMode || e.altKey;
      dragState = {
        peerId: slot.peerId,
        handle,
        move: !handle,
        crop: useCrop,
        startClient: { x: e.clientX, y: e.clientY },
        startRect: { ...(useCrop ? slot.crop : slot.frame) }
      };
      box.setPointerCapture(e.pointerId);
    });

    return box;
  }

  function refresh() {
    const scene = getScene?.();
    if (!scene?.slots?.length) {
      container.hidden = true;
      container.innerHTML = '';
      return;
    }
    container.hidden = false;
    container.innerHTML = '';
    const selectedPeerId = getSelectedPeerId?.();
    const cropMode = !!getCropMode?.();
    scene.slots.forEach((slot, index) => {
      container.appendChild(renderBox(slot, index, selectedPeerId, cropMode));
    });
  }

  function applyDrag(clientX, clientY) {
    if (!dragState) return;
    const scene = getScene?.();
    if (!scene) return;
    const slot = scene.slots.find((s) => String(s.peerId) === String(dragState.peerId));
    if (!slot) return;

    const start = dragState.startRect;
    const delta = clientToNormalized(clientX, clientY);
    const startNorm = clientToNormalized(dragState.startClient.x, dragState.startClient.y);
    const dx = delta.x - startNorm.x;
    const dy = delta.y - startNorm.y;

    let next = { ...start };

    if (dragState.move && !dragState.handle) {
      next.x = start.x + dx;
      next.y = start.y + dy;
    } else if (dragState.handle) {
      const h = dragState.handle;
      if (h.includes('e')) next.w = start.w + dx;
      if (h.includes('s')) next.h = start.h + dy;
      if (h.includes('w')) {
        next.x = start.x + dx;
        next.w = start.w - dx;
      }
      if (h.includes('n')) {
        next.y = start.y + dy;
        next.h = start.h - dy;
      }
    }

    next = normalizeRect(next, FULL_FRAME);
    const patch = dragState.crop ? { crop: next } : { frame: next, frameEdited: true };
    debouncedChange(scene.id, slot.peerId, patch);

    Object.assign(dragState.crop ? slot.crop : slot.frame, next);
    const box = findBox(slot.peerId);
    if (box) {
      updateBoxElement(box, next, dragState.crop, true);
    } else {
      refresh();
    }
  }

  function onPointerMove(e) {
    if (!dragState) return;
    applyDrag(e.clientX, e.clientY);
  }

  function onPointerUp(e) {
    if (!dragState) return;
    dragState = null;
    try {
      e.target?.releasePointerCapture?.(e.pointerId);
    } catch (_) {}
    refresh();
  }

  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointercancel', onPointerUp);

  container.addEventListener('pointerdown', (e) => {
    if (e.target === container && e.button === 0) {
      setSelectedPeerId?.(null);
      refresh();
    }
  });

  function dispose() {
    if (debounceTimer) clearTimeout(debounceTimer);
    container.removeEventListener('pointermove', onPointerMove);
    container.removeEventListener('pointerup', onPointerUp);
    container.removeEventListener('pointercancel', onPointerUp);
    container.innerHTML = '';
    dragState = null;
  }

  return { refresh, dispose };
}
