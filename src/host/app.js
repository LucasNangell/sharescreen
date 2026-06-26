import { SignalingClient, ConnectionState, wsUrl } from '../shared/signaling-client.js';
import { MediaClient } from '../shared/media-client.js';
import { normalizeTransmission, hasActiveVideo, parseRoomSnapshot, roomSnapshotMediaKey, activeVideoTransmissionKey, remoteVideoConsumeNeeded, enrichRoomSourcesState } from '../shared/transmission.js';
import { loadCapturePrefs, saveCapturePrefs, setupMicrophonePicker, installAudioUnlock } from '../shared/audio-manager.js';
import { RecordingClient, RecordingState } from '../shared/recording-client.js';
import { RecordingCompositor } from '../shared/recording-compositor.js';
import { RecordingAudioMixer } from '../shared/recording-audio-mixer.js';
import { ErrorManager, assertSecureContext } from '../shared/error-manager.js';
import { UiStateMachine } from '../shared/ui-state.js';
import { mergeServerQuality, loadPresetId, savePresetId, getPreset, bitrateMbps } from '../shared/quality-manager.js';
import { showToast as originalShowToast } from '../shared/toast.js';
import { collectWebRtcStats } from '../shared/stats-collector.js';
import { formatRecordingFilename } from '../shared/recording-filename.js';
import { HostAudioMonitor, savePresetToLocalStorage } from '../shared/host-audio-monitor.js';
import { normalizeRemoteAudioSources } from '../shared/audio-sources.js';
import { startTrackLevelMeter } from '../shared/audio-level-meter.js';
import {
  formatSourceDisplayName,
  buildDisplaySourceCard
} from '../shared/source-cards.js';
import { sortDisplaySources } from '../shared/display-sources.js';
import { updateStreamSourceBadge } from '../shared/stream-source-badge.js';
import { hideLtOverlay, bindLtOverlayResize } from '../shared/lt-overlay.js';

const STORAGE_HOST_NAME = 'sharescreen_host_name';
const STORAGE_RECORDINGS_DIR = 'sharescreen_recordings_dir';

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
  transmissionCardContainer: $('transmission-card-container'),
  transmissionVuColumn: $('transmission-vu-column'),
  transmissionVuFill: $('transmission-vu-fill'),
  recordingStatus: $('recording-status'),
  recordingTimer: $('recording-timer'),
  uploadProgressWrap: $('upload-progress-wrap'),
  uploadProgress: $('upload-progress'),
  recordingFilename: $('recording-filename'),
  controlesAudio: $('controles-audio'),
  volumeSlider: $('volume-slider'),
  btnMute: $('btn-mute-audio'),
  hostChkSystem: $('host-chk-system-audio'),
  hostChkMic: $('host-chk-microphone'),
  hostMicWrap: $('host-mic-picker-wrap'),
  hostMicSelect: $('host-mic-select'),
  hostBtnRefreshMics: $('host-btn-refresh-mics'),
  btnHostMic: $('btn-host-mic'),
  statusBar: $('status-bar'),
  qualityPreset: $('quality-preset'),
  qualityHint: $('quality-hint'),
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
let lastAudioSources = [];
let pendingRoomSnapshot = null;
let lastAppliedSnapshotKey = '';
let lastAppliedActiveVideoKey = '';
let lastActiveTransmission = null;
let pendingHostAudioSync = null;
let localHostVuStop = null;
let isCoHostInstance = readQueryParam('cohost') === 'true';
if (readQueryParam('nome')) localStorage.setItem(STORAGE_HOST_NAME, readQueryParam('nome'));

function promptHostEntry(roomPinRequired) {
  return new Promise((resolve) => {
    if (els.hostNameInput && hostDisplayName) {
      els.hostNameInput.value = hostDisplayName;
    }
    if (els.hostPinWrap) {
      els.hostPinWrap.hidden = !roomPinRequired;
    }
    if (els.hostEntryModal) {
      els.hostEntryModal.hidden = false;
    }

    const submit = () => {
      const name = els.hostNameInput?.value.trim() || '';
      if (!name) {
        showToast('Informe seu nome para aparecer no painel', 'warn');
        els.hostNameInput?.focus();
        return;
      }
      if (roomPinRequired) {
        roomPin = els.pinInput?.value.trim() || '';
        if (!roomPin) {
          showToast('Informe o PIN da sala', 'warn');
          els.pinInput?.focus();
          return;
        }
      }
      hostDisplayName = name;
      localStorage.setItem(STORAGE_HOST_NAME, name);
      if (els.hostEntryModal) els.hostEntryModal.hidden = true;
      resolve();
    };

    els.btnHostEntrySubmit.onclick = submit;
    els.hostNameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
    els.pinInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
    els.hostNameInput?.focus();
  });
}

let roomPin = '';
let hostToken = '';
let hostDisplayName = readQueryParam('nome') || localStorage.getItem(STORAGE_HOST_NAME) || '';
let statsTimer = null;
const HOST_TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const HOST_LOCK_KEY = 'sharescreen-host-lock';
const HOST_LOCK_TTL_MS = 8000;
let hostTabBlocked = false;
let hostLockTimer = null;
let hostSessionJoined = false;

