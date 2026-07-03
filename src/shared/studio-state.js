const STORAGE_KEY = 'sharescreen_studio_scenes_v1';
const MAX_SLOTS = 4;

const LAYOUTS = ['full', 'split-h', 'split-v', 'pip-br', 'pip-bl'];

function newId() {
  return `scene-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSlot(raw) {
  if (!raw || !raw.peerId) return null;
  return {
    peerId: String(raw.peerId),
    producerId: raw.producerId ? String(raw.producerId) : null,
    label: String(raw.label || raw.peerId)
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
      scenes: state.scenes.map((s) => ({ ...s, slots: s.slots.map((sl) => ({ ...sl })) })),
      previewSceneId: state.previewSceneId,
      programSceneId: state.programSceneId,
      studioModeEnabled: state.studioModeEnabled,
      editingSceneId
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
      slots: src.slots.map((s) => ({ ...s })),
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

  if (!state.scenes.length) {
    createScene({ name: 'Cena 1' });
  }

  return {
    getSnapshot,
    getScene,
    getEditingScene,
    getPreviewScene,
    getProgramScene,
    setStudioModeEnabled,
    isStudioModeEnabled,
    createScene,
    updateScene,
    deleteScene,
    duplicateScene,
    setPreviewScene,
    setProgramScene,
    setEditingScene,
    addSlotToEditingScene,
    removeSlotFromEditingScene,
    syncSlotProducerIds,
    MAX_SLOTS,
    LAYOUTS
  };
}
