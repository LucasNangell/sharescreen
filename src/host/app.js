import { SignalingClient, ConnectionState, wsUrl } from '../shared/signaling-client.js';
import { MediaClient } from '../shared/media-client.js';
import { normalizeTransmission, hasActiveVideo, parseRoomSnapshot, roomSnapshotMediaKey, activeVideoTransmissionKey, remoteVideoConsumeNeeded, enrichRoomSourcesState, resolveRoomClients, reconcileRoomClients, hasAuthoritativeRoomRoster } from '../shared/transmission.js';
import { loadCapturePrefs, saveCapturePrefs, setupMicrophonePicker, installAudioUnlock } from '../shared/audio-manager.js';
import { RecordingClient, RecordingState } from '../shared/recording-client.js';
import { RecordingCompositor } from '../shared/recording-compositor.js';
import { RecordingAudioMixer } from '../shared/recording-audio-mixer.js';
import { ErrorManager, assertSecureContext, isTransientServerError } from '../shared/error-manager.js';
import { UiStateMachine } from '../shared/ui-state.js';
import { mergeServerQuality, loadPresetId, savePresetId, getPreset, bitrateMbps } from '../shared/quality-manager.js';
import { showToast as originalShowToast } from '../shared/toast.js';
import { attachPlaybackScaler } from '../shared/playback-scaler.js';
import { verifyServerBuild } from '../shared/build-verify.js';
import { debugClientSessionLog } from '../shared/debug-session-client.js';
import { collectWebRtcStats } from '../shared/stats-collector.js';
import { formatRecordingFilename, isValidRecordingFilename } from '../shared/recording-filename.js';
import { HostAudioMonitor, savePresetToLocalStorage, renamePresetInLocalStorage } from '../shared/host-audio-monitor.js';
import { createSelfAudioMonitor } from '../shared/self-audio-monitor.js';
import { normalizeRemoteAudioSources, audioSourcesSignature, audioTraceSync, audioTrace } from '../shared/audio-sources.js';
import {
  CLIENT_MIC_PUBLISH_DEFAULTS,
  HOST_MIC_PUBLISH_DEFAULTS,
  MIC_FILTER_DEFAULTS,
  SHARED_ROOM_MIC_PRESET,
  hasActiveMicrophoneFilter,
  normalizeMicrophoneFilterPrefs,
  resolveHostMicFilterPrefs
} from '../shared/mic-dsp.js';
import { startTrackLevelMeter } from '../shared/audio-level-meter.js';
import {
  formatSourceDisplayName,
  buildDisplaySourceCard
} from '../shared/source-cards.js';
import { sortDisplaySources, peerHasPublishedAudio } from '../shared/display-sources.js';
import { updateStreamSourceBadge } from '../shared/stream-source-badge.js';
import { hideLtOverlay, bindLtOverlayResize } from '../shared/lt-overlay.js';
import { createDrawingSurface } from '../shared/drawing-surface.js';
import { createAnnotationToolbar } from '../shared/annotation-toolbar.js';
import { WhiteboardEngine } from '../shared/whiteboard-engine.js';
import { createStudioState, slotNeedsTransform } from '../shared/studio-state.js';
import { StudioCompositor, resolveCompositorDimensions } from '../shared/studio-compositor.js';
import { createStudioTransformEditor } from '../shared/studio-transform-editor.js';
import { requireAuthSession, fetchCurrentUser, authDisplayName, bindLogoutControl } from '../shared/auth-client.js';
import { createRoomControls } from '../shared/room-controls.js';
import { createAudioFiltersPanel } from '../shared/audio-filters-panel.js';
import { fetchClientAudioFilterPreset } from '../shared/audio-filter-presets.js';

const STUDIO_COMPOSITOR_IN_MAIN = true;

const STORAGE_HOST_NAME = 'sharescreen_host_name';
const STORAGE_RECORDINGS_DIR = 'sharescreen_recordings_dir';
const STORAGE_RECORDING_FILENAME_PATTERN = 'sharescreen_recording_filename_pattern';
const STORAGE_REC_EXCLUDE_OWN_SYSTEM = 'sharescreen_rec_exclude_own_system';
const STORAGE_REC_SELECTED_PEER_ONLY = 'sharescreen_rec_selected_peer_only';
const STORAGE_REC_DEFAULT_AUDIO_CLIENT = 'sharescreen_rec_default_audio_client';
const HOST_MIC_PREFS_STORAGE_KEY = 'sharescreen_host_mic_prefs';
const HOST_MIC_FILTER_PREVIEW_MS = 300;

function showToast(message, type, durationMs) {
  const lower = String(message || '').toLowerCase();
  if (lower.includes('fonte selecionada') || lower.includes('tela compartilhada')) {
    return;
  }
  originalShowToast(message, type, durationMs);
}

function readQueryParam(key) {
  try {
    return new URLSearchParams(location.search).get(key)?.trim() || '';
  } catch {
    return '';
  }
}

const $ = (id) => document.getElementById(id);

const els = {
  statusBadge: $('status-badge'),
  secureBadge: $('secure-badge'),
  preview: $('preview-video') || $('video-remoto'),
  previewAudio: $('preview-audio') || $('audio-remoto'),
  previewEmpty: $('preview-empty'),
  previewWaiting: $('preview-waiting'),
  previewPaused: $('preview-paused'),
  previewReconnecting: $('preview-reconnecting'),
  previewError: $('preview-error'),
  previewErrorMsg: $('preview-error-msg'),
  previewInfo: $('preview-info'),
  previewSourceName: $('preview-source-name'),
  streamSourceBadge: $('stream-source-badge'),
  previewQuality: $('preview-quality-label'),
  lista: $('lista-clients'),
  selecionado: $('selecionado-info'),
  logs: $('logs'),
  sidebar: $('sidebar'),
  appMain: document.querySelector('.app-main') || document.querySelector('.client-main'),
  btnPausar: $('btn-pausar'),
  btnRetomar: $('btn-retomar'),
  btnLimpar: $('btn-limpar'),
  btnGravar: $('btn-gravar'),
  btnPararGravar: $('btn-parar-gravar'),
  btnPlayPause: $('btn-playpause'),
  btnRecordingToggle: $('btn-gravacao-toggle'),
  recordingsDirInput: $('recordings-dir-input'),
  recordingFilenamePatternInput: $('recording-filename-pattern-input'),
  btnSaveFilenamePattern: $('btn-save-filename-pattern'),
  recordingFilenamePatternStatus: $('recording-filename-pattern-status'),
  transmissionCardContainer: $('transmission-card-container'),
  transmissionVuColumn: $('transmission-vu-column'),
  transmissionVuFill: $('transmission-vu-fill'),
  recordingStatus: $('recording-status'),
  recordingTimer: $('recording-timer'),
  uploadProgressWrap: $('upload-progress-wrap'),
  uploadProgress: $('upload-progress'),
  recordingFilename: $('recording-filename'),
  pendingRecordingsWrap: $('pending-recordings-wrap'),
  pendingRecordingsList: $('pending-recordings-list'),
  recExcludeOwnSystem: $('rec-exclude-own-system'),
  recSelectedPeerOnly: $('rec-selected-peer-only'),
  chkMeetBridgeLive: $('chk-meet-bridge-live'),
  btnRecMeetBridgePreset: $('btn-rec-meet-bridge-preset'),
  recMeetBridgeHint: $('rec-meet-bridge-hint'),
  chkSharedRoomMode: $('chk-shared-room-mode'),
  btnSharedRoomPreset: $('btn-shared-room-preset'),
  sharedRoomHint: $('shared-room-hint'),
  recDefaultAudioHint: $('rec-default-audio-hint'),
  btnRecClearDefaultAudio: $('btn-rec-clear-default-audio'),
  controlesAudio: $('controles-audio'),
  volumeSlider: $('volume-slider'),
  btnMute: $('btn-mute-audio'),
  hostChkSystem: $('host-chk-system-audio'),
  hostChkMic: $('host-chk-microphone'),
  hostMicWrap: $('host-mic-picker-wrap'),
  hostMicSelect: $('host-mic-select'),
  hostBtnRefreshMics: $('host-btn-refresh-mics'),
  btnHostMic: $('btn-host-mic'),
  btnActivateAudio: $('btn-activate-audio'),
  drawCanvas: $('live-annotation-canvas'),
  annotationToolbar: $('annotation-toolbar'),
  annotationToolbarToggle: $('annotation-toolbar-toggle'),
  annotationToolbarPanel: $('annotation-toolbar-panel'),
  annotationColor: $('annotation-color'),
  annotationWidth: $('annotation-width'),
  annotationClear: $('annotation-clear'),
  btnQuadroBranco: $('btn-quadro-branco'),
  statusBar: $('status-bar'),
  qualityPreset: $('quality-preset'),
  qualityHint: $('quality-hint'),
  btnHostSwitchScreen: $('btn-host-switch-screen'),
  techDrawer: $('tech-drawer'),
  btnTech: $('btn-tech-panel'),
  btnCloseTech: $('btn-close-tech'),
  btnCopyClient: $('btn-copy-client'),
  btnCopyHost: $('btn-copy-host'),
  btnExternalLink: $('btn-external-link'),
  externalLinkModal: $('external-link-modal'),
  externalGuestName: $('external-guest-name'),
  btnExternalLinkSubmit: $('btn-external-link-submit'),
  btnExternalLinkCancel: $('btn-external-link-cancel'),
  btnFullscreen: $('btn-fullscreen'),
  btnPopoutControls: $('btn-popout-controls'),
  btnFsSources: $('btn-fs-sources'),
  fsSourceMenu: $('fs-source-menu'),
  fsSourceList: $('fs-source-list'),
  previewArea: $('preview-area'),
  btnSidebarCollapse: $('btn-sidebar-collapse'),
  hostEntryModal: $('host-entry-modal'),
  hostNameInput: $('host-name-input'),
  hostPinWrap: $('host-pin-wrap'),
  pinInput: $('pin-input'),
  btnHostEntrySubmit: $('btn-host-entry-submit'),
  statBitrate: $('stat-bitrate'),
  statLoss: $('stat-loss'),
  statRtt: $('stat-rtt'),
  statFps: $('stat-fps')
};

let signaling = null;
let media = null;
let playbackScaler = null;

function ensurePlaybackScaler() {
  if (playbackScaler || !els.preview) return;
  playbackScaler = attachPlaybackScaler({
    video: els.preview,
    container: els.previewArea || els.preview.parentElement
  });
}

function stopPlaybackScaler() {
  playbackScaler?.detach();
  playbackScaler = null;
}
let estado = { clients: [], selecionado: null, controleExibicao: [] };
let hostPeerId = null;
let hostReady = false;
let joinInProgress = false;
let joinGeneration = 0;
let transmissionWork = Promise.resolve();
let transmissionGeneration = 0;
let audioMuted = false;
const mutedClients = new Set();
const cardVuElements = new Map();
let hostAudioMonitor = null;
let syncAudioMonitorPromise = null;
let syncAudioMonitorPending = false;
let hostMicAutoplayNeeded = false;
let hostMicPublishDegraded = false;
let lastHostMicDegraded = false;
let hostMicPublishWatchdogTimer = null;
let hostMicPicker = null;
const MIC_PICKER_READY_TIMEOUT_MS = 4000;
let lastAudioSources = [];
let lastAppliedAudioSig = '';
let hasServerAudioList = false;
const ownPeerIds = new Set();
let fontesAudioDebounceTimer = null;
let meetBridgeLiveMode = false;
let sharedRoomMode = false;
let dominantSpeakerPeerId = null;
let pendingRoomSnapshot = null;
let lastAppliedSnapshotKey = '';
let lastAppliedActiveVideoKey = '';
let lastAppliedRoomVersion = 0;
let lastActiveTransmission = null;
let pendingHostAudioSync = null;
const peerDisplayNameById = new Map();

const studio = createStudioState({ onChange: () => scheduleStudioUiRefresh() });
let studioUi = null;
let studioPreviewCompositor = null;
let studioProgramCompositor = null;
let studioPreviewVideoEls = [];
let studioProgramMirrorId = null;
let studioUiRefreshTimer = null;
let studioTransformEditor = null;
let studioCropMode = false;
let studioPreviewApplyTimer = null;
let studioLastPreviewKey = '';
let studioProgramCanvasHost = null;
let hostVideoWatchdogId = null;
let whiteboardEngine = null;
let whiteboardActiveLocal = false;
let lastWhiteboardServerElements = [];
let lastTransmissionSourceKind = null;
let drawingSurface = null;
let annotationToolbar = null;

const HOST_MIC_GAIN_STORAGE_KEY = 'sharescreen_host_mic_gain';

function loadHostMicPrefsCache() {
  try {
    const raw = localStorage.getItem(HOST_MIC_PREFS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function saveHostMicPrefsCache(prefs) {
  try {
    localStorage.setItem(HOST_MIC_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

function loadHostMicPublishGain(fallback = 1.4) {
  try {
    const raw = localStorage.getItem(HOST_MIC_GAIN_STORAGE_KEY);
    if (raw == null || raw === '') return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value)) return fallback;
    return Math.max(0.5, Math.min(2.5, value));
  } catch {
    return fallback;
  }
}

function getDefaultHostMicPublishGain() {
  return Number(media?.videoQuality?.hostMicPublishGain ?? 1.4);
}

let hostMicFilterPrefs = normalizeMicrophoneFilterPrefs(HOST_MIC_PUBLISH_DEFAULTS);
let hostMicFilterPreviewTimer = null;
let hostMicFilterPreviewPromise = Promise.resolve();
let selfAudioMonitor = null;

function ensureSelfAudioMonitor() {
  if (!selfAudioMonitor) {
    selfAudioMonitor = createSelfAudioMonitor({
      getTrack: () => media?.getPublishedMicrophoneTrack?.() || null,
      onBlocked: () => {
        const enabled = $('audio-self-monitor-enabled');
        if (enabled) enabled.checked = false;
        showToast('Nao foi possivel monitorar o microfone — clique na pagina e tente de novo', 'warn');
      }
    });
  }
  return selfAudioMonitor;
}

function persistHostMicFilterPrefs(prefs) {
  saveHostMicPrefsCache(prefs);
  if (hostDisplayName) {
    saveAudioFiltersPresetDebounced(hostDisplayName, prefs, 'host', authUser?.id);
  }
}

async function applyHostMicFilterPrefs(prefs, { persist = false } = {}) {
  const next = normalizeMicrophoneFilterPrefs(prefs || HOST_MIC_PUBLISH_DEFAULTS);
  hostMicFilterPrefs = next;
  if (media?.setMicrophoneFilterPrefs) {
    await media.setMicrophoneFilterPrefs(next);
  }
  ensureSelfAudioMonitor().refresh().catch(() => {});
  if (persist) persistHostMicFilterPrefs(next);
  return next;
}

function scheduleHostMicFilterPreview(prefs) {
  if (hostMicFilterPreviewTimer) clearTimeout(hostMicFilterPreviewTimer);
  hostMicFilterPreviewTimer = setTimeout(() => {
    hostMicFilterPreviewTimer = null;
    hostMicFilterPreviewPromise = applyHostMicFilterPrefs(prefs, { persist: false }).catch((e) =>
      errors.handle(e, 'host-mic-filters')
    );
  }, HOST_MIC_FILTER_PREVIEW_MS);
}

async function flushHostMicFilterPreview() {
  if (hostMicFilterPreviewTimer) {
    clearTimeout(hostMicFilterPreviewTimer);
    hostMicFilterPreviewTimer = null;
  }
  await hostMicFilterPreviewPromise;
}

async function loadHostMicPresetFromStorage() {
  const apiPreset = hostDisplayName
    ? await fetchAudioFilterPresetApi('host', hostDisplayName, authUser?.id)
    : null;
  const prefs = resolveHostMicFilterPrefs({
    apiPrefs: apiPreset?.prefs || null,
    cachedPrefs: loadHostMicPrefsCache(),
    legacyGain: loadHostMicPublishGain(getDefaultHostMicPublishGain()),
    defaults: HOST_MIC_PUBLISH_DEFAULTS
  });
  await applyHostMicFilterPrefs(prefs, { persist: false });
  if (hostDisplayName && !apiPreset?.prefs) persistHostMicFilterPrefs(prefs);
}

async function fetchAudioFilterPresetApi(kind, name, userId = null) {
  const trimmed = String(name || '').trim();
  if (!trimmed && !userId) return null;
  try {
    const isClient = String(kind).toLowerCase() === 'client';
    const params = !isClient && userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await fetch(
      `/api/audio-filter/${encodeURIComponent(kind)}/${encodeURIComponent(trimmed || '_')}${params}`,
      { credentials: 'same-origin' }
    );
    const data = await res.json();
    return data?.preset || null;
  } catch {
    return null;
  }
}

async function saveAudioFilterPresetApi(kind, name, prefs, userId = null) {
  const trimmed = String(name || '').trim();
  if (!trimmed && !userId) return { ok: false };
  try {
    const res = await fetch('/api/audio-filter', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(hostToken ? { 'X-Host-Token': hostToken } : {})
      },
      body: JSON.stringify({
        kind,
        name: trimmed,
        prefs: normalizeMicrophoneFilterPrefs(prefs),
        userId:
          String(kind).toLowerCase() === 'client'
            ? userId || null
            : userId || authUser?.id || null
      })
    });
    return await res.json();
  } catch {
    return { ok: false };
  }
}

function getDefaultRecordingAudioClientName() {
  return String(localStorage.getItem(STORAGE_REC_DEFAULT_AUDIO_CLIENT) || '').trim();
}

function setDefaultRecordingAudioClientName(name) {
  const trimmed = String(name || '').trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_REC_DEFAULT_AUDIO_CLIENT, trimmed);
  } else {
    localStorage.removeItem(STORAGE_REC_DEFAULT_AUDIO_CLIENT);
  }
  syncRecordingDefaultAudioClientUi();
}

function syncRecordingDefaultAudioClientUi() {
  const name = getDefaultRecordingAudioClientName();
  if (els.recDefaultAudioHint) {
    els.recDefaultAudioHint.textContent = name
      ? `Áudio padrão da gravação: ${name}`
      : 'Áudio padrão da gravação: nenhum';
  }
  if (els.btnRecClearDefaultAudio) {
    els.btnRecClearDefaultAudio.hidden = !name;
  }
}

function resolveRecordingAudioPeer(clients, displayName) {
  const wanted = String(displayName || '').trim().toLowerCase();
  if (!wanted) return null;
  const withAudio = (clients || []).find((c) => {
    if (c.ehHost || String(c.id) === String(hostPeerId)) return false;
    if (String(c.displayName || '').trim().toLowerCase() !== wanted) return false;
    return !!(
      c.hasAudio ||
      c.producerIds?.microphone ||
      c.producerIds?.system ||
      c.producerIds?.audio
    );
  });
  if (withAudio) return withAudio;
  return (clients || []).find((c) => {
    if (c.ehHost) return false;
    return String(c.displayName || '').trim().toLowerCase() === wanted;
  }) || null;
}

function trackClientDisplayNameChanges(clients) {
  for (const c of clients || []) {
    if (!c?.id || c.ehHost) continue;
    const id = String(c.id);
    const newName = String(c.displayName || '').trim();
    if (!newName) continue;
    const oldName = peerDisplayNameById.get(id);
    if (oldName && oldName.toLowerCase() !== newName.toLowerCase()) {
      renamePresetInLocalStorage(oldName, newName);
      const defaultRec = getDefaultRecordingAudioClientName();
      if (defaultRec && defaultRec.toLowerCase() === oldName.toLowerCase()) {
        setDefaultRecordingAudioClientName(newName);
      }
    }
    peerDisplayNameById.set(id, newName);
  }
}

function toggleDefaultRecordingAudioClient(client) {
  if (!client?.displayName) return;
  const current = getDefaultRecordingAudioClientName();
  if (current && current.toLowerCase() === client.displayName.toLowerCase()) {
    setDefaultRecordingAudioClientName('');
    showToast('Áudio padrão da gravação removido', 'info');
  } else {
    setDefaultRecordingAudioClientName(client.displayName);
    showToast(`${client.displayName} definido como áudio padrão da gravação`, 'success');
  }
  renderLista();
}

let localHostVuStop = null;
let isCoHostInstance = readQueryParam('cohost') === 'true';
if (readQueryParam('nome')) localStorage.setItem(STORAGE_HOST_NAME, readQueryParam('nome'));

function setHostShellVisible(visible) {
  if (els.appMain) {
    els.appMain.hidden = !visible;
    if (visible) els.appMain.classList.add('sidebar-open');
  }
  if (els.sidebar) els.sidebar.hidden = !visible;
  if (els.techDrawer) els.techDrawer.hidden = !visible;
}

function promptRoomPinIfRequired(roomPinRequired) {
  if (!roomPinRequired) return Promise.resolve();

  return new Promise((resolve) => {
    const nameField = els.hostNameInput?.closest('.field');
    if (nameField) nameField.hidden = true;
    if (els.hostPinWrap) els.hostPinWrap.hidden = false;
    if (els.hostEntryModal) els.hostEntryModal.hidden = false;
    if (els.btnHostEntrySubmit) {
      els.btnHostEntrySubmit.textContent = 'Continuar';
    }

    const submit = () => {
      roomPin = els.pinInput?.value.trim() || '';
      if (!roomPin) {
        showToast('Informe o PIN da sala', 'warn');
        els.pinInput?.focus();
        return;
      }
      if (els.hostEntryModal) els.hostEntryModal.hidden = true;
      resolve();
    };

    els.btnHostEntrySubmit.onclick = submit;
    els.pinInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
    els.pinInput?.focus();
  });
}

function promptHostScreenShare() {
  return new Promise((resolve) => {
    const title = document.getElementById('host-entry-title');
    const desc = els.hostEntryModal?.querySelector('.modal-panel > p');
    const nameField = els.hostNameInput?.closest('.field');
    if (nameField) nameField.hidden = true;
    if (els.hostPinWrap) els.hostPinWrap.hidden = true;
    if (title) title.textContent = 'Compartilhar tela';
    if (desc) {
      desc.textContent = `Olá, ${hostDisplayName}. Selecione a tela que deseja transmitir neste painel.`;
    }
    if (els.btnHostEntrySubmit) els.btnHostEntrySubmit.textContent = 'Selecionar tela';
    if (els.hostEntryModal) els.hostEntryModal.hidden = false;

    const submit = async () => {
      if (els.hostEntryModal) els.hostEntryModal.hidden = true;
      try {
        await iniciarCompartilhamentoHost();
      } catch (e) {
        errors.handle(e, 'compartilhar');
      }
      resolve();
    };

    els.btnHostEntrySubmit.onclick = submit;
    els.hostNameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
    els.btnHostEntrySubmit?.focus();
  });
}

let roomPin = '';
let hostToken = '';
let authUser = null;
let hostDisplayName = readQueryParam('nome') || localStorage.getItem(STORAGE_HOST_NAME) || '';
let statsTimer = null;
const HOST_TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const HOST_LOCK_KEY = 'sharescreen-host-lock';
const HOST_LOCK_TTL_MS = 8000;
let hostTabBlocked = false;
let hostLockTimer = null;
let hostSessionJoined = false;

function debugHostLog(_hypothesisId, _message, _data = {}) {}

