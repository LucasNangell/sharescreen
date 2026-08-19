import { SignalingClient, ConnectionState, wsUrl } from '../shared/signaling-client.js';
import { MediaClient } from '../shared/media-client.js';
import { normalizeTransmission, hasActiveVideo, parseRoomSnapshot, TransmissionSync, enrichDisplaySources } from '../shared/transmission.js';
import {
  loadCapturePrefs,
  saveCapturePrefs,
  setupMicrophonePicker,
  populateMicrophoneSelect,
  VuMeter,
  acquireMicrophoneTrack,
  installAudioUnlock
} from '../shared/audio-manager.js';
import { ErrorManager, assertSecureContext, formatServerError, isTransientServerError, ErrorCodes } from '../shared/error-manager.js';
import {
  mergeServerQuality,
  loadPresetId,
  savePresetId,
  buildDisplayConstraintsWithAudio
} from '../shared/quality-manager.js';
import { showToast } from '../shared/toast.js';
import { HostAudioMonitor } from '../shared/host-audio-monitor.js';
import { normalizeRemoteAudioSources, audioTraceSync, audioTrace, audioSourcesSignature } from '../shared/audio-sources.js';
import { CLIENT_MIC_PUBLISH_DEFAULTS } from '../shared/mic-dsp.js';
import { isSelectableSource, sortDisplaySources } from '../shared/display-sources.js';
import { buildDisplaySourceCard } from '../shared/source-cards.js';
import { ClientSession, SessionPhase, requestRoomStateWithRetry, joinPayloadExtras } from './session.js';
import { MediaPublisher } from './media-publisher.js';
import { PublisherConnection } from './publisher-connection.js';
import { hideLtOverlay, bindLtOverlayResize } from '../shared/lt-overlay.js';
import { createDrawingSurface } from '../shared/drawing-surface.js';
import { createAnnotationToolbar } from '../shared/annotation-toolbar.js';
import { updateStreamSourceBadge } from '../shared/stream-source-badge.js';
import { verifyServerBuild } from '../shared/build-verify.js';
import { debugClientSessionLog } from '../shared/debug-session-client.js';
import { requireAuthSession, authDisplayName, bindLogoutControl } from '../shared/auth-client.js';

const STORAGE_NAME = 'sharescreen_client_name';
const STORAGE_MACHINE = 'sharescreen_agent_hostname';
const STORAGE_MACHINE_ID = 'sharescreen_machine_id';

function readQueryParam(key) {
  try {
    return new URLSearchParams(location.search).get(key)?.trim() || '';
  } catch {
    return '';
  }
}

const $ = (id) => document.getElementById(id);

const els = {
  overlay: $('overlay'),
  nomeInput: $('nome-input'),
  pinWrap: $('pin-wrap'),
  clientPinInput: $('client-pin-input'),
  chkSystemAudio: $('chk-system-audio'),
  chkMicrophone: $('chk-microphone'),
  chkViewerOnly: $('chk-viewer-only'),
  micWrap: $('mic-picker-wrap'),
  micSelect: $('mic-select'),
  btnRefreshMics: $('btn-refresh-mics'),
  vuFill: $('vu-fill'),
  btnSalvarNome: $('btn-salvar-nome'),
  btnViewerEnter: $('btn-viewer-enter'),
  btnEditarNome: $('btn-editar-nome'),
  video: $('video-remoto'),
  audio: $('audio-remoto'),
  statusBar: $('status-bar'),
  statusBadge: $('client-status-badge'),
  stateSharing: $('state-sharing'),
  stateSelected: $('state-selected'),
  stateWatching: $('state-watching'),
  stateWaiting: $('state-waiting'),
  statePaused: $('state-paused'),
  stateInterrupted: $('state-interrupted'),
  interruptedMessage: $('interrupted-message'),
  stateFinalized: $('state-finalized'),
  finalizedMessage: $('finalized-message'),
  watchingLabel: $('watching-label'),
  erro: $('erro-box'),
  btnClientMic: $('btn-client-mic'),
  btnActivateAudio: $('btn-activate-audio'),
  drawCanvas: $('live-annotation-canvas'),
  annotationToolbar: $('annotation-toolbar'),
  annotationToolbarToggle: $('annotation-toolbar-toggle'),
  annotationToolbarPanel: $('annotation-toolbar-panel'),
  annotationColor: $('annotation-color'),
  annotationWidth: $('annotation-width'),
  annotationClear: $('annotation-clear'),
  btnSettings: $('btn-settings'),
  settingsModal: $('settings-modal'),
  settingsNomeInput: $('settings-nome-input'),
  settingsChkSystem: $('settings-chk-system-audio'),
  settingsChkMic: $('settings-chk-microphone'),
  settingsMicWrap: $('settings-mic-picker-wrap'),
  settingsMicSelect: $('settings-mic-select'),
  settingsBtnRefreshMics: $('settings-btn-refresh-mics'),
  settingsSwitchScreenWrap: $('settings-switch-screen-wrap'),
  btnSettingsSwitchScreen: $('btn-settings-switch-screen'),
  btnSettingsSave: $('btn-settings-save'),
  btnSettingsClose: $('btn-settings-close'),
  settingsAccountWrap: $('settings-account-wrap'),
  settingsAuthUserLabel: $('settings-auth-user-label'),
  btnSettingsLogout: $('btn-settings-logout'),
  clientSidebarAccountWrap: $('client-sidebar-account-wrap'),
  clientSidebarAuthLabel: $('client-sidebar-auth-label'),
  btnClientSidebarLogout: $('btn-client-sidebar-logout'),
  btnFullscreen: $('btn-fullscreen'),
  btnFsSources: $('btn-fs-sources'),
  fsSourceMenu: $('fs-source-menu'),
  fsSourceList: $('fs-source-list'),
  clientMain: document.querySelector('.client-main'),
  previewArea: $('preview-area'),
  streamSourceBadge: $('stream-source-badge'),
  insecureWarning: $('insecure-warning'),
  onboardIntro: $('onboard-intro'),
  onboardStepIdentify: $('onboard-step-identify'),
  onboardStepAudio: $('onboard-step-audio'),
  onboardStepsIdentify: $('onboard-steps-identify'),
  onboardStepsAudio: $('onboard-steps-audio')
};

let signaling = null;
let media = null;
let peerId = null;
let displayName = readQueryParam('nome') || localStorage.getItem(STORAGE_NAME) || '';
let authUser = null;

function setClientShellVisible(visible) {
  const main = document.querySelector('.client-main');
  if (main) main.hidden = !visible;
}

function applyAuthIdentityToClient(user) {
  if (!user) return;
  displayName = authDisplayName(user);
  if (!displayName) return;
  localStorage.setItem(STORAGE_NAME, displayName);
  if (els.nomeInput) {
    els.nomeInput.value = displayName;
    els.nomeInput.readOnly = true;
  }
  const nameField = els.nomeInput?.closest('.field');
  if (nameField) nameField.hidden = true;
  if (els.onboardIntro) {
    els.onboardIntro.textContent = `Conectado como ${displayName}. Selecione a tela quando o navegador solicitar.`;
  }
  const identifyStep = els.onboardStepsIdentify?.querySelector('li');
  if (identifyStep) {
    identifyStep.textContent = 'Sua identidade vem do login — selecione a tela no próximo passo.';
  }
}
let agentHostname = readQueryParam('maquina') || localStorage.getItem(STORAGE_MACHINE) || '';
let pendingTransmission = null;
let pendingAudioSources = null;
let pendingRoomSnapshot = null;
let pendingMicrophoneFilterPrefs = null;
let drawingSurface = null;
let annotationToolbar = null;
let clientWhiteboardActive = false;
let txSync = null;
let sessionStarted = false;
let sessionReady = false;
let viewerOnly = false;
let roomAudioMonitor = null;
let clientMicAutoplayNeeded = false;
let syncClientAudioPromise = null;
let syncClientAudioPending = false;
let lastAudioSources = [];
let lastAppliedAudioSig = '';
const ownPeerIds = new Set();
let fontesAudioDebounceTimer = null;
let hostPeerId = null;
let meetBridgeLiveMode = false;
let sharedRoomMode = false;
let audioHealthTimer = null;
let deferScreenShareOnJoin = false;
let skipJoinPublishOnJoin = false;
let pendingPostPublishRemoteWork = null;
let clientDisplayStream = null;
let clientMicTrack = null;
let clientMicPicker = null;
const MIC_PICKER_READY_TIMEOUT_MS = 4000;
let clientJoinInProgress = false;
let bootstrapping = false;
let joinInFlight = false;
let bootstrapPromise = null;
let clientJoinPromise = null;
let roomPin = readQueryParam('pin') || '';
let displayControlActive = false;
let displaySources = [];
const clientSession = new ClientSession();
let mediaPublisher = null;
let suppressShareEndedHandler = false;
let publisherSessionPromise = null;
let publisherFlowPromise = null;
let captureScreenInFlight = false;
let publisherFlowGeneration = 0;
const publisherConnection = new PublisherConnection();