function debugHostLog(_hypothesisId, _message, _data = {}) {}

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
const errors = new ErrorManager({
  onToast: (msg, type) => showToast(msg, type),
  onTechnicalLog: (msg, level) => log(msg, level)
});
const recorder = new RecordingClient({
  onLog: log,
  onStateChange: updateRecordingUi,
  onProgress: (pct) => {
    if (els.uploadProgress) els.uploadProgress.style.width = `${pct}%`;
  },
  onTimer: (sec) => {
    if (els.recordingTimer) {
      els.recordingTimer.textContent = formatTimer(sec);
      els.recordingTimer.hidden = false;
    }
  }
});
let recordingCapture = null;

const hostCapturePrefs = loadCapturePrefs();
if (els.hostChkSystem) els.hostChkSystem.checked = hostCapturePrefs.systemAudio !== false;
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

function applyHostQuality(presetId) {
  savePresetId(presetId);
  updateQualityHint();
  const quality = mergeServerQuality(media?.videoQuality || {}, presetId);
  media?.setVideoQuality(quality);
  if (els.previewQuality && ui._flags.hasPreview) {
    els.previewQuality.textContent = getPreset(presetId).label;
  }
  if (canHostCommand()) {
    signaling.send('definirQualidade', { presetId });
  }
  showToast(`Qualidade: ${getPreset(presetId).label}`, 'info');
}