function debugPopoutLog(hypothesisId, location, message, data = {}) {
  // #region agent log
  fetch('/api/client-debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'c3e9ac',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion
}

function debug3a36beLog(hypothesisId, location, message, data = {}) {
  // Telemetria local de debug — desativada por padrão (evita ERR_CONNECTION_REFUSED no console).
  if (typeof window === 'undefined' || !window.__SHARESCREEN_DEBUG__) return;
  // #region agent log
  fetch('http://127.0.0.1:7342/ingest/d6eaae2d-26c4-4be2-9f68-b438f53e5451', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '3a36be' },
    body: JSON.stringify({
      sessionId: '3a36be',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion
}

function readHostLock() {
  try {
    return JSON.parse(localStorage.getItem(HOST_LOCK_KEY) || 'null');
  } catch {
    return null;
  }
}

function tryAcquireHostLock() {
  const now = Date.now();
  const current = readHostLock();
  if (current && current.tabId !== HOST_TAB_ID && now - current.ts < HOST_LOCK_TTL_MS) {
    return false;
  }
  localStorage.setItem(HOST_LOCK_KEY, JSON.stringify({ tabId: HOST_TAB_ID, ts: now }));
  const verify = readHostLock();
  return verify?.tabId === HOST_TAB_ID;
}

function refreshHostLock() {
  if (readHostLock()?.tabId !== HOST_TAB_ID) return;
  localStorage.setItem(HOST_LOCK_KEY, JSON.stringify({ tabId: HOST_TAB_ID, ts: Date.now() }));
}

function releaseHostLock() {
  const current = readHostLock();
  if (current?.tabId === HOST_TAB_ID) {
    localStorage.removeItem(HOST_LOCK_KEY);
  }
}

const ui = new UiStateMachine({ onChange: syncControlButtons });
const hostRoomControls = createRoomControls({
  getSignaling: () => signaling,
  getSelfPeerId: () => hostPeerId,
  getHostPeerId: () => hostPeerId,
  getEstado: () => estado,
  setEstado: (next) => {
    estado = next;
  },
  mutedClients,
  ui,
  capabilities: {
    canManageCoHosts: true,
    audioFilters: false,
    modes: false
  },
  hooks: {
    canCommand: () => canHostCommand(),
    notify: showToast,
    setStatus,
    onError: (e, ctx) => errors.handle(e, ctx),
    onMuteChanged: () => {
      applyClientAudioMute();
      renderLista();
    }
  }
});
const errors = new ErrorManager({
  onToast: (msg, type) => showToast(msg, type),
  onTechnicalLog: (msg, level) => log(msg, level)
});
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = String(event.message || event.error?.message || '');
    if (/resizeobserver|script error/i.test(msg)) return;
    errors.handle(event.error || new Error(msg || 'Erro de script'), 'window.onerror');
  });
  window.addEventListener('unhandledrejection', (event) => {
    errors.handle(event.reason || new Error('Promise rejeitada'), 'unhandledrejection');
  });
}
const recorder = new RecordingClient({
  onLog: log,
  onStateChange: updateRecordingUi,
  onProgress: (pct) => {
    if (els.uploadProgress) els.uploadProgress.style.width = `${pct}%`;
  },
  onTimer: (sec, bytes) => {
    if (els.recordingTimer) {
      const sizeHint = bytes ? ` · ${formatRecordingBytes(bytes)} no servidor` : '';
      els.recordingTimer.textContent = `${formatTimer(sec)}${sizeHint}`;
      els.recordingTimer.hidden = false;
    }
  }
});
let recordingCapture = null;

const hostCapturePrefs = loadCapturePrefs();
if (els.hostChkSystem) els.hostChkSystem.checked = !!hostCapturePrefs.systemAudio;
if (els.hostChkMic) els.hostChkMic.checked = !!hostCapturePrefs.microphone;
if (els.qualityPreset) {
  els.qualityPreset.value = loadPresetId();
  updateQualityHint();
  els.qualityPreset.addEventListener('change', () => applyHostQuality(els.qualityPreset.value));
}

function updateQualityHint() {
  const preset = getPreset(els.qualityPreset?.value || loadPresetId());
  if (els.qualityHint) {
    els.qualityHint.textContent = `${preset.description} - ate ${bitrateMbps(preset)} Mbps`;
  }
}

async function applyHostQuality(presetId) {
  savePresetId(presetId);
  updateQualityHint();
  const quality = mergeServerQuality(media?.videoQuality || {}, presetId);
  media?.setVideoQuality(quality);
  const appliedLive = media ? await media.applyLiveVideoQuality() : false;
  if (els.previewQuality && ui._flags.hasPreview) {
    els.previewQuality.textContent = getPreset(presetId).label;
  }
  if (canHostCommand()) {
    signaling.send('definirQualidade', { presetId });
  }
  const label = getPreset(presetId).label;
  showToast(
    appliedLive
      ? `Qualidade aplicada na transmissao: ${label}`
      : `Qualidade: ${label} (vale no proximo compartilhamento)`,
    'info'
  );
}

hostMicPicker = setupMicrophonePicker({
  checkbox: els.hostChkMic,
  wrap: els.hostMicWrap,
  select: els.hostMicSelect,
  refreshBtn: els.hostBtnRefreshMics,
  savedDeviceId: hostCapturePrefs.microphoneDeviceId || '',
  onLog: log,
  onError: (m) => errors.handle(new Error(m), 'microfone'),
  onSelectChange: () => onHostAudioPrefsChange(),
  onResolved: () => saveCapturePrefs(getHostCapturePrefs()),
  hasLiveTrack: () => media?.getLocalMicrophoneTrack?.()?.readyState === 'live'
});
els.hostChkMic?.addEventListener('change', () => onHostAudioPrefsChange());
els.hostChkSystem?.addEventListener('change', () => onHostAudioPrefsChange());

async function onHostAudioPrefsChange() {
  saveCapturePrefs(getHostCapturePrefs());
  if (els.hostMicWrap) {
    els.hostMicWrap.hidden = !els.hostChkMic?.checked;
  }
  updateHostMicUi();
  if (!media || !hostReady) return;
  try {
    const prefs = getHostCapturePrefs();
    await media.ensureSendTransport();
    if (prefs.microphone) {
      await applyHostMicFilterPrefs(hostMicFilterPrefs, { persist: false });
    }
    const displayStream = media.localScreenStream;
    const wantsSystem = !!prefs.systemAudio;
    const hasDisplayAudio = !!displayStream
      ?.getAudioTracks?.()
      ?.some((track) => track.readyState === 'live');

    let recaptureCancelled = false;
    if (wantsSystem && displayStream && !hasDisplayAudio) {
      const switched = await media.switchDisplayCapture(prefs);
      recaptureCancelled = !!switched?.cancelled;
      if (recaptureCancelled) {
        showToast(
          'Selecao cancelada - microfone inalterado. Marque Compartilhar audio no dialogo para incluir o audio da aba/sistema.',
          'info'
        );
      } else if (switched?.busy) {
        showToast('Aguarde a troca de tela terminar', 'warn');
      }
    } else {
      await media.syncPublishedAudio(prefs, displayStream);
    }
    syncLocalHostVu();
    refreshHostMicDeviceList();
    syncHostMicPublishHealthUi();
    syncOwnMicMuteFromRoom();
    if (recaptureCancelled) {
      return;
    }
    if (prefs.microphone && !media.hasPublishedMicrophone()) {
      showToast('Microfone nao publicado - verifique permissao do navegador', 'warn');
    } else if (!prefs.microphone && !prefs.systemAudio) {
      showToast('Audio desativado', 'info');
    } else if (!prefs.microphone) {
      showToast('Microfone desativado - so audio da aba/janela', 'info');
    } else if (media.hasPublishedMicrophone()) {
      showToast('Microfone atualizado', 'info');
    }
  } catch (e) {
    errors.handle(e, 'audio-prefs');
  }
}