function ensureAgentHostname() {
  if (agentHostname) return agentHostname;
  let id = localStorage.getItem(STORAGE_MACHINE_ID);
  if (!id) {
    id =
      globalThis.crypto?.randomUUID?.() ||
      `m-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(STORAGE_MACHINE_ID, id);
  }
  agentHostname = id;
  localStorage.setItem(STORAGE_MACHINE, id);
  return agentHostname;
}

function beginPublisherFlow() {
  publisherFlowGeneration += 1;
  publisherConnection.reset();
  return publisherFlowGeneration;
}

function isPublisherFlowCurrent(gen) {
  return gen === publisherFlowGeneration;
}

function shouldIgnorePublisherFailure(gen) {
  return !isPublisherFlowCurrent(gen) || !!media?.hasVideoProducer?.();
}
const viewerAccessToken = readQueryParam('token') || '';
const hasExternalAccessToken = !!viewerAccessToken;
const autoViewerEntry =
  !hasExternalAccessToken &&
  (readQueryParam('espectador') === '1' || readQueryParam('viewer') === '1');
const vu = new VuMeter();

const mutedClients = new Set();

function applyClientAudioMute() {
  roomAudioMonitor?.setManualMuted(mutedClients);
}

function syncOwnMicMuteFromRoom() {
  if (!peerId || !media?.hasPublishedMicrophone?.()) return;
  const selfMuted = mutedClients.has(String(peerId));
  if (media.isPublishedAudioMuted() !== selfMuted) {
    media.setPublishedAudioMuted(selfMuted);
  }
  updateClientMicUi();
}

const errors = new ErrorManager({
  onToast: (m, t) => showToast(m, t),
  onTechnicalLog: (m) => console.error(m)
});

if (readQueryParam('nome') && !readQueryParam('token')) {
  localStorage.setItem(STORAGE_NAME, readQueryParam('nome'));
}
if (readQueryParam('maquina')) localStorage.setItem(STORAGE_MACHINE, readQueryParam('maquina'));
ensureAgentHostname();

bindLtOverlayResize(els.previewArea);

function getClientLocalPreviewStream() {
  const fromDisplay = clientDisplayStream?.getVideoTracks?.()?.[0];
  if (fromDisplay?.readyState === 'live') return clientDisplayStream;
  const fromMedia = media?.localScreenStream?.getVideoTracks?.()?.[0];
  if (fromMedia?.readyState === 'live') return media.localScreenStream;
  const producerTrack = media?.producers?.video?.track;
  if (producerTrack?.readyState === 'live') {
    return new MediaStream([producerTrack]);
  }
  return null;
}

function clientIsPublishingVideo() {
  return !!media?.hasVideoProducer?.();
}

function isClientSelectedSource(tx) {
  if (!tx || !peerId) return false;
  const normalized = normalizeTransmission(tx);
  return hasActiveVideo(normalized) && String(normalized.selectedPeerId) === String(peerId);
}

/** Igual ao host: espelho local quando é a fonte selecionada ou ainda não há vídeo ativo na sala. */
function shouldShowClientLocalPreview(tx) {
  if (!clientIsPublishingVideo() || !getClientLocalPreviewStream()) return false;
  const normalized = tx ? normalizeTransmission(tx) : null;
  if (!normalized || !hasActiveVideo(normalized) || normalized.paused) return true;
  return isClientSelectedSource(normalized);
}

function applyClientLocalPreview(tx = txSync?.lastActiveTransmission) {
  if (!shouldShowClientLocalPreview(tx)) return;

  const stream = getClientLocalPreviewStream();
  if (!stream) return;

  if (media?.remoteConsumers?.video && !media.remoteConsumers.video.closed) {
    media.closeActiveVideoConsumer({ videoEl: els.video, notifyServer: false }).catch(() => {});
  }

  if (els.video.srcObject !== stream) {
    els.video.srcObject = stream;
  }
  els.video.play?.().catch(() => {});
  drawingSurface?.resize();
}

function isWhiteboardTransmission(tx) {
  return tx?.sourceKind === 'whiteboard';
}

function getClientDrawingMode() {
  return isWhiteboardTransmission(txSync?.lastActiveTransmission) ? 'persistent' : 'ephemeral';
}

function applyClientWhiteboardState(payload, tx = txSync?.lastActiveTransmission) {
  if (!payload) return;
  clientWhiteboardActive = !!payload.active;
  annotationToolbar?.syncClearVisibility();
}

function handleClientWhiteboardElement(_element) {
  // Elementos commitados aparecem apenas no video SFU — overlay so para traços em andamento.
}

function clientHasPreview() {
  if (!sessionReady) return false;
  if (shouldShowClientLocalPreview(txSync?.lastActiveTransmission)) return true;
  const tx = txSync?.lastActiveTransmission;
  if (tx && hasActiveVideo(tx) && !tx.paused) return true;
  const vt = els.video?.srcObject?.getVideoTracks?.()?.[0];
  return vt?.readyState === 'live';
}

function clientHasDrawSurface() {
  return clientHasPreview();
}

function updateClientDrawUi() {
  annotationToolbar?.setVisible(clientHasDrawSurface());
  annotationToolbar?.syncClearVisibility();
  drawingSurface?.syncDrawUi();
  drawingSurface?.resize();
}

function onClientTransmissionVideoUpdated() {
  applyClientLocalPreview();
  updateClientDrawUi();
}

annotationToolbar = createAnnotationToolbar({
  rootEl: els.annotationToolbar,
  toggleEl: els.annotationToolbarToggle,
  panelEl: els.annotationToolbarPanel,
  colorEl: els.annotationColor,
  widthEl: els.annotationWidth,
  clearEl: els.annotationClear,
  getCanClear: () => false,
  coupleToolWithExpansion: true,
  defaultTool: 'stroke',
  onToolChange: () => {
    drawingSurface?.syncDrawUi();
  }
});

drawingSurface = createDrawingSurface({
  previewArea: els.previewArea,
  videoEl: els.video,
  canvasEl: els.drawCanvas,
  getPeerId: () => peerId,
  getPeerName: () => displayName || getNome(),
  getTool: () => annotationToolbar?.getTool(),
  getColor: () => annotationToolbar?.getColor(),
  getWidth: () => annotationToolbar?.getWidth(),
  getMode: () => getClientDrawingMode(),
  onSegment: (payload) => {
    if (signaling?.connected) signaling.send('anotacaoSegmento', payload);
  },
  onElementCommit: (element) => {
    if (signaling?.connected) signaling.send('quadroBrancoElemento', element);
    handleClientWhiteboardElement(element);
  }
});

function updateClientStates(mode, _tx, opts = {}) {
  const hideAllOverlays = mode === 'idle';
  const showLocalPreview = shouldShowClientLocalPreview(_tx ?? txSync.lastActiveTransmission);
  els.stateSharing.hidden = hideAllOverlays || mode !== 'sharing' || showLocalPreview;
  els.stateSelected.hidden = hideAllOverlays || mode !== 'selected' || showLocalPreview;
  els.stateWatching.hidden =
    hideAllOverlays || mode !== 'watching' || !!opts.hideWatchingBanner || showLocalPreview;
  els.stateWaiting.hidden = hideAllOverlays || mode !== 'waiting';
  els.statePaused.hidden = hideAllOverlays || mode !== 'paused';
  if (els.stateInterrupted) els.stateInterrupted.hidden = hideAllOverlays || mode !== 'interrupted';
  if (els.stateFinalized) els.stateFinalized.hidden = hideAllOverlays || mode !== 'finalized';
}

txSync = new TransmissionSync({
  getMedia: () => media,
  getVideoEl: () => els.video,
  getPeerId: () => peerId,
  isViewerOnly: () => viewerOnly,
  onStateChange: (mode, tx, opts) => {
    updateClientStates(mode, tx, opts);
    applyClientLocalPreview(tx);
    updateClientDrawUi();
  },
  onStatus: (text) => setStatus(text),
  onLtOverlay: (tx) => applyLtOverlayForTransmission(tx),
  onAutoplayBlocked: () => onRemoteAudioAutoplayBlocked(),
  onError: (e) => {
    const entry = errors.handle(e, 'consume');
    showErro(entry.friendly, entry.technical);
  },
  getInterruptedMessageEl: () => els.interruptedMessage,
  getFinalizedMessageEl: () => els.finalizedMessage,
  getWatchingLabelEl: () => els.watchingLabel
});

function updateClientStreamBadge(tx) {
  const raw = tx ?? txSync.lastActiveTransmission;
  if (!raw) {
    updateStreamSourceBadge(els.streamSourceBadge, '', false);
    return;
  }
  const normalized = normalizeTransmission(raw);
  const active = hasActiveVideo(normalized) && !normalized.paused;
  if (!active) {
    updateStreamSourceBadge(els.streamSourceBadge, '', false);
    return;
  }
  if (String(normalized.selectedPeerId) === String(peerId)) {
    updateStreamSourceBadge(els.streamSourceBadge, displayName || getNome(), true);
    return;
  }
  const badgeName =
    normalized.sourceKind === 'whiteboard' ? 'Quadro branco' : normalized.peerName;
  updateStreamSourceBadge(els.streamSourceBadge, badgeName, true);
}

function applyLtOverlayForTransmission(tx) {
  updateClientStreamBadge(tx);
  if (tx?.sourceKind !== 'whiteboard') {
    hideLtOverlay();
  } else {
    hideLtOverlay();
  }
  applyClientLocalPreview(tx);
  if (isWhiteboardTransmission(tx)) {
    drawingSurface?.clearPersistentOverlay();
    drawingSurface?.syncDrawUi();
  } else {
    drawingSurface?.clearPersistentOverlay();
  }
  updateClientDrawUi();
}

const capturePrefs = loadCapturePrefs();
if (els.chkSystemAudio) els.chkSystemAudio.checked = capturePrefs.systemAudio !== false;
if (els.chkMicrophone) els.chkMicrophone.checked = !!capturePrefs.microphone;

clientMicPicker = setupMicrophonePicker({
  checkbox: els.chkMicrophone,
  wrap: els.micWrap,
  select: els.micSelect,
  refreshBtn: els.btnRefreshMics,
  savedDeviceId: capturePrefs.microphoneDeviceId || '',
  onLog: setStatus,
  onError: (m) => showErro(m),
  onResolved: () => saveCapturePrefs(getCapturePrefsFromUi()),
  hasLiveTrack: () =>
    clientMicTrack?.readyState === 'live' ||
    media?.getLocalMicrophoneTrack?.()?.readyState === 'live'
});

els.micSelect?.addEventListener('change', () => {
  saveCapturePrefs(getCapturePrefsFromUi());
  releaseClientMicTrack();
  attachVuMeterIfNeeded();
});
els.chkMicrophone?.addEventListener('change', () => {
  saveCapturePrefs(getCapturePrefsFromUi());
  if (!els.chkMicrophone?.checked) releaseClientMicTrack();
  updateClientMicUi();
  attachVuMeterIfNeeded();
  if (sessionReady && media) {
    syncClientMicPublication().catch((e) => errors.handle(e, 'audio-prefs'));
  }
});
els.chkSystemAudio?.addEventListener('change', () => {
  saveCapturePrefs(getCapturePrefsFromUi());
  if (sessionReady && media) {
    syncClientMicPublication().catch((e) => errors.handle(e, 'audio-prefs'));
  }
});

setupMicrophonePicker({
  checkbox: els.settingsChkMic,
  wrap: els.settingsMicWrap,
  select: els.settingsMicSelect,
  refreshBtn: els.settingsBtnRefreshMics,
  savedDeviceId: capturePrefs.microphoneDeviceId || '',
  onLog: setStatus,
  onError: (m) => showErro(m),
  hasLiveTrack: () =>
    clientMicTrack?.readyState === 'live' ||
    media?.getLocalMicrophoneTrack?.()?.readyState === 'live'
});

function clientHasMicEnabled() {
  return !!getCapturePrefsFromUi().microphone;
}

function updateClientMicUi() {
  const btn = els.btnClientMic;
  if (!btn) return;
  const micPublished = media?.hasPublishedMicrophone?.();
  const show = micPublished || clientMicAutoplayNeeded;
  btn.hidden = !show;
  if (!show) return;
  const muted = media?.isPublishedAudioMuted?.();
  btn.classList.toggle('is-muted', !!muted || clientMicAutoplayNeeded);
  btn.title = clientMicAutoplayNeeded
    ? 'Ativar audio'
    : muted
      ? 'Ativar microfone'
      : 'Silenciar microfone';
  const svgOn = btn.querySelector('.mic-icon-on');
  const svgOff = btn.querySelector('.mic-icon-off');
  if (clientMicAutoplayNeeded) {
    if (svgOn) svgOn.hidden = false;
    if (svgOff) svgOff.hidden = true;
  } else {
    if (svgOn) svgOn.hidden = !!muted;
    if (svgOff) svgOff.hidden = !muted;
  }
}

async function onClientMicClick() {
  if (!els.btnClientMic) return;
  try {
    if (clientMicAutoplayNeeded) {
      const confirmed = await roomAudioMonitor?.resume();
      roomAudioMonitor?.connectOutput(els.audio);
      await els.audio?.play?.().catch(() => {});
      if (confirmed || roomAudioMonitor?.isPlaybackConfirmed?.()) {
        clientMicAutoplayNeeded = false;
      }
      updateClientMicUi();
      updateActivateAudioUi();
      showToast(clientMicAutoplayNeeded ? 'Clique novamente para ativar o audio' : 'Audio ativado', clientMicAutoplayNeeded ? 'warn' : 'success');
      return;
    }
    if (!media?.hasPublishedMicrophone?.() || !peerId) return;
    const muted = !media.isPublishedAudioMuted();
    media.setPublishedAudioMuted(muted);
    signaling.send('definirClientMute', { peerId, muted });
    updateClientMicUi();
    showToast(muted ? 'Microfone silenciado' : 'Microfone ativado', 'info');
  } catch (e) {
    errors.handle(e, 'mic-toggle');
  }
}

function isSharingScreen() {
  return !!media?.isSharingVideo?.();
}

function applyCapturePrefsToUi(prefs) {
  if (els.chkSystemAudio) els.chkSystemAudio.checked = prefs.systemAudio !== false;
  if (els.chkMicrophone) els.chkMicrophone.checked = !!prefs.microphone;
  if (els.micWrap) els.micWrap.hidden = !prefs.microphone;
  if (els.micSelect && prefs.microphoneDeviceId) {
    els.micSelect.value = prefs.microphoneDeviceId;
  }
  if (els.settingsChkSystem) els.settingsChkSystem.checked = prefs.systemAudio !== false;
  if (els.settingsChkMic) els.settingsChkMic.checked = !!prefs.microphone;
  if (els.settingsMicWrap) els.settingsMicWrap.hidden = !prefs.microphone;
  if (els.settingsMicSelect && prefs.microphoneDeviceId) {
    els.settingsMicSelect.value = prefs.microphoneDeviceId;
  }
}

function getSettingsPrefsFromModal() {
  return {
    systemAudio: els.settingsChkSystem ? els.settingsChkSystem.checked : false,
    microphone: els.settingsChkMic ? els.settingsChkMic.checked : false,
    microphoneDeviceId: els.settingsMicSelect ? els.settingsMicSelect.value : ''
  };
}

function updateSettingsAccountUi() {
  bindLogoutControl({
    wrapEl: els.settingsAccountWrap,
    labelEl: els.settingsAuthUserLabel,
    buttonEl: els.btnSettingsLogout,
    user: authUser
  });
  bindLogoutControl({
    wrapEl: els.clientSidebarAccountWrap,
    labelEl: els.clientSidebarAuthLabel,
    buttonEl: els.btnClientSidebarLogout,
    user: authUser
  });
}

async function openSettingsModal() {
  updateSettingsAccountUi();
  const prefs = loadCapturePrefs();
  applyCapturePrefsToUi(prefs);
  if (els.settingsNomeInput) els.settingsNomeInput.value = displayName || getNome();
  try {
    await populateMicrophoneSelect(els.settingsMicSelect, {
      deviceId: prefs.microphoneDeviceId || '',
      onLog: setStatus,
      skipPermissionProbe:
        clientMicTrack?.readyState === 'live' ||
        media?.getLocalMicrophoneTrack?.()?.readyState === 'live'
    });
    if (prefs.microphoneDeviceId) {
      els.settingsMicSelect.value = prefs.microphoneDeviceId;
    }
  } catch (e) {
    showToast('Nao foi possivel listar microfones', 'warn');
  }
  if (els.settingsModal) els.settingsModal.hidden = false;
  syncSwitchScreenSettingsUi();
}

function closeSettingsModal() {
  if (els.settingsModal) els.settingsModal.hidden = true;
}

function clientCanSwitchDisplay() {
  if (viewerOnly) return false;
  const liveDisplay = clientDisplayStream?.getVideoTracks?.()?.some((t) => t.readyState === 'live');
  const liveMedia = media?.localScreenStream?.getVideoTracks?.()?.some((t) => t.readyState === 'live');
  return !!(media?.hasVideoProducer?.() || liveDisplay || liveMedia);
}

function syncSwitchScreenSettingsUi() {
  if (els.settingsSwitchScreenWrap) {
    els.settingsSwitchScreenWrap.hidden = !clientCanSwitchDisplay();
  }
}

async function switchClientDisplayCapture() {
  if (!clientCanSwitchDisplay()) {
    showToast('Compartilhe uma tela antes de trocar', 'warn');
    return;
  }
  assertSecureContext();
  const prefs = getSettingsPrefsFromModal();
  saveCapturePrefs(prefs);
  applyCapturePrefsToUi(prefs);
  setStatus('Selecione a nova tela para compartilhar...');

  if (!media) {
    try {
      const stream = await promptDisplayCapture(prefs);
      const previous = clientDisplayStream;
      clientDisplayStream = stream;
      previous?.getTracks?.().forEach((t) => {
        if (stream.getTracks().some((nt) => nt.id === t.id)) return;
        try {
          t.stop();
        } catch (_) {}
      });
      applyClientLocalPreview();
      setStatus('Tela de captura atualizada');
      showToast('Tela atualizada', 'success');
    } catch (e) {
      const cancelled =
        e?.name === 'NotAllowedError' ||
        e?.name === 'AbortError' ||
        /cancel|abort|denied/i.test(String(e?.message || ''));
      if (cancelled) {
        setStatus('Selecao de tela cancelada — captura atual mantida');
        showToast('Selecao de tela cancelada', 'info');
        return;
      }
      errors.handle(e, 'trocar-tela');
    }
    return;
  }

  try {
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
    clientDisplayStream = result.stream || media.localScreenStream;
    applyClientLocalPreview();
    drawingSurface?.resize();
    signaling?.send('status', { status: 'transmitindo' });
    setStatus(result.synthetic ? 'Captura de fundo atualizada' : 'Tela de captura atualizada');
    showToast(result.synthetic ? 'Captura de fundo atualizada' : 'Tela atualizada', 'success');
  } catch (e) {
    errors.handle(e, 'trocar-tela');
  }
}

async function saveSettingsModal() {
  const prefs = getSettingsPrefsFromModal();
  const newName = els.settingsNomeInput?.value?.trim();
  if (newName) {
    displayName = newName;
    localStorage.setItem(STORAGE_NAME, newName);
    if (els.nomeInput) els.nomeInput.value = newName;
    if (signaling?.authenticated) {
      signaling.send('atualizarNome', { nome: newName });
    }
    try {
      await fetch('/api/registro-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: newName, computerName: agentHostname })
      });
    } catch (_) {
      showToast('Nome salvo localmente; nao foi possivel sincronizar com o servidor', 'info');
    }
  }
  applyCapturePrefsToUi(prefs);
  saveCapturePrefs(prefs);
  closeSettingsModal();
  if (sessionReady && media) {
    syncClientMicPublication()
      .then(() => {
        attachVuMeterIfNeeded();
        updateClientMicUi();
      })
      .catch((e) => errors.handle(e, 'audio-prefs'));
  }
}

function updateActivateAudioUi() {
  const btn = els.btnActivateAudio;
  if (!btn) return;
  const blocked =
    !!roomAudioMonitor?.isAutoplayBlocked?.() ||
    clientMicAutoplayNeeded ||
    (roomAudioMonitor && !roomAudioMonitor.isPlaybackConfirmed?.());
  const hasChannels = (roomAudioMonitor?.channelCount || 0) > 0;
  btn.hidden = !(blocked && hasChannels);
}

function onRemoteAudioAutoplayBlocked() {
  clientMicAutoplayNeeded = true;
  updateClientMicUi();
  updateActivateAudioUi();
}



function clientAudioNormalizeOptions() {
  return {
    excludePeerId: peerId,
    ownPeerIds: [...ownPeerIds],
    excludeSourceTypes: meetBridgeLiveMode ? ["system"] : [],
    ownProducerIds: media?.getOwnAudioProducerIds?.() || []
  };
}

function expectedAudioSourceCount() {
  return normalizeRemoteAudioSources(lastAudioSources, clientAudioNormalizeOptions()).length;
}

async function applyMeetBridgeLiveMode(ativo, { forceSync = true } = {}) {
  const next = !!ativo;
  if (next === meetBridgeLiveMode && !forceSync) return;
  meetBridgeLiveMode = next;
  roomAudioMonitor?.setExcludeSourceTypes?.(meetBridgeLiveMode ? ['system'] : []);
  lastAppliedAudioSig = '';
  if (sessionReady && forceSync) {
    await syncClientAudioMonitor(lastAudioSources, { force: true }).catch((e) =>
      errors.handle(e, "audio-sync")
    );
  }
}

async function applySharedRoomMode(ativo) {
  const next = !!ativo;
  if (next === sharedRoomMode) return;
  sharedRoomMode = next;
  media?.setSharedRoomMode?.(sharedRoomMode);
  if (sharedRoomMode) {
    showToast('Modo sala compartilhada ativo — apenas o falante dominante transmite mic', 'info');
  }
}

function countActiveAudioChannels(monitor) {
  return monitor?.countLiveChannels?.() ?? 0;
}

function applyHostPeerFromSnapshot(parsed = {}) {
  const nextHostId = parsed.host?.id || null;
  if (nextHostId) {
    hostPeerId = String(nextHostId);
    roomAudioMonitor?.setPinnedPeerIds?.([hostPeerId]);
  }
}

async function repairAllAudioIfNeeded() {
  if (!media || !sessionReady) return;
  const monitor = ensureClientAudioMonitor();
  if (!monitor) return;

  const expected = expectedAudioSourceCount();
  if (!expected) return;

  const active = countActiveAudioChannels(monitor);
  if (active >= expected) {
    await monitor.recoverOutputIfSilent?.();
    return;
  }

  if (hostPeerId) monitor.setPinnedPeerIds([hostPeerId]);
  audioTrace('audio-health', {
    event: 'repair-all',
    expected,
    active
  });

  const list = normalizeRemoteAudioSources(lastAudioSources, clientAudioNormalizeOptions());
  const backoffs = [0, 400, 800, 1600];
  for (const delay of backoffs) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    await monitor.syncFromSources(list);
    if (countActiveAudioChannels(monitor) >= expected) break;
  }

  await monitor.recoverOutputIfSilent?.();
  monitor.connectOutput(els.audio);
  await monitor.resume();
  try {
    await els.audio?.play();
  } catch (_) {
    onRemoteAudioAutoplayBlocked();
  }
}

function startAudioHealthWatchdog() {
  stopAudioHealthWatchdog();
  audioHealthTimer = setInterval(() => {
    if (!sessionReady) return;
    const expected = expectedAudioSourceCount();
    if (!expected) return;
    const active = countActiveAudioChannels(roomAudioMonitor);
    if (active < expected || roomAudioMonitor?.isAutoplayBlocked?.() || !roomAudioMonitor?.isPlaybackConfirmed?.()) {
      repairAllAudioIfNeeded().catch(() => {});
    }
  }, 5000);
}

function stopAudioHealthWatchdog() {
  if (!audioHealthTimer) return;
  clearInterval(audioHealthTimer);
  audioHealthTimer = null;
}

function ensureClientAudioMonitor() {
  if (!media) return null;
  if (!roomAudioMonitor) {
    roomAudioMonitor = new HostAudioMonitor(media, {
      excludePeerId: peerId,
      ownPeerIds: [...ownPeerIds],
      excludeSourceTypes: meetBridgeLiveMode ? ['system'] : [],
      pinnedPeerIds: hostPeerId ? [hostPeerId] : [],
      allowDualPeerAudio: true,
      onAutoplayBlocked: onRemoteAudioAutoplayBlocked,
      onStaleProducer: () => {
        try {
          signaling?.send('solicitarEstado', {});
        } catch (_) {}
      }
    });
    roomAudioMonitor.connectOutput(els.audio);
    roomAudioMonitor.setManualMuted(mutedClients);
  } else if (peerId) {
    roomAudioMonitor.excludePeerId = String(peerId);
    roomAudioMonitor.setOwnPeerIds?.([...ownPeerIds]);
    if (hostPeerId) roomAudioMonitor.setPinnedPeerIds([hostPeerId]);
  }
  return roomAudioMonitor;
}

async function syncClientAudioMonitor(sources, { force = false } = {}) {
  if (!peerId || !media) return;
  if (syncClientAudioPromise) {
    syncClientAudioPending = true;
    return syncClientAudioPromise;
  }
  syncClientAudioPromise = (async () => {
    do {
      syncClientAudioPending = false;
      if (!media || !peerId) return;
      await media.ensureRecvTransport(media._audioRecvTag());
      const monitor = ensureClientAudioMonitor();
      if (!monitor) return;
      if (Array.isArray(sources) && sources.length) {
        lastAudioSources = sources;
      }
      sources = null;
      const list = normalizeRemoteAudioSources(
        lastAudioSources,
        clientAudioNormalizeOptions()
      );
      const sig = audioSourcesSignature(list);
      const expected = list.length;
      const active = countActiveAudioChannels(monitor);
      if (
        !force &&
        sig === lastAppliedAudioSig &&
        ((expected > 0 && active >= expected) || (expected === 0 && active === 0))
      ) {
        return;
      }
      await monitor.syncFromSources(list);
      const retryBackoffs = [800, 1600, 3200];
      let retryCycle = 0;
      while (list.length && monitor.channelCount === 0 && retryCycle < retryBackoffs.length) {
        await new Promise((r) => setTimeout(r, retryBackoffs[retryCycle]));
        retryCycle += 1;
        await monitor.syncFromSources(
          normalizeRemoteAudioSources(lastAudioSources, clientAudioNormalizeOptions())
        );
      }
      await monitor.recoverOutputIfSilent?.();
      monitor.connectOutput(els.audio);
      await monitor.resume();
      if (monitor.isAutoplayBlocked?.() || (monitor.channelCount > 0 && !monitor.isPlaybackConfirmed?.())) {
        onRemoteAudioAutoplayBlocked();
      } else if (!monitor.channelCount) {
        clientMicAutoplayNeeded = false;
        updateClientMicUi();
        updateActivateAudioUi();
      } else {
        clientMicAutoplayNeeded = false;
        updateClientMicUi();
        updateActivateAudioUi();
      }
      setStatus(`Audio remoto: ${monitor.channelCount} fonte(s)`);
      if (monitor.channelCount > 0) {
        audioTraceSync('sync-ok', list, { channels: monitor.channelCount, role: 'client' });
      } else if (list.length) {
        audioTraceSync('sync-falhou', list, { channels: 0, role: 'client' });
      }
      if (monitor.channelCount >= expected || (expected === 0 && monitor.channelCount === 0)) {
        lastAppliedAudioSig = sig;
      }
      await repairAllAudioIfNeeded();
    } while (syncClientAudioPending);
  })().finally(() => {
    syncClientAudioPromise = null;
  });
  return syncClientAudioPromise;
}

function resetClientPageState() {
  clientJoinInProgress = false;
  bootstrapping = false;
  viewerOnly = false;
  pendingTransmission = null;
  pendingAudioSources = null;
  pendingRoomSnapshot = null;
  deferScreenShareOnJoin = false;
  pendingPostPublishRemoteWork = null;
  txSync.reset();
  updateClientStates('idle');
}

function releaseClientMicTrack() {
  vu.detach();
  if (!clientMicTrack) return;
  try {
    clientMicTrack.stop();
  } catch (_) {}
  clientMicTrack = null;
}

/** A enumeração inicial é assíncrona: capturar antes dela usa o microfone errado. */
function waitClientMicPickerReady() {
  const ready = clientMicPicker?.ready;
  if (!ready) return Promise.resolve();
  return Promise.race([
    ready,
    new Promise((resolve) => setTimeout(resolve, MIC_PICKER_READY_TIMEOUT_MS))
  ]);
}

async function ensureClientMicTrack(deviceId = '') {
  if (clientMicTrack?.readyState === 'live') {
    const activeId = clientMicTrack.getSettings?.().deviceId || '';
    if (!deviceId || !activeId || activeId === deviceId) {
      return clientMicTrack;
    }
    releaseClientMicTrack();
  }
  clientMicTrack = await acquireMicrophoneTrack(deviceId, setStatus);
  return clientMicTrack;
}

async function teardownClientSession({ keepDisplayStream = false, keepMicTrack = false } = {}) {
  stopAudioHealthWatchdog();
  if (fontesAudioDebounceTimer) {
    clearTimeout(fontesAudioDebounceTimer);
    fontesAudioDebounceTimer = null;
  }
  lastAppliedAudioSig = '';
  await roomAudioMonitor?.dispose();
  roomAudioMonitor = null;
  suppressShareEndedHandler = true;
  try {
    await media?.dispose({
      keepLocalScreenStream: keepDisplayStream,
      keepMicTrack
    });
  } finally {
    suppressShareEndedHandler = false;
  }
  media = null;
  mediaPublisher = null;
  clientSession.reset();
  publisherConnection.reset();
  if (signaling) {
    signaling.close();
    signaling = null;
  }
  peerId = null;
  lastAudioSources = [];
  lastAppliedAudioSig = '';
  sessionStarted = false;
  sessionReady = false;
  joinInFlight = false;
  txSync.reset();
  if (!keepDisplayStream) {
    clientDisplayStream?.getTracks?.().forEach((t) => t.stop());
    clientDisplayStream = null;
    onboardStep = 'identify';
  }
  if (!keepMicTrack) {
    releaseClientMicTrack();
  }
}

function getLiveDisplayVideoTrack() {
  return clientDisplayStream?.getVideoTracks?.().find((t) => t.readyState === 'live') || null;
}

function hasPendingDisplayStream() {
  return !!getLiveDisplayVideoTrack();
}

function logCaptureTrackState(label, extra = {}) {
  const track = getLiveDisplayVideoTrack();
  const firstTrack = clientDisplayStream?.getVideoTracks?.()[0];
  // #region agent log
  debugClientSessionLog('H9', 'client:capture-track', label, {
    hasStream: !!clientDisplayStream,
    trackState: track?.readyState || firstTrack?.readyState || null,
    firstTrackState: firstTrack?.readyState || null,
    hasProducer: !!media?.hasVideoProducer?.(),
    wsConnected: !!signaling?.connected,
    ...extra
  });
  // #endregion
}

function createClientSignalingClient() {
  const client = new SignalingClient(wsUrl(), {
    enableReconnect: false,
    onLog: (m, l) => setStatus(m),
    onStateChange: (state) => {
      if (state === ConnectionState.RECONNECTING) setBadge('Reconectando', 'warn');
      if (state === ConnectionState.CONNECTED) setBadge('Online', 'online');
      if (state === ConnectionState.FAILED) setBadge('Falha', 'error');
    },
    onClose: () => {
      if (sessionReady && !clientJoinInProgress && !bootstrapping) {
        setStatus('Reconectando...');
      }
    }
  });
  client.addListener(handleServerMessage);
  return client;
}

function enableSessionReconnect() {
  if (!signaling) return;
  signaling.onOpen = () => handleSignalingReconnect();
  signaling.enableReconnect = true;
}

/** Conecta/join sem derrubar captura de tela nem fechar WS desnecessariamente. */
async function ensurePublisherSession(flowGen = publisherFlowGeneration) {
  if (publisherSessionPromise) return publisherSessionPromise;

  publisherSessionPromise = (async () => {
    if (!isPublisherFlowCurrent(flowGen)) return;

    if (signaling?.connected && media && peerId && media.hasVideoProducer?.()) {
      logCaptureTrackState('ensure-skip-already-publishing');
      return;
    }

    viewerOnly = false;
    clientSession.setPublishIntent('publisher');
    deferScreenShareOnJoin = true;
    skipJoinPublishOnJoin = false;
    logCaptureTrackState('ensure-start');

    const stale = () => !isPublisherFlowCurrent(flowGen);

    if (signaling?.connected && signaling.authenticated && media && peerId) {
      bootstrapping = true;
      try {
        await media.ensureSendTransport();
      } finally {
        bootstrapping = false;
      }
      logCaptureTrackState('ensure-reuse-session');
      return;
    }

    if (media && (!signaling?.connected || !peerId)) {
      const pendingStream = hasPendingDisplayStream() ? clientDisplayStream : null;
      suppressShareEndedHandler = true;
      try {
        await media.dispose({
          keepLocalScreenStream: !!pendingStream,
          keepMicTrack: clientMicTrack?.readyState === 'live'
        });
      } finally {
        suppressShareEndedHandler = false;
      }
      media = null;
      mediaPublisher = null;
      peerId = null;
      lastAudioSources = [];
      lastAppliedAudioSig = '';
      sessionStarted = false;
      sessionReady = false;
      joinInFlight = false;
      clientJoinPromise = null;
      clientDisplayStream = pendingStream;
      logCaptureTrackState('ensure-after-dispose');
    }

    if (signaling && !signaling.connected) {
      try {
        signaling.close();
      } catch (_) {}
      signaling = null;
    }

    bootstrapping = true;
    try {
      signaling = await publisherConnection.ensureWebSocket({
        signaling,
        createSignaling: () => createClientSignalingClient(),
        isStale: stale
      });

      if (stale()) return;

      if (signaling.connected && media && peerId && signaling.authenticated) {
        await media.ensureSendTransport();
        logCaptureTrackState('ensure-reuse-session');
        return;
      }

      await publisherConnection.ensureJoined({
        isStale: stale,
        joinFn: async () => {
          await runClientJoin();
        }
      });

      logCaptureTrackState('ensure-connected');
    } finally {
      bootstrapping = false;
    }
  })().finally(() => {
    publisherSessionPromise = null;
  });

  return publisherSessionPromise;
}

async function ensureLiveCaptureStream(capturePrefs) {
  const liveTrack = getLiveDisplayVideoTrack();
  if (liveTrack) {
    logCaptureTrackState('ensure-live-ok', { trackId: liveTrack.id?.slice(0, 8) });
    return clientDisplayStream;
  }
  if (clientDisplayStream) {
    clientDisplayStream.getTracks?.().forEach((t) => {
      try {
        t.stop();
      } catch (_) {}
    });
    clientDisplayStream = null;
  }
  logCaptureTrackState('ensure-live-recapture', {
    previousState: 'ended'
  });
  setStatus('Selecione a tela no dialogo do navegador...');
  clientDisplayStream = await promptDisplayCapture({
    systemAudio: capturePrefs.systemAudio !== false,
    microphone: false
  });
  mediaPublisher = null;
  return clientDisplayStream;
}

function showIdentifyStep() {
  onboardStep = 'identify';
  if (els.overlay) els.overlay.hidden = false;
  if (els.onboardStepIdentify) els.onboardStepIdentify.hidden = false;
  if (els.onboardStepAudio) els.onboardStepAudio.hidden = true;
  if (els.onboardStepsIdentify) els.onboardStepsIdentify.hidden = false;
  if (els.onboardStepsAudio) els.onboardStepsAudio.hidden = true;
  if (els.btnSalvarNome) els.btnSalvarNome.textContent = 'Selecionar tela para compartilhar';
  if (els.onboardIntro && !authUser) {
    els.onboardIntro.textContent =
      'Informe o nome deste computador e selecione a tela quando o navegador solicitar.';
  }
}

function showAudioStep() {
  onboardStep = 'audio';
  if (els.overlay) els.overlay.hidden = false;
  if (els.onboardStepIdentify) els.onboardStepIdentify.hidden = true;
  if (els.onboardStepAudio) els.onboardStepAudio.hidden = false;
  if (els.onboardStepsIdentify) els.onboardStepsIdentify.hidden = true;
  if (els.onboardStepsAudio) els.onboardStepsAudio.hidden = false;
  if (els.btnSalvarNome) els.btnSalvarNome.textContent = 'Iniciar transmissao';
  if (els.onboardIntro) {
    els.onboardIntro.textContent =
      'Tela selecionada. Confirme as opcoes de audio antes de transmitir.';
  }
  if (els.micWrap) els.micWrap.hidden = !els.chkMicrophone?.checked;
  populateMicrophoneSelect(els.micSelect, {
    deviceId: loadCapturePrefs().microphoneDeviceId || '',
    onLog: setStatus,
    skipPermissionProbe:
      clientMicTrack?.readyState === 'live' ||
      media?.getLocalMicrophoneTrack?.()?.readyState === 'live'
  })
    .then(() => saveCapturePrefs(getCapturePrefsFromUi()))
    .catch(() => {});
}

function hideOverlay() {
  if (els.overlay) {
    els.overlay.hidden = true;
  }
}

function showOverlay() {
  if (onboardStep === 'audio' && hasPendingDisplayStream()) {
    showAudioStep();
  } else {
    showIdentifyStep();
  }
}

async function promptDisplayCapture(capturePrefs) {
  assertSecureContext();
  const quality = mergeServerQuality(media?.videoQuality || {}, loadPresetId());
  const constraints = buildDisplayConstraintsWithAudio(quality, capturePrefs.systemAudio !== false);
  setStatus('Selecione a tela no dialogo do navegador...');
  return navigator.mediaDevices.getDisplayMedia(constraints);
}

async function captureScreenFirst({ autoTransmitAfterCapture = false } = {}) {
  if (captureScreenInFlight || publisherFlowPromise) {
    debugClientSessionLog('H10', 'client:captureScreenFirst', 'dedupe', {
      captureScreenInFlight,
      hasPublisherFlow: !!publisherFlowPromise
    });
    return;
  }
  captureScreenInFlight = true;
  const flowGen = beginPublisherFlow();
  const t0 = performance.now();
  debugClientSessionLog('H8', 'client:captureScreenFirst', 'start', {
    autoTransmitAfterCapture,
    elapsedMs: 0,
    flowGen
  });
  if (!media?.hasVideoProducer?.()) {
    mediaPublisher = null;
  }
  clientJoinInProgress = true;
  setStatus('Selecione a tela no dialogo do navegador...');
  hideOverlay();
  try {
    debugClientSessionLog('H8', 'client:captureScreenFirst', 'before-getDisplayMedia', {
      elapsedMs: Math.round(performance.now() - t0)
    });
    const stream = await promptDisplayCapture({
      systemAudio: true,
      microphone: false
    });
    if (!isPublisherFlowCurrent(flowGen)) return;
    clientDisplayStream = stream;
    debugClientSessionLog('H8', 'client:captureScreenFirst', 'capture-ok', {
      elapsedMs: Math.round(performance.now() - t0)
    });
    if (autoTransmitAfterCapture && hasPendingDisplayStream()) {
      await startPublisherFlow(flowGen);
      return;
    }
    showAudioStep();
    await attachVuMeterIfNeeded();
    setStatus('Tela capturada - configure o audio e confirme');
  } catch (e) {
    if (shouldIgnorePublisherFailure(flowGen)) return;
    clientDisplayStream = null;
    onboardStep = 'identify';
    showIdentifyStep();
    const cancelled =
      e?.name === 'NotAllowedError' ||
      e?.name === 'AbortError' ||
      /cancel|abort|denied/i.test(String(e?.message || ''));
    if (cancelled) {
      setStatus('Selecao de tela cancelada');
      showToast('Selecao de tela cancelada', 'info');
    } else {
      errors.handle(e, 'captura');
      showErro(e.message);
    }
  } finally {
    captureScreenInFlight = false;
    if (isPublisherFlowCurrent(flowGen)) {
      clientJoinInProgress = false;
    }
  }
}

async function runPublisherFlowBody(t0, flowGen) {
  if (!isPublisherFlowCurrent(flowGen)) {
    return;
  }

  await waitClientMicPickerReady();
  if (!isPublisherFlowCurrent(flowGen)) {
    return;
  }

  const prefs = getCapturePrefsFromUi();
  saveCapturePrefs(prefs);
  viewerOnly = false;
  clientSession.setPublishIntent('publisher');
  if (els.chkViewerOnly) els.chkViewerOnly.checked = false;

  if (media?.hasVideoProducer?.()) {
    debugClientSessionLog('H10', 'client:startPublisherFlow', 'already-publishing', {
      producerId: media.producers?.video?.id?.slice(0, 8) || null
    });
    enableSessionReconnect();
    hideOverlay();
    setStatus('Transmitindo - aguardando selecao do host');
    updateClientStateAfterPublish();
    return;
  }

  const nome = getNome();
  if (!nome) {
    throw new Error('Informe um nome para este computador');
  }

  clientJoinInProgress = true;
  setStatus('Preparando transmissao...');
  debugClientSessionLog('H1', 'client:startPublisherFlow', 'start', {
    hasStreamBeforeJoin: hasPendingDisplayStream(),
    elapsedMs: 0,
    flowGen
  });

  if (!hasPendingDisplayStream()) {
    setStatus('Selecione a tela no dialogo do navegador...');
    hideOverlay();
    debugClientSessionLog('H8', 'client:startPublisherFlow', 'before-getDisplayMedia', {
      elapsedMs: Math.round(performance.now() - t0)
    });
    clientDisplayStream = await promptDisplayCapture({
      systemAudio: prefs.systemAudio !== false,
      microphone: false
    });
  }

  if (!isPublisherFlowCurrent(flowGen)) {
    throw new Error('Fluxo de publicacao interrompido');
  }

  setStatus('Conectando...');
  hideOverlay();
  debugClientSessionLog('H8', 'client:startPublisherFlow', 'before-connect', {
    elapsedMs: Math.round(performance.now() - t0),
    hasStream: hasPendingDisplayStream()
  });
  await ensurePublisherSession(flowGen);
  if (!isPublisherFlowCurrent(flowGen)) {
    throw new Error('Fluxo de publicacao interrompido');
  }
  if (!media) {
    throw new Error('Sessao de midia nao iniciada');
  }

  if (!media.hasVideoProducer?.()) {
    await ensureLiveCaptureStream(prefs);
    if (!isPublisherFlowCurrent(flowGen)) {
      throw new Error('Fluxo de publicacao interrompido');
    }
    logCaptureTrackState('before-publish', { elapsedMs: Math.round(performance.now() - t0) });

    let publishPrefs = { ...prefs };
    if (prefs.microphone) {
      const track = await ensureClientMicTrack(prefs.microphoneDeviceId || '');
      if (!track || track.readyState !== 'live') {
        throw new Error('Nao foi possivel capturar o microfone - verifique permissoes');
      }
      publishPrefs = { ...prefs, prefetchedMicTrack: track };
    }

    await publishClientMedia(publishPrefs);
    if (prefs.microphone && !media.hasPublishedMicrophone()) {
      throw new Error('Microfone nao publicado - verifique permissoes do navegador');
    }
    await flushPostPublishRemoteWork();
    await finalizeAfterPublish();
    updateClientMicUi();
    await attachVuMeterIfNeeded();
  } else {
    await finalizeAfterPublish();
    updateClientStateAfterPublish();
  }

  if (!media.hasVideoProducer?.()) {
    throw new Error('Falha ao publicar video - tente novamente');
  }

  onboardStep = 'identify';
  setStatus('Transmitindo - aguardando selecao do host');
  debugClientSessionLog('H1', 'client:startPublisherFlow', 'done', {
    hasVideoProducer: media.hasVideoProducer(),
    producerId: media.producers?.video?.id?.slice(0, 8) || null
  });
  enableSessionReconnect();
  hideOverlay();
}

async function startPublisherFlow(existingFlowGen = null) {
  if (publisherFlowPromise) {
    debugClientSessionLog('H10', 'client:startPublisherFlow', 'dedupe', {});
    return publisherFlowPromise;
  }

  const flowGen = existingFlowGen ?? beginPublisherFlow();
  const t0 = performance.now();
  publisherFlowPromise = (async () => {
    try {
      await runPublisherFlowBody(t0, flowGen);
    } catch (e) {
      debugClientSessionLog('H7', 'client:startPublisherFlow', 'failed', {
        message: String(e?.message || e),
        hasMedia: !!media,
        wsConnected: !!signaling?.connected,
        hasStream: hasPendingDisplayStream(),
        hasProducer: !!media?.hasVideoProducer?.(),
        flowGen,
        currentFlowGen: publisherFlowGeneration
      });
      if (shouldIgnorePublisherFailure(flowGen)) {
        debugClientSessionLog('H10', 'client:startPublisherFlow', 'ignored-stale-flow', {
          flowGen,
          currentFlowGen: publisherFlowGeneration
        });
        if (media?.hasVideoProducer?.()) {
          enableSessionReconnect();
          hideOverlay();
          setStatus('Transmitindo - aguardando selecao do host');
        }
        return;
      }
      if (/cancelad/i.test(String(e?.message || ''))) {
        return;
      }
      errors.handle(e, 'publisher-flow');
      showErro(e.message);
      if (/pista de v[ií]deo indispon|captura de tela|timeout ao conectar/i.test(String(e?.message || ''))) {
        if (!media?.hasVideoProducer?.()) {
          clientDisplayStream = null;
          mediaPublisher = null;
        }
      }
      showOverlay();
      showIdentifyStep();
    } finally {
      if (isPublisherFlowCurrent(flowGen)) {
        clientJoinInProgress = false;
      }
    }
  })().finally(() => {
    publisherFlowPromise = null;
  });

  return publisherFlowPromise;
}

async function confirmAudioAndTransmit() {
  if (clientJoinInProgress || bootstrapping || publisherFlowPromise) {
    if (publisherFlowPromise) return publisherFlowPromise;
    return;
  }

  const prefs = getCapturePrefsFromUi();
  saveCapturePrefs(prefs);

  if (!hasPendingDisplayStream()) {
    onboardStep = 'identify';
    clientDisplayStream = null;
    showIdentifyStep();
    showToast('Selecione a tela novamente', 'warn');
    return;
  }

  return startPublisherFlow();
}

function setStatus(text) {
  if (els.statusBar) els.statusBar.textContent = text;
}

function setBadge(text, type = 'muted') {
  if (!els.statusBadge) return;
  els.statusBadge.textContent = text;
  els.statusBadge.className = `badge badge-${type}`;
}

function showErro(msg, technical = '') {
  if (!els.erro) return;
  els.erro.textContent = technical ? `${msg}\n\nDetalhe: ${technical}` : msg;
  els.erro.hidden = false;
}

function hideErro() {
  if (els.erro) els.erro.hidden = true;
}

async function resolveClientNameFromServer() {
  const cached = (localStorage.getItem(STORAGE_NAME) || displayName || '').trim();
  let serverNome = null;
  try {
    const reg = await fetch('/api/registro-cliente', { credentials: 'same-origin' }).then((r) => r.json());
    serverNome = reg?.nome ? String(reg.nome).trim() : null;
  } catch (_) {}

  const namesMatch = (a, b) =>
    a && b && a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;

  if (cached) {
    if (!namesMatch(cached, serverNome)) {
      try {
        await fetch('/api/registro-cliente', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: cached, computerName: agentHostname })
        });
      } catch (_) {}
    }
    return cached;
  }

  return serverNome || null;
}

function getNome() {
  return (els.nomeInput?.value || displayName || '').trim();
}

function getCapturePrefsFromUi() {
  return {
    systemAudio: els.chkSystemAudio ? els.chkSystemAudio.checked : false,
    microphone: els.chkMicrophone ? els.chkMicrophone.checked : false,
    microphoneDeviceId: els.micSelect ? els.micSelect.value : ''
  };
}

function configureExternalViewerUi() {
  if (els.btnSalvarNome) els.btnSalvarNome.hidden = true;
  if (els.btnViewerEnter) els.btnViewerEnter.textContent = 'Assistir transmissao';
  if (els.chkViewerOnly) els.chkViewerOnly.checked = true;
  document.querySelectorAll('#overlay .steps, #overlay .check-row').forEach((el) => {
    el.hidden = true;
  });
  const title = document.getElementById('onboard-title');
  if (title) title.textContent = 'Assistir transmissao ao vivo';
  const intro = document.querySelector('#overlay .modal-panel > p');
  if (intro) intro.textContent = 'Clique abaixo para entrar como espectador.';
  if (els.btnEditarNome) els.btnEditarNome.hidden = true;
}

async function initOnboarding() {
  resetClientPageState();
  await teardownClientSession({ keepDisplayStream: false });

  setClientShellVisible(false);
  hideOverlay();

  if (!window.isSecureContext && els.insecureWarning) {
    els.insecureWarning.hidden = false;
  }

  if (hasExternalAccessToken) {
    setClientShellVisible(true);
    try {
      const info = await fetch('/api/info').then((r) => r.json());
      if (info.roomPinRequired && els.pinWrap && !viewerAccessToken) {
        els.pinWrap.hidden = false;
      }
    } catch (_) {}
    const nomeUrl = readQueryParam('nome');
    displayName = nomeUrl || displayName || '';
    if (displayName && els.nomeInput) {
      els.nomeInput.value = displayName;
    }
    if (displayName) {
      showIdentifyStep();
      setStatus('Clique abaixo para compartilhar a tela');
      return;
    }
    showIdentifyStep();
    els.nomeInput?.focus();
    return;
  }

  if (autoViewerEntry) {
    setClientShellVisible(true);
    configureExternalViewerUi();
    viewerOnly = true;
    if (els.chkViewerOnly) els.chkViewerOnly.checked = true;
    const nomeUrl = readQueryParam('nome');
    if (nomeUrl) {
      displayName = nomeUrl;
      if (els.nomeInput) els.nomeInput.value = nomeUrl;
    } else if (!displayName) {
      displayName = 'Visitante';
      if (els.nomeInput) els.nomeInput.value = displayName;
    }
    try {
      await bootstrap(true);
      hideOverlay();
      setStatus('Assistindo transmissao pela internet');
      return;
    } catch (e) {
      showOverlay();
      showErro(e.message || 'Nao foi possivel conectar a transmissao');
      return;
    }
  }

  try {
    authUser = await requireAuthSession({
      onLoginRequired: () => setClientShellVisible(false),
      onAuthenticated: () => setClientShellVisible(true)
    });
    applyAuthIdentityToClient(authUser);
    updateSettingsAccountUi();
  } catch (e) {
    showErro(e.message || 'Falha na autenticação');
    return;
  }

  setClientShellVisible(true);

  try {
    const info = await fetch('/api/info').then((r) => r.json());
    if (info.roomPinRequired && els.pinWrap && !viewerAccessToken) {
      els.pinWrap.hidden = false;
    }
  } catch (_) {}

  showIdentifyStep();
  setStatus(`Olá, ${displayName} — selecione a tela para compartilhar`);
}

async function salvarEIniciar(asViewer = false, { autoTransmitAfterCapture = false } = {}) {
  if (clientJoinInProgress || captureScreenInFlight || publisherFlowPromise) return;

  const nome = getNome();
  if (!nome) {
    showToast('Faça login para continuar', 'error');
    return;
  }
  displayName = nome;
  localStorage.setItem(STORAGE_NAME, nome);
  try {
    await fetch('/api/registro-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, computerName: ensureAgentHostname() })
    });
  } catch (_) {}
  roomPin = els.clientPinInput?.value?.trim() || roomPin;

  if (asViewer || els.chkViewerOnly?.checked) {
    viewerOnly = true;
    clientSession.setPublishIntent('viewer');
    clientJoinInProgress = true;
    setStatus('Conectando...');
    try {
      await bootstrap(true);
      hideOverlay();
    } catch (e) {
      showOverlay();
      errors.handle(e, 'bootstrap');
      showErro(e.message);
    } finally {
      clientJoinInProgress = false;
    }
    return;
  }

  viewerOnly = false;
  clientSession.setPublishIntent('publisher');
  if (els.chkViewerOnly) els.chkViewerOnly.checked = false;

  if (sessionStarted && signaling?.connected && media?.hasVideoProducer?.()) {
    hideOverlay();
    signaling.send('atualizarNome', { nome });
    syncClientMicPublication().catch((e) => errors.handle(e, 'audio-prefs'));
    return;
  }

  if (onboardStep === 'audio' && hasPendingDisplayStream()) {
    if (clientJoinInProgress || bootstrapping) return;
    await confirmAudioAndTransmit();
    return;
  }

  if (autoTransmitAfterCapture) {
    await captureScreenFirst({ autoTransmitAfterCapture: true });
    return;
  }
  await captureScreenFirst({ autoTransmitAfterCapture: false });
}

els.btnSalvarNome?.addEventListener('click', () => {
  const asViewer = !!els.chkViewerOnly?.checked;
  salvarEIniciar(asViewer, { autoTransmitAfterCapture: !asViewer });
});
els.btnViewerEnter?.addEventListener('click', () => salvarEIniciar(true));

els.nomeInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    salvarEIniciar(!!els.chkViewerOnly?.checked);
  }
});

els.btnEditarNome?.addEventListener('click', () => {
  if (els.nomeInput) els.nomeInput.value = displayName;
  showOverlay();
});

async function attachVuMeterIfNeeded() {
  vu.detach();
  if (!els.chkMicrophone?.checked) return;
  try {
    await waitClientMicPickerReady();
    const track =
      media?.getLocalAudioTrack?.() ||
      (await ensureClientMicTrack(els.micSelect?.value || ''));
    if (!track || track.readyState !== 'live') return;
    const bind = () => {
      vu.attach(track, (level) => {
        if (els.vuFill) els.vuFill.style.width = `${level}%`;
      });
    };
    if (track.muted || track.readyState !== 'live') {
      track.addEventListener('unmute', bind, { once: true });
    } else {
      bind();
    }
  } catch (e) {
    if (e.name !== 'NotAllowedError') {
      showToast('VU meter indisponivel - microfone nao capturado', 'warn');
    }
  }
}

async function handleSignalingReconnect() {
  if (joinInFlight || clientJoinInProgress || bootstrapping) return;
  if (publisherFlowPromise || publisherSessionPromise || captureScreenInFlight) {
    return;
  }
  if (media?.hasVideoProducer?.() && hasPendingDisplayStream()) {
    logCaptureTrackState('reconnect-skip-rejoin');
    await requestRoomStateWithRetry(signaling).catch(() => {});
    return;
  }
  try {
    await rejoinSession();
  } catch (e) {
    errors.handle(e, 'ws-reconnect');
    setStatus(`Reconexao falhou: ${e.message}`);
  }
}

function debugClientLog(hypothesisId, message, data = {}, runId = 'pre-fix') {
  reportClientTrace(message, { hypothesisId, runId, ...data });
}

function reportClientTrace(message, data = {}) {
  if (!signaling?.connected || !signaling?.authenticated) return;
  try {
    signaling.send('clientTrace', {
      message,
      data: {
        ...data,
        peerId: peerId?.slice(0, 8) || null,
        sessionReady,
        viewerOnly
      }
    });
  } catch (_) {}
}

function updateClientStateAfterPublish() {
  const tx =
    txSync.lastActiveTransmission ||
    (pendingTransmission ? normalizeTransmission(pendingTransmission) : null);

  if (tx && hasActiveVideo(tx) && String(tx.selectedPeerId) === String(peerId)) {
    updateClientStates('selected');
    setStatus('Voce esta selecionado - transmitindo para todos');
  } else if (tx && hasActiveVideo(tx) && String(tx.selectedPeerId) !== String(peerId)) {
    updateClientStates('watching', tx, { hideWatchingBanner: true });
    setStatus(
      tx.paused ? 'Transmissao pausada pelo host' : `Assistindo: ${tx.peerName || 'fonte'}`
    );
  } else if (viewerOnly) {
    updateClientStates('waiting');
    setStatus('Modo espectador - aguardando transmissao');
  } else {
    updateClientStates('sharing');
    setStatus('Transmitindo — aguardando selecao do host');
  }

  applyClientLocalPreview();
  updateClientDrawUi();
}

function getClientPublishPrefs() {
  const prefs = getCapturePrefsFromUi();
  return {
    ...prefs,
    meetBridgeLiveMode,
    prefetchedMicTrack: clientMicTrack?.readyState === 'live' ? clientMicTrack : undefined
  };
}

async function syncClientMicPublication() {
  if (!media) return false;
  const prefs = getClientPublishPrefs();
  await media.ensureSendTransport();
  if (prefs.microphone) {
    const fallback = pendingMicrophoneFilterPrefs || CLIENT_MIC_PUBLISH_DEFAULTS;
    await media.ensureMicPublishFilters(fallback);
    if (!clientMicTrack || clientMicTrack.readyState !== 'live') {
      try {
        clientMicTrack = await ensureClientMicTrack(prefs.microphoneDeviceId || '');
        prefs.prefetchedMicTrack = clientMicTrack;
      } catch (err) {
        errors.handle(err, 'mic-publish');
        return false;
      }
    }
  }

  const displayStream =
    clientDisplayStream ||
    (media.localScreenStream?.getVideoTracks?.().some((t) => t.readyState === 'live')
      ? media.localScreenStream
      : null);

  if (displayStream) {
    await media.syncPublishedAudio(prefs, displayStream);
  } else {
    const result = await media.ensureMicrophonePublication(prefs);
    if (media.hasPublishedSystemAudio()) await media.stopSystemAudio();
    if (prefs.microphone && !result.ok && result.reason !== 'disabled') {
      const message =
        result.reason === 'permission'
          ? 'Microfone nao publicado - verifique permissao do navegador'
          : result.reason === 'device'
            ? 'Microfone nao encontrado'
            : 'Falha ao publicar microfone';
      showToast(message, 'warn');
    }
  }

  updateClientMicUi();
  return media.hasPublishedMicrophone() || !prefs.microphone;
}

async function publishClientMedia(publishPrefs) {
  const alreadyVideo = media?.hasVideoProducer?.();
  if (alreadyVideo) {
    debugClientSessionLog('H10', 'client:publishClientMedia', 'video-already-published', {
      producerId: media.producers?.video?.id?.slice(0, 8) || null
    });
    await syncClientMicPublication();
    return;
  }
  debugClientSessionLog('H1', 'client:publishClientMedia', 'start', {
    hasMedia: !!media,
    hasStream: hasPendingDisplayStream(),
    peerId: peerId?.slice(0, 8),
    mic: !!publishPrefs?.microphone,
    system: !!publishPrefs?.systemAudio
  });
  if (!media || !hasPendingDisplayStream()) {
    debugClientSessionLog('H1', 'client:publishClientMedia', 'early-return-no-stream', {
      hasMedia: !!media,
      hasStream: hasPendingDisplayStream()
    });
    throw new Error('Captura de tela indisponivel — selecione a tela novamente');
  }
  mediaPublisher = mediaPublisher || new MediaPublisher(media, signaling);
  clientSession.setPhase(SessionPhase.PUBLISHING);

  if (media.localScreenStream && media.localScreenStream !== clientDisplayStream) {
    media.localScreenStream = null;
  }

  await mediaPublisher.publishVideo(clientDisplayStream, publishPrefs);
  logCaptureTrackState('after-publish-video');
  if (!media.hasVideoProducer()) {
    throw new Error('Falha ao publicar video - tente novamente');
  }

  await syncClientMicPublication();

  const readyAck = await mediaPublisher.confirmMediaReady();
  debugClientSessionLog('H3', 'client:publishClientMedia', 'midiaPronta-result', {
    readyAck,
    hasVideoProducer: media.hasVideoProducer(),
    producerId: media.producers?.video?.id?.slice(0, 8) || null
  });
  if (!readyAck?.ok) {
    throw new Error(readyAck?.erro || 'Servidor nao confirmou midia pronta');
  }
  if (!media.hasVideoProducer()) {
    throw new Error('Video nao publicado apos midiaPronta');
  }
  signaling.send('status', { status: 'transmitindo' });
  clientSession.setPhase(SessionPhase.ACTIVE);
  applyClientLocalPreview();
  updateClientDrawUi();
}

async function finalizeAfterPublish() {
  const snapshot = await requestRoomStateWithRetry(signaling);
  if (snapshot) {
    await applyRoomSnapshot(snapshot, { force: true });
  }
  updateClientStateAfterPublish();
}

async function applyRoomSnapshot(snapshot, { force = false } = {}) {
  if (!snapshot) return;

  const parsed = parseRoomSnapshot(snapshot);
  applyHostPeerFromSnapshot(parsed);

  if (snapshot.meetBridgeLiveMode !== undefined) {
    await applyMeetBridgeLiveMode(snapshot.meetBridgeLiveMode, { forceSync: sessionReady });
  }
  if (snapshot.sharedRoomMode !== undefined) {
    await applySharedRoomMode(snapshot.sharedRoomMode);
  }

  if (parsed.mutedPeerIds) {
    mutedClients.clear();
    for (const id of parsed.mutedPeerIds) {
      mutedClients.add(String(id));
    }
    syncOwnMicMuteFromRoom();
    applyClientAudioMute();
  }

  if (parsed.displayControl) {
    applyDisplayControlUpdate(parsed.displayControl);
  }

  if (parsed.audioSources?.length) {
    lastAudioSources = parsed.audioSources;
  }

  if (snapshot.whiteboard) {
    applyClientWhiteboardState(snapshot.whiteboard, parsed.transmission);
  }

  debugClientLog('H1', '[ROOM_STATE] snapshot recebido', {
    producerVideo: parsed.transmission?.producerIds?.video?.slice(0, 8) || null,
    selectedPeerId: parsed.transmission?.selectedPeerId?.slice(0, 8) || null
  });

  if (!sessionReady) {
    pendingRoomSnapshot = snapshot;
    pendingTransmission = parsed.transmission;
    pendingAudioSources = parsed.audioSources;
    return;
  }

  await txSync.apply(parsed.transmission, { force });
  await syncClientAudioMonitor(parsed.audioSources).catch((e) =>
    errors.handle(e, 'audio-sync')
  );
  onClientTransmissionVideoUpdated();
}

async function reconcileRemoteMediaState() {
  txSync.clearAppliedState();
  if (pendingRoomSnapshot) {
    const snap = pendingRoomSnapshot;
    pendingRoomSnapshot = null;
    if (pendingTransmission) {
      snap.transmission = pendingTransmission;
      pendingTransmission = null;
    }
    if (pendingAudioSources) {
      snap.audioSources = pendingAudioSources;
      pendingAudioSources = null;
    }
    await applyRoomSnapshot(snap, { force: true });
    return;
  }
  const tx = pendingTransmission || txSync.lastActiveTransmission;
  if (tx) {
    await txSync.apply(tx, { force: true });
  }
  const audio = pendingAudioSources?.length ? pendingAudioSources : lastAudioSources;
  if (audio?.length) {
    await syncClientAudioMonitor(audio).catch((e) => errors.handle(e, 'audio-sync'));
  }
  pendingTransmission = null;
  pendingAudioSources = null;
  onClientTransmissionVideoUpdated();
}

async function flushPostPublishRemoteWork() {
  if (!pendingPostPublishRemoteWork) {
    await reconcileRemoteMediaState();
    return;
  }
  const work = pendingPostPublishRemoteWork;
  pendingPostPublishRemoteWork = null;
  debugClientLog('H3', 'flushPostPublishRemoteWork start', { peerId });
  await work();
  debugClientLog('H3', 'flushPostPublishRemoteWork done', { peerId });
}

async function schedulePostJoinWork() {
  debugClientLog('H2', 'schedulePostJoinWork', {
    hasTx: !!(pendingTransmission || txSync.lastActiveTransmission),
    hasAudio: !!(pendingAudioSources?.length || lastAudioSources?.length),
    viewerOnly,
    peerId
  });

  await reconcileRemoteMediaState();
  if (!viewerOnly && media?.hasVideoProducer?.()) {
    await finalizeAfterPublish();
  } else if (viewerOnly) {
    await finalizeAfterPublish();
  }
}

async function bootstrap(isViewer, { deferScreenShare = false, skipJoinPublish = false } = {}) {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    viewerOnly = isViewer;
    deferScreenShareOnJoin = deferScreenShare;
    skipJoinPublishOnJoin = skipJoinPublish;

    const preserveCapture = hasPendingDisplayStream();
    const preserveMic = clientMicTrack?.readyState === 'live';
    const pendingStream = preserveCapture ? clientDisplayStream : null;

    await teardownClientSession({
      keepDisplayStream: preserveCapture,
      keepMicTrack: preserveMic
    });
    clientDisplayStream = pendingStream;
    joinInFlight = false;
    clientJoinPromise = null;

    bootstrapping = true;

    signaling = new SignalingClient(wsUrl(), {
      enableReconnect: false,
      onLog: (m, l) => setStatus(m),
      onStateChange: (state) => {
        if (state === ConnectionState.RECONNECTING) setBadge('Reconectando', 'warn');
        if (state === ConnectionState.CONNECTED) setBadge('Online', 'online');
        if (state === ConnectionState.FAILED) setBadge('Falha', 'error');
      },
      onClose: () => {
        if (sessionReady) setStatus('Reconectando...');
      }
    });

    signaling.addListener(handleServerMessage);

    try {
      await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn, value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          fn(value);
        };

        const timer = setTimeout(
          () => finish(reject, new Error('Timeout ao conectar')),
          45000
        );

        signaling.onOpen = () => {
          runClientJoin()
            .then(() => finish(resolve))
            .catch((e) => finish(reject, e));
        };
        signaling.connect();
      });

      signaling.onOpen = () => handleSignalingReconnect();
      if (isViewer) {
        signaling.enableReconnect = true;
      }
      await schedulePostJoinWork();
    } finally {
      bootstrapping = false;
    }
  })().finally(() => {
    bootstrapPromise = null;
  });

  return bootstrapPromise;
}

function runClientJoin() {
  if (clientJoinPromise) return clientJoinPromise;
  clientJoinPromise = executeJoinAndStart().finally(() => {
    clientJoinPromise = null;
  });
  return clientJoinPromise;
}

async function executeJoinAndStart() {
  joinInFlight = true;
  try {
    sessionReady = false;
    stopAudioHealthWatchdog();
    hideErro();

    const nome = getNome();
    if (!nome) {
      throw new Error('Informe um nome para este computador');
    }

    if (!signaling?.connected) {
      throw new Error('WebSocket nao conectado');
    }

    setStatus('Entrando na sala...');
    const entrouPromise = signaling.onceType('entrou', () => true, 45000);
    signaling.send(
      'entrar',
      {
        papel: 'client',
        nome,
        maquina: ensureAgentHostname(),
        pin: roomPin || undefined,
        viewerToken: viewerAccessToken || undefined,
        ...joinPayloadExtras(clientSession, {
          viewerOnly,
          viewerToken: viewerAccessToken
        })
      }
    );

    const payload = await entrouPromise;
    peerId = payload.peerId;
    if (peerId) ownPeerIds.add(String(peerId));
    signaling.markAuthenticated(true);

    setStatus('Preparando midia...');
    media = new MediaClient(signaling, {
      splitRecvTransports: true,
      applyMicPublishChain: true,
      onLog: (m, l) => setStatus(m)
    });
    media.setOwnPeerId(peerId);
    await media.loadDevice(payload.rtpCapabilities);
    media.setVideoQuality(mergeServerQuality(payload.videoQuality, loadPresetId()));
    await media.ensureRecvTransport();
    await media.ensureRecvTransport(media._audioRecvTag());
    await applyPendingMicrophoneFilters();
    if (!pendingMicrophoneFilterPrefs) {
      await media.ensureMicPublishFilters(CLIENT_MIC_PUBLISH_DEFAULTS);
    }

    const deferShare = !viewerOnly && deferScreenShareOnJoin;
    deferScreenShareOnJoin = false;
    let joinPrefs = getCapturePrefsFromUi();
    const publishPrefs =
      clientMicTrack?.readyState === 'live'
        ? { ...joinPrefs, prefetchedMicTrack: clientMicTrack }
        : joinPrefs;

    await media.ensureSendTransport();
    if (joinPrefs.microphone) {
      assertSecureContext();
    }

    sessionStarted = true;
    sessionReady = true;
    startAudioHealthWatchdog();
    setBadge('Online', 'online');

    if (!viewerOnly && !skipJoinPublishOnJoin) {
      if (deferShare) {
        if (hasPendingDisplayStream()) {
          setStatus('Publicando tela...');
          await publishClientMedia(publishPrefs);
        } else {
          throw new Error('Captura de tela expirada - selecione a tela novamente');
        }
      } else {
        setStatus('Selecione a tela para compartilhar...');
        await media.startScreenShare({ ...joinPrefs, microphone: false, systemAudio: false });
        clientDisplayStream = media.localScreenStream;
        joinPrefs = getCapturePrefsFromUi();
        await publishClientMedia({
          ...joinPrefs,
          prefetchedMicTrack:
            clientMicTrack?.readyState === 'live' ? clientMicTrack : joinPrefs.prefetchedMicTrack
        });
      }
      await finalizeAfterPublish();
      updateClientMicUi();
      await attachVuMeterIfNeeded();
    } else if (viewerOnly) {
      if (pendingRoomSnapshot || pendingTransmission || pendingAudioSources?.length) {
        await reconcileRemoteMediaState();
      }
      clientSession.setPhase(SessionPhase.VIEWER_ACTIVE);
      setStatus('Modo espectador - aguardando transmissao');
      await finalizeAfterPublish();
    } else {
      clientSession.setPhase(SessionPhase.JOINING);
      setStatus('Conectado - publicando tela...');
    }
    await syncClientMicPublication();
    skipJoinPublishOnJoin = false;
    deferScreenShareOnJoin = false;
    updateClientDrawUi();
  } finally {
    joinInFlight = false;
  }
}

async function joinAndStart() {
  return runClientJoin();
}

async function rejoinSession() {
  if (joinInFlight || clientJoinInProgress || bootstrapping) return;
  joinInFlight = true;
  sessionReady = false;
  stopAudioHealthWatchdog();
  txSync.reset();
  try {
  const prefs = getCapturePrefsFromUi();
  const publishPrefs =
    prefs.microphone && clientMicTrack?.readyState === 'live'
      ? { ...prefs, prefetchedMicTrack: clientMicTrack }
      : prefs;
  const stream =
    clientDisplayStream?.getVideoTracks?.().some((t) => t.readyState === 'live')
      ? clientDisplayStream
      : media?.localScreenStream?.getVideoTracks?.().some((t) => t.readyState === 'live')
        ? media.localScreenStream
        : null;

  await roomAudioMonitor?.dispose();
  roomAudioMonitor = null;
  suppressShareEndedHandler = true;
  try {
    await media?.dispose({
      keepLocalScreenStream: !!stream,
      keepMicTrack: clientMicTrack?.readyState === 'live'
    });
  } finally {
    suppressShareEndedHandler = false;
  }
  media = null;
  peerId = null;
  lastAudioSources = [];
  lastAppliedAudioSig = '';

  const entrouPromise = signaling.onceType('entrou', () => true, 45000);
  if (!signaling?.connected) {
    throw new Error('WebSocket nao conectado');
  }
  signaling.send(
    'entrar',
    {
      papel: 'client',
      nome: getNome(),
      maquina: ensureAgentHostname(),
      pin: roomPin || undefined,
      viewerToken: viewerAccessToken || undefined,
      ...joinPayloadExtras(clientSession, {
        viewerOnly,
        viewerToken: viewerAccessToken
      })
    }
  );

  const payload = await entrouPromise;
  peerId = payload.peerId;
  if (peerId) ownPeerIds.add(String(peerId));
  signaling.markAuthenticated(true);

  media = new MediaClient(signaling, {
    splitRecvTransports: true,
    applyMicPublishChain: true,
    onLog: (m, l) => setStatus(m)
  });
  await media.loadDevice(payload.rtpCapabilities);
  media.setVideoQuality(mergeServerQuality(payload.videoQuality, loadPresetId()));
  await media.ensureRecvTransport();
  await media.ensureRecvTransport(media._audioRecvTag());
  await applyPendingMicrophoneFilters();
  if (!pendingMicrophoneFilterPrefs) {
    await media.ensureMicPublishFilters(CLIENT_MIC_PUBLISH_DEFAULTS);
  }

  await media.ensureSendTransport();

  sessionStarted = true;
  sessionReady = true;
  setBadge('Online', 'online');

  if (!viewerOnly) {
    if (stream) {
      clientDisplayStream = stream;
      mediaPublisher = new MediaPublisher(media, signaling);
      await publishClientMedia(publishPrefs);
      setStatus('Transmitindo - reconectado');
    } else {
      setStatus('Reconectado - selecione a tela novamente');
      onboardStep = 'identify';
      showIdentifyStep();
    }
    await attachVuMeterIfNeeded();
    updateClientMicUi();
  }

  await syncClientMicPublication();
  startAudioHealthWatchdog();
  await schedulePostJoinWork();
  await finalizeAfterPublish();
  } finally {
    joinInFlight = false;
  }
}

function applyDisplayControlUpdate(payload) {
  const { ativo, fontes } = payload || {};
  displayControlActive = !!ativo;
  displaySources = enrichDisplaySources(fontes || [], txSync.lastActiveTransmission);
  if (!displayControlActive) closeFsSourceMenu();
  syncFsSourceUi();
}

function isClientMainFullscreen() {
  return document.fullscreenElement === els.clientMain;
}

function syncFsSourceUi() {
  const show = displayControlActive;
  if (els.btnFsSources) els.btnFsSources.hidden = !show;
  if (!show) closeFsSourceMenu();
}

function closeFsSourceMenu() {
  if (!els.fsSourceMenu) return;
  els.fsSourceMenu.hidden = true;
  els.btnFsSources?.setAttribute('aria-expanded', 'false');
}

function toggleFsSourceMenu() {
  if (!els.fsSourceMenu || !displayControlActive) return;
  const open = els.fsSourceMenu.hidden;
  if (open) renderFsSourceMenu();
  els.fsSourceMenu.hidden = !open;
  els.btnFsSources?.setAttribute('aria-expanded', String(open));
}

function renderFsSourceMenu() {
  if (!els.fsSourceList) return;
  els.fsSourceList.innerHTML = '';

  const sources = sortDisplaySources(
    enrichDisplaySources(displaySources, txSync.lastActiveTransmission)
  );
  if (!sources.length) {
    const li = document.createElement('li');
    li.className = 'fs-source-empty';
    li.textContent = 'Nenhuma fonte disponivel';
    els.fsSourceList.appendChild(li);
    return;
  }

  for (const s of sources) {
    els.fsSourceList.appendChild(
      buildDisplaySourceCard(s, (peerId) => {
        closeFsSourceMenu();
        selecionarFonte(peerId);
      })
    );
  }
}

async function selecionarFonte(targetPeerId) {
  if (!displayControlActive || !signaling?.authenticated) return;
  const source = displaySources.find((s) => String(s.id) === String(targetPeerId));
  if (!source || !isSelectableSource(source)) return;
  try {
    const resultPromise = signaling.onceType('selecaoResultado');
    signaling.send('selecionarFonte', { peerId: targetPeerId });
    const res = await resultPromise;
    if (!res.ok) throw new Error(res.erro || 'Falha na selecao');
    showToast('Fonte alternada', 'success');
  } catch (e) {
    errors.handle(e, 'selecionar-fonte');
  }
}

async function applyPendingMicrophoneFilters() {
  if (!media || !pendingMicrophoneFilterPrefs) return;
  await media.setMicrophoneFilterPrefs(pendingMicrophoneFilterPrefs);
}
async function handleServerMessage(msg) {
  if (msg.type === 'roomState') {
    await applyRoomSnapshot(msg.payload, { force: true });
    return;
  }
  if (msg.type === 'estadoSala') {
    await applyRoomSnapshot(msg.payload);
    return;
  }
  if (msg.type === 'modoPonteMeetAtualizado') {
    await applyMeetBridgeLiveMode(!!msg.payload?.ativo);
    return;
  }
  if (msg.type === 'modoSalaCompartilhadaAtualizado') {
    await applySharedRoomMode(!!msg.payload?.ativo);
    if (msg.payload?.dominantSpeakerPeerId) {
      media?.handleDominantSpeaker?.({
        peerId: msg.payload.dominantSpeakerPeerId,
        sharedRoomMode: !!msg.payload.ativo
      });
    }
    return;
  }
  if (msg.type === 'falanteDominante') {
    if (sharedRoomMode) {
      media?.handleDominantSpeaker?.(msg.payload || {});
    }
    return;
  }
  if (msg.type === 'filtroAudioAtualizado') {
    pendingMicrophoneFilterPrefs = msg.payload?.prefs || {};
    if (media) {
      await media.setMicrophoneFilterPrefs(pendingMicrophoneFilterPrefs).catch((e) =>
        errors.handle(e, 'audio-filters')
      );
    }
    return;
  }
  if (msg.type === 'audioPolicyAplicada') {
    if (media) {
      await media.applyAudioPolicyFromServer(msg.payload || {}).catch((e) =>
        errors.handle(e, 'audio-policy')
      );
    }
    return;
  }
  if (msg.type === 'clientesSilenciados') {
    const mutedIds = msg.payload?.mutedPeerIds || [];
    mutedClients.clear();
    for (const id of mutedIds) {
      mutedClients.add(String(id));
    }
    syncOwnMicMuteFromRoom();
    applyClientAudioMute();
    return;
  }
  if (msg.type === 'anotacaoSegmento') {
    drawingSurface?.receive(msg.payload);
    return;
  }
  if (msg.type === 'quadroBrancoEstado') {
    applyClientWhiteboardState(msg.payload);
    return;
  }
  if (msg.type === 'quadroBrancoElemento') {
    handleClientWhiteboardElement(msg.payload);
    return;
  }
  if (msg.type === 'quadroBrancoLimpar') {
    drawingSurface?.clearPersistentOverlay();
    return;
  }
  if (msg.type === 'fontesAudio') {
    const sources = msg.payload?.sources || [];
    lastAudioSources = sources;
    roomAudioMonitor?.clearInvalidProducers?.();
    if (!sessionReady) {
      pendingAudioSources = sources;
      return;
    }
    if (fontesAudioDebounceTimer) clearTimeout(fontesAudioDebounceTimer);
    fontesAudioDebounceTimer = setTimeout(() => {
      fontesAudioDebounceTimer = null;
      syncClientAudioMonitor(sources).catch((e) => errors.handle(e, 'audio-sync'));
    }, 80);
    return;
  }
  if (msg.type === 'transmissaoAtiva') {
    const tx = normalizeTransmission(msg.payload);
    debugClientLog('H2', '[ACTIVE_VIDEO] transmissao ativa recebida', {
      selectedPeerId: tx.selectedPeerId?.slice(0, 8) || null,
      producerVideo: tx.producerIds?.video?.slice(0, 8) || null
    });
    if (!sessionReady) {
      pendingTransmission = msg.payload;
      return;
    }
    await txSync.apply(msg.payload);
    await syncClientAudioMonitor(lastAudioSources).catch((e) =>
      errors.handle(e, 'audio-sync')
    );
    onClientTransmissionVideoUpdated();
    return;
  }
  if (msg.type === 'erro') {
    const mensagem = msg.payload?.mensagem || '';
    if (isTransientServerError(mensagem, { joinInProgress })) return;
    if (!sessionReady && formatServerError(mensagem).code === ErrorCodes.NOT_AUTHENTICATED) {
      return;
    }
    const entry = errors.handle(new Error(mensagem), 'servidor');
    showErro(entry.friendly, entry.technical);
  }
  if (msg.type === 'consumerFechado') {
    const consumerId = msg.payload?.consumerId;
    const wasVideoConsumer = media?.remoteConsumers?.video?.id === consumerId;
    if (consumerId) {
      await roomAudioMonitor?.removeByConsumerId(consumerId);
    }
    if (wasVideoConsumer) {
      debugClientLog('H3', '[CLIENT_CONSUME] consumer de video fechado', {
        consumerId: consumerId?.slice(0, 8) || null
      });
      setStatus('Stream remota encerrada');
      await txSync.onConsumerClosed(consumerId);
      await syncClientAudioMonitor(lastAudioSources).catch((e) =>
        errors.handle(e, 'audio-sync')
      );
    } else {
      lastAppliedAudioSig = '';
      await repairAllAudioIfNeeded();
    }
    return;
  }
  if (msg.type === 'qualidadeAtualizada') {
    const presetId = msg.payload?.presetId;
    if (!presetId) return;
    savePresetId(presetId);
    if (media) {
      media.setVideoQuality(mergeServerQuality(media.videoQuality, presetId));
      await media.applyLiveVideoQuality();
    }
    return;
  }
  if (msg.type === 'controleExibicaoAtualizado') {
    applyDisplayControlUpdate(msg.payload);
  }
  if (msg.type === 'promovidoCoHost') {
    showToast('Funcoes de co-host estao disponiveis apenas no painel host', 'info');
  }
  if (msg.type === 'demovidoCoHost') {
    showToast('Voce nao e mais co-host desta sala', 'info');
  }
}

els.btnSettings?.addEventListener('click', () => openSettingsModal());
els.btnSettingsSave?.addEventListener('click', () => saveSettingsModal());
els.btnSettingsClose?.addEventListener('click', () => closeSettingsModal());
els.btnSettingsSwitchScreen?.addEventListener('click', () => switchClientDisplayCapture());

els.btnClientMic?.addEventListener('click', () => onClientMicClick());

els.btnFullscreen?.addEventListener('click', () => {
  const el = els.clientMain || document.querySelector('.client-main');
  if (document.fullscreenElement) document.exitFullscreen();
  else el?.requestFullscreen?.();
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

window.addEventListener('sharescreen-ended', async () => {
  if (media?._suppressShareEnded || suppressShareEndedHandler || clientJoinInProgress || bootstrapping) {
    logCaptureTrackState('share-ended-suppressed');
    return;
  }
  logCaptureTrackState('share-ended-user');
  try {
    await media?.stopVideoShare();
  } catch (e) {
    errors.handle(e, 'share-ended');
  }
  clientDisplayStream = null;
  onboardStep = 'identify';
  updateClientMicUi();
  const micActive = media?.hasPublishedMicrophone?.();
  signaling?.send('status', { status: micActive ? 'transmitindo' : 'conectado' });
  setStatus(
    micActive
      ? 'Microfone ativo - selecione a tela novamente para compartilhar'
      : 'Compartilhamento encerrado - use o painel para compartilhar novamente'
  );
  updateClientStates(micActive ? 'sharing' : 'sharing');
  vu.detach();
  showIdentifyStep();
  await attachVuMeterIfNeeded();
});

function teardownClientSessionSync() {
  if (signaling?.ws) {
    try {
      signaling.intentionalClose = true;
      signaling.ws.close(1000, 'Pagina encerrada');
    } catch (_) {}
  }
}

window.addEventListener('pagehide', () => {
  vu.detach();
  teardownClientSessionSync();
});

window.addEventListener('beforeunload', () => {
  vu.detach();
  teardownClientSessionSync();
});

window.addEventListener('pageshow', async (event) => {
  if (!event.persisted) return;
  resetClientPageState();
  await teardownClientSession({ keepDisplayStream: false });
  showIdentifyStep();
  setStatus('Sessao restaurada - selecione a tela novamente');
});

initOnboarding();
verifyServerBuild({
  onToast: (m, t) => showToast(m, t),
  onTitlePrefix: (prefix) => {
    document.title = prefix + (document.title.replace(/^\[[^\]]+\]\s*/, '') || 'ShareScreen Client');
  }
});

async function unlockClientRemoteAudio() {
  const confirmed = await roomAudioMonitor?.resume();
  els.audio?.play?.().catch(() => {});
  vu.resume();
  attachVuMeterIfNeeded();
  if (media?.hasPendingMicFilterRestore?.()) {
    await media.recoverMicPublicationIfNeeded().catch((e) => errors.handle(e, 'mic-publish-recover'));
  }
  if (confirmed || roomAudioMonitor?.isPlaybackConfirmed?.()) {
    clientMicAutoplayNeeded = false;
    updateClientMicUi();
    updateActivateAudioUi();
    return true;
  }
  updateActivateAudioUi();
  return false;
}

installAudioUnlock(() => unlockClientRemoteAudio());
els.btnActivateAudio?.addEventListener('click', () => unlockClientRemoteAudio());