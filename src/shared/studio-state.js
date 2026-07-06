const STORAGE_KEY = 'sharescreen_studio_scenes_v1';
const MAX_SLOTS = 4;
const MIN_RECT_SIZE = 0.05;

const LAYOUTS = ['full', 'split-h', 'split-v', 'pip-br', 'pip-bl'];

export const FULL_FRAME = Object.freeze({ x: 0, y: 0, w: 1, h: 1 });

function newId() {
  return `scene-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Normaliza retângulo normalizado 0–1 com tamanho mínimo. */
export function normalizeRect(raw, fallback = FULL_FRAME) {
  const base = fallback || FULL_FRAME;
  const x = clamp01(raw?.x ?? base.x);
  const y = clamp01(raw?.y ?? base.y);
  let w = clamp01(raw?.w ?? base.w);
  let h = clamp01(raw?.h ?? base.h);
  w = Math.max(MIN_RECT_SIZE, w);
  h = Math.max(MIN_RECT_SIZE, h);
  if (x + w > 1) w = Math.max(MIN_RECT_SIZE, 1 - x);
  if (y + h > 1) h = Math.max(MIN_RECT_SIZE, 1 - y);
  return { x, y, w, h };
}

export function rectsEqual(a, b, epsilon = 0.001) {
  if (!a || !b) return false;
  return (
    Math.abs(a.x - b.x) < epsilon &&
    Math.abs(a.y - b.y) < epsilon &&
    Math.abs(a.w - b.w) < epsilon &&
    Math.abs(a.h - b.h) < epsilon
  );
}

export function slotNeedsTransform(slot) {
  if (!slot) return false;
  return !rectsEqual(slot.crop, FULL_FRAME) || !rectsEqual(slot.frame, FULL_FRAME);
}

function normalizeSlot(raw) {
  if (!raw || !raw.peerId) return null;
  return {
    peerId: String(raw.peerId),
    producerId: raw.producerId ? String(raw.producerId) : null,
    label: String(raw.label || raw.peerId),
    crop: normalizeRect(raw.crop, FULL_FRAME),
    frame: normalizeRect(raw.frame, FULL_FRAME),
    frameEdited: !!raw.frameEdited
  };
}

function normalizeScene(raw) {
  if (!raw || !raw.id) return null;
  const slots = (raw.slots || []).map(normalizeSlot).filter(Boolean).slice(0, MAX_SLOTS);
  const layout = LAYOUTS.includes(raw.layout) ? raw.layout : 'full';
  return {
    id: String(raw.id),
    name: String(raw.name || 'Cena'),
    layout,
    slots,
    primaryAudioPeerId: raw.primaryAudioPeerId ? String(raw.primaryAudioPeerId) : (slots[0]?.peerId || '')
  };
}

function loadPersisted() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { scenes: [], previewSceneId: null, programSceneId: null, studioModeEnabled: false };
    const data = JSON.parse(raw);
    const scenes = (data.scenes || []).map(normalizeScene).filter(Boolean);
    return {
      scenes,
      previewSceneId: data.previewSceneId || null,
      programSceneId: data.programSceneId || null,
      studioModeEnabled: !!data.studioModeEnabled
    };
  } catch {
    return { scenes: [], previewSceneId: null, programSceneId: null, studioModeEnabled: false };
  }
}

export function createStudioState({ onChange } = {}) {
  let state = loadPersisted();
  let editingSceneId = state.previewSceneId || state.scenes[0]?.id || null;
  let selectedSlotPeerId = null;

  function persist() {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          scenes: state.scenes,
          previewSceneId: state.previewSceneId,
          programSceneId: state.programSceneId,
          studioModeEnabled: state.studioModeEnabled
        })
      );
    } catch (_) {}
    onChange?.(getSnapshot());
  }

  function getSnapshot() {
    return {
      scenes: state.scenes.map((s) => ({
        ...s,
        slots: s.slots.map((sl) => ({ ...sl, crop: { ...sl.crop }, frame: { ...sl.frame } }))
      })),
      previewSceneId: state.previewSceneId,
      programSceneId: state.programSceneId,
      studioModeEnabled: state.studioModeEnabled,
      editingSceneId,
      selectedSlotPeerId
    };
  }

  function getScene(id) {
    return state.scenes.find((s) => s.id === id) || null;
  }

  function getEditingScene() {
    return getScene(editingSceneId);
  }

  function getPreviewScene() {
    return getScene(state.previewSceneId);
  }

  function getProgramScene() {
    return getScene(state.programSceneId);
  }

  function getSelectedSlotPeerId() {
    return selectedSlotPeerId;
  }

  function setSelectedSlotPeerId(peerId) {
    selectedSlotPeerId = peerId ? String(peerId) : null;
    onChange?.(getSnapshot());
  }

  function setStudioModeEnabled(enabled) {
    state.studioModeEnabled = !!enabled;
    persist();
  }

  function isStudioModeEnabled() {
    return !!state.studioModeEnabled;
  }

  function createScene({ name = 'Nova cena', layout = 'full' } = {}) {
    const scene = normalizeScene({
      id: newId(),
      name,
      layout,
      slots: [],
      primaryAudioPeerId: ''
    });
    state.scenes.push(scene);
    editingSceneId = scene.id;
    if (!state.previewSceneId) state.previewSceneId = scene.id;
    persist();
    return scene;
  }

  function updateScene(id, patch) {
    const scene = getScene(id);
    if (!scene) return null;
    if (patch.name !== undefined) scene.name = String(patch.name).trim() || scene.name;
    if (patch.layout !== undefined && LAYOUTS.includes(patch.layout)) scene.layout = patch.layout;
    if (patch.slots !== undefined) {
      scene.slots = (patch.slots || []).map(normalizeSlot).filter(Boolean).slice(0, MAX_SLOTS);
    }
    if (patch.primaryAudioPeerId !== undefined) {
      scene.primaryAudioPeerId = patch.primaryAudioPeerId ? String(patch.primaryAudioPeerId) : '';
    }
    persist();
    return scene;
  }

  function updateSlotTransform(sceneId, peerId, { crop, frame, frameEdited } = {}) {
    const scene = getScene(sceneId);
    if (!scene) return false;
    const slot = scene.slots.find((s) => String(s.peerId) === String(peerId));
    if (!slot) return false;
    if (crop !== undefined) slot.crop = normalizeRect(crop, FULL_FRAME);
    if (frame !== undefined) {
      slot.frame = normalizeRect(frame, FULL_FRAME);
      if (frameEdited !== undefined) slot.frameEdited = !!frameEdited;
      else slot.frameEdited = true;
    }
    persist();
    return true;
  }

  function resetSlotTransform(sceneId, peerId) {
    const scene = getScene(sceneId);
    if (!scene) return false;
    const slot = scene.slots.find((s) => String(s.peerId) === String(peerId));
    if (!slot) return false;
    slot.crop = { ...FULL_FRAME };
    slot.frame = { ...FULL_FRAME };
    slot.frameEdited = false;
    persist();
    return true;
  }

  function deleteScene(id) {
    const idx = state.scenes.findIndex((s) => s.id === id);
    if (idx < 0) return false;
    state.scenes.splice(idx, 1);
    if (state.previewSceneId === id) {
      state.previewSceneId = state.scenes[0]?.id || null;
    }
    if (state.programSceneId === id) {
      state.programSceneId = null;
    }
    if (editingSceneId === id) {
      editingSceneId = state.previewSceneId || state.scenes[0]?.id || null;
    }
    if (selectedSlotPeerId && !state.scenes.some((s) => s.slots.some((sl) => sl.peerId === selectedSlotPeerId))) {
      selectedSlotPeerId = null;
    }
    persist();
    return true;
  }

  function duplicateScene(id) {
    const src = getScene(id);
    if (!src) return null;
    const copy = normalizeScene({
      id: newId(),
      name: `${src.name} (cópia)`,
      layout: src.layout,
      slots: src.slots.map((s) => ({
        ...s,
        crop: { ...s.crop },
        frame: { ...s.frame },
        frameEdited: s.frameEdited
      })),
      primaryAudioPeerId: src.primaryAudioPeerId
    });
    state.scenes.push(copy);
    editingSceneId = copy.id;
    persist();
    return copy;
  }

  function setPreviewScene(id) {
    if (!getScene(id)) return false;
    state.previewSceneId = id;
    editingSceneId = id;
    persist();
    return true;
  }

  function setProgramScene(id) {
    state.programSceneId = id || null;
    persist();
  }

  function setEditingScene(id) {
    if (id && !getScene(id)) return false;
    editingSceneId = id;
    onChange?.(getSnapshot());
    return true;
  }

  function addSlotToEditingScene(slot) {
    const scene = getEditingScene();
    if (!scene) return false;
    const normalized = normalizeSlot(slot);
    if (!normalized) return false;
    if (scene.slots.length >= MAX_SLOTS) return false;
    if (scene.slots.some((s) => s.peerId === normalized.peerId)) return false;
    scene.slots.push(normalized);
    if (!scene.primaryAudioPeerId) scene.primaryAudioPeerId = normalized.peerId;
    persist();
    return true;
  }

  function removeSlotFromEditingScene(peerId) {
    const scene = getEditingScene();
    if (!scene) return false;
    scene.slots = scene.slots.filter((s) => s.peerId !== peerId);
    if (scene.primaryAudioPeerId === peerId) {
      scene.primaryAudioPeerId = scene.slots[0]?.peerId || '';
    }
    if (selectedSlotPeerId === peerId) selectedSlotPeerId = null;
    persist();
    return true;
  }

  function syncSlotProducerIds(clients) {
    let changed = false;
    for (const scene of state.scenes) {
      for (const slot of scene.slots) {
        const client = clients.find((c) => String(c.id) === String(slot.peerId));
        if (!client) continue;
        const pid =
          client.producerIds?.video ||
          client.producerId ||
          client.producerIds?.video ||
          null;
        if (pid && slot.producerId !== pid) {
          slot.producerId = pid;
          slot.label = client.displayName || slot.label;
          changed = true;
        }
      }
    }
    if (changed) persist();
  }

  function applyLayoutFramesToScene(sceneId) {
    const scene = getScene(sceneId);
    if (!scene) return false;
    let changed = false;
    scene.slots.forEach((slot, index) => {
      if (slot.frameEdited) return;
      const defaults = defaultFramesForLayout(scene.layout, scene.slots.length);
      const next = defaults[index] || FULL_FRAME;
      if (!rectsEqual(slot.frame, next)) {
        slot.frame = { ...next };
        changed = true;
      }
    });
    if (changed) persist();
    return changed;
  }

  if (!state.scenes.length) {
    createScene({ name: 'Cena 1' });
  }

  return {
    getSnapshot,
    getScene,
    getEditingScene,
    getPreviewScene,
    getProgramScene,
    getSelectedSlotPeerId,
    setSelectedSlotPeerId,
    setStudioModeEnabled,
    isStudioModeEnabled,
    createScene,
    updateScene,
    updateSlotTransform,
    resetSlotTransform,
    deleteScene,
    duplicateScene,
    setPreviewScene,
    setProgramScene,
    setEditingScene,
    addSlotToEditingScene,
    removeSlotFromEditingScene,
    syncSlotProducerIds,
    applyLayoutFramesToScene,
    MAX_SLOTS,
    LAYOUTS,
    FULL_FRAME,
    slotNeedsTransform
  };
}

/** Defaults de frame por layout (exportado para compositor/editor). */
export function defaultFramesForLayout(layout, slotCount) {
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
    const frames = [{ x: 0, y: 0, w: 1, h: 1 }];
    for (let i = 1; i < n; i++) {
      frames.push({ x: 0.62, y: 0.62, w: 0.36, h: 0.36 });
    }
    return frames;
  }
  if (layout === 'pip-bl' && n >= 2) {
    const frames = [{ x: 0, y: 0, w: 1, h: 1 }];
    for (let i = 1; i < n; i++) {
      frames.push({ x: 0.02, y: 0.62, w: 0.36, h: 0.36 });
    }
    return frames;
  }
  return [{ ...FULL_FRAME }];
}