function formatTimer(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatRecordingBytes(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function log(msg, level = 'info') {
  if (level === 'error') console.error(msg);
  else if (level === 'warn') console.warn(msg);
  if (!els.logs) return;
  const time = new Date().toLocaleTimeString('pt-BR');
  const line = document.createElement('div');
  line.className = `log-line log-${level}`;
  line.textContent = `[${time}] ${msg}`;
  els.logs.prepend(line);
  while (els.logs.children.length > 150) els.logs.lastChild?.remove();
}

function setStatus(text) {
  if (els.statusBar) els.statusBar.textContent = text;
}

function setBadge(text, type = 'muted') {
  if (!els.statusBadge) return;
  els.statusBadge.textContent = text;
  els.statusBadge.className = `badge badge-${type}`;
}

function getHostCapturePrefs() {
  return {
    systemAudio: !!els.hostChkSystem?.checked,
    microphone: !!els.hostChkMic?.checked,
    microphoneDeviceId: els.hostMicSelect?.value || ''
  };
}

function syncControlButtons() {
  if (els.btnPausar) {
    els.btnPausar.disabled = !ui.canPause();
    els.btnPausar.hidden = ui._flags.isPaused;
  }
  if (els.btnRetomar) {
    els.btnRetomar.hidden = !ui._flags.isPaused;
    els.btnRetomar.disabled = !ui.canResume();
  }
  if (els.btnLimpar) {
    els.btnLimpar.disabled = !ui._flags.hasSelection;
  }
  if (els.btnGravar) {
    els.btnGravar.disabled = !ui.canRecord();
  }
  if (els.btnPararGravar) {
    els.btnPararGravar.disabled = !ui.canStopRecord();
    els.btnPararGravar.hidden = !ui._flags.isRecording;
  }

  // Sync merged Play/Pause button
  if (els.btnPlayPause) {
    const isPaused = ui._flags.isPaused;
    els.btnPlayPause.disabled = isPaused ? !ui.canResume() : !ui.canPause();
    els.btnPlayPause.title = isPaused ? 'Retomar transmissao' : 'Pausar transmissao';
    els.btnPlayPause.innerHTML = isPaused
      ? `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`
      : `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
  }

  // Sync merged Recording/Stop button
  if (els.btnRecordingToggle) {
    const isRec = ui._flags.isRecording;
    const busy = ui._flags.isUploading || ui._flags.isRecordingBusy;
    els.btnRecordingToggle.disabled = isRec ? !ui.canStopRecord() : !ui.canRecord() || busy;
    els.btnRecordingToggle.title = isRec ? 'Parar gravacao' : 'Gravar transmissao';
    if (isRec) {
      els.btnRecordingToggle.classList.add('btn-danger');
      els.btnRecordingToggle.classList.remove('btn-secondary');
      els.btnRecordingToggle.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="white"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>`;
    } else {
      els.btnRecordingToggle.classList.add('btn-secondary');
      els.btnRecordingToggle.classList.remove('btn-danger');
      els.btnRecordingToggle.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="red"><circle cx="12" cy="12" r="8"></circle></svg>`;
    }
  }
}

function updatePreviewOverlays() {
  if (!els.previewEmpty) return;

  const sel = estado.selecionado;
  const paused = sel?.pausado;
  const hasPreview = ui._flags.hasPreview;

  els.previewEmpty.hidden = hasPreview || paused || !!sel;
  els.previewWaiting.hidden = hasPreview || paused || !sel;
  els.previewPaused.hidden = !paused;
  els.previewInfo.hidden = true;

  const showBadge = hasPreview && sel && !paused;
  const badgeName =
    isWhiteboardTransmission(lastActiveTransmission) ? 'Quadro branco' : sel?.displayName;
  updateStreamSourceBadge(els.streamSourceBadge, badgeName, showBadge);
  if (sel && hasPreview && els.previewSourceName) {
    els.previewSourceName.textContent = badgeName || 'Fonte';
    if (els.previewQuality) {
      els.previewQuality.textContent = getPreset(loadPresetId()).label;
    }
  }
  updateDrawUi();
}

function isWhiteboardTransmission(tx) {
  return tx?.sourceKind === 'whiteboard';
}

function getDrawingMode() {
  return isWhiteboardTransmission(lastActiveTransmission) ? 'persistent' : 'ephemeral';
}

function canClearWhiteboard() {
  return isWhiteboardTransmission(lastActiveTransmission) && canHostCommand();
}

function updateQuadroBrancoUi() {
  if (els.btnQuadroBranco) {
    els.btnQuadroBranco.classList.toggle(
      'is-active',
      whiteboardActiveLocal || isWhiteboardTransmission(lastActiveTransmission)
    );
  }
  annotationToolbar?.syncClearVisibility();
}

function applyWhiteboardState(payload) {
  if (!payload) return;
  const elements = payload.elements || [];
  lastWhiteboardServerElements = elements.slice();
  whiteboardEngine?.setElements(elements);
  whiteboardActiveLocal = !!payload.active;
  updateQuadroBrancoUi();
}

function handleWhiteboardElement(element) {
  whiteboardEngine?.addElement(element);
}

async function ensureWhiteboardEngineReady(elements = lastWhiteboardServerElements) {
  if (whiteboardEngine?.stream) {
    if (elements.length) whiteboardEngine.setElements(elements);
    return whiteboardEngine;
  }
  await media.ensureSendTransport();
  whiteboardEngine = WhiteboardEngine.start({ width: 1920, height: 1080, fps: 30 });
  if (elements.length) whiteboardEngine.setElements(elements);
  await media.publishSyntheticVideoStream(whiteboardEngine.stream);
  whiteboardActiveLocal = true;
  updateQuadroBrancoUi();
  return whiteboardEngine;
}

function resetAppliedTransmissionDedup() {
  lastAppliedActiveVideoKey = '';
  lastAppliedSnapshotKey = '';
}

async function stopWhiteboardTransmission({ notifyServer = false } = {}) {
  const wasActive = whiteboardActiveLocal || isWhiteboardTransmission(lastActiveTransmission);
  if (notifyServer && signaling?.connected && wasActive) {
    signaling.send('quadroBrancoParar');
  }

  const syntheticActive = !!media?.isSyntheticVideoActive?.();
  if (syntheticActive) {
    await media.stopSyntheticVideo({ notifyServer: false });
  }

  if (whiteboardEngine) {
    whiteboardEngine.stop();
    whiteboardEngine = null;
  }

  whiteboardActiveLocal = false;
  lastWhiteboardServerElements = [];
  drawingSurface?.clearPersistentOverlay();
  annotationToolbar?.setTool(null);
  resetAppliedTransmissionDedup();

  if (
    notifyServer &&
    signaling?.connected &&
    signaling?.authenticated &&
    !media?.hasVideoProducer?.()
  ) {
    try {
      signaling.send('pararProducao', {});
    } catch (_) {}
  }

  updateQuadroBrancoUi();
}

async function iniciarQuadroBranco() {
  if (!canHostCommand()) {
    showToast('Aguarde o painel conectar ao servidor', 'warn');
    return;
  }
  try {
    if (studioProgramCompositor) {
      studioProgramCompositor.stop();
      studioProgramCompositor = null;
    }
    if (studioPreviewCompositor) {
      studioPreviewCompositor.stop();
      studioPreviewCompositor = null;
    }
    await stopWhiteboardTransmission({ notifyServer: false });
    await media.ensureSendTransport();
    whiteboardEngine = WhiteboardEngine.start({ width: 1920, height: 1080, fps: 30 });
    await media.publishSyntheticVideoStream(whiteboardEngine.stream);
    whiteboardActiveLocal = true;
    signaling.send('quadroBrancoIniciar');
    await selecionar(hostPeerId);
    await bindHostSelfPreview(whiteboardEngine.stream);
    annotationToolbar?.expandWithDefaultTool?.();
    updateQuadroBrancoUi();
    showToast('Quadro branco ativo', 'success');
    startHostVideoWatchdog();
  } catch (e) {
    await stopWhiteboardTransmission({ notifyServer: false });
    errors.handle(e, 'quadroBranco');
  }
}

function updateDrawUi() {
  const hasPreview = ui._flags.hasPreview;
  annotationToolbar?.setVisible(hostReady && hasPreview);
  annotationToolbar?.syncClearVisibility();
  drawingSurface?.syncDrawUi();
  drawingSurface?.resize();
}

function formatClientName(c) {
  return formatSourceDisplayName(c);
}

function sortClientsForDisplay(clients) {
  return sortDisplaySources(clients);
}

function getHostVideoStreamForStudio() {
  if (media?._syntheticStream) {
    const synTrack = media._syntheticStream.getVideoTracks?.()?.[0];
    if (synTrack?.readyState === 'live') return media._syntheticStream;
  }

  if (whiteboardEngine?.stream) {
    const wbTrack = whiteboardEngine.stream.getVideoTracks?.()?.[0];
    if (wbTrack?.readyState === 'live') return whiteboardEngine.stream;
  }

  const local = media?.localScreenStream;
  const localTrack = local?.getVideoTracks?.()?.[0];
  if (localTrack?.readyState === 'live') return local;

  const producerTrack = media?.producers?.video?.track;
  if (producerTrack?.readyState === 'live') {
    return new MediaStream([producerTrack]);
  }

  if (studioProgramCompositor?.stream) {
    const compTrack = studioProgramCompositor.stream.getVideoTracks?.()?.[0];
    if (compTrack?.readyState === 'live') return studioProgramCompositor.stream;
  }

  return null;
}

function getStudioCompositorSize(sources) {
  return resolveCompositorDimensions(sources, { maxWidth: 1920, maxHeight: 1080 });
}

function sceneNeedsCompositor(scene, slots = null) {
  const list = slots || scene?.slots || [];
  if (list.length > 1) return true;
  return list.some((slot) => slotNeedsTransform(slot));
}

function getStudioPreviewKey(scene) {
  if (!scene) return '';
  return scene.slots
    .map((s) => `${s.peerId}:${s.producerId}:${JSON.stringify(s.crop)}:${JSON.stringify(s.frame)}:${s.frameEdited}`)
    .join('|');
}

function ensureStudioProgramCanvasHost() {
  if (studioProgramCanvasHost?.isConnected) return studioProgramCanvasHost;
  let el = document.getElementById('studio-program-compositor-canvas');
  if (!el) {
    el = document.createElement('canvas');
    el.id = 'studio-program-compositor-canvas';
    el.style.cssText =
      'position:fixed;left:-9999px;top:0;width:1920px;height:1080px;opacity:0;pointer-events:none';
    document.body.appendChild(el);
  }
  studioProgramCanvasHost = el;
  return el;
}

function disposeStudioProgramCanvasHost() {
  if (studioProgramCanvasHost?.parentNode) {
    studioProgramCanvasHost.parentNode.removeChild(studioProgramCanvasHost);
  }
  studioProgramCanvasHost = null;
}

function startHostVideoWatchdog() {
  if (hostVideoWatchdogId) return;
  hostVideoWatchdogId = setInterval(async () => {
    if (!hostPeerId || !ui._flags.isSharing) return;
    const selectedId = estado.selecionado?.id || lastActiveTransmission?.selectedPeerId;
    if (String(selectedId) !== String(hostPeerId)) return;
    const trackState = media?.getHostVideoTrackState?.() || 'none';
    if (trackState === 'live') {
      await media?.repairHostVideoIfNeeded?.().catch(() => {});
      return;
    }
    if (trackState !== 'live' && media?.producers?.video && !media.producers.video.closed) {
      showToast('Transmissão do host interrompida — recompartilhe a tela', 'warn');
      ui.set({ isSharing: false, hasPreview: false });
      updatePreviewOverlays();
    }
  }, 5000);
}

function stopHostVideoWatchdog() {
  if (hostVideoWatchdogId) {
    clearInterval(hostVideoWatchdogId);
    hostVideoWatchdogId = null;
  }
}

async function waitForVideoDimensions(videoEl, timeoutMs = 2500) {
  if (!videoEl) return;
  if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) return;
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    const done = () => {
      clearTimeout(timer);
      videoEl.removeEventListener('loadeddata', done);
      videoEl.removeEventListener('resize', done);
      resolve();
    };
    videoEl.addEventListener('loadeddata', done);
    videoEl.addEventListener('resize', done);
  });
}

async function bindHostSelfPreview(stream) {
  if (!els.preview || !stream) return false;
  const track = stream.getVideoTracks?.()?.[0];
  if (!track || track.readyState !== 'live') return false;

  if (els.preview.srcObject !== stream) {
    els.preview.srcObject = stream;
  }
  try {
    await els.preview.play();
  } catch (_) {}
  await waitForVideoDimensions(els.preview);
  return track.readyState === 'live';
}

function getListaOwnerDocument() {
  return els.lista?.ownerDocument || document;
}

function buildStudioParticipantCard(c, onSelect) {
  const editing = studio.getEditingScene();
  const sceneSlotPeerIds = new Set((editing?.slots || []).map((s) => String(s.peerId)));
  return buildSourceCard(c, onSelect, false, {
    forStudioSlot: true,
    sceneSlotPeerIds,
    ownerDocument: getListaOwnerDocument()
  });
}

function buildSourceCard(c, onSelect, isTransmissionSection = false, studioOptions = null) {
  const ownerDocument = studioOptions?.ownerDocument || getListaOwnerDocument();
  const card = buildDisplaySourceCard(c, onSelect, {
    forStudioSlot: studioOptions?.forStudioSlot,
    sceneSlotPeerIds: studioOptions?.sceneSlotPeerIds,
    noSharingHighlight: studioOptions?.forStudioSlot || !isTransmissionSection,
    ownerDocument,
    decorateBody: (body, source) => {
      if (peerHasPublishedAudio(source)) {
        const isMuted = mutedClients.has(source.id);
        const muteBtn = ownerDocument.createElement('button');
        muteBtn.type = 'button';
        muteBtn.className = `source-mute-btn${isMuted ? ' is-muted' : ''}`;
        const ownMic = isHostPeer(source);
        muteBtn.setAttribute(
          'aria-label',
          isMuted
            ? ownMic
              ? 'Ativar meu microfone'
              : 'Ativar audio do client'
            : ownMic
              ? 'Silenciar meu microfone'
              : 'Silenciar audio do client'
        );
        muteBtn.title = isMuted
          ? ownMic
            ? 'Ativar meu microfone'
            : 'Ativar audio'
          : ownMic
            ? 'Silenciar meu microfone'
            : 'Silenciar audio';
        muteBtn.innerHTML = isMuted
          ? '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
          : '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c0 3.28-2.64 5.91-5.91 5.91S6.09 14.28 6.09 11H4.07c0 3.95 2.87 7.23 6.65 7.88v2.02h2.56v-2.02c3.78-.65 6.65-3.93 6.65-7.88h-2.02z"/></svg>';
        muteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleClientMute(source.id);
        });
        body.append(muteBtn);
      }
    },
    decorateRow: (row, source) => {
      const defaultRecName = getDefaultRecordingAudioClientName();
      if (
        defaultRecName &&
        source.displayName &&
        defaultRecName.toLowerCase() === String(source.displayName).toLowerCase()
      ) {
        const badge = ownerDocument.createElement('span');
        badge.className = 'source-role-badge source-role-badge--rec-audio';
        badge.textContent = 'áudio gravação';
        badge.title = 'Áudio padrão da gravação';
        const nameWrap = row.querySelector('.source-name-wrap');
        if (nameWrap) nameWrap.append(badge);
      }
      if (!peerHasPublishedAudio(source)) return;
      const vuColumn = ownerDocument.createElement('div');
      vuColumn.className = 'source-vu-column';
      vuColumn.title = 'Nivel de audio';
      const vuFill = ownerDocument.createElement('div');
      vuFill.className = 'source-vu-fill';
      vuColumn.append(vuFill);
      row.append(vuColumn);
      
      const key = String(source.id);
      if (!cardVuElements.has(key)) {
        cardVuElements.set(key, []);
      }
      cardVuElements.get(key).push({ fill: vuFill, column: vuColumn });
    }
  });

  if (!isTransmissionSection) {
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openContextMenu(e, c);
    });
  }

  return card;
}

function hostHasMicEnabled() {
  return !!getHostCapturePrefs().microphone;
}

function refreshHostMicDeviceList() {
  hostMicPicker?.refresh?.().catch(() => {});
}

/** A enumeração inicial é assíncrona: publicar antes dela captura o microfone errado. */
function waitHostMicPickerReady() {
  const ready = hostMicPicker?.ready;
  if (!ready) return Promise.resolve();
  return Promise.race([
    ready,
    new Promise((resolve) => setTimeout(resolve, MIC_PICKER_READY_TIMEOUT_MS))
  ]);
}

function syncHostMicPublishHealthUi({ toast = false } = {}) {
  const health = media?.getMicPublishHealth?.();
  const degraded = !!(media?.isMicPublishDegraded?.() || health?.action === 'republish-raw');
  hostMicPublishDegraded = degraded;
  if (toast && degraded && !lastHostMicDegraded) {
    showToast('Microfone publicado sem audio - clique em Ativar audio', 'warn');
  }
  lastHostMicDegraded = degraded;
  updateHostMicUi();
  updateActivateAudioUi();
}

function startHostMicPublishWatchdog() {
  stopHostMicPublishWatchdog();
  hostMicPublishWatchdogTimer = setInterval(() => {
    if (!hostReady || !media?.hasPublishedMicrophone?.()) return;
    recoverHostMicPublication({ fromWatchdog: true }).catch(() => {});
  }, 5000);
}

function stopHostMicPublishWatchdog() {
  if (!hostMicPublishWatchdogTimer) return;
  clearInterval(hostMicPublishWatchdogTimer);
  hostMicPublishWatchdogTimer = null;
}

async function recoverHostMicPublication({ fromWatchdog = false } = {}) {
  if (!media || !hostHasMicEnabled()) return false;
  const before = media.getMicPublishHealth?.();
  const needsRecover =
    media.isMicPublishDegraded?.() ||
    media.hasPendingMicFilterRestore?.() ||
    before?.action === 'republish-raw' ||
    before?.action === 'republish';
  if (fromWatchdog && !needsRecover) {
    syncHostMicPublishHealthUi();
    return true;
  }
  try {
    const result = await media.recoverMicPublicationIfNeeded?.();
    const ok = result?.ok !== false && !media.isMicPublishDegraded?.();
    syncHostMicPublishHealthUi({ toast: !ok });
    refreshHostMicDeviceList();
    syncLocalHostVu();
    syncOwnMicMuteFromRoom();
    return ok;
  } catch (e) {
    errors.handle(e, 'mic-publish-recover');
    syncHostMicPublishHealthUi({ toast: true });
    return false;
  }
}

function updateHostMicUi() {
  const btn = els.btnHostMic;
  if (!btn) return;
  const micPublished = media?.hasPublishedMicrophone?.();
  const degraded = hostMicPublishDegraded || !!media?.isMicPublishDegraded?.();
  const show = micPublished || degraded;
  btn.hidden = !show;
  if (show) {
    const muted = media?.isPublishedAudioMuted?.() ?? false;
    btn.classList.toggle('is-muted', muted || degraded);
    btn.setAttribute('aria-pressed', String(muted));
    const label = degraded
      ? 'Microfone publicado sem audio - clique para reativar'
      : muted
        ? 'Ativar microfone'
        : 'Silenciar microfone';
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }
  syncLocalHostVu();
  ensureSelfAudioMonitor().refresh().catch(() => {});
}

async function onHostMicClick() {
  if (!els.btnHostMic) return;
  try {
    if (hostMicPublishDegraded || media?.isMicPublishDegraded?.()) {
      await unlockHostRemoteAudio();
      return;
    }
    if (!media?.hasPublishedMicrophone?.() || !hostPeerId) return;
    const muted = !media.isPublishedAudioMuted();
    media.setPublishedAudioMuted(muted);
    const id = String(hostPeerId);
    if (muted) mutedClients.add(id);
    else mutedClients.delete(id);
    signaling.send('definirClientMute', { peerId: hostPeerId, muted });
    updateHostMicUi();
    renderLista();
    showToast(muted ? 'Microfone silenciado' : 'Microfone ativado', 'info');
  } catch (e) {
    errors.handle(e, 'mic-toggle');
  }
}

function isSharingScreen() {
  return !!media?.isSharingVideo?.();
}

function toggleClientMute(peerId) {
  hostRoomControls.toggleClientMute(peerId);
}

async function toggleDisplayControl(peerId, ativo) {
  return hostRoomControls.toggleDisplayControl(peerId, ativo);
}

function updateTransmissionSectionVu(level, active) {
  const fill = els.transmissionVuFill;
  const col = els.transmissionVuColumn;
  if (!fill || !col) return;
  const pct = Math.min(100, Math.max(0, Math.round(level * 120)));
  fill.style.height = `${pct}%`;
  col.classList.toggle('is-active', active);
}

function syncLocalHostVu() {
  localHostVuStop?.();
  localHostVuStop = null;
  if (!hostPeerId) return;

  const list = cardVuElements.get(String(hostPeerId));
  if (!list || !list.length) return;

  const track = media?.getLocalAudioTrack?.();
  if (!track || track.readyState !== 'live') return;

  localHostVuStop = startTrackLevelMeter(track, {
    onLevel: (level) => {
      const currentList = cardVuElements.get(String(hostPeerId));
      if (!currentList) return;
      const pct = Math.min(100, Math.max(2, Math.round(level * 120)));
      for (const vu of currentList) {
        vu.fill.style.height = `${pct}%`;
        vu.column.classList.toggle('is-active', level > 0.02);
      }
      if (estado.selecionado && String(estado.selecionado.id) === String(hostPeerId)) {
        updateTransmissionSectionVu(level, level > 0.02);
      }
    }
  });
}

function updateDominantSpeakerIndicators() {
  const dominant = dominantSpeakerPeerId ? String(dominantSpeakerPeerId) : null;
  for (const [peerId, refs] of cardVuElements) {
    const id = String(peerId);
    const arr = Array.isArray(refs) ? refs : [refs];
    for (const vu of arr) {
      vu.column?.classList.toggle('is-dominant-speaker', !!dominant && id === dominant);
    }
  }
}

function updateCardVuMeters(levels) {
  let selectedLevel = 0;
  let selectedActive = false;
  for (const [peerId, { level, active, speaking }] of levels) {
    if (hostPeerId && String(peerId) === String(hostPeerId)) continue;
    const id = String(peerId);
    if (estado.selecionado && String(estado.selecionado.id) === id) {
      selectedLevel = level;
      selectedActive = active;
    }
    const list = cardVuElements.get(id) || cardVuElements.get(peerId);
    if (!list) continue;
    const pct = Math.min(100, Math.max(2, Math.round(level * 120)));
    const arr = Array.isArray(list) ? list : [list];
    for (const refs of arr) {
      refs.fill.style.height = `${pct}%`;
      refs.column.classList.toggle('is-active', active);
      refs.column.classList.toggle('is-speaking', !!speaking);
      refs.column.classList.toggle(
        'is-dominant-speaker',
        !!dominantSpeakerPeerId && id === String(dominantSpeakerPeerId)
      );
    }
  }
  if (estado.selecionado && String(estado.selecionado.id) !== String(hostPeerId)) {
    updateTransmissionSectionVu(selectedLevel, selectedActive);
  }
}

function updateActivateAudioUi() {
  const btn = els.btnActivateAudio;
  if (!btn) return;
  const blocked =
    !!hostAudioMonitor?.isAutoplayBlocked?.() ||
    hostMicAutoplayNeeded ||
    (hostAudioMonitor && !hostAudioMonitor.isPlaybackConfirmed?.());
  const hasChannels = (hostAudioMonitor?.channelCount || 0) > 0;
  const publishDegraded = hostMicPublishDegraded || !!media?.isMicPublishDegraded?.();
  btn.hidden = !((blocked && hasChannels) || publishDegraded);
}

function onHostRemoteAudioAutoplayBlocked() {
  hostMicAutoplayNeeded = true;
  updateHostMicUi();
  updateActivateAudioUi();
}

function ensureHostAudioMonitor() {
  if (!media) return null;
  if (!hostAudioMonitor) {
    hostAudioMonitor = new HostAudioMonitor(media, {
      excludePeerId: hostPeerId,
      ownPeerIds: [...ownPeerIds],
      excludeSourceTypes: meetBridgeLiveMode ? ['system'] : [],
      allowDualPeerAudio: true,
      onAutoplayBlocked: onHostRemoteAudioAutoplayBlocked,
      onStaleProducer: () => {
        requestRoomStateSync().catch(() => {});
      }
    });
    hostAudioMonitor.onLevels = updateCardVuMeters;
  } else if (hostPeerId) {
    hostAudioMonitor.excludePeerId = String(hostPeerId);
    hostAudioMonitor.setOwnPeerIds?.([...ownPeerIds]);
  }
  return hostAudioMonitor;
}

function mergeLastAudioSourcesFromEstado(payload = {}) {
  if (payload.audioSources?.length) {
    lastAudioSources = payload.audioSources;
    return;
  }
  const merged = buildHostAudioSources();
  if (!merged.length) return;
  const nextSig = audioSourcesSignature(merged);
  const prevSig = audioSourcesSignature(lastAudioSources);
  if (nextSig !== prevSig) {
    lastAudioSources = merged;
  }
}

function resolveHostAudioSources() {
  const fromServer = normalizeRemoteAudioSources(lastAudioSources, hostAudioNormalizeOptions());
  if (hasServerAudioList) return fromServer;
  if (fromServer.length) return fromServer;
  return buildHostAudioSources();
}

function hostAudioNormalizeOptions() {
  return {
    excludePeerId: hostPeerId,
    ownPeerIds: [...ownPeerIds],
    excludeSourceTypes: meetBridgeLiveMode ? ['system'] : [],
    ownProducerIds: media?.getOwnAudioProducerIds?.() || []
  };
}

function countActiveHostAudioChannels(monitor) {
  return monitor?.countLiveChannels?.() ?? 0;
}

async function repairHostRemoteAudioIfNeeded() {
  if (!hostPeerId || !media?.device) return;
  const monitor = ensureHostAudioMonitor();
  if (!monitor) return;

  const list = resolveHostAudioSources();
  const expected = list.length;
  if (!expected) return;

  const active = countActiveHostAudioChannels(monitor);
  if (active >= expected) {
    await monitor.recoverOutputIfSilent?.();
    return;
  }

  audioTrace('audio-health', { event: 'repair-all', expected, active, role: 'host' });

  const backoffs = [0, 400, 800, 1600];
  for (const delay of backoffs) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    await monitor.syncFromSources(list);
    if (countActiveHostAudioChannels(monitor) >= expected) break;
  }

  await monitor.recoverOutputIfSilent?.();
  monitor.connectOutput(els.previewAudio);
  applyVolumeFromSlider();
  await monitor.resume();
}

async function syncHostAudioMonitor(sources = null, { force = false } = {}) {
  if (!hostPeerId || !media?.device) {
    pendingHostAudioSync = sources ?? 'merge';
    return;
  }
  if (syncAudioMonitorPromise) {
    syncAudioMonitorPending = true;
    return syncAudioMonitorPromise;
  }
  syncAudioMonitorPromise = (async () => {
    do {
      syncAudioMonitorPending = false;
      if (!media || !hostPeerId) return;
      await media.ensureRecvTransport(media._audioRecvTag());
      const monitor = ensureHostAudioMonitor();
      if (!monitor) return;
      monitor.setMasterVolume(Number(els.volumeSlider?.value || 100) / 100);
      monitor.setManualMuted(mutedClients);
      if (Array.isArray(sources)) {
        lastAudioSources = sources;
        hasServerAudioList = true;
      }
      const audioSources = resolveHostAudioSources();
      const sig = audioSourcesSignature(audioSources);
      const expected = audioSources.length;
      const active = countActiveHostAudioChannels(monitor);
      if (
        !force &&
        sig === lastAppliedAudioSig &&
        ((expected > 0 && active >= expected) || (expected === 0 && active === 0))
      ) {
        return;
      }
      await monitor.syncFromSources(audioSources);
      await syncPublishedAudioFiltersToClients(audioSources);
      const retryBackoffs = [800, 1600, 3200];
      let retryCycle = 0;
      while (audioSources.length && monitor.channelCount === 0 && retryCycle < retryBackoffs.length) {
        log(
          `Audio remoto: ${audioSources.length} fonte(s) detectada(s), 0 canal ativo - tentativa ${retryCycle + 1}/${retryBackoffs.length}...`,
          'warn'
        );
        await new Promise((r) => setTimeout(r, retryBackoffs[retryCycle]));
        retryCycle += 1;
        await monitor.syncFromSources(resolveHostAudioSources());
      }
      await monitor.recoverOutputIfSilent?.();
      monitor.connectOutput(els.previewAudio);
      applyVolumeFromSlider();
      await monitor.resume();
      if (els.controlesAudio) {
        els.controlesAudio.hidden = !hasAnyClientAudio() && monitor.channelCount === 0;
      }
      if (monitor.isAutoplayBlocked?.() || (monitor.channelCount > 0 && !monitor.isPlaybackConfirmed?.())) {
        onHostRemoteAudioAutoplayBlocked();
      } else if (!monitor.channelCount) {
        hostMicAutoplayNeeded = false;
        updateHostMicUi();
        updateActivateAudioUi();
      } else {
        hostMicAutoplayNeeded = false;
        updateHostMicUi();
        updateActivateAudioUi();
      }
      syncLocalHostVu();
      if (monitor.channelCount > 0) {
        log(`Audio remoto: ${monitor.channelCount} canal(is) ativo(s)`, 'info');
        audioTraceSync('sync-ok', audioSources, { channels: monitor.channelCount, role: 'host' });
      } else if (audioSources.length) {
        audioTraceSync('sync-falhou', audioSources, { channels: 0, role: 'host' });
      }
      if (monitor.channelCount >= expected || (expected === 0 && monitor.channelCount === 0)) {
        lastAppliedAudioSig = sig;
      }
      await repairHostRemoteAudioIfNeeded();
    } while (syncAudioMonitorPending);
  })().finally(() => {
    syncAudioMonitorPromise = null;
  });
  return syncAudioMonitorPromise;
}

async function flushPendingHostAudioSync() {
  if (!pendingHostAudioSync || !hostPeerId || !media?.device) return;
  const pending = pendingHostAudioSync;
  pendingHostAudioSync = null;
  if (pending === 'merge' || pending === 'estado') {
    await syncHostAudioMonitor();
  } else {
    await syncHostAudioMonitor(pending);
  }
}

function applyClientAudioMute() {
  hostAudioMonitor?.setManualMuted(mutedClients);
  applyVolumeFromSlider();
}

function syncOwnMicMuteFromRoom() {
  if (!hostPeerId || !media?.hasPublishedMicrophone?.()) {
    updateHostMicUi();
    return;
  }
  const selfMuted = mutedClients.has(String(hostPeerId));
  if (media.isPublishedAudioMuted() !== selfMuted) {
    media.setPublishedAudioMuted(selfMuted);
  }
  updateHostMicUi();
}

function queueTransmission(raw) {
  const gen = ++transmissionGeneration;
  transmissionWork = transmissionWork
    .then(() => runTransmission(raw, gen))
    .catch((e) => errors.handle(e, 'applyTransmission'));
}

function queueWhiteboardOp(fn, context = 'quadroBranco') {
  transmissionWork = transmissionWork
    .then(() => fn())
    .catch((e) => errors.handle(e, context));
  return transmissionWork;
}

function hasAnyClientAudio() {
  return estado.clients.some(
    (c) => c.hasAudio && String(c.id) !== String(hostPeerId)
  );
}

function buildHostAudioSources() {
  const map = new Map();

  for (const s of lastAudioSources || []) {
    const peerId = String(s.peerId || s.id);
    if (!peerId || !s.producerId || peerId === String(hostPeerId)) continue;
    const source = s.source || 'microphone';
    map.set(`${peerId}:${source}`, {
      peerId,
      producerId: s.producerId,
      name: s.name || s.displayName || peerId,
      source
    });
  }

  for (const c of estado.clients || []) {
    if (String(c.id) === String(hostPeerId)) continue;
    const ids = c.producerIds || {};
    const entries = [
      ['microphone', ids.microphone],
      ['system', ids.system],
      ['mixed', ids.mixed]
    ];
    for (const [source, producerId] of entries) {
      if (!producerId) continue;
      const peerId = String(c.id);
      const mapKey = `${peerId}:${source}`;
      if (map.has(mapKey)) continue;
      map.set(mapKey, {
        peerId: c.id,
        producerId,
        name: c.displayName,
        source
      });
    }
    if (!ids.microphone && !ids.system && !ids.mixed && c.hasAudio && ids.audio) {
      const peerId = String(c.id);
      const mapKey = `${peerId}:microphone`;
      if (!map.has(mapKey)) {
        map.set(mapKey, {
          peerId: c.id,
          producerId: ids.audio,
          name: c.displayName,
          source: 'microphone'
        });
      }
    }
  }

  return normalizeRemoteAudioSources([...map.values()], { excludePeerId: hostPeerId });
}

function renderFsSourceMenu() {
  if (!els.fsSourceList) return;
  els.fsSourceList.innerHTML = '';

  if (!estado.clients.length) {
    const li = document.createElement('li');
    li.className = 'fs-source-empty';
    li.textContent = 'Nenhuma fonte conectada';
    els.fsSourceList.appendChild(li);
    return;
  }

  for (const c of sortClientsForDisplay(estado.clients)) {
    els.fsSourceList.appendChild(
      buildSourceCard(c, (peerId) => {
        closeFsSourceMenu();
        selecionar(peerId);
      })
    );
  }
}

function isPreviewFullscreen() {
  return document.fullscreenElement === els.previewArea;
}

function syncFsSourceUi() {
  const fs = isPreviewFullscreen();
  if (els.btnFsSources) els.btnFsSources.hidden = !fs;
  if (!fs) closeFsSourceMenu();
}

function closeFsSourceMenu() {
  if (!els.fsSourceMenu) return;
  els.fsSourceMenu.hidden = true;
  els.btnFsSources?.setAttribute('aria-expanded', 'false');
}

function toggleFsSourceMenu() {
  if (!els.fsSourceMenu || !isPreviewFullscreen()) return;
  const open = els.fsSourceMenu.hidden;
  if (open) renderFsSourceMenu();
  els.fsSourceMenu.hidden = !open;
  els.btnFsSources?.setAttribute('aria-expanded', String(open));
}

function updateTransmissionCard() {
  if (!els.transmissionCardContainer) return;
  const cardDoc = els.transmissionCardContainer.ownerDocument || document;
  els.transmissionCardContainer.innerHTML = '';
  const sel = estado.selecionado;
  if (sel && sel.isProducing) {
    const card = buildSourceCard(sel, () => {}, true, { ownerDocument: cardDoc });
    els.transmissionCardContainer.appendChild(card);
  } else {
    const empty = cardDoc.createElement('div');
    empty.className = 'transmission-card-empty';
    empty.textContent = 'Nenhuma transmissao ativa';
    els.transmissionCardContainer.appendChild(empty);
  }
}

function shouldUseStudioParticipantCards() {
  return isSidebarPoppedOut() && studio.isStudioModeEnabled() && popoutControlsExpanded;
}

function getParticipantSelectHandler() {
  if (shouldUseStudioParticipantCards()) {
    return (peerId) => handleStudioAddParticipant(peerId);
  }
  return (peerId) => selecionar(peerId);
}

function renderLista() {
  if (!els.lista) {
    debugPopoutLog('E', 'host/app.js:renderLista', 'els.lista missing', {});
    return;
  }
  const docked = ensureSidebarDockedInMain();
  const listDoc = getListaOwnerDocument();
  const sidebar = els.sidebar;
  debugPopoutLog('A,B,E', 'host/app.js:renderLista', 'start', {
    clientCount: estado.clients?.length ?? 0,
    clientNames: (estado.clients || []).map((c) => c.displayName),
    poppedOut: isSidebarPoppedOut(),
    dockedByEnsure: docked,
    sidebarInMain: isSidebarInMainDocument(),
    sidebarHidden: !!sidebar?.hidden,
    listaDocIsMain: listDoc === document,
    listaConnected: els.lista.isConnected,
    listaParentId: els.lista.parentElement?.id || null
  });
  els.lista.innerHTML = '';
  cardVuElements.clear();

  const participants = getSidebarParticipants();
  // #region agent log
  debugClientSessionLog('H2', 'host:renderLista', 'render participants', {
    totalClients: estado.clients?.length ?? 0,
    remoteCount: participants.length,
    remoteNames: participants.map((c) => c.displayName),
    listaConnected: els.lista.isConnected,
    sectionH: els.lista.closest('.participants-section')?.offsetHeight ?? 0,
    listaH: els.lista.offsetHeight,
    hypothesisId: 'C'
  });
  debug3a36beLog('C', 'host:renderLista', 'render participants', {
    totalClients: estado.clients?.length ?? 0,
    participantCount: participants.length,
    participantNames: participants.map((c) => c.displayName),
    hasListaEl: !!els.lista,
    listaConnected: els.lista?.isConnected ?? false,
    participantsSectionFound: !!els.lista?.closest('.participants-section'),
    sectionH: els.lista?.closest('.participants-section')?.offsetHeight ?? 0,
    listaH: els.lista?.offsetHeight ?? 0,
    sidebarCollapsed: els.sidebar?.classList.contains('is-collapsed') ?? false
  });
  // #endregion

  if (!participants.length) {
    const li = listDoc.createElement('li');
    li.className = 'hint-text';
    li.textContent = 'Nenhuma fonte conectada';
    els.lista.appendChild(li);
    renderFsSourceMenu();
    updateTransmissionCard();
    if (!estado.selecionado) {
      updateTransmissionSectionVu(0, false);
    }
    return;
  }

  const onSelect = getParticipantSelectHandler();
  const cardKinds = [];
  for (const c of sortClientsForDisplay(participants)) {
    const card = shouldUseStudioParticipantCards()
      ? buildStudioParticipantCard(c, onSelect)
      : buildSourceCard(c, onSelect, false);
    cardKinds.push({
      name: c.displayName,
      kind: card.classList.contains('sharing')
        ? 'sharing'
        : card.classList.contains('available')
          ? 'available'
          : card.classList.contains('spectator')
            ? 'spectator'
            : 'other'
    });
    els.lista.appendChild(card);
  }

  if (els.selecionado) {
    els.selecionado.textContent = estado.selecionado
      ? `Selecionado: ${estado.selecionado.displayName}`
      : 'Nenhuma fonte selecionada';
  }

  renderFsSourceMenu();
  syncLocalHostVu();
  updateTransmissionCard();
  if (!estado.selecionado) {
    updateTransmissionSectionVu(0, false);
  }

  ui.set({
    hasSelection: !!estado.selecionado,
    isPaused: !!estado.selecionado?.pausado
  });
  updatePreviewOverlays();
  if (isSidebarPoppedOut()) {
    studio.syncSlotProducerIds(estado.clients);
    syncStudioProgramMirror();
  }
  debugPopoutLog('A,E', 'host/app.js:renderLista', 'done', {
    listaChildCount: els.lista.childElementCount,
    cardKinds,
    poppedOut: isSidebarPoppedOut(),
    sidebarInMain: isSidebarInMainDocument(),
    sidebarOwnerIsMain: sidebar?.ownerDocument === document
  });
  requestAnimationFrame(() => {
    const participantsSection = els.lista?.closest('.participants-section');
    const listaRect = els.lista?.getBoundingClientRect();
    const sectionRect = participantsSection?.getBoundingClientRect();
    debugPopoutLog('F', 'host/app.js:renderLista', 'layout', {
      listaOffsetHeight: els.lista?.offsetHeight ?? 0,
      listaClientHeight: els.lista?.clientHeight ?? 0,
      listaRectH: listaRect ? Math.round(listaRect.height) : 0,
      sectionOffsetHeight: participantsSection?.offsetHeight ?? 0,
      sectionRectH: sectionRect ? Math.round(sectionRect.height) : 0,
      sidebarInnerH: sidebar?.querySelector('.sidebar-inner')?.offsetHeight ?? 0,
      cards: [...(els.lista?.children || [])].map((li) => ({
        h: Math.round(li.getBoundingClientRect().height),
        text: (li.querySelector('.source-name')?.textContent || li.textContent || '').slice(0, 32)
      }))
    });
  });
}

async function selecionar(peerId) {
  if (!canHostCommand()) {
    debugHostLog('H', 'selecionar blocked', {
      hostPeerId: !!hostPeerId,
      hostReady,
      connected: signaling?.connected,
      authenticated: signaling?.authenticated,
      joinInProgress
    });
  }
  return hostRoomControls.selectPeer(peerId);
}

async function runTransmission(raw, gen = transmissionGeneration) {
  if (gen !== transmissionGeneration) return;

  const tx = normalizeTransmission(raw);
  const prevKind = lastTransmissionSourceKind;
  lastTransmissionSourceKind = tx.sourceKind || null;
  lastActiveTransmission = tx;

  if (prevKind === 'whiteboard' && tx.sourceKind !== 'whiteboard') {
    await stopWhiteboardTransmission({ notifyServer: false });
  }

  if (isWhiteboardTransmission(tx) && String(tx.selectedPeerId) === String(hostPeerId) && !whiteboardEngine) {
    await ensureWhiteboardEngineReady(lastWhiteboardServerElements);
  }

  // Sync state selected
  if (tx.selectedPeerId) {
    const client = estado.clients.find((c) => String(c.id) === String(tx.selectedPeerId));
    if (client) {
      estado.selecionado = {
        ...client,
        isProducing: hasActiveVideo(tx) || client.isProducing,
        hasVideo: hasActiveVideo(tx) || client.hasVideo,
        producerIds: {
          ...(client.producerIds || {}),
          video: tx.producerIds?.video || client.producerIds?.video || client.producerId || null
        },
        producerId: tx.producerIds?.video || client.producerIds?.video || client.producerId || null,
        selecionado: true,
        pausado: tx.paused
      };
    } else {
      estado.selecionado = {
        id: tx.selectedPeerId,
        displayName: tx.peerName || 'Fonte',
        isProducing: hasActiveVideo(tx),
        producerIds: tx.producerIds,
        selecionado: true,
        pausado: tx.paused
      };
    }
  } else {
    estado.selecionado = null;
  }

  // Also sync the selecionado flag on the clients list
  for (const c of estado.clients || []) {
    c.selecionado = String(c.id) === String(tx.selectedPeerId);
  }
  if (isCoHostInstance) {
    renderLista();
    return;
  }

  try {
    if (!tx.producerId) {
      await media?.closeActiveVideoConsumer({ videoEl: els.preview, notifyServer: true });
      hideLtOverlay();
      if (els.controlesAudio) els.controlesAudio.hidden = !hasAnyClientAudio();
      ui.set({ hasPreview: false, isPaused: tx.paused });
      updatePreviewOverlays();
      setStatus('Nenhuma transmissao ativa');
    } else if (String(tx.selectedPeerId) === String(hostPeerId)) {
      await media?.closeActiveVideoConsumer({ videoEl: els.preview, notifyServer: true });
      let previewStream = null;
      if (isWhiteboardTransmission(tx)) {
        if (whiteboardEngine?.stream) {
          previewStream = whiteboardEngine.stream;
        } else {
          const engine = await ensureWhiteboardEngineReady(lastWhiteboardServerElements);
          previewStream = engine?.stream || null;
        }
      } else if (media?.isSyntheticVideoActive?.() && studioProgramCompositor?.stream) {
        previewStream = studioProgramCompositor.stream;
      } else if (media?.isSyntheticVideoActive?.() && media._syntheticStream) {
        previewStream = media._syntheticStream;
      } else {
        previewStream = media?.localScreenStream;
      }
      const previewBound = await bindHostSelfPreview(previewStream);
      let bound = previewBound;
      if (!bound) {
        resetAppliedTransmissionDedup();
        const fallback =
          whiteboardEngine?.stream ||
          (media?.producers?.video?.track?.readyState === 'live'
            ? new MediaStream([media.producers.video.track])
            : null);
        if (fallback && fallback !== previewStream) {
          bound = await bindHostSelfPreview(fallback);
        }
      }
      applyLtOverlayForTransmission(tx);
      if (isWhiteboardTransmission(tx)) {
        drawingSurface?.clearPersistentOverlay();
        if (!annotationToolbar?.getTool()) {
          annotationToolbar?.expandWithDefaultTool?.();
        }
      }
      ui.set({ hasPreview: bound, isSharing: bound || !!media?.hasVideoProducer?.() });
      updatePreviewOverlays();
      const statusMsg = !bound
        ? 'Preview indisponivel — recompartilhe a tela se a captura foi encerrada'
        : isWhiteboardTransmission(tx)
          ? 'Exibindo quadro branco'
          : media?.isSyntheticVideoActive?.()
            ? 'Exibindo cena composta'
            : 'Exibindo sua tela';
      setStatus(statusMsg);
    } else {
      if (gen !== transmissionGeneration) return;

      const ownProducerId = media.producers?.video?.id || null;
      const currentProducerId = media.currentActiveVideoProducerId || media.remoteConsumers?.video?.producerId;
      const needsConsume = remoteVideoConsumeNeeded(tx, {
        currentProducerId,
        isSelfSelected: false,
        hasVideoElement: !!els.preview?.srcObject,
        consumerClosed: !media?.remoteConsumers?.video || media.remoteConsumers.video.closed
      });

      if (needsConsume) {
        debugHostLog('H2', '[CLIENT_CONSUME] host consumindo video ativo', {
          producerVideo: tx.producerIds?.video?.slice(0, 8) || null,
          previousProducer: currentProducerId?.slice(0, 8) || null
        });
        await media.consumeRemoteMedia(tx.producerIds, {
          videoEl: els.preview,
          audioEl: null,
          ownProducerIds: { video: ownProducerId }
        });
      }

      els.previewError.hidden = true;
      if (els.controlesAudio) {
        els.controlesAudio.hidden = !hasAnyClientAudio();
      }
      updateHostMicUi();
      ui.set({ hasPreview: true, isPaused: tx.paused });
      updatePreviewOverlays();
      applyLtOverlayForTransmission(tx);
      setStatus(tx.paused ? 'Transmissao pausada' : `Exibindo: ${tx.peerName || 'fonte'}`);
      if (!tx.paused) {
        try {
          await els.preview?.play?.();
        } catch (_) {}
      }
    }
  } catch (e) {
    if (e.message?.includes('Autoplay') || e.name === 'NotAllowedError') {
      hostMicAutoplayNeeded = true;
      updateHostMicUi();
    }
    errors.handle(e, 'applyTransmission');
    els.previewError.hidden = false;
    if (els.previewErrorMsg) els.previewErrorMsg.textContent = e.message;
    setStatus(`Erro ao exibir fonte: ${e.message}`);
  } finally {
    if (gen === transmissionGeneration) {
      syncHostAudioMonitor().catch((e) =>
        errors.handle(e, 'audio-monitor')
      );
      renderLista();
    }
  }
}

function applyTransmission(raw) {
  queueTransmission(raw);
}

function shouldHostApplyActiveVideo(tx) {
  const activeKey = activeVideoTransmissionKey(tx);
  const currentProducerId = media?.currentActiveVideoProducerId || media?.remoteConsumers?.video?.producerId || null;
  const isOwn = String(normalizeTransmission(tx).selectedPeerId) === String(hostPeerId);
  const needsConsume = remoteVideoConsumeNeeded(tx, {
    currentProducerId,
    isSelfSelected: isOwn,
    hasVideoElement: !!els.preview?.srcObject,
    consumerClosed: !media?.remoteConsumers?.video || media.remoteConsumers.video.closed
  });
  const keyChanged = activeKey !== lastAppliedActiveVideoKey;
  if (!hasActiveVideo(tx)) return keyChanged || !!currentProducerId;
  if (isOwn) return keyChanged || !!currentProducerId;
  return keyChanged || needsConsume;
}

function resolveTransmissionForEnrich(snapshot, parsed) {
  const snapTx = parsed?.transmission;
  if (snapTx && hasActiveVideo(snapTx)) return snapTx;
  if (lastActiveTransmission && hasActiveVideo(lastActiveTransmission)) return lastActiveTransmission;
  return snapTx || null;
}

function snapshotVersion(snapshot, parsed = null) {
  const p = parsed || parseRoomSnapshot(snapshot || {});
  return snapshot?.version || p.version || 0;
}

function isHostPeer(c) {
  return !!(c?.ehHost || c?.role === 'host' || (hostPeerId && String(c?.id) === String(hostPeerId)));
}

function getSidebarParticipants() {
  return estado.clients || [];
}

function applyParticipantState(snapshot, { source = 'unknown' } = {}) {
  if (!snapshot) return false;

  const parsed = parseRoomSnapshot(snapshot);
  const version = snapshotVersion(snapshot, parsed);
  if (version && version < lastAppliedRoomVersion) {
    debugHostLog('H3', '[HOST_LIST] snapshot ignorado (versao antiga)', {
      source,
      version,
      lastAppliedRoomVersion
    });
    // #region agent log
    debugClientSessionLog('H3', 'host:applyParticipantState', 'rejected stale version', {
      source,
      version,
      lastAppliedRoomVersion,
      hypothesisId: 'B'
    });
    // #endregion
    return false;
  }

  const existing = estado.clients || [];
  let roomClients = resolveRoomClients(snapshot, parsed);
  const authoritative = hasAuthoritativeRoomRoster(snapshot);
  if (version && authoritative) {
    roomClients = reconcileRoomClients(existing, roomClients, { allowRemovals: true });
  } else if (existing.length && roomClients.length < existing.length) {
    // #region agent log
    debug3a36beLog('B', 'host:applyParticipantState', 'versionless snapshot would shrink clients — merging', {
      source,
      lastAppliedRoomVersion,
      existingCount: existing.length,
      incomingCount: roomClients.length,
      existingNames: existing.map((c) => c.displayName),
      incomingNames: roomClients.map((c) => c.displayName)
    });
    // #endregion
    roomClients = reconcileRoomClients(existing, roomClients, { allowRemovals: false });
  }

  if (version) {
    lastAppliedRoomVersion = Math.max(lastAppliedRoomVersion, version);
    const pendingVersion = pendingRoomSnapshot ? snapshotVersion(pendingRoomSnapshot) : 0;
    if (!pendingRoomSnapshot || version >= pendingVersion) {
      pendingRoomSnapshot = null;
    }
  } else if (!hostReady || joinInProgress) {
    pendingRoomSnapshot = snapshot;
  }

  const transmission = resolveTransmissionForEnrich(snapshot, parsed);
  // #region agent log
  debugClientSessionLog('H1', 'host:applyParticipantState', 'participants applied', {
    source,
    version,
    clientCount: roomClients.length,
    clientNames: roomClients.map((c) => c.displayName),
    remoteCount: roomClients.filter((c) => !isHostPeer(c)).length,
    hasTransmission: !!transmission,
    hypothesisId: 'A'
  });
  debug3a36beLog('A', 'host:applyParticipantState', 'participants applied', {
    source,
    version,
    lastAppliedRoomVersion,
    clientCount: roomClients.length,
    clientNames: roomClients.map((c) => c.displayName),
    remoteCount: roomClients.filter((c) => !isHostPeer(c)).length,
    hostPeerId: hostPeerId?.slice(0, 8) || null
  });
  // #endregion
  trackClientDisplayNameChanges(roomClients);
  estado = enrichRoomSourcesState(
    {
      clients: roomClients,
      selecionado: snapshot.selecionado
        ? { ...snapshot.selecionado, selecionado: true }
        : (authoritative ? null : estado.selecionado),
      controleExibicao: snapshot.controleExibicao ?? estado.controleExibicao ?? []
    },
    transmission
  );

  const me = estado.clients.find((c) => String(c.id) === String(hostPeerId));
  if (me) isCoHostInstance = !!me.isCoHost;

  debugHostLog('H3', '[HOST_LIST] participantes aplicados', {
    source,
    version,
    totalClients: estado.clients.length,
    names: estado.clients.map((c) => c.displayName)
  });
  debugPopoutLog('B', 'host/app.js:applyParticipantState', 'participants applied', {
    source,
    version,
    roomClientCount: estado.clients.length,
    roomClientNames: estado.clients.map((c) => c.displayName)
  });
  renderLista();
  return true;
}

async function applyRoomSnapshot(snapshot, { includeMedia = true } = {}) {
  if (!snapshot) return;

  const parsed = parseRoomSnapshot(snapshot);
  const version = snapshotVersion(snapshot, parsed);
  const applied = applyParticipantState(snapshot, { source: 'roomSnapshot' });
  if (!applied && version && version < lastAppliedRoomVersion) return;

  if (snapshot.meetBridgeLiveMode !== undefined) {
    applyMeetBridgeLiveModeFromRoom(snapshot.meetBridgeLiveMode);
  }
  if (snapshot.sharedRoomMode !== undefined) {
    applySharedRoomModeFromRoom(snapshot.sharedRoomMode);
  }
  if (snapshot.dominantSpeakerPeerId !== undefined) {
    applyDominantSpeakerFromRoom(snapshot.dominantSpeakerPeerId);
  }

  if (Array.isArray(snapshot.mutedPeerIds)) {
    mutedClients.clear();
    for (const id of snapshot.mutedPeerIds) {
      mutedClients.add(String(id));
    }
    syncOwnMicMuteFromRoom();
    applyClientAudioMute();
  }

  if (snapshot.whiteboard) {
    applyWhiteboardState(snapshot.whiteboard);
  }

  const mediaKey = roomSnapshotMediaKey(snapshot);
  const activeKey = activeVideoTransmissionKey(parsed.transmission);

  debugHostLog('H1', '[ROOM_STATE] snapshot recebido', {
    version,
    activeKey,
    producerVideo: parsed.transmission?.producerIds?.video?.slice(0, 8) || null,
    clients: estado.clients.length
  });

  if (!hostReady || joinInProgress) {
    if (Array.isArray(parsed.audioSources)) {
      lastAudioSources = parsed.audioSources;
      hasServerAudioList = true;
      pendingHostAudioSync = parsed.audioSources;
    }
    return;
  }

  if (Array.isArray(parsed.audioSources)) {
    lastAudioSources = parsed.audioSources;
    hasServerAudioList = true;
  }

  if (!includeMedia) return;

  const applyVideo = shouldHostApplyActiveVideo(parsed.transmission);
  if (!applyVideo && mediaKey && mediaKey === lastAppliedSnapshotKey) return;
  lastAppliedSnapshotKey = mediaKey;
  lastAppliedActiveVideoKey = activeKey;
  applyTransmission(parsed.transmission);
  await syncHostAudioMonitor(parsed.audioSources).catch((e) =>
    errors.handle(e, 'audio-monitor')
  );
}

async function requestRoomStateSync() {
  if (!signaling?.connected) return;
  try {
    const snapshotPromise = signaling.onceType('roomState', () => true, 5000);
    signaling.send('solicitarEstado', {});
    const snapshot = await snapshotPromise;
    await applyRoomSnapshot(snapshot, { includeMedia: true });
  } catch (e) {
    debugHostLog('H1', '[ROOM_STATE] solicitarEstado timeout ou falha', { error: e.message });
  }
}

async function iniciarCompartilhamentoHost() {
  try {
    assertSecureContext();
    await waitHostMicPickerReady();
    saveCapturePrefs(getHostCapturePrefs());
    setStatus('Selecione a tela para compartilhar...');
    await media.ensureSendTransport();
    await media.startScreenShare(getHostCapturePrefs());
    const prefs = getHostCapturePrefs();
    if (prefs.microphone && !media.hasPublishedMicrophone()) {
      await applyHostMicFilterPrefs(hostMicFilterPrefs, { persist: false });
      await media.ensureMicrophonePublication(prefs);
    }
    signaling.send('status', { status: 'transmitindo' });
    ui.set({ isSharing: true });
    updateHostMicUi();
    refreshHostMicDeviceList();
    syncHostMicPublishHealthUi({ toast: true });
    if (prefs.microphone && !media.hasPublishedMicrophone()) {
      showToast('Marque Microfone no painel e conceda permissao ao navegador', 'warn');
    }
    showToast('Tela compartilhada neste painel', 'success');
    startHostVideoWatchdog();
  } catch (e) {
    errors.handle(e, 'compartilhar');
    updateHostMicUi();
  }
}

async function trocarTelaHost() {
  if (!media) {
    showToast('Conecte-se antes de trocar a tela', 'warn');
    return;
  }
  try {
    assertSecureContext();
    saveCapturePrefs(getHostCapturePrefs());
    setStatus('Selecione a nova tela para compartilhar...');
    const prefs = getHostCapturePrefs();
    const result = await media.switchDisplayCapture(prefs);
    if (result?.cancelled) {
      setStatus('Selecao de tela cancelada — captura atual mantida');
      showToast('Selecao de tela cancelada', 'info');
      return;
    }
    if (result?.busy) {
      showToast('Troca de tela ja em andamento', 'info');
      return;
    }
    if (!result?.ok) {
      showToast('Nao foi possivel trocar a tela', 'error');
      return;
    }

    const selfSelected = String(lastActiveTransmission?.selectedPeerId || '') === String(hostPeerId || '');
    if (selfSelected && !media.isSyntheticVideoActive?.()) {
      await bindHostSelfPreview(result.stream || media.localScreenStream);
    }

    if (prefs.microphone && !media.hasPublishedMicrophone()) {
      await applyHostMicFilterPrefs(hostMicFilterPrefs, { persist: false });
      await media.ensureMicrophonePublication(prefs);
    }
    signaling?.send('status', { status: 'transmitindo' });
    ui.set({ isSharing: true });
    updateHostMicUi();
    startHostVideoWatchdog();
    setStatus(
      result.synthetic ? 'Captura de fundo atualizada' : 'Tela de captura atualizada'
    );
    showToast(result.synthetic ? 'Captura de fundo atualizada' : 'Tela atualizada', 'success');
  } catch (e) {
    errors.handle(e, 'trocar-tela');
    updateHostMicUi();
  }
}

function updateRecordingUi(state) {
  const labels = {
    [RecordingState.IDLE]: 'Pronto para gravar',
    [RecordingState.RECORDING]: 'Gravando...',
    [RecordingState.FINALIZING]: 'Finalizando...',
    [RecordingState.UPLOADING]: 'Enviando gravacao...',
    [RecordingState.SAVED]: 'Gravacao salva',
    [RecordingState.ERROR]: 'Erro na gravacao'
  };
  if (els.recordingStatus) els.recordingStatus.textContent = labels[state] || state;
  ui.set({
    isRecording: state === RecordingState.RECORDING,
    isUploading: state === RecordingState.UPLOADING,
    isRecordingBusy: state === RecordingState.FINALIZING || state === RecordingState.UPLOADING
  });
  if (els.uploadProgressWrap) els.uploadProgressWrap.hidden = state !== RecordingState.UPLOADING;
  if (state === RecordingState.IDLE) {
    if (els.recordingTimer) els.recordingTimer.hidden = true;
  }
}

function triggerRecordingDownload(downloadUrl) {
  if (!downloadUrl) return false;
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = '';
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  return true;
}

function renderPendingRecordingDownloads(recordings = []) {
  if (!els.pendingRecordingsWrap || !els.pendingRecordingsList) return;
  els.pendingRecordingsList.replaceChildren();
  els.pendingRecordingsWrap.hidden = recordings.length === 0;

  for (const recording of recordings) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.35rem;';
    const label = document.createElement('span');
    const size = Number(recording.bytes || 0);
    const suffix = recording.incomplete ? ' (incompleta)' : '';
    label.textContent = `${recording.filename || 'Gravação'}${suffix}${size ? ` — ${(size / (1024 * 1024)).toFixed(1)} MB` : ''}`;
    label.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8rem;';
    const download = document.createElement('a');
    download.href = recording.downloadUrl;
    download.className = 'btn btn-secondary';
    download.textContent = 'Baixar';
    download.style.cssText = 'padding:.25rem .5rem;font-size:.75rem;flex-shrink:0;';
    download.addEventListener('click', () => {
      window.setTimeout(() => refreshPendingRecordingDownloads(), 1500);
    });
    row.append(label, download);
    els.pendingRecordingsList.append(row);
  }
}

async function refreshPendingRecordingDownloads() {
  if (!els.pendingRecordingsWrap || !els.pendingRecordingsList) return;
  try {
    const res = await fetch('/api/gravacao/pendentes', {
      headers: hostToken ? { 'X-Host-Token': hostToken } : {}
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return;
    renderPendingRecordingDownloads(Array.isArray(data.recordings) ? data.recordings : []);
  } catch (_) {}
}

function offerRecordingDownload(uploadResult, fallbackFilename) {
  const filename = uploadResult?.filename || fallbackFilename;
  if (els.recordingFilename) els.recordingFilename.textContent = filename;
  if (!uploadResult?.downloadUrl) {
    showToast('Gravação salva; o download estará disponível no painel.', 'info');
    refreshPendingRecordingDownloads();
    return;
  }
  triggerRecordingDownload(uploadResult.downloadUrl);
  showToast('Download da gravação iniciado. O arquivo será apagado após a transferência.', 'success');
  setStatus(`Baixando gravação: ${filename}`);
  window.setTimeout(() => refreshPendingRecordingDownloads(), 1500);
}

async function iniciarGravacao() {
  if (ui._flags.isRecording || ui._flags.isUploading || ui._flags.isRecordingBusy) return;
  try {
    const stream = await getRecordingStream();
    if (!stream) {
      if (els.recordingStatus) els.recordingStatus.textContent = 'Nenhuma transmissao ativa para gravar';
      setStatus('Nenhuma transmissao ativa para gravar');
      showToast('Nenhuma transmissao ativa para gravar', 'warn');
      return;
    }
    const quality = mergeServerQuality(media.videoQuality, loadPresetId());
    const customDir = localStorage.getItem(STORAGE_RECORDINGS_DIR) || '';
    recorder.setHostToken(hostToken);
    await recorder.start(stream, quality, { customDir });
    showToast('Gravacao iniciada', 'info');
  } catch (e) {
    stopRecordingCapture();
    errors.handle(e, 'gravacao');
  }
}

async function pararGravacao() {
  try {
    const stopResult = await recorder.stop();
    stopRecordingCapture();

    const pattern = localStorage.getItem(STORAGE_RECORDING_FILENAME_PATTERN) || '';
    const filename = formatRecordingFilename(new Date(), pattern);
    if (!isValidRecordingFilename(filename)) {
      showToast('Nome de arquivo invalido. Revise o padrao nas configuracoes.', 'warn');
      recorder.resetIdle();
      return;
    }
    const customDir = localStorage.getItem(STORAGE_RECORDINGS_DIR) || '';

    if (stopResult?.streaming) {
      if (!recorder.bytesPersisted) {
        showToast('Gravacao vazia', 'warn');
        recorder.resetIdle();
        return;
      }
      const uploadResult = await recorder.finishStream(filename, customDir);
      offerRecordingDownload(uploadResult, filename);
      setTimeout(() => recorder.resetIdle(), 4000);
      return;
    }

    if (!stopResult) {
      showToast('Gravacao vazia', 'warn');
      recorder.resetIdle();
      return;
    }

    const uploadResult = await recorder.upload(stopResult, filename, customDir);
    offerRecordingDownload(uploadResult, filename);
    setTimeout(() => recorder.resetIdle(), 4000);
  } catch (e) {
    stopRecordingCapture();
    errors.handle(e, 'upload');
    recorder.resetIdle();
  }
}

function applyVolumeFromSlider() {
  const vol = Number(els.volumeSlider?.value || 100) / 100;
  hostAudioMonitor?.setMasterVolume(vol);
  hostAudioMonitor?.setMasterMuted?.(audioMuted);
  if (els.previewAudio) {
    els.previewAudio.volume = audioMuted ? 0 : vol;
  }
}

function stopRecordingCapture() {
  recordingCapture?.stop?.();
  recordingCapture = null;
}

function getActiveRecordingSelection() {
  if (estado.selecionado?.id) return estado.selecionado;

  const tx = normalizeTransmission(lastActiveTransmission || {});
  if (tx.selectedPeerId && hasActiveVideo(tx)) {
    const client = estado.clients.find((c) => String(c.id) === String(tx.selectedPeerId));
    return {
      ...(client || {}),
      id: tx.selectedPeerId,
      displayName: client?.displayName || tx.peerName || 'Fonte',
      isProducing: true,
      hasVideo: true,
      producerIds: tx.producerIds,
      producerId: tx.producerIds?.video || tx.producerId || null,
      selecionado: true,
      pausado: tx.paused
    };
  }

  const previewStream = els.preview?.srcObject;
  const previewTrack = previewStream instanceof MediaStream
    ? previewStream.getVideoTracks?.().find((track) => track.readyState === 'live')
    : null;
  if (!previewTrack || !ui._flags.hasPreview) return null;

  const localTrack = media?.localScreenStream?.getVideoTracks?.()[0] || null;
  const isOwnPreview = !!localTrack && localTrack.readyState === 'live' && localTrack.id === previewTrack.id;
  return {
    id: isOwnPreview && hostPeerId ? hostPeerId : 'preview',
    displayName: isOwnPreview ? (hostDisplayName || 'Host') : 'Fonte',
    isProducing: true,
    hasVideo: true,
    producerIds: { video: null },
    producerId: null,
    selecionado: true,
    pausado: false
  };
}

async function getRecordingStream() {
  const selected = getActiveRecordingSelection();
  const selectedPeerId = selected?.id;
  const own =
    hostPeerId && selectedPeerId && String(selectedPeerId) === String(hostPeerId);

  if (!selectedPeerId || selected?.pausado) return null;

  stopRecordingCapture();

  const compositor = RecordingCompositor.start({
    videoEl: els.preview,
    fallbackStream: own ? media?.localScreenStream : null,
    getBadgeText: () => getActiveRecordingSelection()?.displayName || 'Fonte',
    getBadgeVisible: () => {
      const active = getActiveRecordingSelection();
      return !!active && !active.pausado;
    }
  });
  const videoTrack = compositor?.stream?.getVideoTracks?.()[0];
  if (videoTrack?.readyState !== 'live') {
    compositor?.stop?.();
    return null;
  }

  let mixer = null;
  try {
    const recPrefs = getRecordingAudioPrefs();
    let restrictToPeerId = null;
    let ownForRec = own;
    let excludeOwnSystem = recPrefs.excludeOwnSystem;

    const defaultAudioName = getDefaultRecordingAudioClientName();
    if (defaultAudioName) {
      const defaultPeer = resolveRecordingAudioPeer(estado.clients, defaultAudioName);
      if (defaultPeer?.id) {
        restrictToPeerId = defaultPeer.id;
        ownForRec = false;
        excludeOwnSystem = true;
      } else {
        showToast('Client padrao de gravacao indisponivel — usando mix normal', 'warn');
      }
    } else if (recPrefs.selectedPeerOnly) {
      restrictToPeerId = selectedPeerId;
    }

    mixer = await RecordingAudioMixer.build({
      hostAudioMonitor,
      media,
      own: ownForRec,
      mutedClients,
      excludeOwnSystem,
      restrictToPeerId
    });
  } catch (err) {
    compositor.stop();
    throw err;
  }

  const tracks = [videoTrack];
  if (mixer?.track?.readyState === 'live') tracks.push(mixer.track);

  const stream = new MediaStream(tracks);
  recordingCapture = {
    stream,
    stop() {
      compositor.stop();
      mixer?.stop?.();
    }
  };
  return stream;
}

function handleMessage(msg) {
  if (msg.type === 'roomState') {
    // #region agent log
    debugClientSessionLog('H5', 'host:handleMessage', 'roomState', {
      version: msg.payload?.version,
      clients: (msg.payload?.clients || []).map((c) => ({
        id: c.id?.slice(0, 8),
        name: c.displayName,
        selectable: c.selectable,
        mediaReadyVideo: c.mediaReady?.video,
        hasVideo: c.hasVideo,
        producerVideo: c.producerIds?.video?.slice(0, 8) || null
      }))
    });
    // #endregion
    applyRoomSnapshot(msg.payload, { includeMedia: true }).catch((e) => errors.handle(e, 'room-state'));
    return;
  }
  if (msg.type === 'estadoSala') {
    applyRoomSnapshot(msg.payload, { includeMedia: true }).catch((e) => errors.handle(e, 'estado-sala'));
    return;
  }
  if (msg.type === 'modoPonteMeetDefinido') {
    if (msg.payload?.ativo !== undefined) {
      applyMeetBridgeLiveModeFromRoom(msg.payload.ativo);
    }
    return;
  }
  if (msg.type === 'modoSalaCompartilhadaDefinido') {
    if (msg.payload?.ativo !== undefined) {
      applySharedRoomModeFromRoom(msg.payload.ativo);
    }
    return;
  }
  if (msg.type === 'modoSalaCompartilhadaAtualizado') {
    if (msg.payload?.ativo !== undefined) {
      applySharedRoomModeFromRoom(msg.payload.ativo);
    }
    if (msg.payload?.dominantSpeakerPeerId !== undefined) {
      applyDominantSpeakerFromRoom(msg.payload.dominantSpeakerPeerId);
    }
    return;
  }
  if (msg.type === 'falanteDominante') {
    if (sharedRoomMode) {
      applyDominantSpeakerFromRoom(msg.payload?.peerId || null);
      media?.handleDominantSpeaker?.(msg.payload || {});
    }
    return;
  }
  if (msg.type === 'clientesSilenciados') {
    const mutedIds = msg.payload?.mutedPeerIds || [];
    mutedClients.clear();
    for (const id of mutedIds) {
      mutedClients.add(String(id));
    }
    applyClientAudioMute();
    syncOwnMicMuteFromRoom();
    renderLista();
    return;
  }
  if (msg.type === 'anotacaoSegmento') {
    drawingSurface?.receive(msg.payload);
    return;
  }
  if (msg.type === 'quadroBrancoEstado') {
    applyWhiteboardState(msg.payload);
    return;
  }
  if (msg.type === 'quadroBrancoElemento') {
    handleWhiteboardElement(msg.payload);
    return;
  }
  if (msg.type === 'quadroBrancoLimpar') {
    lastWhiteboardServerElements = [];
    whiteboardEngine?.clear();
    drawingSurface?.clearPersistentOverlay();
    return;
  }
  if (msg.type === 'estado') {
    const version = msg.payload?.version || 0;
    // #region agent log
    debugClientSessionLog('H5', 'host:handleMessage', 'estado', {
      version,
      clients: resolveRoomClients(msg.payload || {}).map((c) => ({
        id: c.id?.slice(0, 8),
        name: c.displayName,
        selectable: c.selectable,
        mediaReadyVideo: c.mediaReady?.video,
        hasVideo: c.hasVideo,
        isProducing: c.isProducing,
        producerVideo: c.producerIds?.video?.slice(0, 8) || null
      }))
    });
    debug3a36beLog('D', 'host:handleMessage', 'estado received', {
      version,
      clientNames: resolveRoomClients(msg.payload || {}).map((c) => c.displayName),
      lastAppliedRoomVersion
    });
    // #endregion
    if (!applyParticipantState(msg.payload || {}, { source: 'estado' })) {
      return;
    }
    if (msg.payload?.meetBridgeLiveMode !== undefined) {
      applyMeetBridgeLiveModeFromRoom(msg.payload.meetBridgeLiveMode);
    }
    if (msg.payload?.sharedRoomMode !== undefined) {
      applySharedRoomModeFromRoom(msg.payload.sharedRoomMode);
    }
    if (msg.payload?.dominantSpeakerPeerId !== undefined) {
      applyDominantSpeakerFromRoom(msg.payload.dominantSpeakerPeerId);
    }
    mergeLastAudioSourcesFromEstado(msg.payload || {});
    syncHostAudioMonitor(msg.payload?.audioSources?.length ? msg.payload.audioSources : null).catch((e) =>
      errors.handle(e, 'audio-monitor')
    );
    return;
  }
  if (msg.type === 'demovidoCoHost') {
    if (isCoHostInstance) {
      teardownCoHost();
      return;
    }
    window.location.href = `/client/?nome=${encodeURIComponent(hostDisplayName)}`;
  }
  if (msg.type === 'audioPolicyAplicada') {
    if (media) {
      media.applyAudioPolicyFromServer(msg.payload || {}).catch((e) =>
        errors.handle(e, 'audio-policy')
      );
    }
    return;
  }
  if (msg.type === 'fontesAudio') {
    const sources = msg.payload?.sources || [];
    const forceMicSync = sources.some(
      (s) =>
        (s.source || 'microphone') === 'microphone' &&
        String(s.peerId || s.id) !== String(hostPeerId)
    );
    lastAudioSources = sources;
    hasServerAudioList = true;
    hostAudioMonitor?.clearInvalidProducers?.();
    if (fontesAudioDebounceTimer) clearTimeout(fontesAudioDebounceTimer);
    fontesAudioDebounceTimer = setTimeout(() => {
      fontesAudioDebounceTimer = null;
      syncHostAudioMonitor(sources, { force: forceMicSync }).catch((e) =>
        errors.handle(e, 'audio-monitor')
      );
    }, 80);
    return;
  }
  if (msg.type === 'consumerFechado') {
    const consumerId = msg.payload?.consumerId;
    const wasVideoConsumer = media?.remoteConsumers?.video?.id === consumerId;
    if (consumerId) {
      hostAudioMonitor?.removeByConsumerId(consumerId).catch(() => {});
    }
    if (wasVideoConsumer) {
      media.remoteConsumers.video = null;
      media.currentActiveVideoProducerId = null;
      if (els.preview) els.preview.srcObject = null;
      lastAppliedSnapshotKey = '';
      lastAppliedActiveVideoKey = '';
      if (lastActiveTransmission && hasActiveVideo(lastActiveTransmission)) {
        applyTransmission(lastActiveTransmission);
      } else {
        hideLtOverlay();
        ui.set({ hasPreview: false });
        updatePreviewOverlays();
        setStatus('Nenhuma transmissao ativa');
      }
      lastAppliedAudioSig = '';
      syncHostAudioMonitor(null, { force: true }).catch((e) =>
        errors.handle(e, 'audio-monitor')
      );
    } else {
      lastAppliedAudioSig = '';
      syncHostAudioMonitor(null, { force: true }).catch((e) =>
        errors.handle(e, 'audio-monitor')
      );
    }
  }
  if (msg.type === 'transmissaoAtiva') {
    const tx = normalizeTransmission(msg.payload);
    debugHostLog('H2', '[ACTIVE_VIDEO] evento de transmissao ativa recebido no host', {
      selectedPeerId: tx.selectedPeerId?.slice(0, 8) || null,
      producerVideo: tx.producerIds?.video?.slice(0, 8) || null,
      activeKey: activeVideoTransmissionKey(tx),
      lastAppliedActiveVideoKey
    });
    if (!shouldHostApplyActiveVideo(msg.payload)) return;
    lastAppliedActiveVideoKey = activeVideoTransmissionKey(tx);
    lastAppliedSnapshotKey = roomSnapshotMediaKey({
      transmission: msg.payload,
      audioSources: lastAudioSources
    });
    applyTransmission(msg.payload);
    return;
  }
  if (msg.type === 'erro') {
    const payload = msg.payload || {};
    const mensagem = payload.mensagem || payload.message || payload.erro || '';
    if (isTransientServerError(mensagem, { joinInProgress })) {
      log(mensagem || 'Erro transitorio', 'warn');
      return;
    }
    errors.handleServerMessage(mensagem || 'Erro do servidor sem mensagem', payload.tipo || 'servidor', {
      joinInProgress
    });
  }
}

function coHostHandleMessage(msg) {
  if (msg.type === 'transmissaoAtiva') {
    applyTransmission(msg.payload);
    return;
  }
  handleMessage(msg);
}

function canHostCommand() {
  const ok =
    !!hostPeerId &&
    !!hostReady &&
    signaling?.connected &&
    signaling?.authenticated &&
    !joinInProgress;
  return ok;
}

function renderTechErrors() {
  const box = $('tech-errors');
  if (!box) return;
  const history = errors.getHistory().slice(0, 8);
  if (!history.length) {
    box.innerHTML = '<p class="hint-text">Nenhum erro recente.</p>';
    return;
  }
  box.innerHTML = '';
  for (const entry of history) {
    const details = document.createElement('details');
    details.className = 'tech-error-item';
    const summary = document.createElement('summary');
    summary.textContent = entry.friendly;
    const pre = document.createElement('pre');
    pre.textContent = `[${entry.code}] ${entry.context}\n${entry.technical}`;
    details.append(summary, pre);
    box.appendChild(details);
  }
}

async function joinHost({ autoShare = true } = {}) {
  const gen = ++joinGeneration;
  joinInProgress = true;
  hostPeerId = null;
  lastAppliedSnapshotKey = '';
  lastAppliedActiveVideoKey = '';
  lastAppliedRoomVersion = 0;
  pendingRoomSnapshot = null;
  lastAudioSources = [];
  lastAppliedAudioSig = '';
  pendingHostAudioSync = null;
  hasServerAudioList = false;
  estado = { clients: [], selecionado: null, controleExibicao: [] };
  signaling?.markAuthenticated(false);
  updateHostMicUi();
  debugHostLog('F', 'joinHost start', { gen, autoShare });

  try {
    await hostAudioMonitor?.dispose();
    hostAudioMonitor = null;
    stopHostMicPublishWatchdog();
    await media?.dispose();
    media = null;

    const payload = {
      papel: 'host',
      nome: hostDisplayName,
      pin: roomPin || undefined,
      hostToken: hostToken || undefined,
      isCoHost: !!isCoHostInstance
    };
    const entrouPromise = signaling.onceType('entrou');
    signaling.send('entrar', payload, { critical: true });
    const entrou = await entrouPromise;
    if (gen !== joinGeneration) return;

    hostPeerId = entrou.peerId;
    if (hostPeerId) ownPeerIds.add(String(hostPeerId));
    hostToken = entrou.hostToken || hostToken;
    signaling.markAuthenticated(true);
    debugHostLog('F', 'joinHost entrou', { gen, hostPeerId });

    media = new MediaClient(signaling, {
      splitRecvTransports: true,
      applyMicPublishChain: true,
      applyHostMicPublishChain: true,
      onLog: log,
      onIceState: (state) => {
        if (state === 'failed') showToast('Problema na conexao de midia (ICE)', 'error');
      }
    });

    const quality = mergeServerQuality(entrou.videoQuality, loadPresetId());
    await media.loadDevice(entrou.rtpCapabilities);
    if (gen !== joinGeneration) return;

    await media.ensureRecvTransport();
    await media.ensureRecvTransport(media._audioRecvTag());
    if (gen !== joinGeneration) return;

    media.setVideoQuality(quality);
    media.setOwnPeerId(hostPeerId);
    if (entrou.videoQuality?.sharedRoomMode) {
      applySharedRoomModeFromRoom(true);
    }
    recorder.setHostToken(hostToken);

    hostReady = true;
    ui.set({ wsConnected: true, wsWasConnected: true });
    setBadge('Online', 'online');
    refreshPendingRecordingDownloads();

    if (gen === joinGeneration) {
      joinInProgress = false;
      updateHostMicUi();
    }

    if (autoShare) {
      await iniciarCompartilhamentoHost();
    } else {
      setStatus('Conectado ao painel host');
      updateHostMicUi();
    }

    if (gen !== joinGeneration) return;
    await waitHostMicPickerReady();
    if (gen !== joinGeneration) return;
    const joinPrefs = getHostCapturePrefs();
    if (joinPrefs.microphone) {
      try {
        await media.ensureSendTransport();
        await loadHostMicPresetFromStorage();
        const result = await media.ensureMicrophonePublication(joinPrefs);
        if (!result.ok && result.reason !== 'disabled') {
          showToast('Microfone nao publicado - verifique permissao do navegador', 'warn');
        }
        syncLocalHostVu();
        refreshHostMicDeviceList();
        syncHostMicPublishHealthUi({ toast: true });
        syncOwnMicMuteFromRoom();
      } catch (e) {
        errors.handle(e, 'mic-join');
      }
    }
    await requestRoomStateSync();
    await flushPendingHostAudioSync();
    syncHostAudioMonitor().catch((e) => errors.handle(e, 'audio-monitor'));
    signaling.send('definirQualidade', { presetId: loadPresetId() });
    startStatsPolling();
    startHostMicPublishWatchdog();
  } finally {
    if (gen === joinGeneration) {
      joinInProgress = false;
      updateHostMicUi();
    }
  }
}

function startStatsPolling() {
  clearInterval(statsTimer);
  statsTimer = setInterval(async () => {
    if (!media) return;
    const s = await collectWebRtcStats(media);
    if (els.statBitrate && s.bitrateKbps != null) els.statBitrate.textContent = `${s.bitrateKbps} kbps`;
    if (els.statLoss) els.statLoss.textContent = s.packetLoss != null ? `${s.packetLoss}%` : '-';
    if (els.statRtt) els.statRtt.textContent = s.rttMs != null ? `${s.rttMs} ms` : '-';
    if (els.statFps) els.statFps.textContent = s.fps != null ? String(s.fps) : '-';
  }, 3000);
}

async function bootstrap() {
  if (!window.isSecureContext) {
    showToast('Use HTTPS para captura de tela confiavel', 'warn');
  }

  ensurePlaybackScaler();

  setHostShellVisible(false);

  hostTabBlocked = !tryAcquireHostLock();
  if (hostTabBlocked) {
    debugHostLog('A', 'duplicate host tab blocked', { lock: readHostLock() });
    setBadge('Aba duplicada', 'error');
    setStatus('Ja existe outro painel host aberto neste navegador. Feche a outra aba.');
    showToast('Feche a outra aba do painel host antes de continuar', 'error');
    return;
  }
  hostLockTimer = setInterval(refreshHostLock, 2000);
  window.addEventListener('beforeunload', () => {
    clearInterval(hostLockTimer);
    releaseHostLock();
  });

  const cohostParam = readQueryParam('cohost') === 'true';
  const tokenParam = readQueryParam('token');
  const nomeParam = readQueryParam('nome');

  if (cohostParam && tokenParam) {
    hostToken = tokenParam;
    if (nomeParam) {
      hostDisplayName = nomeParam;
    } else {
      hostDisplayName = 'Co-host';
    }
  } else {
    try {
      authUser = await requireAuthSession({
        onLoginRequired: () => setHostShellVisible(false),
        onAuthenticated: () => setHostShellVisible(true)
      });
      hostDisplayName = authDisplayName(authUser);
      if (hostDisplayName) {
        localStorage.setItem(STORAGE_HOST_NAME, hostDisplayName);
        if (els.hostNameInput) els.hostNameInput.value = hostDisplayName;
      }
    } catch (e) {
      showToast(e.message || 'Falha na autenticação', 'error');
      return;
    }
    try {
      const info = await fetch('/api/info').then((r) => r.json());
      await promptRoomPinIfRequired(info.hostPinRequired ?? !!info.roomPinRequired);
    } catch (_) {
      await promptRoomPinIfRequired(false);
    }
  }

  updateHostSettingsAccountUi();
  setHostShellVisible(true);

  signaling = new SignalingClient(wsUrl(), {
    onLog: (m, l) => log(m, l),
    onStateChange: (state) => {
      if (state === ConnectionState.RECONNECTING) {
        els.previewReconnecting.hidden = false;
        setBadge('Reconectando', 'warn');
        ui.set({ wsConnected: false, wsWasConnected: true });
      }
      if (state === ConnectionState.CONNECTED) {
        els.previewReconnecting.hidden = true;
        setBadge('Online', 'online');
        ui.set({ wsConnected: true, wsWasConnected: true });
      }
      if (state === ConnectionState.FAILED) {
        setBadge('Falha', 'error');
      }
    },
    onOpen: async () => {
      if (hostTabBlocked) return;
      try {
        const isReconnect = hostSessionJoined;
        debugHostLog('B', 'ws onOpen', { isReconnect });
        await joinHost({ autoShare: isReconnect });
        hostSessionJoined = true;
        if (!isReconnect && !isCoHostInstance) {
          await promptHostScreenShare();
        }
        if (isReconnect) {
          setStatus('Reconectado ao painel host');
          showToast('Reconectado ao servidor', 'info');
        }
      } catch (e) {
        errors.handle(e, 'join');
      }
    },
    onClose: (code, reason) => {
      const wasAuthenticated = signaling?.authenticated;
      const hadPeer = !!hostPeerId;
      debugHostLog('C', 'ws onClose', { code, reason, wasAuthenticated, hadPeer, joinInProgress });

      if (code === 4000 && !wasAuthenticated && !hadPeer) {
        debugHostLog('G', 'ignored stale 4000 during join', { code, reason });
        return;
      }

      joinGeneration += 1;
      joinInProgress = false;
      hostPeerId = null;
      hostReady = false;
      stopHostMicPublishWatchdog();
      lastAppliedRoomVersion = 0;
      signaling?.markAuthenticated(false);
      signaling?.clearPending();

      if (code === 4000 && (wasAuthenticated || hadPeer)) {
        signaling.enableReconnect = false;
        releaseHostLock();
        setBadge('Substituido', 'error');
        setStatus(
          'Outro painel host assumiu esta sessao. Feche abas duplicadas ou use apenas uma URL do host.'
        );
        showToast('Painel host substituido - reconexao automatica desativada', 'error');
        debugHostLog('A', 'host replaced - reconnect disabled', { code, reason });
        return;
      }

      setStatus('Desconectado - reconectando...');
      ui.set({ wsConnected: false });
    }
  });

  signaling.addListener(handleMessage);
  signaling.connect();
}

// Eventos UI
els.btnPausar?.addEventListener('click', async () => {
  if (!canHostCommand()) return;
  const resultPromise = signaling.onceType('pausaResultado');
  signaling.send('pausarTransmissao', {});
  const r = await resultPromise;
  if (!r.ok) errors.handle(new Error(r.erro), 'pausar');
  else {
    ui.set({ isPaused: true, hasPreview: true });
    updatePreviewOverlays();
    showToast('Transmissao pausada', 'info');
  }
});

els.btnRetomar?.addEventListener('click', async () => {
  if (!canHostCommand()) return;
  const resultPromise = signaling.onceType('retomadaResultado');
  signaling.send('retomarTransmissao', {});
  const r = await resultPromise;
  if (!r.ok) errors.handle(new Error(r.erro), 'retomar');
  else {
    ui.set({ isPaused: false });
    showToast('Transmissao retomada', 'success');
  }
});

els.btnLimpar?.addEventListener('click', async () => {
  if (!canHostCommand()) return;
  const resultPromise = signaling.onceType('limpezaResultado');
  signaling.send('limparTransmissao', {});
  await resultPromise;
  await media?.detachMedia({ videoEl: els.preview, audioEl: null });
  syncHostAudioMonitor().catch((e) =>
    errors.handle(e, 'audio-monitor')
  );
  estado.selecionado = null;
  ui.set({ hasSelection: false, hasPreview: false });
  renderLista();
});

els.btnGravar?.addEventListener('click', () => iniciarGravacao());
els.btnPararGravar?.addEventListener('click', () => pararGravacao());

els.btnPlayPause?.addEventListener('click', () => {
  if (ui._flags.isPaused) {
    els.btnRetomar?.click();
  } else {
    els.btnPausar?.click();
  }
});

els.btnRecordingToggle?.addEventListener('click', () => {
  if (ui._flags.isRecording) {
    pararGravacao();
  } else {
    iniciarGravacao();
  }
});

els.volumeSlider?.addEventListener('input', applyVolumeFromSlider);
els.btnMute?.addEventListener('click', () => {
  audioMuted = !audioMuted;
  applyVolumeFromSlider();
  updateMuteButtonIcon();
});

function updateMuteButtonIcon() {
  if (!els.btnMute) return;
  els.btnMute.title = audioMuted ? 'Ativar audio' : 'Silenciar audio';
  els.btnMute.innerHTML = audioMuted
    ? `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="1" x2="1" y2="23"></line></svg>`
    : `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
}


function toggleSidebarCollapsed() {
  const collapsed = !els.sidebar?.classList.contains('is-collapsed');
  els.sidebar?.classList.toggle('is-collapsed', collapsed);
  els.appMain?.classList.toggle('sidebar-collapsed', collapsed);
  els.btnSidebarCollapse?.setAttribute('aria-expanded', String(!collapsed));
  els.btnSidebarCollapse?.setAttribute(
    'aria-label',
    collapsed ? 'Expandir painel' : 'Recolher painel'
  );
  els.btnSidebarCollapse?.setAttribute('title', collapsed ? 'Expandir painel' : 'Recolher painel');
}

els.btnSidebarCollapse?.addEventListener('click', toggleSidebarCollapsed);

let controlsPopoutWindow = null;
let controlsPopoutWatchId = null;
let sidebarPopoutTransition = false;
let sidebarWasCollapsed = false;
let sidebarHiddenForPopout = false;
let studioPopoutRoot = null;
let popoutControlsExpanded = false;
const POPOUT_WIDTH_BASIC = 286;
const POPOUT_WIDTH_EXPANDED = 960;
const POPOUT_EXPAND_ICON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';

function scheduleStudioUiRefresh() {
  if (studioUiRefreshTimer) clearTimeout(studioUiRefreshTimer);
  studioUiRefreshTimer = setTimeout(() => {
    studioUiRefreshTimer = null;
    refreshStudioUi();
  }, 50);
}

function getStudioUiFromPopout(win) {
  if (!win?.document) return null;
  const root = win.document.getElementById('studio-popout-root');
  if (!root) return null;
  return {
    root,
    modeToggle: root.querySelector('#studio-mode-toggle'),
    popoutModeLabel: root.querySelector('#studio-popout-mode-label'),
    btnExpandControls: root.querySelector('#studio-btn-expand-controls'),
    btnTransition: root.querySelector('#studio-btn-transition'),
    programVideo: root.querySelector('#studio-program-video'),
    programEmpty: root.querySelector('#studio-program-empty'),
    previewVideo: root.querySelector('#studio-preview-video'),
    previewCanvas: root.querySelector('#studio-preview-canvas'),
    previewEmpty: root.querySelector('#studio-preview-empty'),
    sceneList: root.querySelector('#studio-scene-list'),
    sceneName: root.querySelector('#studio-scene-name'),
    sceneLayout: root.querySelector('#studio-scene-layout'),
    primaryAudio: root.querySelector('#studio-primary-audio'),
    slotList: root.querySelector('#studio-slot-list'),
    btnNew: root.querySelector('#studio-btn-new-scene'),
    btnDup: root.querySelector('#studio-btn-dup-scene'),
    btnDel: root.querySelector('#studio-btn-del-scene'),
    transformOverlay: root.querySelector('#studio-transform-overlay'),
    btnCropMode: root.querySelector('#studio-btn-crop-mode'),
    btnResetSlot: root.querySelector('#studio-btn-reset-slot')
  };
}

function syncPopoutLayoutExpanded(expanded) {
  if (!controlsPopoutWindow || controlsPopoutWindow.closed) return;
  try {
    const doc = controlsPopoutWindow.document;
    const layout = doc.getElementById('popout-layout');
    layout?.classList.toggle('is-expanded', expanded);
    layout?.classList.toggle('is-basic', !expanded);
    controlsPopoutWindow.resizeTo(
      expanded ? POPOUT_WIDTH_EXPANDED : POPOUT_WIDTH_BASIC,
      controlsPopoutWindow.outerHeight || 720
    );
  } catch (_) {}
}

function setPopoutControlsExpanded(expanded) {
  const next = !!expanded;
  const changed = next !== popoutControlsExpanded;
  popoutControlsExpanded = next;
  syncPopoutLayoutExpanded(popoutControlsExpanded);
  if (studioUi?.root) {
    studioUi.root.classList.toggle('is-expanded', popoutControlsExpanded);
    studioUi.root.classList.toggle('is-basic', !popoutControlsExpanded);
    if (studioUi.btnExpandControls) {
      studioUi.btnExpandControls.textContent = popoutControlsExpanded
        ? 'Ocultar controles avançados'
        : 'Expandir controles';
      studioUi.btnExpandControls.setAttribute('aria-expanded', String(popoutControlsExpanded));
    }
    if (studioUi.popoutModeLabel) {
      studioUi.popoutModeLabel.textContent = popoutControlsExpanded ? 'Expandido' : 'Padrão';
    }
  }
  syncPopoutExpandButtonInSidebar();
  if (controlsPopoutWindow && !controlsPopoutWindow.closed) {
    try {
      controlsPopoutWindow.document.title = popoutControlsExpanded && studio.isStudioModeEnabled()
        ? 'Studio — ShareScreen'
        : 'Controles — ShareScreen';
    } catch (_) {}
  }
  if (changed && isSidebarPoppedOut()) {
    renderLista();
  }
}

function resolveClientProducerId(client) {
  return (
    client?.producerIds?.video ||
    client?.producerId ||
    null
  );
}

function getClientByPeerId(peerId) {
  if (hostPeerId && String(peerId) === String(hostPeerId)) {
    return {
      id: hostPeerId,
      displayName: estado.clients.find((c) => String(c.id) === String(hostPeerId))?.displayName || 'Host',
      ehHost: true,
      isProducing: media?.hasVideoProducer?.() || !!media?.localScreenStream || media?.isSyntheticVideoActive?.(),
      producerIds: { video: media?.producers?.video?.id || null }
    };
  }
  return estado.clients.find((c) => String(c.id) === String(peerId)) || null;
}

function stopStudioPreviewCompositor() {
  if (studioPreviewCompositor) {
    studioPreviewCompositor.stop();
    studioPreviewCompositor = null;
  }
  for (const el of studioPreviewVideoEls) {
    try {
      el.pause();
      el.srcObject = null;
      el.remove();
    } catch (_) {}
  }
  studioPreviewVideoEls = [];
  media?.closePreviewConsumers?.().catch(() => {});
}

function stopStudioProgramCompositor() {
  if (studioProgramCompositor) {
    studioProgramCompositor.stop();
    studioProgramCompositor = null;
  }
  disposeStudioProgramCanvasHost();
}

function syncStudioProgramMirror() {
  if (!studioUi?.programVideo) return;
  const stream = els.preview?.srcObject;
  const hasStream = stream instanceof MediaStream && stream.getVideoTracks().some((t) => t.readyState === 'live');
  if (hasStream) {
    if (studioUi.programVideo.srcObject !== stream) {
      studioUi.programVideo.srcObject = stream;
    }
    studioUi.programVideo.hidden = false;
    studioUi.programEmpty.hidden = true;
    studioUi.programVideo.play?.().catch(() => {});
  } else {
    studioUi.programVideo.srcObject = null;
    studioUi.programVideo.hidden = true;
    studioUi.programEmpty.hidden = false;
  }
}

async function buildStudioPreviewSources(scene) {
  const sources = [];
  const ownProducerId = media?.producers?.video?.id || null;

  for (const slot of scene.slots) {
    const client = getClientByPeerId(slot.peerId);
    const producerId = slot.producerId || resolveClientProducerId(client);
    const slotPayload = { slot };

    if (hostPeerId && String(slot.peerId) === String(hostPeerId)) {
      const hostStream = getHostVideoStreamForStudio();
      const track = hostStream?.getVideoTracks?.()?.[0];
      if (track?.readyState === 'live') {
        sources.push({ stream: hostStream, ...slotPayload });
        continue;
      }
      sources.push({ stream: null, ...slotPayload });
      continue;
    }

    if (!producerId) {
      sources.push({ stream: null, ...slotPayload });
      continue;
    }

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.className = 'studio-preview-hidden-video';
    video.style.cssText =
      'position:fixed;left:-9999px;top:0;width:1920px;height:1080px;opacity:0;pointer-events:none';
    document.body.appendChild(video);
    studioPreviewVideoEls.push(video);

    try {
      await media.consumePreviewVideo(producerId, video, {
        ownProducerIds: { video: ownProducerId }
      });
      await waitForVideoDimensions(video);
      sources.push({ videoEl: video, ...slotPayload });
    } catch (_) {
      sources.push({ stream: null, ...slotPayload });
    }
  }

  return sources;
}

async function applyStudioPreview(sceneId) {
  if (!studio.isStudioModeEnabled() || !studioUi) return;
  const scene = sceneId ? studio.getScene(sceneId) : studio.getPreviewScene();
  if (!scene || !scene.slots.length) {
    stopStudioPreviewCompositor();
    studioLastPreviewKey = '';
    if (studioUi.previewVideo) {
      studioUi.previewVideo.hidden = true;
      studioUi.previewVideo.srcObject = null;
    }
    if (studioUi.previewCanvas) studioUi.previewCanvas.hidden = true;
    if (studioUi.previewEmpty) studioUi.previewEmpty.hidden = false;
    if (studioUi.transformOverlay) studioUi.transformOverlay.hidden = true;
    if (studioUi.btnTransition) studioUi.btnTransition.disabled = true;
    studioTransformEditor?.refresh?.();
    return;
  }

  studio.applyLayoutFramesToScene(scene.id);
  const previewKey = `${scene.id}:${scene.layout}:${getStudioPreviewKey(scene)}`;
  if (previewKey === studioLastPreviewKey && studioPreviewCompositor) {
    studioTransformEditor?.refresh?.();
    return;
  }
  studioLastPreviewKey = previewKey;

  stopStudioPreviewCompositor();
  const sources = await buildStudioPreviewSources(scene);
  const validCount = sources.filter((s) => s.videoEl || s.stream).length;
  if (!validCount) {
    if (studioUi.previewEmpty) studioUi.previewEmpty.hidden = false;
    if (studioUi.previewCanvas) studioUi.previewCanvas.hidden = true;
    if (studioUi.transformOverlay) studioUi.transformOverlay.hidden = true;
    if (studioUi.btnTransition) studioUi.btnTransition.disabled = true;
    studioTransformEditor?.refresh?.();
    return;
  }

  const dims = getStudioCompositorSize(sources);
  const useCompositor = sceneNeedsCompositor(scene);

  if (!useCompositor && scene.slots.length === 1 && sources[0]?.videoEl) {
    const stream = sources[0].videoEl.srcObject;
    if (studioUi.previewVideo && stream) {
      studioUi.previewVideo.srcObject = stream;
      studioUi.previewVideo.hidden = false;
      studioUi.previewCanvas.hidden = true;
      studioUi.previewEmpty.hidden = true;
      if (studioUi.transformOverlay) studioUi.transformOverlay.hidden = false;
      studioUi.previewVideo.play?.().catch(() => {});
      if (studioUi.btnTransition) studioUi.btnTransition.disabled = false;
      studioTransformEditor?.refresh?.();
      return;
    }
    if (sources[0]?.stream) {
      if (studioUi.previewVideo) {
        studioUi.previewVideo.srcObject = sources[0].stream;
        studioUi.previewVideo.hidden = false;
        studioUi.previewCanvas.hidden = true;
        studioUi.previewEmpty.hidden = true;
        if (studioUi.transformOverlay) studioUi.transformOverlay.hidden = false;
        studioUi.previewVideo.play?.().catch(() => {});
        if (studioUi.btnTransition) studioUi.btnTransition.disabled = false;
        studioTransformEditor?.refresh?.();
        return;
      }
    }
  }

  studioPreviewCompositor = StudioCompositor.start({
    canvas: studioUi.previewCanvas,
    sources,
    layout: scene.layout,
    width: dims.width,
    height: dims.height,
    fps: 30,
    ownerDocument: document
  });

  if (studioPreviewCompositor) {
    studioUi.previewCanvas.hidden = false;
    studioUi.previewVideo.hidden = true;
    studioUi.previewEmpty.hidden = true;
    if (studioUi.transformOverlay) studioUi.transformOverlay.hidden = false;
    if (studioUi.btnTransition) studioUi.btnTransition.disabled = false;
  } else {
    if (studioUi.previewEmpty) studioUi.previewEmpty.hidden = false;
    if (studioUi.btnTransition) studioUi.btnTransition.disabled = true;
  }
  studioTransformEditor?.refresh?.();
}

function scheduleApplyStudioPreview(sceneId) {
  if (studioPreviewApplyTimer) clearTimeout(studioPreviewApplyTimer);
  studioPreviewApplyTimer = setTimeout(() => {
    studioPreviewApplyTimer = null;
    applyStudioPreview(sceneId);
  }, 80);
}

function renderStudioSceneList() {
  if (!studioUi?.sceneList) return;
  const snap = studio.getSnapshot();
  studioUi.sceneList.innerHTML = '';
  for (const scene of snap.scenes) {
    const li = document.createElement('li');
    li.className = 'studio-scene-item';
    if (scene.id === snap.previewSceneId) li.classList.add('is-preview');
    if (scene.id === snap.programSceneId) li.classList.add('is-program');
    li.textContent = scene.name;
    li.title = scene.name;
    li.addEventListener('click', () => handleStudioSceneClick(scene.id));
    studioUi.sceneList.appendChild(li);
  }
}

function renderStudioSlotList() {
  if (!studioUi?.slotList) return;
  const scene = studio.getEditingScene();
  const selectedPeerId = studio.getSelectedSlotPeerId();
  studioUi.slotList.innerHTML = '';
  if (!scene) return;
  scene.slots.forEach((slot, index) => {
    const li = document.createElement('li');
    li.className = 'studio-slot-item';
    if (String(slot.peerId) === String(selectedPeerId)) li.classList.add('is-selected');
    const label = document.createElement('span');
    label.textContent = `${index + 1}. ${slot.label || slot.peerId}`;
    label.style.cursor = 'pointer';
    label.addEventListener('click', () => {
      studio.setSelectedSlotPeerId(slot.peerId);
      renderStudioSlotList();
      studioTransformEditor?.refresh?.();
    });
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Remover';
    btn.addEventListener('click', () => {
      studio.removeSlotFromEditingScene(slot.peerId);
      studioLastPreviewKey = '';
      scheduleApplyStudioPreview(scene.id);
      renderStudioSlotList();
      renderStudioSceneEditor();
    });
    li.append(label, btn);
    studioUi.slotList.appendChild(li);
  });
}

function renderStudioPrimaryAudioOptions() {
  if (!studioUi?.primaryAudio) return;
  const scene = studio.getEditingScene();
  const sel = studioUi.primaryAudio;
  const current = scene?.primaryAudioPeerId || '';
  sel.innerHTML = '<option value="">— automático —</option>';
  for (const slot of scene?.slots || []) {
    const opt = document.createElement('option');
    opt.value = slot.peerId;
    opt.textContent = slot.label || slot.peerId;
    sel.appendChild(opt);
  }
  sel.value = current;
}

function renderStudioSceneEditor() {
  const scene = studio.getEditingScene();
  if (!scene || !studioUi) return;
  if (studioUi.sceneName) studioUi.sceneName.value = scene.name;
  if (studioUi.sceneLayout) studioUi.sceneLayout.value = scene.layout;
  renderStudioPrimaryAudioOptions();
  renderStudioSlotList();
}

function refreshStudioUi() {
  if (!studioUi) return;
  studio.syncSlotProducerIds(estado.clients);
  renderStudioSceneList();
  renderStudioSceneEditor();
  syncStudioPopoutChrome();
  syncStudioProgramMirror();
  const preview = studio.getPreviewScene();
  if (preview && studio.isStudioModeEnabled()) {
    scheduleApplyStudioPreview(preview.id);
  }
  studioTransformEditor?.refresh?.();
  syncStudioCropModeUi();
}

function syncStudioPopoutChrome() {
  if (!studioUi?.root) return;
  const on = studio.isStudioModeEnabled();
  studioUi.root.classList.toggle('studio-mode-off', !on);
  setPopoutControlsExpanded(popoutControlsExpanded);
  if (studioUi.modeToggle) studioUi.modeToggle.checked = on;
  if (studioUi.btnTransition) {
    studioUi.btnTransition.disabled = !on || !studio.getPreviewScene()?.slots?.length;
  }
  if (!on) {
    stopStudioPreviewCompositor();
    if (studioUi.previewVideo) {
      studioUi.previewVideo.hidden = true;
      studioUi.previewVideo.srcObject = null;
    }
    if (studioUi.previewCanvas) studioUi.previewCanvas.hidden = true;
    if (studioUi.previewEmpty) studioUi.previewEmpty.hidden = true;
    if (studioUi.transformOverlay) studioUi.transformOverlay.hidden = true;
  }
}

function handleStudioSceneClick(sceneId) {
  studio.setPreviewScene(sceneId);
  studio.setEditingScene(sceneId);
  renderStudioSceneEditor();
  renderStudioSceneList();
  if (studio.isStudioModeEnabled()) {
    scheduleApplyStudioPreview(sceneId);
    syncStudioPopoutChrome();
    return;
  }
  goLiveScene(sceneId);
}

function getValidSceneSlots(scene) {
  if (!scene?.slots?.length) return [];
  return scene.slots.filter((slot) => {
    if (hostPeerId && String(slot.peerId) === String(hostPeerId)) return true;
    return !!getClientByPeerId(slot.peerId);
  });
}

async function ensureSceneCompositor(scene, validSlots, { forProgram = false } = {}) {
  const snap = studio.getSnapshot();
  if (
    !forProgram &&
    studioPreviewCompositor?.stream &&
    snap.previewSceneId === scene.id &&
    validSlots.length >= 1
  ) {
    return studioPreviewCompositor;
  }

  if (forProgram) {
    stopStudioProgramCompositor();
  } else {
    stopStudioPreviewCompositor();
  }

  studio.applyLayoutFramesToScene(scene.id);
  const sources = await buildStudioPreviewSources({ ...scene, slots: validSlots });
  const dims = getStudioCompositorSize(sources);
  const canvas = forProgram && STUDIO_COMPOSITOR_IN_MAIN
    ? ensureStudioProgramCanvasHost()
    : undefined;
  const ownerDocument = forProgram && STUDIO_COMPOSITOR_IN_MAIN ? document : undefined;

  const comp = StudioCompositor.start({
    canvas,
    sources,
    layout: scene.layout,
    width: dims.width,
    height: dims.height,
    fps: 30,
    ownerDocument
  });
  if (!comp?.stream) throw new Error('Falha ao compor cena multi-fonte');

  if (forProgram) {
    studioProgramCompositor = comp;
  } else {
    studioPreviewCompositor = comp;
  }
  return comp;
}

async function goLiveScene(sceneId) {
  const scene = studio.getScene(sceneId);
  if (!scene) return;

  const validSlots = getValidSceneSlots(scene);
  if (!validSlots.length) {
    showToast('Adicione fontes validas à cena antes de transmitir', 'warn');
    return;
  }

  const needsCompositor = sceneNeedsCompositor(scene, validSlots);

  try {
    if (validSlots.length === 1 && !needsCompositor) {
      if (media?.isSyntheticVideoActive?.()) {
        await media.stopSyntheticVideo();
        stopStudioProgramCompositor();
      }
      await selecionar(validSlots[0].peerId);
      studio.setProgramScene(scene.id);
      startHostVideoWatchdog();
      refreshStudioUi();
      showToast('Cena no ar', 'success');
      return;
    }

    const comp = await ensureSceneCompositor(scene, validSlots, { forProgram: true });
    studioPreviewCompositor = null;
    studioLastPreviewKey = '';

    await media.publishSyntheticVideoStream(comp.stream);
    try {
      await media.producers?.video?.requestKeyFrame?.();
    } catch (_) {}

    await selecionar(hostPeerId);

    if (els.preview && comp.stream) {
      els.preview.srcObject = comp.stream;
      await els.preview.play?.().catch(() => {});
    }

    studio.setProgramScene(scene.id);
    syncStudioProgramMirror();
    renderStudioSceneList();
    startHostVideoWatchdog();
    showToast('Cena composta no ar', 'success');
  } catch (e) {
    errors.handle(e, 'studio-golive');
    showToast('Falha ao colocar cena no ar', 'error');
  }
}

async function executeStudioTransition() {
  if (!studio.isStudioModeEnabled()) return;
  const scene = studio.getPreviewScene();
  if (!scene) {
    showToast('Selecione uma cena no preview', 'warn');
    return;
  }
  await goLiveScene(scene.id);
}

function handleStudioAddParticipant(peerId) {
  const client = getClientByPeerId(peerId);
  if (!client?.id) return;

  const producerId = resolveClientProducerId(client);
  const scene = studio.getEditingScene();
  if (!scene) {
    studio.createScene({ name: 'Nova cena' });
  }
  const added = studio.addSlotToEditingScene({
    peerId,
    producerId: producerId || null,
    label: client.displayName || peerId
  });
  if (!added) {
    showToast('Nao foi possivel adicionar (limite 4 ou ja na cena)', 'warn');
    return;
  }
  const editing = studio.getEditingScene();
  if (editing) {
    studio.setPreviewScene(editing.id);
    if (studio.isStudioModeEnabled()) {
      scheduleApplyStudioPreview(editing.id);
    }
  }
  renderStudioSceneList();
  renderStudioSceneEditor();
  renderLista();
  syncStudioPopoutChrome();
  showToast('Fonte adicionada à cena', 'info');
}

function syncStudioCropModeUi() {
  if (studioUi?.btnCropMode) {
    studioUi.btnCropMode.classList.toggle('is-active', studioCropMode);
    studioUi.btnCropMode.setAttribute('aria-pressed', String(studioCropMode));
  }
}

function handleStudioTransformChange(sceneId, peerId, patch) {
  studio.updateSlotTransform(sceneId, peerId, patch);
  studioLastPreviewKey = '';
  scheduleApplyStudioPreview(sceneId);
  renderStudioSlotList();
}

function initStudioTransformEditor() {
  studioTransformEditor?.dispose?.();
  if (!studioUi?.transformOverlay) return;
  studioTransformEditor = createStudioTransformEditor({
    container: studioUi.transformOverlay,
    onChange: handleStudioTransformChange,
    getScene: () => studio.getEditingScene(),
    getSelectedPeerId: () => studio.getSelectedSlotPeerId(),
    setSelectedPeerId: (peerId) => {
      studio.setSelectedSlotPeerId(peerId);
      renderStudioSlotList();
      studioTransformEditor?.refresh?.();
    },
    getCropMode: () => studioCropMode,
    setCropMode: (v) => {
      studioCropMode = !!v;
      syncStudioCropModeUi();
      studioTransformEditor?.refresh?.();
    }
  });
  studioTransformEditor.refresh();
}

function mountStudioPopoutShell(win) {
  const tpl = document.getElementById('studio-popout-shell');
  if (!tpl?.content) {
    showToast('Painel Studio indisponivel — recarregue a pagina do host (Ctrl+F5)', 'warn');
    return null;
  }
  const node = tpl.content.firstElementChild.cloneNode(true);
  win.document.body.appendChild(node);
  studioPopoutRoot = node.querySelector('#studio-popout-root') || node;
  studioUi = getStudioUiFromPopout(win);
  setPopoutControlsExpanded(false);

  syncStudioPopoutChrome();
  initStudioTransformEditor();

  studioUi?.btnExpandControls?.addEventListener('click', () => {
    setPopoutControlsExpanded(!popoutControlsExpanded);
    syncStudioPopoutChrome();
  });

  studioUi?.btnCropMode?.addEventListener('click', () => {
    studioCropMode = !studioCropMode;
    syncStudioCropModeUi();
    studioTransformEditor?.refresh?.();
  });

  studioUi?.btnResetSlot?.addEventListener('click', () => {
    const editing = studio.getEditingScene();
    const peerId = studio.getSelectedSlotPeerId() || editing?.slots?.[0]?.peerId;
    if (!editing || !peerId) return;
    studio.resetSlotTransform(editing.id, peerId);
    studioLastPreviewKey = '';
    scheduleApplyStudioPreview(editing.id);
    studioTransformEditor?.refresh?.();
  });

  win.document.addEventListener('keydown', (e) => {
    if (!studio.isStudioModeEnabled()) return;
    if (e.target?.matches('input, textarea, select')) return;
    if (e.key === 'Escape') {
      studio.setSelectedSlotPeerId(null);
      renderStudioSlotList();
      studioTransformEditor?.refresh?.();
    } else if (e.key === 'r' || e.key === 'R') {
      studioUi?.btnResetSlot?.click();
    } else if (e.altKey && !e.ctrlKey && !e.metaKey) {
      studioCropMode = true;
      syncStudioCropModeUi();
      studioTransformEditor?.refresh?.();
    }
  });

  win.document.addEventListener('keyup', (e) => {
    if (e.key === 'Alt') {
      studioCropMode = !!studioUi?.btnCropMode?.classList.contains('is-active');
      syncStudioCropModeUi();
      studioTransformEditor?.refresh?.();
    }
  });

  studioUi?.modeToggle?.addEventListener('change', () => {
    studio.setStudioModeEnabled(!!studioUi.modeToggle.checked);
    if (studio.isStudioModeEnabled()) {
      if (!studioProgramMirrorId) {
        studioProgramMirrorId = setInterval(syncStudioProgramMirror, 500);
      }
    } else if (studioProgramMirrorId) {
      clearInterval(studioProgramMirrorId);
      studioProgramMirrorId = null;
    }
    setPopoutControlsExpanded(popoutControlsExpanded);
    refreshStudioUi();
  });

  studioUi?.btnTransition?.addEventListener('click', () => executeStudioTransition());

  studioUi?.btnNew?.addEventListener('click', () => {
    studio.createScene({ name: `Cena ${studio.getSnapshot().scenes.length + 1}` });
    refreshStudioUi();
  });

  studioUi?.btnDup?.addEventListener('click', () => {
    const editing = studio.getEditingScene();
    if (editing) studio.duplicateScene(editing.id);
    refreshStudioUi();
  });

  studioUi?.btnDel?.addEventListener('click', () => {
    const editing = studio.getEditingScene();
    if (!editing) return;
    if (studio.getSnapshot().scenes.length <= 1) {
      showToast('Mantenha ao menos uma cena', 'warn');
      return;
    }
    studio.deleteScene(editing.id);
    refreshStudioUi();
  });

  studioUi?.sceneName?.addEventListener('change', () => {
    const editing = studio.getEditingScene();
    if (editing) {
      studio.updateScene(editing.id, { name: studioUi.sceneName.value });
      renderStudioSceneList();
    }
  });

  studioUi?.sceneLayout?.addEventListener('change', () => {
    const editing = studio.getEditingScene();
    if (editing) {
      studio.updateScene(editing.id, { layout: studioUi.sceneLayout.value });
      studio.applyLayoutFramesToScene(editing.id);
      studioLastPreviewKey = '';
      scheduleApplyStudioPreview(editing.id);
      studioTransformEditor?.refresh?.();
    }
  });

  studioUi?.primaryAudio?.addEventListener('change', () => {
    const editing = studio.getEditingScene();
    if (editing) {
      studio.updateScene(editing.id, { primaryAudioPeerId: studioUi.primaryAudio.value });
    }
  });

  refreshStudioUi();

  return node;
}

function teardownStudioPopout() {
  if (studioProgramMirrorId) {
    clearInterval(studioProgramMirrorId);
    studioProgramMirrorId = null;
  }
  if (studioPreviewApplyTimer) {
    clearTimeout(studioPreviewApplyTimer);
    studioPreviewApplyTimer = null;
  }
  studioTransformEditor?.dispose?.();
  studioTransformEditor = null;
  studioCropMode = false;
  studioLastPreviewKey = '';
  stopStudioPreviewCompositor();
  stopStudioProgramCompositor();
  media?.closePreviewConsumers?.().catch(() => {});
  studioUi = null;
  studioPopoutRoot = null;
}

function isFullscreenInSidebar() {
  return !!els.btnFullscreen?.closest('#sidebar');
}

function moveFullscreenToPreview() {
  if (!els.btnFullscreen || !els.previewArea || !isFullscreenInSidebar()) return;
  els.btnFullscreen.classList.remove('sidebar-icon-btn');
  els.btnFullscreen.classList.add('preview-float-btn', 'preview-fullscreen-btn');
  els.btnFullscreen.hidden = false;
  els.previewArea.appendChild(els.btnFullscreen);
}

function restoreFullscreenToSidebar() {
  if (!els.btnFullscreen || !els.previewArea?.contains(els.btnFullscreen)) return;
  const actions = els.sidebar?.querySelector('.sidebar-actions');
  const anchor = els.btnPopoutControls;
  if (!actions) return;
  els.btnFullscreen.classList.remove('preview-float-btn', 'preview-fullscreen-btn');
  els.btnFullscreen.classList.add('sidebar-icon-btn');
  if (anchor?.parentNode === actions) {
    actions.insertBefore(els.btnFullscreen, anchor);
  } else {
    actions.appendChild(els.btnFullscreen);
  }
}

function syncPopoutControlsUi(popped) {
  const btn = els.btnPopoutControls;
  if (!btn) return;
  const doc = btn.ownerDocument || document;
  let icon = btn.querySelector('i');
  if (!icon) {
    icon = doc.createElement('i');
    icon.setAttribute('aria-hidden', 'true');
    btn.replaceChildren(icon);
  }
  icon.className = popped
    ? 'fa-solid fa-up-right-from-square fa-flip-both'
    : 'fa-solid fa-up-right-from-square';
  if (popped) {
    btn.setAttribute('aria-label', 'Voltar para janela principal');
    btn.setAttribute('title', 'Voltar para janela principal');
  } else {
    btn.setAttribute('aria-label', 'Abrir controles em nova janela');
    btn.setAttribute('title', 'Abrir controles em nova janela');
  }
}

function injectPopoutGuardScript(win) {
  const script = win.document.createElement('script');
  script.textContent =
    'setInterval(function(){if(!window.opener||window.opener.closed)window.close();},500);';
  win.document.body.appendChild(script);
}

function setupPopoutDocument(win) {
  win.document.open();
  win.document.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Controles — ShareScreen</title></head>' +
      '<body class="controls-popout-body app-host"></body></html>'
  );
  win.document.close();
  document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    win.document.head.appendChild(link.cloneNode(true));
  });
  injectPopoutGuardScript(win);
}

