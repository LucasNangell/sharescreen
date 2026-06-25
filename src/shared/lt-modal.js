import { createChromaRenderer, rgbToHex } from './lt-chroma.js';
import { showToast } from './toast.js';

const REF_WIDTH = 1920;
const REF_HEIGHT = 1080;

export function setupLtModal({ getHostToken = () => '' } = {}) {
  const modal = document.getElementById('lt-modal');
  if (!modal) return { openLtModal() {}, closeLtModal() {} };

  const els = {
    clientLabel: document.getElementById('lt-client-name'),
    fileInput: document.getElementById('lt-file-input'),
    previewStage: document.getElementById('lt-preview-stage'),
    previewCanvas: document.getElementById('lt-preview-canvas'),
    previewVideo: document.getElementById('lt-preview-video'),
    widthInput: document.getElementById('lt-width-input'),
    heightInput: document.getElementById('lt-height-input'),
    chromaColor: document.getElementById('lt-chroma-color'),
    chromaTolerance: document.getElementById('lt-chroma-tolerance'),
    btnPickColor: document.getElementById('lt-btn-pick-color'),
    btnSave: document.getElementById('btn-lt-modal-save'),
    btnClose: document.getElementById('btn-lt-modal-close'),
    btnCancel: document.getElementById('btn-lt-modal-cancel')
  };

  let activeClient = null;
  let objectUrl = null;
  let origWidth = 1920;
  let origHeight = 1080;
  let aspectRatio = 16 / 9;
  let renderer = null;
  let pickingColor = false;
  let updatingFields = false;

  function revokeObjectUrl() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  }

  function stopPreviewRenderer() {
    if (renderer) {
      renderer.stop();
      renderer = null;
    }
  }

  function updatePreviewLayout() {
    if (!els.previewStage || !els.previewCanvas) return;
    const stageW = els.previewStage.clientWidth;
    const stageH = els.previewStage.clientHeight;
    const displayW = Math.max(40, Number(els.widthInput?.value) || 640);
    const displayH = Math.max(24, Number(els.heightInput?.value) || 360);
    const scale = stageW / REF_WIDTH;
    const w = Math.round(displayW * scale);
    const h = Math.round(displayH * scale);
    els.previewCanvas.style.width = `${w}px`;
    els.previewCanvas.style.height = `${h}px`;
    els.previewCanvas.style.left = `${Math.round(stageW * 0.03)}px`;
    els.previewCanvas.style.bottom = `${Math.round(stageH * 0.04)}px`;
  }

  function syncRendererSettings() {
    if (!renderer) return;
    renderer.setChromaColor(els.chromaColor?.value || '#00FF00');
    renderer.setTolerance(Number(els.chromaTolerance?.value) || 40);
    renderer.drawOnce();
  }

  function startPreviewRenderer() {
    if (!els.previewVideo || !els.previewCanvas) return;
    stopPreviewRenderer();
    renderer = createChromaRenderer({
      video: els.previewVideo,
      canvas: els.previewCanvas,
      chromaColor: els.chromaColor?.value,
      chromaTolerance: Number(els.chromaTolerance?.value) || 40
    });
    renderer.start();
    updatePreviewLayout();
  }

  function setDimensionsFromWidth(width) {
    updatingFields = true;
    const w = Math.max(1, Math.round(Number(width) || 640));
    const h = Math.max(1, Math.round(w / aspectRatio));
    if (els.widthInput) els.widthInput.value = String(w);
    if (els.heightInput) els.heightInput.value = String(h);
    updatingFields = false;
    updatePreviewLayout();
  }

  function setDimensionsFromHeight(height) {
    updatingFields = true;
    const h = Math.max(1, Math.round(Number(height) || 360));
    const w = Math.max(1, Math.round(h * aspectRatio));
    if (els.widthInput) els.widthInput.value = String(w);
    if (els.heightInput) els.heightInput.value = String(h);
    updatingFields = false;
    updatePreviewLayout();
  }

  async function loadExistingConfig(clientName) {
    try {
      const res = await fetch(`/api/lower-third/${encodeURIComponent(clientName)}`);
      if (!res.ok) return;
      const data = await res.json();
      const lt = data.lowerThird;
      if (!lt) return;
      origWidth = lt.origWidth || lt.width || 1920;
      origHeight = lt.origHeight || lt.height || 1080;
      aspectRatio = origWidth / origHeight;
      setDimensionsFromWidth(lt.width || 640);
      if (els.chromaColor) els.chromaColor.value = lt.chromaColor || '#00FF00';
      if (els.chromaTolerance) els.chromaTolerance.value = String(lt.chromaTolerance ?? 40);
      if (els.previewVideo && lt.videoUrl) {
        els.previewVideo.src = lt.videoUrl;
        els.previewVideo.load();
        els.previewVideo.onloadedmetadata = () => {
          if (els.previewVideo.videoWidth) {
            origWidth = els.previewVideo.videoWidth;
            origHeight = els.previewVideo.videoHeight;
            aspectRatio = origWidth / origHeight;
          }
          startPreviewRenderer();
        };
      }
    } catch (_) {}
  }

  function onFileSelected(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.webm')) {
      showToast('Selecione um arquivo .webm', 'warn');
      return;
    }
    revokeObjectUrl();
    objectUrl = URL.createObjectURL(file);
    if (els.previewVideo) {
      els.previewVideo.src = objectUrl;
      els.previewVideo.load();
      els.previewVideo.onloadedmetadata = () => {
        origWidth = els.previewVideo.videoWidth || 1920;
        origHeight = els.previewVideo.videoHeight || 1080;
        aspectRatio = origWidth / origHeight;
        setDimensionsFromWidth(Math.min(origWidth, Math.round(REF_WIDTH * 0.33)));
        startPreviewRenderer();
      };
    }
  }

  async function saveLowerThird() {
    if (!activeClient?.displayName) {
      showToast('Nenhum participante selecionado', 'warn');
      return;
    }
    const file = els.fileInput?.files?.[0];
    const hasExistingVideo = els.previewVideo?.src && !els.previewVideo.src.startsWith('blob:');
    if (!file && !hasExistingVideo) {
      showToast('Selecione um vídeo .webm', 'warn');
      return;
    }

    if (els.btnSave) els.btnSave.disabled = true;
    try {
      let body;
      if (file) {
        body = await file.arrayBuffer();
      } else {
        const res = await fetch(els.previewVideo.src);
        body = await res.arrayBuffer();
      }

      const headers = {
        'Content-Type': 'application/octet-stream',
        'X-LT-Client-Name': activeClient.displayName,
        'X-LT-Width': String(els.widthInput?.value || 640),
        'X-LT-Height': String(els.heightInput?.value || 360),
        'X-LT-Orig-Width': String(origWidth),
        'X-LT-Orig-Height': String(origHeight),
        'X-LT-Chroma-Color': els.chromaColor?.value || '#00FF00',
        'X-LT-Chroma-Tolerance': String(els.chromaTolerance?.value || 40)
      };
      const token = getHostToken();
      if (token) headers['X-Host-Token'] = token;

      const uploadRes = await fetch('/api/lower-third', { method: 'POST', headers, body });
      const result = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) throw new Error(result.erro || 'Falha ao salvar Lower Third');

      showToast('Lower Third salvo', 'success');
      closeLtModal();
    } catch (e) {
      showToast(e.message || 'Erro ao salvar Lower Third', 'error');
    } finally {
      if (els.btnSave) els.btnSave.disabled = false;
    }
  }

  function closeLtModal() {
    stopPreviewRenderer();
    pickingColor = false;
    if (els.previewStage) els.previewStage.classList.remove('lt-picking-color');
    if (els.previewVideo) {
      els.previewVideo.pause();
      els.previewVideo.removeAttribute('src');
      els.previewVideo.load();
    }
    revokeObjectUrl();
    if (els.fileInput) els.fileInput.value = '';
    activeClient = null;
    modal.hidden = true;
  }

  async function openLtModal(client) {
    if (!client?.displayName) return;
    activeClient = client;
    if (els.clientLabel) els.clientLabel.textContent = client.displayName;
    if (els.chromaColor && !els.chromaColor.value) els.chromaColor.value = '#00FF00';
    if (els.chromaTolerance && !els.chromaTolerance.value) els.chromaTolerance.value = '40';
    aspectRatio = 16 / 9;
    origWidth = 1920;
    origHeight = 1080;
    setDimensionsFromWidth(640);
    modal.hidden = false;
    await loadExistingConfig(client.displayName);
    updatePreviewLayout();
  }

  els.fileInput?.addEventListener('change', () => {
    const file = els.fileInput.files?.[0];
    onFileSelected(file);
  });

  els.widthInput?.addEventListener('input', () => {
    if (updatingFields) return;
    setDimensionsFromWidth(els.widthInput.value);
    syncRendererSettings();
  });

  els.heightInput?.addEventListener('input', () => {
    if (updatingFields) return;
    setDimensionsFromHeight(els.heightInput.value);
    syncRendererSettings();
  });

  els.chromaColor?.addEventListener('input', syncRendererSettings);
  els.chromaTolerance?.addEventListener('input', syncRendererSettings);

  els.btnPickColor?.addEventListener('click', () => {
    pickingColor = !pickingColor;
    els.previewStage?.classList.toggle('lt-picking-color', pickingColor);
    showToast(
      pickingColor ? 'Clique no preview para capturar a cor' : 'Conta-gotas desativado',
      'info',
      2000
    );
  });

  els.previewCanvas?.addEventListener('click', (e) => {
    if (!pickingColor || !els.previewCanvas || !renderer) return;
    const rect = els.previewCanvas.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * els.previewCanvas.width);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * els.previewCanvas.height);
    const ctx = els.previewCanvas.getContext('2d');
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    if (els.chromaColor) els.chromaColor.value = hex;
    syncRendererSettings();
    pickingColor = false;
    els.previewStage?.classList.remove('lt-picking-color');
  });

  els.btnSave?.addEventListener('click', saveLowerThird);
  els.btnClose?.addEventListener('click', closeLtModal);
  els.btnCancel?.addEventListener('click', closeLtModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeLtModal();
  });

  window.addEventListener('resize', updatePreviewLayout);

  return { openLtModal, closeLtModal };
}