setupMicrophonePicker({
  checkbox: els.hostChkMic,
  wrap: els.hostMicWrap,
  select: els.hostMicSelect,
  refreshBtn: els.hostBtnRefreshMics,
  savedDeviceId: hostCapturePrefs.microphoneDeviceId || '',
  onLog: log,
  onError: (m) => errors.handle(new Error(m), 'microfone'),
  onSelectChange: () => onHostAudioPrefsChange()
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
      await media.publishMicrophone(prefs);
    } else {
      await media.stopMicrophone();
    }
    if (media.hasVideoProducer?.() || media.localScreenStream) {
      if (prefs.systemAudio !== false) {
        await media.publishSystemAudioFromDisplay();
      } else {
        await media.stopSystemAudio();
      }
    } else if (!prefs.systemAudio) {
      await media.stopSystemAudio();
    }
    syncLocalHostVu();
    if (prefs.microphone && !media.hasPublishedMicrophone()) {
      showToast('Microfone nao publicado - verifique permissao do navegador', 'warn');
    } else if (!prefs.microphone && !prefs.systemAudio) {
      showToast('Audio desativado', 'info');
    } else if (!prefs.microphone) {
      showToast('Microfone desativado - so audio do sistema', 'info');
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

function log(msg, level = 'info') {
  if (!els.logs) return;
  const time = new Date().toLocaleTimeString('pt-BR');
  const line = document.createElement('div');
  line.className = `log-line log-${level}`;
  line.textContent = `[${time}] ${msg}`;
  els.logs.prepend(line);
  while (els.logs.children.length > 150) els.logs.lastChild?.remove();
  if (level === 'error') console.error(msg);
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
    systemAudio: els.hostChkSystem?.checked !== false,
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
    els.btnRecordingToggle.disabled = isRec ? !ui.canStopRecord() : ui._flags.isUploading;
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
  updateStreamSourceBadge(els.streamSourceBadge, sel?.displayName, showBadge);
  if (sel && hasPreview && els.previewSourceName) {
    els.previewSourceName.textContent = sel.displayName || 'Fonte';
    if (els.previewQuality) {
      els.previewQuality.textContent = getPreset(loadPresetId()).label;
    }
  }
}

function formatClientName(c) {
  return formatSourceDisplayName(c);
}

function sortClientsForDisplay(clients) {
  return sortDisplaySources(clients);
}

function buildSourceCard(c, onSelect, isTransmissionSection = false) {
  const card = buildDisplaySourceCard(c, onSelect, {
    noSharingHighlight: !isTransmissionSection,
    decorateBody: (body, source) => {
      if (source.hasAudio) {
        const isMuted = mutedClients.has(source.id);
        const muteBtn = document.createElement('button');
        muteBtn.type = 'button';
        muteBtn.className = `source-mute-btn${isMuted ? ' is-muted' : ''}`;
        muteBtn.setAttribute('aria-label', isMuted ? 'Ativar audio do client' : 'Silenciar audio do client');
        muteBtn.title = isMuted ? 'Ativar audio' : 'Silenciar audio';
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
      if (!source.hasAudio) return;
      const vuColumn = document.createElement('div');
      vuColumn.className = 'source-vu-column';
      vuColumn.title = 'Nivel de audio';
      const vuFill = document.createElement('div');
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

function updateHostMicUi() {
  const btn = els.btnHostMic;
  if (!btn) return;
  const micPublished = media?.hasPublishedMicrophone?.();
  const show = micPublished || hostMicAutoplayNeeded;
  btn.hidden = !show;
  if (!show) return;
  const muted = media?.isPublishedAudioMuted?.() ?? false;
  btn.classList.toggle('is-muted', muted || hostMicAutoplayNeeded);
  btn.setAttribute('aria-pressed', String(muted));
  btn.title = hostMicAutoplayNeeded
    ? 'Ativar audio'
    : muted
      ? 'Ativar microfone'
      : 'Silenciar microfone';
  btn.setAttribute(
    'aria-label',
    hostMicAutoplayNeeded
      ? 'Ativar audio'
      : muted
        ? 'Ativar microfone'
        : 'Silenciar microfone'
  );
  syncLocalHostVu();
}

async function onHostMicClick() {
  if (!els.btnHostMic) return;
  try {
    if (hostMicAutoplayNeeded) {
      await hostAudioMonitor?.resume();
      hostAudioMonitor?.connectOutput(els.previewAudio);
      await els.previewAudio?.play();
      hostMicAutoplayNeeded = false;
      updateHostMicUi();
      return;
    }
    if (!media?.hasPublishedMicrophone?.()) return;
    media.togglePublishedAudioMuted();
    updateHostMicUi();
    showToast(media.isPublishedAudioMuted() ? 'Microfone silenciado' : 'Microfone ativado', 'info');
  } catch (e) {
    errors.handle(e, 'mic-toggle');
  }
}

function isSharingScreen() {
  return !!media?.isSharingVideo?.();
}

function toggleClientMute(peerId) {
  const muted = !mutedClients.has(peerId);
  signaling.send('definirClientMute', { peerId, muted });
}

async function toggleDisplayControl(peerId, ativo) {
  if (!canHostCommand()) {
    showToast('Aguarde o painel conectar ao servidor', 'warn');
    return;
  }
  try {
    const resultPromise = signaling.onceType('controleExibicaoResultado');
    signaling.send('definirControleExibicao', { peerId, ativo });
    const res = await resultPromise;
    if (!res.ok) throw new Error(res.erro || 'Falha ao delegar controle');
    showToast(
      ativo ? 'Controle de exibicao delegado ao client' : 'Controle de exibicao revogado',
      'success'
    );
  } catch (e) {
    errors.handle(e, 'controle-exibicao');
  }
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

function updateCardVuMeters(levels) {
  let selectedLevel = 0;
  let selectedActive = false;
  for (const [peerId, { level, active }] of levels) {
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
    }
  }
  if (estado.selecionado && String(estado.selecionado.id) !== String(hostPeerId)) {
    updateTransmissionSectionVu(selectedLevel, selectedActive);
  }
}

function onHostRemoteAudioAutoplayBlocked() {
  hostMicAutoplayNeeded = true;
  updateHostMicUi();
}

function ensureHostAudioMonitor() {
  if (!media) return null;
  if (!hostAudioMonitor) {
    hostAudioMonitor = new HostAudioMonitor(media, {
      excludePeerId: hostPeerId,
      onAutoplayBlocked: onHostRemoteAudioAutoplayBlocked
    });
    hostAudioMonitor.onLevels = updateCardVuMeters;
  } else if (hostPeerId) {
    hostAudioMonitor.excludePeerId = String(hostPeerId);
  }
  return hostAudioMonitor;
}

async function syncHostAudioMonitor(sources = null) {
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
      if (sources?.length) {
        lastAudioSources = sources;
      }
      const audioSources = buildHostAudioSources();
      await monitor.syncFromSources(audioSources);
      if (audioSources.length && monitor.channelCount === 0) {
        log(
          `Audio remoto: ${audioSources.length} fonte(s) detectada(s), 0 canal ativo - tentando novamente...`, 
          'warn'
        );
        await new Promise((r) => setTimeout(r, 800));
        await monitor.syncFromSources(buildHostAudioSources());
      }
      monitor.connectOutput(els.previewAudio);
      applyVolumeFromSlider();
      await monitor.resume();
      if (els.controlesAudio) {
        els.controlesAudio.hidden = !hasAnyClientAudio() && monitor.channelCount === 0;
      }
      if (monitor.isAutoplayBlocked?.() || (els.previewAudio?.paused && monitor.channelCount > 0)) {
        onHostRemoteAudioAutoplayBlocked();
      } else if (!monitor.channelCount) {
        hostMicAutoplayNeeded = false;
        updateHostMicUi();
      }
      syncLocalHostVu();
      if (monitor.channelCount > 0) {
        log(`Audio remoto: ${monitor.channelCount} canal(is) ativo(s)`, 'info');
      }
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

function queueTransmission(raw) {
  const gen = ++transmissionGeneration;
  transmissionWork = transmissionWork
    .then(() => runTransmission(raw, gen))
    .catch((e) => errors.handle(e, 'applyTransmission'));
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
  els.transmissionCardContainer.innerHTML = '';
  const sel = estado.selecionado;
  if (sel && sel.isProducing) {
    // Pass isTransmissionSection = true so the card gets the green highlight
    const card = buildSourceCard(sel, () => {}, true);
    els.transmissionCardContainer.appendChild(card);
  } else {
    const empty = document.createElement('div');
    empty.className = 'transmission-card-empty';
    empty.textContent = 'Nenhuma transmissao ativa';
    els.transmissionCardContainer.appendChild(empty);
  }
}

function renderLista() {
  if (!els.lista) return;
  els.lista.innerHTML = '';
  cardVuElements.clear();

  if (!estado.clients.length) {
    const li = document.createElement('li');
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

  for (const c of sortClientsForDisplay(estado.clients)) {
    // Render for Participants section (no sharing green highlight)
    els.lista.appendChild(buildSourceCard(c, (peerId) => selecionar(peerId), false));
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
    showToast('Aguarde o painel conectar ao servidor', 'warn');
    return;
  }
  try {
    setStatus('Selecionando fonte...');
    const resultPromise = signaling.onceType('selecaoResultado');
    signaling.send('selecionarClient', { peerId });
    const res = await resultPromise;
    if (!res.ok) throw new Error(res.erro || 'Falha na selecao');
    showToast('Fonte selecionada', 'success');
    setStatus('Carregando video da fonte...');
  } catch (e) {
    errors.handle(e, 'selecionar');
    setStatus('Conectado ao painel host');
  }
}

async function runTransmission(raw, gen = transmissionGeneration) {
  if (gen !== transmissionGeneration) return;

  const tx = normalizeTransmission(raw);
  lastActiveTransmission = tx;

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
      const localVideoTrack = media?.localScreenStream?.getVideoTracks?.()[0];
      if (els.preview && localVideoTrack?.readyState === 'live') {
        if (els.preview.srcObject !== media.localScreenStream) {
          els.preview.srcObject = media.localScreenStream;
        }
        els.preview.play?.().catch(() => {});
      }
      applyLtOverlayForTransmission(tx);
      ui.set({ hasPreview: true, isSharing: true });
      updatePreviewOverlays();
      setStatus('Exibindo sua tela');
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
      syncHostAudioMonitor(buildHostAudioSources()).catch((e) =>
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

async function applyRoomSnapshot(snapshot, { force = false } = {}) {
  if (!snapshot) return;

  const parsed = parseRoomSnapshot(snapshot);

  if (parsed.mutedPeerIds) {
    mutedClients.clear();
    for (const id of parsed.mutedPeerIds) {
      mutedClients.add(String(id));
    }
    applyClientAudioMute();
  }

  const mediaKey = roomSnapshotMediaKey(snapshot);
  const activeKey = activeVideoTransmissionKey(parsed.transmission);

  debugHostLog('H1', '[ROOM_STATE] snapshot recebido', {
    activeKey,
    producerVideo: parsed.transmission?.producerIds?.video?.slice(0, 8) || null,
    clients: (snapshot.clients || parsed.peers || []).length
  });

  if (!hostReady || joinInProgress) {
    pendingRoomSnapshot = snapshot;
    if (snapshot.clients?.length || parsed.peers?.length) {
      estado = enrichRoomSourcesState(
        {
          clients: snapshot.clients || parsed.peers || [],
          selecionado: snapshot.selecionado || null,
          controleExibicao: snapshot.controleExibicao || []
        },
        parsed.transmission
      );
      renderLista();
    }
    if (parsed.audioSources?.length) {
      lastAudioSources = parsed.audioSources;
      pendingHostAudioSync = parsed.audioSources;
    }
    return;
  }

  estado = enrichRoomSourcesState(
    {
      clients: snapshot.clients || parsed.peers || [],
      selecionado: snapshot.selecionado
        ? { ...snapshot.selecionado, selecionado: true }
        : null,
      controleExibicao: snapshot.controleExibicao || []
    },
    parsed.transmission
  );
  const me = estado.clients.find((c) => String(c.id) === String(hostPeerId));
  if (me) isCoHostInstance = !!me.isCoHost;

  if (parsed.audioSources?.length) {
    lastAudioSources = parsed.audioSources;
  }

  renderLista();

  const applyVideo = force || shouldHostApplyActiveVideo(parsed.transmission);
  if (!applyVideo && !force && mediaKey && mediaKey === lastAppliedSnapshotKey) return;
  lastAppliedSnapshotKey = mediaKey;
  lastAppliedActiveVideoKey = activeKey;
  applyTransmission(parsed.transmission);
  await syncHostAudioMonitor(parsed.audioSources).catch((e) =>
    errors.handle(e, 'audio-monitor')
  );
}

async function flushPendingRoomSnapshot() {
  if (!pendingRoomSnapshot || !hostReady) return;
  const snap = pendingRoomSnapshot;
  pendingRoomSnapshot = null;
  await applyRoomSnapshot(snap, { force: true });
}

async function iniciarCompartilhamentoHost() {
  try {
    assertSecureContext();
    saveCapturePrefs(getHostCapturePrefs());
    setStatus('Selecione a tela para compartilhar...');
    await media.ensureSendTransport();
    await media.startScreenShare(getHostCapturePrefs());
    const prefs = getHostCapturePrefs();
    if (prefs.microphone && !media.hasPublishedMicrophone()) {
      await media.publishMicrophone(prefs);
    }
    signaling.send('status', { status: 'transmitindo' });
    ui.set({ isSharing: true });
    updateHostMicUi();
    if (prefs.microphone && !media.hasPublishedMicrophone()) {
      showToast('Marque Microfone no painel e conceda permissao ao navegador', 'warn');
    }
    showToast('Tela compartilhada neste painel', 'success');
  } catch (e) {
    errors.handle(e, 'compartilhar');
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
    isUploading: state === RecordingState.UPLOADING
  });
  if (els.uploadProgressWrap) els.uploadProgressWrap.hidden = state !== RecordingState.UPLOADING;
  if (state === RecordingState.IDLE) {
    if (els.recordingTimer) els.recordingTimer.hidden = true;
  }
}

async function iniciarGravacao() {
  if (ui._flags.isRecording || ui._flags.isUploading) return;
  try {
    const stream = await getRecordingStream();
    if (!stream) {
      throw new Error('Nenhuma transmissao ativa');
    }
    const quality = mergeServerQuality(media.videoQuality, loadPresetId());
    recorder.setHostToken(hostToken);
    recorder.start(stream, quality);
    showToast('Gravacao iniciada', 'info');
  } catch (e) {
    stopRecordingCapture();
    errors.handle(e, 'gravacao');
  }
}

async function pararGravacao() {
  try {
    const blob = await recorder.stop();
    stopRecordingCapture();
    if (!blob) {
      showToast('Gravacao vazia', 'warn');
      return;
    }
    const filename = formatRecordingFilename(new Date());
    const customDir = localStorage.getItem(STORAGE_RECORDINGS_DIR) || '';
    const uploadResult = await recorder.upload(blob, filename, customDir);
    if (els.recordingFilename) {
      els.recordingFilename.textContent = uploadResult.filename || filename;
    }
    showToast('Gravacao salva com sucesso', 'success');
    setStatus(`Gravacao salva: ${uploadResult.filename || filename}`);
    setTimeout(() => recorder.resetIdle(), 4000);
  } catch (e) {
    stopRecordingCapture();
    errors.handle(e, 'upload');
    recorder.resetIdle();
  }
}

function applyVolumeFromSlider() {
  const vol = Number(els.volumeSlider?.value || 100) / 100;
  hostAudioMonitor?.setMasterVolume(audioMuted ? 0 : vol);
  if (els.previewAudio) {
    els.previewAudio.volume = audioMuted ? 0 : vol;
    els.previewAudio.muted = !!audioMuted;
  }
}

function stopRecordingCapture() {
  recordingCapture?.stop?.();
  recordingCapture = null;
}

async function getRecordingStream() {
  const selected = estado.selecionado;
  const selectedPeerId = selected?.id;
  const own =
    hostPeerId && selectedPeerId && String(selectedPeerId) === String(hostPeerId);

  if (!selectedPeerId || selected?.pausado) return null;

  stopRecordingCapture();

  const compositor = RecordingCompositor.start({
    videoEl: els.preview,
    fallbackStream: own ? media?.localScreenStream : null,
    badgeText: selected?.displayName || 'Fonte',
    visible: !!selected && !selected?.pausado
  });
  const videoTrack = compositor?.stream?.getVideoTracks?.()[0];
  if (videoTrack?.readyState !== 'live') {
    compositor?.stop?.();
    return null;
  }

  let mixer = null;
  try {
    mixer = await RecordingAudioMixer.build({
      hostAudioMonitor,
      media,
      own,
      mutedClients
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
  if (msg.type === 'estadoSala') {
    applyRoomSnapshot(msg.payload).catch((e) => errors.handle(e, 'estado-sala'));
    return;
  }
  if (msg.type === 'clientesSilenciados') {
    const mutedIds = msg.payload?.mutedPeerIds || [];
    mutedClients.clear();
    for (const id of mutedIds) {
      mutedClients.add(String(id));
    }
    applyClientAudioMute();
    renderLista();
    return;
  }
  if (msg.type === 'estado') {
    estado = enrichRoomSourcesState(
      {
        clients: msg.payload.clients || [],
        selecionado: msg.payload.selecionado
          ? { ...msg.payload.selecionado, selecionado: true }
          : null,
        controleExibicao: msg.payload.controleExibicao || []
      },
      lastActiveTransmission
    );
    const me = estado.clients.find((c) => String(c.id) === String(hostPeerId));
    if (me) {
      isCoHostInstance = !!me.isCoHost;
    }
    const videoProducers = (estado.clients || [])
      .filter((c) => c.hasVideo || c.isProducing || c.producerIds?.video)
      .map((c) => ({
        peerId: c.id?.slice(0, 8),
        producerId: c.producerIds?.video?.slice(0, 8) || c.producerId?.slice(0, 8) || null,
        name: c.displayName
      }));
    debugHostLog('H3', '[HOST_LIST] estado recebido', {
      totalClients: estado.clients.length,
      videoProducers
    });
    renderLista();
    syncHostAudioMonitor().catch((e) => errors.handle(e, 'audio-monitor'));
  }
  if (msg.type === 'demovidoCoHost') {
    if (isCoHostInstance) {
      isCoHostInstance = false;
      if (els.sidebar) els.sidebar.hidden = true;
      els.appMain?.classList.remove('sidebar-open');
      els.appMain?.classList.remove('sidebar-collapsed');
      els.sidebar?.classList.remove('is-collapsed');
      if (els.btnSidebarCollapse) {
        els.btnSidebarCollapse.setAttribute('aria-expanded', 'false');
      }
      return;
    }
    window.location.href = `/client/?nome=${encodeURIComponent(hostDisplayName)}`;
  }
  if (msg.type === 'fontesAudio') {
    const sources = msg.payload?.sources || [];
    lastAudioSources = sources;
    syncHostAudioMonitor(sources).catch((e) => errors.handle(e, 'audio-monitor'));
  }
  if (msg.type === 'consumerFechado') {
    const consumerId = msg.payload?.consumerId;
    if (consumerId) {
      hostAudioMonitor?.removeByConsumerId(consumerId).catch(() => {});
    }
    const wasVideoConsumer = media?.remoteConsumers?.video?.id === consumerId;
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
    }
    syncHostAudioMonitor(buildHostAudioSources()).catch((e) =>
      errors.handle(e, 'audio-monitor')
    );
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
    const text = String(msg.payload?.mensagem || '').toLowerCase();
    const benign =
      joinInProgress ||
      text.includes('nao autenticado') ||
      text.includes('nao autenticado');
    if (benign) {
      log(msg.payload?.mensagem || 'Erro transitorio', 'warn');
      return;
    }
    errors.handle(new Error(msg.payload?.mensagem), 'servidor');
  }
}

function coHostHandleMessage(msg) {
  if (msg.type === 'transmissaoAtiva') return;
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
  pendingRoomSnapshot = null;
  signaling?.markAuthenticated(false);
  updateHostMicUi();
  debugHostLog('F', 'joinHost start', { gen, autoShare });

  try {
    await hostAudioMonitor?.dispose();
    hostAudioMonitor = null;
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
    hostToken = entrou.hostToken || hostToken;
    signaling.markAuthenticated(true);
    debugHostLog('F', 'joinHost entrou', { gen, hostPeerId });

    media = new MediaClient(signaling, {
      splitRecvTransports: false,
      onLog: log,
      onIceState: (state) => {
        if (state === 'failed') showToast('Problema na conexao de midia (ICE)', 'error');
      }
    });

    const quality = mergeServerQuality(entrou.videoQuality, loadPresetId());
    await media.loadDevice(entrou.rtpCapabilities);
    if (gen !== joinGeneration) return;

    await media.ensureRecvTransport();
    if (gen !== joinGeneration) return;

    media.setVideoQuality(quality);
    recorder.setHostToken(hostToken);

    hostReady = true;
    ui.set({ wsConnected: true, wsWasConnected: true });
    setBadge('Online', 'online');

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
    const joinPrefs = getHostCapturePrefs();
    if (joinPrefs.microphone) {
      try {
        await media.ensureSendTransport();
        await media.publishMicrophone(joinPrefs);
        syncLocalHostVu();
      } catch (e) {
        errors.handle(e, 'mic-join');
      }
    }
    signaling.send('solicitarEstado', {});
    await flushPendingRoomSnapshot();
    await flushPendingHostAudioSync();
    syncHostAudioMonitor().catch((e) => errors.handle(e, 'audio-monitor'));
    signaling.send('definirQualidade', { presetId: loadPresetId() });
    startStatsPolling();
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
      const info = await fetch('/api/info').then((r) => r.json());
      await promptHostEntry(!!info.roomPinRequired);
    } catch (_) {
      await promptHostEntry(false);
    }
  }

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
        await joinHost({ autoShare: !isReconnect });
        hostSessionJoined = true;
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
  syncHostAudioMonitor(buildHostAudioSources()).catch((e) =>
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

els.btnHostMic?.addEventListener('click', () => onHostMicClick());

window.addEventListener('sharescreen-ended', async () => {
  if (recorder.isRecording()) pararGravacao();
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
  clearInterval(hostLockTimer);
  releaseHostLock();
  localHostVuStop?.();
  stopRecordingCapture();
  hostAudioMonitor?.dispose();
  media?.dispose();
  signaling?.close();
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
const isHost = window.location.pathname.includes('/host') || !!document.getElementById('host-entry-modal');
if (isHost) {
  if (els.sidebar) els.sidebar.hidden = false;
  els.appMain?.classList.add('sidebar-open');
  updateRecordingUi(RecordingState.IDLE);
  updateMuteButtonIcon();
  setupRecordingsDirInput();
  setupSettingsInteraction();

  installAudioUnlock(() => {
    hostAudioMonitor?.resume();
    els.previewAudio?.play?.().catch(() => {});
    if (hostAudioMonitor && !hostAudioMonitor.isAutoplayBlocked?.()) {
      hostMicAutoplayNeeded = false;
      updateHostMicUi();
    }
  });
}

let activeContextClient = null;
let activeAudioFiltersClient = null;
bindLtOverlayResize(els.previewArea);

function applyLtOverlayForTransmission(_tx) {
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
    if (!isHostCard) cohostBtn.classList.toggle('is-active', isCoHost);
  }
  if (trocaTelasBtn) {
    trocaTelasBtn.hidden = isHostCard;
    if (!isHostCard) trocaTelasBtn.classList.toggle('is-active', isTrocaTelas);
  }
  const audioBtn = $('ctx-audio');
  if (audioBtn) audioBtn.hidden = isHostCard;

  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;
  menu.hidden = false;
}

function closeContextMenu() {
  const menu = $('custom-context-menu');
  if (menu) menu.hidden = true;
  activeContextClient = null;
}

$('ctx-cohost')?.addEventListener('click', () => {
  if (!activeContextClient) return;
  const targetState = !activeContextClient.isCoHost;
  signaling.send('definirCoHost', { peerId: activeContextClient.id, ativo: targetState });
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

function saveAudioFiltersPresetDebounced(name, prefs) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    savePresetToLocalStorage(name, prefs);
  }, 1000);
}

function applyAudioFiltersFromUi() {
  const client = activeAudioFiltersClient;
  const monitor = hostAudioMonitor;
  if (!client || !monitor) return;

  const prefs = {
    gain: Number($('audio-gain')?.value !== undefined ? $('audio-gain')?.value : 1.0),
    bass: Number($('audio-bass')?.value || 0),
    treble: Number($('audio-treble')?.value || 0),
    highpass: !!$('audio-hp-enabled')?.checked,
    highpassFreq: Number($('audio-hp-frequency')?.value || 80),
    peaking: !!$('audio-peak-enabled')?.checked,
    peakingFreq: Number($('audio-peak-frequency')?.value || 3000),
    peakingGain: Number($('audio-peak-gain')?.value || 3),
    compressor: !!$('audio-comp-enabled')?.checked,
    noiseGate: !!$('audio-gate-enabled')?.checked,
    noiseGateThreshold: Number($('audio-gate-threshold')?.value || -45)
  };

  monitor.setFilterPrefs(client.id, prefs);
  saveAudioFiltersPresetDebounced(client.displayName, prefs);
}

function openAudioFiltersModal(client) {
  if (!client) return;
  activeAudioFiltersClient = client;
  const monitor = hostAudioMonitor;
  if (!monitor) {
    showToast('Monitor de audio nao inicializado', 'warn');
    return;
  }

  const prefs = monitor.getFilterPrefs(client.id);
  originalAudioFilterPrefs = { ...prefs };

  const nameEl = $('audio-filters-client-name');
  if (nameEl) nameEl.textContent = client.displayName || '-';

  const gainInput = $('audio-gain');
  if (gainInput) {
    gainInput.value = prefs.gain !== undefined ? prefs.gain : 1.0;
    const gainVal = $('audio-gain-val');
    if (gainVal) gainVal.textContent = `${Number(gainInput.value).toFixed(1)}x`;
  }

  const bassInput = $('audio-bass');
  if (bassInput) {
    bassInput.value = prefs.bass !== undefined ? prefs.bass : 0;
    const bassVal = $('audio-bass-val');
    if (bassVal) bassVal.textContent = `${bassInput.value} dB`;
  }

  const trebleInput = $('audio-treble');
  if (trebleInput) {
    trebleInput.value = prefs.treble !== undefined ? prefs.treble : 0;
    const trebleVal = $('audio-treble-val');
    if (trebleVal) trebleVal.textContent = `${trebleInput.value} dB`;
  }

  const hpEnabled = $('audio-hp-enabled');
  if (hpEnabled) hpEnabled.checked = !!prefs.highpass;

  const peakEnabled = $('audio-peak-enabled');
  if (peakEnabled) peakEnabled.checked = !!prefs.peaking;

  const compEnabled = $('audio-comp-enabled');
  if (compEnabled) compEnabled.checked = !!prefs.compressor;

  const gateEnabled = $('audio-gate-enabled');
  if (gateEnabled) gateEnabled.checked = !!prefs.noiseGate;

  const hpFreq = $('audio-hp-frequency');
  if (hpFreq) {
    hpFreq.value = prefs.highpassFreq || 80;
    const hpFreqVal = $('audio-hp-freq-val');
    if (hpFreqVal) hpFreqVal.textContent = `${hpFreq.value} Hz`;
  }

  const peakFreq = $('audio-peak-frequency');
  if (peakFreq) {
    peakFreq.value = prefs.peakingFreq || 3000;
    const peakFreqVal = $('audio-peak-freq-val');
    if (peakFreqVal) peakFreqVal.textContent = `${peakFreq.value} Hz`;
  }

  const peakGain = $('audio-peak-gain');
  if (peakGain) {
    peakGain.value = prefs.peakingGain !== undefined ? prefs.peakingGain : 3;
    const peakGainVal = $('audio-peak-gain-val');
    if (peakGainVal) peakGainVal.textContent = `${peakGain.value} dB`;
  }

  const gateThresh = $('audio-gate-threshold');
  if (gateThresh) {
    gateThresh.value = prefs.noiseGateThreshold !== undefined ? prefs.noiseGateThreshold : -45;
    const gateThreshVal = $('audio-gate-thresh-val');
    if (gateThreshVal) gateThreshVal.textContent = `${gateThresh.value} dB`;
  }

  const modal = $('audio-filters-modal');
  if (modal) modal.hidden = false;
}

function saveAudioFiltersModal() {
  const client = activeAudioFiltersClient;
  if (!client) return;

  applyAudioFiltersFromUi();
  showToast(`Filtros de audio atualizados para ${client.displayName}`, 'success');
  closeAudioFiltersModal(false);
}

function closeAudioFiltersModal(revert = false) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  const modal = $('audio-filters-modal');
  if (modal) modal.hidden = true;

  const client = activeAudioFiltersClient;
  const monitor = hostAudioMonitor;
  if (revert && client && monitor && originalAudioFilterPrefs) {
    monitor.setFilterPrefs(client.id, originalAudioFilterPrefs);
    savePresetToLocalStorage(client.displayName, originalAudioFilterPrefs);
  }

  activeAudioFiltersClient = null;
  originalAudioFilterPrefs = null;
}

$('audio-gain')?.addEventListener('input', (e) => {
  const el = $('audio-gain-val');
  if (el) el.textContent = `${Number(e.target.value).toFixed(1)}x`;
  applyAudioFiltersFromUi();
});
$('audio-bass')?.addEventListener('input', (e) => {
  const el = $('audio-bass-val');
  if (el) el.textContent = `${e.target.value} dB`;
  applyAudioFiltersFromUi();
});
$('audio-treble')?.addEventListener('input', (e) => {
  const el = $('audio-treble-val');
  if (el) el.textContent = `${e.target.value} dB`;
  applyAudioFiltersFromUi();
});
$('audio-hp-enabled')?.addEventListener('change', applyAudioFiltersFromUi);
$('audio-hp-frequency')?.addEventListener('input', (e) => {
  const el = $('audio-hp-freq-val');
  if (el) el.textContent = `${e.target.value} Hz`;
  applyAudioFiltersFromUi();
});
$('audio-peak-enabled')?.addEventListener('change', applyAudioFiltersFromUi);
$('audio-peak-frequency')?.addEventListener('input', (e) => {
  const el = $('audio-peak-freq-val');
  if (el) el.textContent = `${e.target.value} Hz`;
  applyAudioFiltersFromUi();
});
$('audio-peak-gain')?.addEventListener('input', (e) => {
  const el = $('audio-peak-gain-val');
  if (el) el.textContent = `${e.target.value} dB`;
  applyAudioFiltersFromUi();
});
$('audio-comp-enabled')?.addEventListener('change', applyAudioFiltersFromUi);
$('audio-gate-enabled')?.addEventListener('change', applyAudioFiltersFromUi);
$('audio-gate-threshold')?.addEventListener('input', (e) => {
  const el = $('audio-gate-thresh-val');
  if (el) el.textContent = `${e.target.value} dB`;
  applyAudioFiltersFromUi();
});

$('btn-audio-filters-reset')?.addEventListener('click', () => {
  const client = activeAudioFiltersClient;
  if (!client) return;

  const gain = $('audio-gain'); if (gain) gain.value = 1.0;
  const gainVal = $('audio-gain-val'); if (gainVal) gainVal.textContent = '1.0x';

  const bass = $('audio-bass'); if (bass) bass.value = 0;
  const bassVal = $('audio-bass-val'); if (bassVal) bassVal.textContent = '0 dB';

  const treble = $('audio-treble'); if (treble) treble.value = 0;
  const trebleVal = $('audio-treble-val'); if (trebleVal) trebleVal.textContent = '0 dB';

  const hp = $('audio-hp-enabled'); if (hp) hp.checked = false;
  const hpFreq = $('audio-hp-frequency'); if (hpFreq) hpFreq.value = 80;
  const hpFreqVal = $('audio-hp-freq-val'); if (hpFreqVal) hpFreqVal.textContent = '80 Hz';

  const peak = $('audio-peak-enabled'); if (peak) peak.checked = false;
  const peakFreq = $('audio-peak-frequency'); if (peakFreq) peakFreq.value = 3000;
  const peakFreqVal = $('audio-peak-freq-val'); if (peakFreqVal) peakFreqVal.textContent = '3000 Hz';
  const peakGain = $('audio-peak-gain'); if (peakGain) peakGain.value = 3;
  const peakGainVal = $('audio-peak-gain-val'); if (peakGainVal) peakGainVal.textContent = '3 dB';

  const comp = $('audio-comp-enabled'); if (comp) comp.checked = false;

  const gate = $('audio-gate-enabled'); if (gate) gate.checked = false;
  const gateThresh = $('audio-gate-threshold'); if (gateThresh) gateThresh.value = -45;
  const gateThreshVal = $('audio-gate-thresh-val'); if (gateThreshVal) gateThreshVal.textContent = '-45 dB';

  applyAudioFiltersFromUi();
});

$('ctx-audio')?.addEventListener('click', () => {
  const client = activeContextClient;
  closeContextMenu();
  if (client) openAudioFiltersModal(client);
});

$('btn-audio-filters-cancel')?.addEventListener('click', () => closeAudioFiltersModal(true));
$('btn-audio-filters-save')?.addEventListener('click', saveAudioFiltersModal);

document.addEventListener('click', (e) => {
  const menu = $('custom-context-menu');
  if (menu && !menu.hidden) {
    const isMenuClick = menu.contains(e.target) || e.target.closest('.ctx-item');
    if (!isMenuClick) {
      closeContextMenu();
    }
  }
});

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
  setupSettingsInteraction();

  installAudioUnlock(() => {
    hostAudioMonitor?.resume();
    els.previewAudio?.play?.().catch(() => {});
    if (hostAudioMonitor && !hostAudioMonitor.isAutoplayBlocked?.()) {
      hostMicAutoplayNeeded = false;
      updateHostMicUi();
    }
  });

  signaling.addListener(coHostHandleMessage);
  signaling.send('solicitarEstado', {});
}

const isHostPage = window.location.pathname.includes('/host');
if (isHostPage) {
  bootstrap();
}