function isSidebarPoppedOut() {
  return !!(controlsPopoutWindow && !controlsPopoutWindow.closed);
}

const ENABLE_SIDEBAR_POPOUT_EXPAND_BUTTON = false;

function ensurePopoutExpandButtonInSidebar() {
  if (!ENABLE_SIDEBAR_POPOUT_EXPAND_BUTTON) {
    removePopoutExpandButtonFromSidebar();
    return;
  }
  const sidebar = els.sidebar;
  const actions = sidebar?.querySelector('.sidebar-actions');
  if (!actions) return;
  const doc = sidebar.ownerDocument;
  let btn = doc.getElementById('btn-sidebar-popout-expand');
  if (!btn) {
    btn = doc.createElement('button');
    btn.type = 'button';
    btn.id = 'btn-sidebar-popout-expand';
    btn.className = 'sidebar-icon-btn';
    btn.setAttribute('aria-label', 'Expandir controles avançados');
    btn.title = 'Expandir controles avançados';
    btn.innerHTML = POPOUT_EXPAND_ICON;
    btn.addEventListener('click', () => {
      setPopoutControlsExpanded(!popoutControlsExpanded);
      syncStudioPopoutChrome();
    });
    actions.insertBefore(btn, actions.firstChild);
  }
  syncPopoutExpandButtonInSidebar();
}

function syncPopoutExpandButtonInSidebar() {
  const btn = els.sidebar?.ownerDocument?.getElementById('btn-sidebar-popout-expand');
  if (!btn) return;
  const show = ENABLE_SIDEBAR_POPOUT_EXPAND_BUTTON && isSidebarPoppedOut() && !popoutControlsExpanded;
  btn.hidden = !show;
}

function removePopoutExpandButtonFromSidebar() {
  els.sidebar?.ownerDocument?.getElementById('btn-sidebar-popout-expand')?.remove();
}

function isSidebarInMainDocument() {
  const sidebar = els.sidebar;
  if (!sidebar) return true;
  return sidebar.ownerDocument === document && document.contains(sidebar);
}

function ensureSidebarDockedInMain() {
  if (sidebarPopoutTransition || isSidebarPoppedOut()) return false;
  if (isSidebarInMainDocument()) return false;
  debugPopoutLog('A', 'host/app.js:ensureSidebarDockedInMain', 'restoring orphan sidebar to main', {
    poppedOut: false,
    sidebarOwnerIsMain: els.sidebar?.ownerDocument === document
  });
  return restoreSidebarFromPopout();
}

function moveSidebarToPopout(win) {
  const sidebar = els.sidebar;
  const layout = win?.document?.getElementById('popout-layout');
  if (!sidebar || !layout) return false;

  let placeholder = document.getElementById('sidebar-popout-placeholder');
  if (!placeholder) {
    placeholder = document.createElement('div');
    placeholder.id = 'sidebar-popout-placeholder';
    placeholder.hidden = true;
    sidebar.parentNode?.insertBefore(placeholder, sidebar);
  }

  sidebar.classList.remove('is-collapsed');
  sidebar.hidden = false;
  layout.insertBefore(sidebar, layout.firstChild);
  ensurePopoutExpandButtonInSidebar();
  debugPopoutLog('C', 'host/app.js:moveSidebarToPopout', 'sidebar moved', {
    layoutFound: true,
    sidebarInPopout: sidebar.ownerDocument === win.document
  });
  return true;
}

function restoreSidebarFromPopout() {
  const sidebar = els.sidebar;
  if (!sidebar) return false;

  if (sidebar.ownerDocument === document && document.contains(sidebar)) {
    return true;
  }

  const placeholder = document.getElementById('sidebar-popout-placeholder');
  if (placeholder?.parentNode) {
    placeholder.parentNode.insertBefore(sidebar, placeholder);
    placeholder.remove();
  } else {
    els.appMain?.appendChild(sidebar);
  }
  removePopoutExpandButtonFromSidebar();
  return true;
}

function applySidebarDockedLayout() {
  els.appMain?.classList.remove('sidebar-popped-out');
  if (els.sidebar && !els.sidebar.hidden) {
    els.appMain?.classList.add('sidebar-open');
    if (sidebarWasCollapsed) {
      els.appMain.classList.add('sidebar-collapsed');
      els.sidebar.classList.add('is-collapsed');
    }
  }
}

function finalizePopoutDock({ skipClosePopup = false } = {}) {
  const popoutWin = controlsPopoutWindow;
  const needsDock = !!popoutWin || !isSidebarInMainDocument();
  if (!needsDock) return;

  sidebarPopoutTransition = true;
  try {
    debugPopoutLog('D', 'host/app.js:finalizePopoutDock', 'dock called', {
      skipClosePopup: !!skipClosePopup,
      hadPopout: !!popoutWin
    });
    if (controlsPopoutWatchId) {
      clearInterval(controlsPopoutWatchId);
      controlsPopoutWatchId = null;
    }

    controlsPopoutWindow = null;
    teardownStudioPopout();
    restoreSidebarFromPopout();
    if (els.sidebar && !sidebarHiddenForPopout) {
      els.sidebar.hidden = false;
    }
    sidebarHiddenForPopout = false;
    removePopoutExpandButtonFromSidebar();
    restoreFullscreenToSidebar();
    applySidebarDockedLayout();
    syncPopoutControlsUi(false);
    renderLista();

    if (!skipClosePopup && popoutWin && !popoutWin.closed) {
      try {
        popoutWin.close();
      } catch (_) {}
    }
  } finally {
    sidebarPopoutTransition = false;
  }
}

function dockControlsPopout(skipClosePopup = false) {
  finalizePopoutDock({ skipClosePopup });
}

function watchPopoutClosed() {
  if (controlsPopoutWatchId) clearInterval(controlsPopoutWatchId);
  controlsPopoutWatchId = setInterval(() => {
    if (!controlsPopoutWindow || controlsPopoutWindow.closed) {
      finalizePopoutDock({ skipClosePopup: true });
    }
  }, 300);
}

function handlePopoutControlsClick() {
  if (isSidebarPoppedOut()) {
    dockControlsPopout();
    return;
  }
  openControlsPopout();
}

function openControlsPopout() {
  if (!canHostCommand() && !isCoHostInstance) {
    showToast('Aguarde o painel conectar ao servidor', 'warn');
    return;
  }

  if (!els.sidebar || els.sidebar.hidden) {
    showToast('Painel de controles indisponivel', 'warn');
    return;
  }

  const features =
    `width=${POPOUT_WIDTH_BASIC},height=720,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`;
  const win = window.open('about:blank', 'sharescreen-controls', features);
  if (!win) {
    showToast('Permita pop-ups para abrir os controles em nova janela', 'warn');
    return;
  }

  setupPopoutDocument(win);
  sidebarWasCollapsed = els.sidebar.classList.contains('is-collapsed');
  sidebarHiddenForPopout = !!els.sidebar.hidden;
  mountStudioPopoutShell(win);
  sidebarPopoutTransition = true;
  controlsPopoutWindow = win;
  try {
    if (!win.document.getElementById('popout-layout') || !moveSidebarToPopout(win)) {
      controlsPopoutWindow = null;
      teardownStudioPopout();
      win.close();
      showToast('Falha ao abrir painel de controles', 'error');
      return;
    }

    moveFullscreenToPreview();

    els.appMain?.classList.add('sidebar-popped-out');
    els.appMain?.classList.remove('sidebar-open', 'sidebar-collapsed');

    win.document.title = 'Controles — ShareScreen';
    syncPopoutControlsUi(true);

    debugPopoutLog('C,D', 'host/app.js:openControlsPopout', 'popout opened', {
      popoutLayoutChildren: win.document.getElementById('popout-layout')?.childElementCount ?? 0,
      sidebarInPopout: els.sidebar?.ownerDocument === win.document,
      popoutBodyChildCount: win.document.body?.childElementCount ?? 0
    });

    if (!studioProgramMirrorId) {
      studioProgramMirrorId = setInterval(syncStudioProgramMirror, 500);
    }
    renderLista();
    refreshStudioUi();

    win.addEventListener('beforeunload', () => {
      finalizePopoutDock({ skipClosePopup: true });
    });

    watchPopoutClosed();
  } finally {
    sidebarPopoutTransition = false;
  }
}

els.btnPopoutControls?.addEventListener('click', handlePopoutControlsClick);
window.addEventListener('pagehide', () => dockControlsPopout());

els.btnTech?.addEventListener('click', () => {
  const open = els.techDrawer.hidden;
  els.techDrawer.hidden = !open;
  if (open) renderTechErrors();
});
els.btnCloseTech?.addEventListener('click', () => {
  els.techDrawer.hidden = true;
});

async function gerarLinkExterno(guestName) {
  const nome = String(guestName || '').trim();
  if (!nome) {
    showToast('Informe o nome do convidado', 'warn');
    return;
  }
  try {
    const res = await fetch('/api/link-externo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(hostToken ? { 'X-Host-Token': hostToken } : {})
      },
      body: JSON.stringify({ nome })
    });
    let data = {};
    const raw = await res.text();
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(
        res.ok
          ? 'Resposta invalida do servidor ao gerar link'
          : `Servidor indisponivel (${res.status}). Verifique se o ShareScreen foi reiniciado.`
      );
    }
    if (!res.ok) throw new Error(data.erro || `Falha ao gerar link externo (${res.status})`);
    if (!data.url) throw new Error('Servidor nao retornou o link externo');
    await navigator.clipboard.writeText(data.url);
    const hours = Math.round((data.expiresInMs || 0) / 3_600_000);
    showToast(
      hours
        ? `Link de ${nome} copiado (valido por ~${hours}h)`
        : `Link de ${nome} copiado`,
      'success'
    );
  } catch (e) {
    if (e.name === 'NotAllowedError') {
      showToast('Permita acesso a area de transferencia para copiar o link', 'warn');
    } else {
      errors.handle(e, 'link-externo');
    }
  }
}

function copyUrl(path) {
  const url = `${location.origin}${path}`;
  navigator.clipboard.writeText(url).then(
    () => showToast('Link copiado', 'success'),
    () => showToast(url, 'info')
  );
}

els.btnCopyClient?.addEventListener('click', () => copyUrl('/client'));
els.btnCopyHost?.addEventListener('click', () => copyUrl('/host'));

function openExternalLinkModal() {
  if (!canHostCommand()) {
    showToast('Aguarde o painel conectar ao servidor', 'warn');
    return;
  }
  if (els.externalGuestName) els.externalGuestName.value = '';
  if (els.externalLinkModal) els.externalLinkModal.hidden = false;
  els.externalGuestName?.focus();
}

function closeExternalLinkModal() {
  if (els.externalLinkModal) els.externalLinkModal.hidden = true;
}

async function submitExternalLink() {
  const nome = els.externalGuestName?.value.trim() || '';
  if (!nome) {
    showToast('Informe o nome do convidado', 'warn');
    els.externalGuestName?.focus();
    return;
  }
  closeExternalLinkModal();
  await gerarLinkExterno(nome);
}

els.btnExternalLink?.addEventListener('click', () => openExternalLinkModal());
els.btnExternalLinkSubmit?.addEventListener('click', () => submitExternalLink());
els.btnExternalLinkCancel?.addEventListener('click', () => closeExternalLinkModal());
els.externalGuestName?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    submitExternalLink();
  }
});

els.btnFullscreen?.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else els.previewArea?.requestFullscreen?.();
});

els.btnFsSources?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleFsSourceMenu();
});

document.addEventListener('fullscreenchange', syncFsSourceUi);

document.addEventListener('click', (e) => {
  if (els.fsSourceMenu?.hidden) return;
  if (e.target === els.btnFsSources || els.btnFsSources?.contains(e.target)) return;
  if (els.fsSourceMenu?.contains(e.target)) return;
  closeFsSourceMenu();
});

async function unlockHostRemoteAudio() {
  const confirmed = await hostAudioMonitor?.resume();
  els.previewAudio?.play?.().catch(() => {});
  if (confirmed || hostAudioMonitor?.isPlaybackConfirmed?.()) {
    hostMicAutoplayNeeded = false;
  }
  if (hostHasMicEnabled() && media) {
    await recoverHostMicPublication();
  }
  updateHostMicUi();
  updateActivateAudioUi();
  const publishOk = !media?.isMicPublishDegraded?.();
  const playbackOk =
    !hostAudioMonitor ||
    hostAudioMonitor.channelCount === 0 ||
    !!hostAudioMonitor.isPlaybackConfirmed?.();
  return publishOk && playbackOk;
}

els.btnHostMic?.addEventListener('click', () => onHostMicClick());
els.btnHostSwitchScreen?.addEventListener('click', () => trocarTelaHost());

window.addEventListener('sharescreen-ended', async () => {
  if (media?._suppressShareEnded) return;
  const syntheticActive = !!media?.isSyntheticVideoActive?.();
  if (syntheticActive) {
    try {
      media.releaseLocalScreenStream?.();
    } catch (_) {}
    updateHostMicUi();
    setStatus(
      isWhiteboardTransmission(lastActiveTransmission)
        ? 'Quadro branco ativo — captura de tela encerrada'
        : 'Captura de tela encerrada'
    );
    return;
  }
  if (recorder.isRecording()) pararGravacao();
  stopHostVideoWatchdog();
  try {
    await media?.stopVideoShare();
  } catch (_) {}
  ui.set({ isSharing: false });
  updateHostMicUi();
  signaling?.send('status', {
    status: media?.hasPublishedMicrophone?.() ? 'transmitindo' : 'conectado'
  });
});

window.addEventListener('beforeunload', () => {
  stopPlaybackScaler();
  clearInterval(hostLockTimer);
  releaseHostLock();
  localHostVuStop?.();
  selfAudioMonitor?.dispose();
  selfAudioMonitor = null;
  stopHostMicPublishWatchdog();
  stopRecordingCapture();
  hostAudioMonitor?.dispose();
  media?.dispose();
  signaling?.close();
});

window.addEventListener('pagehide', () => {
  if (!recorder.isRecording() && !recorder.isStreaming()) return;
  const pattern = localStorage.getItem(STORAGE_RECORDING_FILENAME_PATTERN) || '';
  const filename = formatRecordingFilename(new Date(), pattern);
  recorder.prepareIncompleteFinish(filename);
});

let currentPickerPath = '';

async function loadDir(pathValue) {
  const listEl = document.getElementById('dir-picker-list');
  const pathEl = document.getElementById('dir-picker-current-path');
  if (!listEl || !pathEl) return;

  listEl.innerHTML = '<div style="padding: 10px; color: var(--color-text-muted);">Carregando...</div>';
  pathEl.textContent = pathValue || 'Aguarde...';

  try {
    const res = await fetch('/api/browse-dir', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(hostToken ? { 'X-Host-Token': hostToken } : {})
      },
      body: JSON.stringify({ path: pathValue })
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      listEl.innerHTML = '<div style="padding: 10px; color: var(--color-danger);">Rota /api/browse-dir indisponível no proxy. Atualize o NGINX ou acesse o host diretamente.</div>';
      return;
    }
    const data = await res.json();
    if (!data.ok) {
      listEl.innerHTML = `<div style="padding: 10px; color: var(--color-danger);">${data.erro || 'Erro ao listar'}</div>`;
      return;
    }

    currentPickerPath = data.currentPath;
    pathEl.textContent = currentPickerPath;
    listEl.innerHTML = '';

    const upBtn = document.getElementById('btn-dir-picker-up');
    if (upBtn) {
      upBtn.disabled = !data.parent;
      upBtn.onclick = () => {
        if (data.parent) loadDir(data.parent);
      };
    }

    if (data.dirs.length === 0) {
      listEl.innerHTML = '<div style="padding: 10px; color: var(--color-text-muted);">Pasta vazia</div>';
      return;
    }

    data.dirs.forEach((dirName) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-ghost';
      btn.style.width = '100%';
      btn.style.textAlign = 'left';
      btn.style.padding = '0.4rem 0.6rem';
      btn.style.fontSize = '0.9rem';
      btn.style.justifyContent = 'flex-start';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.gap = 'var(--space-xs)';

      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" style="flex-shrink: 0;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${dirName}</span>
      `;
      btn.addEventListener('click', () => {
        const separator = currentPickerPath.includes('/') ? '/' : '\\';
        const newPath = currentPickerPath.endsWith(separator)
          ? `${currentPickerPath}${dirName}`
          : `${currentPickerPath}${separator}${dirName}`;
        loadDir(newPath);
      });
      listEl.appendChild(btn);
    });
  } catch (e) {
    listEl.innerHTML = `<div style="padding: 10px; color: var(--color-danger);">${e.message}</div>`;
  }
}

function syncMeetBridgeLiveUi() {
  if (els.chkMeetBridgeLive) {
    els.chkMeetBridgeLive.checked = meetBridgeLiveMode;
  }
  const recPrefs = getRecordingAudioPrefs();
  if (els.recMeetBridgeHint) {
    els.recMeetBridgeHint.hidden = !(
      recPrefs.excludeOwnSystem || recPrefs.selectedPeerOnly || meetBridgeLiveMode
    );
  }
}

function applyMeetBridgeLiveModeFromRoom(ativo) {
  meetBridgeLiveMode = !!ativo;
  syncMeetBridgeLiveUi();
  hostAudioMonitor?.setExcludeSourceTypes?.(meetBridgeLiveMode ? ['system'] : []);
  lastAppliedAudioSig = '';
  syncHostAudioMonitor(null, { force: true }).catch((e) => errors.handle(e, 'audio-sync'));
}

function sendMeetBridgeLiveMode(ativo) {
  meetBridgeLiveMode = !!ativo;
  syncMeetBridgeLiveUi();
  hostAudioMonitor?.setExcludeSourceTypes?.(meetBridgeLiveMode ? ['system'] : []);
  lastAppliedAudioSig = '';
  if (signaling && hostReady) {
    signaling.send('definirModoPonteMeet', { ativo: meetBridgeLiveMode });
    syncHostAudioMonitor(null, { force: true }).catch((e) => errors.handle(e, 'audio-sync'));
  }
}

function syncSharedRoomUi() {
  if (els.chkSharedRoomMode) {
    els.chkSharedRoomMode.checked = sharedRoomMode;
  }
  if (els.sharedRoomHint) {
    els.sharedRoomHint.hidden = !sharedRoomMode;
  }
}

function applySharedRoomModeFromRoom(ativo) {
  sharedRoomMode = !!ativo;
  syncSharedRoomUi();
  media?.setSharedRoomMode?.(sharedRoomMode);
}

function applyDominantSpeakerFromRoom(peerId) {
  dominantSpeakerPeerId = peerId ? String(peerId) : null;
  updateDominantSpeakerIndicators();
}

function sendSharedRoomMode(ativo) {
  sharedRoomMode = !!ativo;
  syncSharedRoomUi();
  media?.setSharedRoomMode?.(sharedRoomMode);
  if (signaling && hostReady) {
    signaling.send('definirModoSalaCompartilhada', { ativo: sharedRoomMode });
  }
}

async function applySharedRoomPresetToClients() {
  sendSharedRoomMode(true);
  const preset = normalizeMicrophoneFilterPrefs(SHARED_ROOM_MIC_PRESET);
  for (const client of estado.clients || []) {
    if (!client?.id || String(client.id) === String(hostPeerId)) continue;
    hostAudioMonitor?.setFilterPrefs?.(client.id, preset);
    sendAudioFiltersToClient(client, preset, { force: true });
  }
  await applyHostMicFilterPrefs(preset, { persist: true });
  showToast('Preset Sala compartilhada aplicado', 'success');
}

function getRecordingAudioPrefs() {
  return {
    excludeOwnSystem: localStorage.getItem(STORAGE_REC_EXCLUDE_OWN_SYSTEM) === '1',
    selectedPeerOnly: localStorage.getItem(STORAGE_REC_SELECTED_PEER_ONLY) === '1'
  };
}

function syncRecordingAudioPrefsUi() {
  const prefs = getRecordingAudioPrefs();
  if (els.recExcludeOwnSystem) {
    els.recExcludeOwnSystem.checked = prefs.excludeOwnSystem;
  }
  if (els.recSelectedPeerOnly) {
    els.recSelectedPeerOnly.checked = prefs.selectedPeerOnly;
  }
  syncMeetBridgeLiveUi();
  syncSharedRoomUi();
}

function setRecordingAudioPref(key, value) {
  localStorage.setItem(key, value ? '1' : '0');
  syncRecordingAudioPrefsUi();
}

function setupRecordingAudioPrefs() {
  syncRecordingAudioPrefsUi();
  syncRecordingDefaultAudioClientUi();

  els.recExcludeOwnSystem?.addEventListener('change', () => {
    setRecordingAudioPref(STORAGE_REC_EXCLUDE_OWN_SYSTEM, els.recExcludeOwnSystem.checked);
  });
  els.recSelectedPeerOnly?.addEventListener('change', () => {
    setRecordingAudioPref(STORAGE_REC_SELECTED_PEER_ONLY, els.recSelectedPeerOnly.checked);
  });
  els.chkMeetBridgeLive?.addEventListener('change', () => {
    sendMeetBridgeLiveMode(!!els.chkMeetBridgeLive.checked);
  });
  els.chkSharedRoomMode?.addEventListener('change', () => {
    sendSharedRoomMode(!!els.chkSharedRoomMode.checked);
  });
  els.btnSharedRoomPreset?.addEventListener('click', () => {
    applySharedRoomPresetToClients().catch((e) => errors.handle(e, 'shared-room-preset'));
  });
  els.btnRecMeetBridgePreset?.addEventListener('click', () => {
    setRecordingAudioPref(STORAGE_REC_EXCLUDE_OWN_SYSTEM, true);
    setRecordingAudioPref(STORAGE_REC_SELECTED_PEER_ONLY, true);
    if (els.recExcludeOwnSystem) els.recExcludeOwnSystem.checked = true;
    if (els.recSelectedPeerOnly) els.recSelectedPeerOnly.checked = true;
    sendMeetBridgeLiveMode(true);
  });
  els.btnRecClearDefaultAudio?.addEventListener('click', () => {
    setDefaultRecordingAudioClientName('');
    showToast('Áudio padrão da gravação removido', 'info');
    renderLista();
  });
}

let recordingFilenamePatternReady = false;

function updateRecordingFilenamePatternStatus(pattern = '') {
  if (!els.recordingFilenamePatternStatus) return;
  const trimmed = String(pattern).trim();
  if (!trimmed) {
    els.recordingFilenamePatternStatus.textContent = `Padrao salvo: ${formatRecordingFilename(new Date())}`;
  } else {
    els.recordingFilenamePatternStatus.textContent = `Padrao salvo. Exemplo: ${formatRecordingFilename(new Date(), trimmed)}`;
  }
  els.recordingFilenamePatternStatus.hidden = false;
}

function saveRecordingFilenamePattern() {
  const pattern = els.recordingFilenamePatternInput?.value.trim() || '';
  if (pattern) {
    localStorage.setItem(STORAGE_RECORDING_FILENAME_PATTERN, pattern);
  } else {
    localStorage.removeItem(STORAGE_RECORDING_FILENAME_PATTERN);
  }
  updateRecordingFilenamePatternStatus(pattern);
  showToast(pattern ? 'Padrao de nome salvo' : 'Padrao de nome restaurado ao padrao do sistema', 'success');
}

function setupRecordingFilenamePattern() {
  if (!els.recordingFilenamePatternInput || recordingFilenamePatternReady) return;
  recordingFilenamePatternReady = true;

  const saved = localStorage.getItem(STORAGE_RECORDING_FILENAME_PATTERN) || '';
  els.recordingFilenamePatternInput.value = saved;
  if (saved) updateRecordingFilenamePatternStatus(saved);

  els.btnSaveFilenamePattern?.addEventListener('click', (e) => {
    e.stopPropagation();
    saveRecordingFilenamePattern();
  });
  els.recordingFilenamePatternInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRecordingFilenamePattern();
    }
  });
}

function setupRecordingsDirInput() {
  if (!els.recordingsDirInput) return;
  els.recordingsDirInput.value = localStorage.getItem(STORAGE_RECORDINGS_DIR) || '';
  els.recordingsDirInput.addEventListener('input', () => {
    localStorage.setItem(STORAGE_RECORDINGS_DIR, els.recordingsDirInput.value.trim());
  });

  const btnBrowse = document.getElementById('btn-browse-dir');
  const pickerModal = document.getElementById('dir-picker-modal');

  btnBrowse?.addEventListener('click', () => {
    if (pickerModal) pickerModal.hidden = false;
    loadDir(els.recordingsDirInput.value.trim());
  });

  document.getElementById('btn-dir-picker-cancel')?.addEventListener('click', () => {
    if (pickerModal) pickerModal.hidden = true;
  });

  document.getElementById('btn-dir-picker-select')?.addEventListener('click', () => {
    if (els.recordingsDirInput && currentPickerPath) {
      els.recordingsDirInput.value = currentPickerPath;
      localStorage.setItem(STORAGE_RECORDINGS_DIR, currentPickerPath);
    }
    if (pickerModal) pickerModal.hidden = true;
  });
}

function setupSettingsInteraction() {
  const subdetails = document.querySelectorAll('.settings-subdetails');
  subdetails.forEach((details) => {
    details.addEventListener('toggle', () => {
      if (details.open) {
        subdetails.forEach((other) => {
          if (other !== details && other.open) {
            other.removeAttribute('open');
          }
        });
      }
    });
  });

  const settingsSection = document.getElementById('settings-details');
  document.addEventListener('click', (e) => {
    if (settingsSection && settingsSection.open && !settingsSection.contains(e.target)) {
      settingsSection.removeAttribute('open');
    }
  });
}

function updateHostSettingsAccountUi() {
  bindLogoutControl({
    wrapEl: document.getElementById('host-settings-account-wrap'),
    labelEl: document.getElementById('host-auth-user-label'),
    buttonEl: document.getElementById('btn-host-logout'),
    user: authUser
  });
}
const isHost = window.location.pathname.includes('/host') || !!document.getElementById('host-entry-modal');
if (isHost) {
  setHostShellVisible(false);
  updateRecordingUi(RecordingState.IDLE);
  updateMuteButtonIcon();
  setupRecordingsDirInput();
  setupRecordingFilenamePattern();
  setupRecordingAudioPrefs();
  setupSettingsInteraction();

  installAudioUnlock(() => unlockHostRemoteAudio());
  els.btnActivateAudio?.addEventListener('click', () => unlockHostRemoteAudio());
}

let activeContextClient = null;
let activeAudioFiltersClient = null;
let audioFiltersPanel = null;
bindLtOverlayResize(els.previewArea);

annotationToolbar = createAnnotationToolbar({
  rootEl: els.annotationToolbar,
  toggleEl: els.annotationToolbarToggle,
  panelEl: els.annotationToolbarPanel,
  colorEl: els.annotationColor,
  widthEl: els.annotationWidth,
  clearEl: els.annotationClear,
  getCanClear: () => canClearWhiteboard(),
  coupleToolWithExpansion: true,
  defaultTool: 'stroke',
  onToolChange: (tool) => {
    drawingSurface?.syncDrawUi();
  },
  onClear: () => {
    if (!canClearWhiteboard()) return;
    signaling?.send('quadroBrancoLimpar');
    whiteboardEngine?.clear();
    drawingSurface?.clearPersistentOverlay();
  }
});

drawingSurface = createDrawingSurface({
  previewArea: els.previewArea,
  videoEl: els.preview,
  canvasEl: els.drawCanvas,
  getPeerId: () => hostPeerId,
  getPeerName: () => hostDisplayName || 'Host',
  getTool: () => annotationToolbar?.getTool(),
  getColor: () => annotationToolbar?.getColor(),
  getWidth: () => annotationToolbar?.getWidth(),
  getMode: () => getDrawingMode(),
  onSegment: (payload) => {
    if (signaling?.connected) signaling.send('anotacaoSegmento', payload);
  },
  onElementCommit: (element) => {
    if (signaling?.connected) signaling.send('quadroBrancoElemento', element);
    handleWhiteboardElement(element);
  }
});

els.btnQuadroBranco?.addEventListener('click', () => {
  if (whiteboardActiveLocal || isWhiteboardTransmission(lastActiveTransmission)) {
    queueWhiteboardOp(() => stopWhiteboardTransmission({ notifyServer: true }));
    return;
  }
  queueWhiteboardOp(() => iniciarQuadroBranco());
});

function applyLtOverlayForTransmission(tx) {
  if (tx?.sourceKind === 'whiteboard') {
    hideLtOverlay();
    return;
  }
  hideLtOverlay();
}

function openContextMenu(e, client) {
  activeContextClient = client;

  const menu = $('custom-context-menu');
  if (!menu) return;

  const isHostCard = !!client.ehHost;
  const isCoHost = !!client.isCoHost;
  const isTrocaTelas = (estado.controleExibicao || []).includes(client.id);

  const cohostBtn = $('ctx-cohost');
  const trocaTelasBtn = $('ctx-troca-telas');

  if (cohostBtn) {
    cohostBtn.hidden = isHostCard;
    if (!isHostCard) {
      cohostBtn.classList.toggle('is-active', isCoHost);
      const textEl = cohostBtn.querySelector('.ctx-text');
      if (textEl) textEl.textContent = isCoHost ? 'Remover co-host' : 'Tornar co-host';
    }
  }
  if (trocaTelasBtn) {
    trocaTelasBtn.hidden = isHostCard;
    if (!isHostCard) trocaTelasBtn.classList.toggle('is-active', isTrocaTelas);
  }
  const audioBtn = $('ctx-audio');
  if (audioBtn) audioBtn.hidden = false;
  const recAudioBtn = $('ctx-rec-audio');
  if (recAudioBtn) {
    recAudioBtn.hidden = isHostCard || !peerHasPublishedAudio(client);
    const isDefault = !!(
      client.displayName &&
      getDefaultRecordingAudioClientName().toLowerCase() ===
        String(client.displayName).toLowerCase()
    );
    recAudioBtn.classList.toggle('is-active', isDefault);
    const textEl = recAudioBtn.querySelector('.ctx-text');
    if (textEl) {
      textEl.textContent = isDefault
        ? 'Remover áudio padrão da gravação'
        : 'Definir como áudio padrão da gravação';
    }
  }

  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;
  menu.hidden = false;
}

function closeContextMenu() {
  const menu = $('custom-context-menu');
  if (menu) menu.hidden = true;
  activeContextClient = null;
}

function applyLocalCoHostFlag(peerId, ativo) {
  const id = String(peerId);
  const flag = !!ativo;
  estado = {
    ...estado,
    clients: (estado.clients || []).map((c) =>
      String(c.id) === id
        ? { ...c, isCoHost: flag, permissions: { ...(c.permissions || {}), isCoHost: flag } }
        : c
    )
  };
  if (estado.selecionado && String(estado.selecionado.id) === id) {
    estado.selecionado = {
      ...estado.selecionado,
      isCoHost: flag,
      permissions: { ...(estado.selecionado.permissions || {}), isCoHost: flag }
    };
  }
  renderLista();
}

$('ctx-cohost')?.addEventListener('click', () => {
  if (!activeContextClient) return;
  const targetState = !activeContextClient.isCoHost;
  signaling.send('definirCoHost', { peerId: activeContextClient.id, ativo: targetState });
  applyLocalCoHostFlag(activeContextClient.id, targetState);
  closeContextMenu();
});

$('ctx-troca-telas')?.addEventListener('click', () => {
  if (!activeContextClient) return;
  const isTrocaTelas = (estado.controleExibicao || []).includes(activeContextClient.id);
  toggleDisplayControl(activeContextClient.id, !isTrocaTelas);
  closeContextMenu();
});

let originalAudioFilterPrefs = null;
let saveTimeout = null;
const sentAudioFilterKeys = new Map();

function saveAudioFiltersPresetDebounced(name, prefs, kind = 'client', userId = null) {
  if (saveTimeout) clearTimeout(saveTimeout);
  const normalized = normalizeMicrophoneFilterPrefs(prefs);
  saveTimeout = setTimeout(() => {
    if (kind !== 'host') savePresetToLocalStorage(name, normalized);
    saveAudioFilterPresetApi(kind, name, normalized, userId).catch(() => {});
  }, 1000);
}

function sendAudioFiltersToClient(client, prefs, { force = false } = {}) {
  if (!client?.id || !signaling || !hostReady) return;
  if (String(client.id) === String(hostPeerId)) return;
  const normalized = normalizeMicrophoneFilterPrefs(prefs);
  const key = JSON.stringify(normalized);
  const id = String(client.id);
  if (!force && sentAudioFilterKeys.get(id) === key) return;
  sentAudioFilterKeys.set(id, key);
  signaling.send('definirFiltroAudioClient', { peerId: client.id, prefs: normalized });
}

function syncPublishedAudioFiltersToClients(audioSources = []) {
  return syncPublishedAudioFiltersToClientsAsync(audioSources);
}

async function syncPublishedAudioFiltersToClientsAsync(audioSources = []) {
  const monitor = hostAudioMonitor;
  if (!monitor) return;
  const sent = new Set();
  for (const source of audioSources || []) {
    if (!source?.peerId || source.source !== 'microphone') continue;
    const id = String(source.peerId);
    if (sent.has(id)) continue;
    sent.add(id);

    const client = estado.clients.find((c) => String(c.id) === id);
    const displayName =
      client?.displayName || source.name || monitor.peerNames?.get?.(id) || '';

    let stored = normalizeMicrophoneFilterPrefs(monitor.getFilterPrefs(id));
    if (displayName) {
      const apiPrefs = await fetchClientAudioFilterPreset(displayName);
      if (apiPrefs) {
        stored = apiPrefs;
        monitor.setFilterPrefs(id, stored);
      } else if (hasActiveMicrophoneFilter(stored)) {
        saveAudioFilterPresetApi('client', displayName, stored, client?.userId || null).catch(() => {});
      }
    }

    const prefs = hasActiveMicrophoneFilter(stored)
      ? stored
      : normalizeMicrophoneFilterPrefs(CLIENT_MIC_PUBLISH_DEFAULTS);
    if (!hasActiveMicrophoneFilter(stored)) {
      monitor.setFilterPrefs(id, prefs);
    }
    sendAudioFiltersToClient({ id }, prefs);
  }
}
function getAppliedClientAudioFilterPrefs(peerId) {
  const id = String(peerId);
  const sentKey = sentAudioFilterKeys.get(id);
  if (sentKey) {
    try {
      return normalizeMicrophoneFilterPrefs(JSON.parse(sentKey));
    } catch {
      // fallback abaixo
    }
  }
  const monitor = hostAudioMonitor;
  if (monitor) {
    return normalizeMicrophoneFilterPrefs(monitor.getFilterPrefs(id));
  }
  return normalizeMicrophoneFilterPrefs(CLIENT_MIC_PUBLISH_DEFAULTS);
}

function populateAudioFiltersUi(prefs) {
  audioFiltersPanel?.populate(prefs);
}

function readAudioFilterPrefsFromUi() {
  return audioFiltersPanel?.readPrefs?.() || normalizeMicrophoneFilterPrefs(MIC_FILTER_DEFAULTS);
}

function previewAudioFiltersFromUi(prefsOverride = null) {
  const client = activeAudioFiltersClient;
  if (!client) return;

  const prefs = prefsOverride || readAudioFilterPrefsFromUi();
  if (isHostPeer(client)) {
    scheduleHostMicFilterPreview(prefs);
    return;
  }

  const monitor = hostAudioMonitor;
  if (!monitor) return;
  monitor.setFilterPrefs(client.id, prefs);
  sendAudioFiltersToClient(client, prefs, { force: true });
}

function syncSelfMonitorUi() {
  const monitor = ensureSelfAudioMonitor();
  const volumeEl = document.getElementById('audio-self-monitor-volume');
  const volume = volumeEl ? Number(volumeEl.value || 70) / 100 : 0.7;
  audioFiltersPanel?.syncSelfMonitor({
    enabled: monitor.isEnabled(),
    volume
  });
  monitor.setVolume(volume);
}

function attachAudioFilterMeters(client) {
  if (!audioFiltersPanel || !client) return;
  if (isHostPeer(client)) {
    audioFiltersPanel.attachMeters({
      local: true,
      getMeter: () => media?._micFilterGraph?.lastMeter || null
    });
    return;
  }
  audioFiltersPanel.attachMeters({
    local: false,
    getMeter: () => null
  });
}

async function openAudioFiltersModal(client) {
  if (!client) return;
  activeAudioFiltersClient = client;
  const targetingHost = isHostPeer(client);
  const monitor = hostAudioMonitor;
  if (!targetingHost && !monitor) {
    showToast('Monitor de audio nao inicializado', 'warn');
    return;
  }

  let prefs;
  if (targetingHost) {
    prefs = normalizeMicrophoneFilterPrefs(hostMicFilterPrefs);
  } else {
    const stored = await fetchClientAudioFilterPreset(client.displayName);
    if (activeAudioFiltersClient !== client) return;
    prefs = stored || getAppliedClientAudioFilterPrefs(client.id);
    if (stored) {
      monitor.setFilterPrefs(client.id, stored);
    }
  }
  originalAudioFilterPrefs = { ...prefs };

  ensureAudioFiltersPanel();
  audioFiltersPanel.open({
    clientName: client.displayName || '-',
    note: targetingHost
      ? 'Estes filtros sao aplicados no microfone publicado. Todos os participantes ouvem o resultado.'
      : 'Estes filtros sao aplicados na origem do participante. Todos os participantes ouvem o resultado.',
    prefs,
    selfMonitor: targetingHost,
    onChange: (next) => previewAudioFiltersFromUi(next)
  });
  if (targetingHost) syncSelfMonitorUi();
  attachAudioFilterMeters(client);
}

async function saveAudioFiltersModal() {
  const client = activeAudioFiltersClient;
  if (!client) return;

  const prefs = normalizeMicrophoneFilterPrefs(readAudioFilterPrefsFromUi());
  if (isHostPeer(client)) {
    await flushHostMicFilterPreview();
    await applyHostMicFilterPrefs(prefs, { persist: true });
    showToast('Filtros de audio do host atualizados', 'success');
    closeAudioFiltersModal(false);
    return;
  }

  previewAudioFiltersFromUi(prefs);
  savePresetToLocalStorage(client.displayName, prefs);
  saveAudioFilterPresetApi('client', client.displayName, prefs, client.userId || null).catch(() => {});
  showToast(`Filtros de audio atualizados para ${client.displayName}`, 'success');
  closeAudioFiltersModal(false);
}

async function closeAudioFiltersModal(revert = false) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (hostMicFilterPreviewTimer) {
    clearTimeout(hostMicFilterPreviewTimer);
    hostMicFilterPreviewTimer = null;
  }

  audioFiltersPanel?.stopMeters?.();
  audioFiltersPanel?.close?.();

  const client = activeAudioFiltersClient;
  const monitor = hostAudioMonitor;
  if (revert && client && originalAudioFilterPrefs) {
    if (isHostPeer(client)) {
      await applyHostMicFilterPrefs(originalAudioFilterPrefs, { persist: false });
    } else if (monitor) {
      monitor.setFilterPrefs(client.id, originalAudioFilterPrefs);
      sendAudioFiltersToClient(client, originalAudioFilterPrefs, { force: true });
    }
  }

  activeAudioFiltersClient = null;
  originalAudioFilterPrefs = null;
}

function ensureAudioFiltersPanel() {
  if (audioFiltersPanel) return audioFiltersPanel;
  audioFiltersPanel = createAudioFiltersPanel({
    capabilities: { selfMonitor: true },
    hooks: {
      onSave: (prefs) => {
        populateAudioFiltersUi(prefs);
        saveAudioFiltersModal().catch((e) => errors.handle(e, 'audio-filters'));
      },
      onCancel: () => closeAudioFiltersModal(true),
      onReset: () => {
        const client = activeAudioFiltersClient;
        if (!client) return;
        const defaults = isHostPeer(client) ? HOST_MIC_PUBLISH_DEFAULTS : MIC_FILTER_DEFAULTS;
        populateAudioFiltersUi(normalizeMicrophoneFilterPrefs(defaults));
        previewAudioFiltersFromUi();
      },
      onSelfMonitorToggle: async (enabled) => {
        const monitor = ensureSelfAudioMonitor();
        if (!enabled) {
          monitor.disable();
          return;
        }
        if (!media?.hasPublishedMicrophone?.()) {
          audioFiltersPanel?.syncSelfMonitor({ enabled: false });
          showToast('Publique o microfone para monitorar o audio', 'warn');
          return;
        }
        if (media.hasPublishedSystemAudio?.()) {
          showToast('Audio do sistema esta compartilhado — use fones para evitar eco', 'warn');
        }
        const ok = await monitor.enable();
        if (!ok) audioFiltersPanel?.syncSelfMonitor({ enabled: false });
      },
      onSelfMonitorVolume: (volume) => {
        ensureSelfAudioMonitor().setVolume(volume);
      }
    }
  });
  return audioFiltersPanel;
}

$('ctx-audio')?.addEventListener('click', () => {
  const client = activeContextClient;
  closeContextMenu();
  if (client) openAudioFiltersModal(client).catch((e) => errors.handle(e, 'audio-filters'));
});

$('ctx-rec-audio')?.addEventListener('click', () => {
  const client = activeContextClient;
  closeContextMenu();
  if (client) toggleDefaultRecordingAudioClient(client);
});

document.addEventListener('click', (e) => {
  const menu = $('custom-context-menu');
  if (menu && !menu.hidden) {
    const isMenuClick = menu.contains(e.target) || e.target.closest('.ctx-item');
    if (!isMenuClick) {
      closeContextMenu();
    }
  }
});

export function teardownCoHost() {
  if (!isCoHostInstance) return;
  isCoHostInstance = false;
  hostReady = false;
  stopHostMicPublishWatchdog();
  if (signaling) signaling.removeListener(coHostHandleMessage);
  dockControlsPopout();
  if (els.sidebar) els.sidebar.hidden = true;
  els.appMain?.classList.remove('sidebar-open');
  els.appMain?.classList.remove('sidebar-collapsed');
  els.sidebar?.classList.remove('is-collapsed');
  if (els.btnSidebarCollapse) {
    els.btnSidebarCollapse.setAttribute('aria-expanded', 'false');
  }
}

export function initCoHost(clientSignaling, clientMedia, clientPeerId) {
  signaling = clientSignaling;
  media = clientMedia;
  hostPeerId = clientPeerId;
  isCoHostInstance = true;
  hostReady = true;

  if (els.sidebar) els.sidebar.hidden = false;
  els.appMain?.classList.add('sidebar-open');

  updateRecordingUi(RecordingState.IDLE);
  updateMuteButtonIcon();
  setupRecordingsDirInput();
  setupRecordingFilenamePattern();
  setupRecordingAudioPrefs();
  setupSettingsInteraction();

  installAudioUnlock(() => unlockHostRemoteAudio());
  els.btnActivateAudio?.addEventListener('click', () => unlockHostRemoteAudio());

  signaling.addListener(coHostHandleMessage);
  requestRoomStateSync().catch((e) => errors.handle(e, 'cohost-state'));
  startHostMicPublishWatchdog();
}

const isHostPage = window.location.pathname.includes('/host');
if (isHostPage) {
  verifyServerBuild({
    onToast: (m, t) => showToast(m, t),
    onTitlePrefix: (prefix) => {
      document.title = prefix + (document.title.replace(/^\[[^\]]+\]\s*/, '') || 'ShareScreen Host');
    }
  });
  bootstrap();
}
