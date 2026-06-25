import { SignalingClient, ConnectionState, wsUrl } from '../shared/signaling-client.js';
import { MediaClient } from '../shared/media-client.js';
import { normalizeTransmission, hasActiveVideo, parseRoomSnapshot, roomSnapshotMediaKey } from '../shared/transmission.js';
import {
  loadCapturePrefs,
  saveCapturePrefs,
  setupMicrophonePicker,
  populateMicrophoneSelect,
  VuMeter,
  acquireMicrophoneTrack,
  installAudioUnlock
} from '../shared/audio-manager.js';
import { ErrorManager, assertSecureContext } from '../shared/error-manager.js';
import {
  mergeServerQuality,
  loadPresetId,
  savePresetId,
  buildDisplayConstraintsWithAudio
} from '../shared/quality-manager.js';
import { showToast } from '../shared/toast.js';
import { HostAudioMonitor } from '../shared/host-audio-monitor.js';
import { normalizeRemoteAudioSources } from '../shared/audio-sources.js';
import { isSelectableSource, sortDisplaySources } from '../shared/display-sources.js';
import { buildDisplaySourceCard } from '../shared/source-cards.js';
import { initCoHost } from '../host/app.js';
import { hideLtOverlay, bindLtOverlayResize } from '../shared/lt-overlay.js';
import { updateStreamSourceBadge } from '../shared/stream-source-badge.js';

const STORAGE_NAME = 'sharescreen_client_name';
const STORAGE_MACHINE = 'sharescreen_agent_hostname';

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
  btnSettings: $('btn-settings'),
  settingsModal: $('settings-modal'),
  settingsNomeInput: $('settings-nome-input'),
  settingsChkSystem: $('settings-chk-system-audio'),
  settingsChkMic: $('settings-chk-microphone'),
  settingsMicWrap: $('settings-mic-picker-wrap'),
  settingsMicSelect: $('settings-mic-select'),
  settingsBtnRefreshMics: $('settings-btn-refresh-mics'),
  btnSettingsSave: $('btn-settings-save'),
  btnSettingsClose: $('btn-settings-close'),
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
let agentHostname = readQueryParam('maquina') || localStorage.getItem(STORAGE_MACHINE) || '';
let transmissionWork = Promise.resolve();
let transmissionGeneration = 0;
let lastConsumedSelectionKey = '';
let sessionStarted = false;
let sessionReady = false;
let viewerOnly = false;
let pendingTransmission = null;
let pendingAudioSources = null;
let pendingRoomSnapshot = null;
let lastAppliedSnapshotKey = '';
let roomAudioMonitor = null;
let clientMicAutoplayNeeded = false;
let syncClientAudioPromise = null;
let syncClientAudioPending = false;
let lastAudioSources = [];
let deferScreenShareOnJoin = false;
let lastActiveTransmission = null;
let pendingPostPublishRemoteWork = null;
let clientDisplayStream = null;
let clientMicTrack = null;
let clientJoinInProgress = false;
let bootstrapping = false;
let joinInFlight = false;
let bootstrapPromise = null;
let clientJoinPromise = null;
let roomPin = readQueryParam('pin') || '';
let displayControlActive = false;
let displaySources = [];
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

const errors = new ErrorManager({
  onToast: (m, t) => showToast(m, t),
  onTechnicalLog: (m) => console.error(m)
});

if (readQueryParam('nome') && !readQueryParam('token')) {
  localStorage.setItem(STORAGE_NAME, readQueryParam('nome'));
}
if (readQueryParam('maquina')) localStorage.setItem(STORAGE_MACHINE, readQueryParam('maquina'));

bindLtOverlayResize(els.previewArea);

function transmissionSelectionKey(tx) {
  const n = normalizeTransmission(tx);
  return [
    n.selectedPeerId || '',
    n.producerIds?.video || '',
    n.paused ? '1' : '0'
  ].join(':');
}

function updateClientStreamBadge(tx) {
  const raw = tx ?? lastActiveTransmission;
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
  updateStreamSourceBadge(els.streamSourceBadge, normalized.peerName, true);
}

function applyLtOverlayForTransmission(tx) {
  updateClientStreamBadge(tx);
  hideLtOverlay();
}

const capturePrefs = loadCapturePrefs();
if (els.chkSystemAudio) els.chkSystemAudio.checked = capturePrefs.systemAudio !== false;
if (els.chkMicrophone) els.chkMicrophone.checked = !!capturePrefs.microphone;

setupMicrophonePicker({
  checkbox: els.chkMicrophone,
  wrap: els.micWrap,
  select: els.micSelect,
  refreshBtn: els.btnRefreshMics,
  savedDeviceId: capturePrefs.microphoneDeviceId || '',
  onLog: setStatus,
  onError: (m) => showErro(m)
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
});
els.chkSystemAudio?.addEventListener('change', () => saveCapturePrefs(getCapturePrefsFromUi()));

setupMicrophonePicker({
  checkbox: els.settingsChkMic,
  wrap: els.settingsMicWrap,
  select: els.settingsMicSelect,
  refreshBtn: els.settingsBtnRefreshMics,
  savedDeviceId: capturePrefs.microphoneDeviceId || '',
  onLog: setStatus,
  onError: (m) => showErro(m)
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
      await roomAudioMonitor?.resume();
      roomAudioMonitor?.connectOutput(els.audio);
      await els.audio?.play();
      clientMicAutoplayNeeded = false;
      updateClientMicUi();
      showToast('Audio ativado', 'success');
      return;
    }
    if (!media?.hasPublishedMicrophone?.()) return;
    media.togglePublishedAudioMuted();
    updateClientMicUi();
    showToast(media.isPublishedAudioMuted() ? 'Microfone silenciado' : 'Microfone ativado', 'info');
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

async function openSettingsModal() {
  const prefs = loadCapturePrefs();
  applyCapturePrefsToUi(prefs);
  if (els.settingsNomeInput) els.settingsNomeInput.value = displayName || getNome();
  try {
    await populateMicrophoneSelect(els.settingsMicSelect, {
      deviceId: prefs.microphoneDeviceId || '',
      onLog: setStatus
    });
    if (prefs.microphoneDeviceId) {
      els.settingsMicSelect.value = prefs.microphoneDeviceId;
    }
  } catch (e) {
    showToast('Nao foi possivel listar microfones', 'warn');
  }
  if (els.settingsModal) els.settingsModal.hidden = false;
}

function closeSettingsModal() {
  if (els.settingsModal) els.settingsModal.hidden = true;
}

function saveSettingsModal() {
  const prefs = getSettingsPrefsFromModal();
  const newName = els.settingsNomeInput?.value?.trim();
  if (newName) {
    displayName = newName;
    localStorage.setItem(STORAGE_NAME, newName);
    if (els.nomeInput) els.nomeInput.value = newName;
    if (signaling?.authenticated) {
      signaling.send('atualizarNome', { nome: newName });
    }
    fetch('/api/registro-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: newName })
    }).catch(() => {});
  }
  applyCapturePrefsToUi(prefs);
  saveCapturePrefs(prefs);
  closeSettingsModal();
  if (sessionReady && media && !viewerOnly) {
    media
      .syncPublishedAudio(prefs)
      .then(() => {
        attachVuMeterIfNeeded();
        updateClientMicUi();
      })
      .catch((e) => errors.handle(e, 'audio-prefs'));
  }
}

function onRemoteAudioAutoplayBlocked() {
  clientMicAutoplayNeeded = true;
  updateClientMicUi();
}

function ensureClientAudioMonitor() {
  if (!media) return null;
  if (!roomAudioMonitor) {
    roomAudioMonitor = new HostAudioMonitor(media, {
      excludePeerId: peerId,
      onAutoplayBlocked: onRemoteAudioAutoplayBlocked
    });
    roomAudioMonitor.connectOutput(els.audio);
    roomAudioMonitor.setManualMuted(mutedClients);
  } else if (peerId) {
    roomAudioMonitor.excludePeerId = String(peerId);
  }
  return roomAudioMonitor;
}

async function syncClientAudioMonitor(sources) {
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
      const list = normalizeRemoteAudioSources(
        sources?.length ? sources : lastAudioSources,
        { excludePeerId: peerId }
      );
      if (sources?.length) lastAudioSources = sources;
      await monitor.syncFromSources(list);
      monitor.connectOutput(els.audio);
      await monitor.resume();
      if (monitor.isAutoplayBlocked?.() || (monitor.channelCount > 0 && els.audio?.paused)) {
        onRemoteAudioAutoplayBlocked();
      } else if (!monitor.channelCount) {
        clientMicAutoplayNeeded = false;
        updateClientMicUi();
      }
      setStatus(`Audio remoto: ${monitor.channelCount} fonte(s)`);
    } while (syncClientAudioPending);
  })().finally(() => {
    syncClientAudioPromise = null;
  });
  return syncClientAudioPromise;
}

function resetClientPageState() {
  clientJoinInProgress = false;
  bootstrapping = false;
  pendingTransmission = null;
  pendingAudioSources = null;
  pendingRoomSnapshot = null;
  lastAppliedSnapshotKey = '';
  deferScreenShareOnJoin = false;
  lastActiveTransmission = null;
  pendingPostPublishRemoteWork = null;
  lastConsumedSelectionKey = '';
  transmissionGeneration = 0;
}

function releaseClientMicTrack() {
  vu.detach();
  if (!clientMicTrack) return;
  try {
    clientMicTrack.stop();
  } catch (_) {}
  clientMicTrack = null;
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
  await roomAudioMonitor?.dispose();
  roomAudioMonitor = null;
  await media?.dispose({
    keepLocalScreenStream: keepDisplayStream,
    keepMicTrack
  });
  media = null;
  if (signaling) {
    signaling.close();
    signaling = null;
  }
  peerId = null;
  sessionStarted = false;
  sessionReady = false;
  joinInFlight = false;
  if (!keepDisplayStream) {
    clientDisplayStream?.getTracks?.().forEach((t) => t.stop());
    clientDisplayStream = null;
    onboardStep = 'identify';
  }
  if (!keepMicTrack) {
    releaseClientMicTrack();
  }
}

function hasPendingDisplayStream() {
  return clientDisplayStream?.getVideoTracks?.().some((t) => t.readyState === 'live');
}

function showIdentifyStep() {
  onboardStep = 'identify';
  if (els.overlay) els.overlay.hidden = false;
  if (els.onboardStepIdentify) els.onboardStepIdentify.hidden = false;
  if (els.onboardStepAudio) els.onboardStepAudio.hidden = true;
  if (els.onboardStepsIdentify) els.onboardStepsIdentify.hidden = false;
  if (els.onboardStepsAudio) els.onboardStepsAudio.hidden = true;
  if (els.btnSalvarNome) els.btnSalvarNome.textContent = 'Selecionar tela para compartilhar';
  if (els.onboardIntro) {
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
  if (els.chkMicrophone && !els.chkMicrophone.checked) {
    els.chkMicrophone.checked = true;
    saveCapturePrefs(getCapturePrefsFromUi());
  }
  if (els.micWrap) els.micWrap.hidden = false;
  populateMicrophoneSelect(els.micSelect, {
    deviceId: loadCapturePrefs().microphoneDeviceId || '',
    onLog: setStatus
  }).catch(() => {});
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

async function captureScreenFirst() {
  if (!media?.hasVideoProducer?.()) {
    await teardownClientSession({ keepDisplayStream: false });
  }
  clientJoinInProgress = true;
  hideOverlay();
  try {
    const stream = await promptDisplayCapture({
      systemAudio: true,
      microphone: false
    });
    clientDisplayStream = stream;
    showAudioStep();
    await attachVuMeterIfNeeded();
    setStatus('Tela capturada - configure o audio e confirme');
  } catch (e) {
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
    clientJoinInProgress = false;
  }
}

async function confirmAudioAndTransmit() {
  if (clientJoinInProgress || bootstrapping) return;

  const prefs = getCapturePrefsFromUi();
  saveCapturePrefs(prefs);

  if (!hasPendingDisplayStream()) {
    onboardStep = 'identify';
    clientDisplayStream = null;
    showIdentifyStep();
    showToast('Selecione a tela novamente', 'warn');
    return;
  }

  clientJoinInProgress = true;
  hideOverlay();
  setStatus('Conectando...');
  try {
    let prefetchedMicTrack = null;
    if (prefs.microphone) {
      prefetchedMicTrack = await ensureClientMicTrack(prefs.microphoneDeviceId || '');
      if (!prefetchedMicTrack || prefetchedMicTrack.readyState !== 'live') {
        throw new Error('Nao foi possivel capturar o microfone - verifique permissoes');
      }
    }

    const publishPrefs = prefetchedMicTrack
      ? { ...prefs, prefetchedMicTrack }
      : prefs;
    const stream = clientDisplayStream;
    await teardownClientSession({ keepDisplayStream: true, keepMicTrack: !!prefetchedMicTrack });
    clientDisplayStream = stream;
    await bootstrap(false, { deferScreenShare: true });
    if (!media) throw new Error('Sessao de midia nao iniciada');
    if (!hasPendingDisplayStream()) {
      throw new Error('Captura de tela expirada - selecione a tela novamente');
    }
    await media.publishDisplayStream(clientDisplayStream, publishPrefs);
    if (!media.hasVideoProducer()) {
      throw new Error('Falha ao publicar video - tente novamente');
    }
    if (prefs.microphone && !media.hasPublishedMicrophone()) {
      throw new Error('Microfone nao publicado - verifique permissoes do navegador');
    }
    signaling.send('status', { status: 'transmitindo' });
    await flushPostPublishRemoteWork();
    updateClientStateAfterPublish();
    updateClientMicUi();
    await attachVuMeterIfNeeded();
    onboardStep = 'identify';
    const activeTx = lastActiveTransmission;
    const watchingRemote =
      activeTx &&
      hasActiveVideo(activeTx) &&
      String(activeTx.selectedPeerId) !== String(peerId);
    if (!watchingRemote) {
      setStatus(
        prefs.microphone
          ? 'Transmitindo com microfone - aguardando selecao do host'
          : 'Transmitindo - aguardando selecao do host'
      );
    }
    if (prefs.microphone) {
      showToast('Microfone publicado com sucesso', 'success');
    }
  } catch (e) {
    showAudioStep();
    errors.handle(e, 'compartilhar');
    showErro(e.message);
  } finally {
    clientJoinInProgress = false;
  }
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
  try {
    const reg = await fetch('/api/registro-cliente').then((r) => r.json());
    if (reg?.nome) return reg.nome;
  } catch (_) {}

  const cached = localStorage.getItem(STORAGE_NAME);
  if (!cached) return null;

  try {
    const res = await fetch('/api/registro-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: cached })
    });
    const data = await res.json();
    if (data?.ok) return data.nome || data.name || cached;
  } catch (_) {}

  return null;
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

function updateClientStates(mode) {
  els.stateSharing.hidden = mode !== 'sharing';
  els.stateSelected.hidden = mode !== 'selected';
  els.stateWatching.hidden = mode !== 'watching';
  els.stateWaiting.hidden = mode !== 'waiting';
  els.statePaused.hidden = mode !== 'paused';
  if (els.stateInterrupted) els.stateInterrupted.hidden = mode !== 'interrupted';
  if (els.stateFinalized) els.stateFinalized.hidden = mode !== 'finalized';
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

  if (!window.isSecureContext && els.insecureWarning) {
    els.insecureWarning.hidden = false;
  }

  try {
    const info = await fetch('/api/info').then((r) => r.json());
    if (info.roomPinRequired && els.pinWrap && !viewerAccessToken) {
      els.pinWrap.hidden = false;
    }
  } catch (_) {}

  if (hasExternalAccessToken) {
    const nomeUrl = readQueryParam('nome');
    displayName = nomeUrl || displayName || '';
    if (displayName && els.nomeInput) {
      els.nomeInput.value = displayName;
    }
    if (displayName) {
      hideOverlay();
      await salvarEIniciar(false);
      return;
    }
    showIdentifyStep();
    els.nomeInput?.focus();
    return;
  }

  if (autoViewerEntry) {
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

  if (displayName && els.nomeInput) {
    els.nomeInput.value = displayName;
  }

  if (!hasExternalAccessToken && !autoViewerEntry) {
    const resolved = await resolveClientNameFromServer();
    if (resolved) {
      displayName = resolved;
      localStorage.setItem(STORAGE_NAME, resolved);
      if (els.nomeInput) els.nomeInput.value = resolved;
      hideOverlay();
      await salvarEIniciar(false);
      return;
    }
  }

  showIdentifyStep();
  if (!displayName) els.nomeInput?.focus();
}

async function salvarEIniciar(asViewer = false) {
  if (clientJoinInProgress) return;

  const nome = getNome();
  if (!nome) {
    showToast('Informe um nome para este computador', 'error');
    els.nomeInput?.focus();
    return;
  }
  displayName = nome;
  localStorage.setItem(STORAGE_NAME, nome);
  try {
    await fetch('/api/registro-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    });
  } catch (_) {}
  roomPin = els.clientPinInput?.value?.trim() || roomPin;

  if (asViewer || els.chkViewerOnly?.checked) {
    viewerOnly = true;
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

  if (sessionStarted && signaling?.connected && media?.hasVideoProducer?.()) {
    hideOverlay();
    signaling.send('atualizarNome', { nome });
    media.syncPublishedAudio(getCapturePrefsFromUi()).catch((e) => errors.handle(e, 'audio-prefs'));
    return;
  }

  if (onboardStep === 'audio' && hasPendingDisplayStream()) {
    if (clientJoinInProgress || bootstrapping) return;
    await confirmAudioAndTransmit();
    return;
  }

  await captureScreenFirst();
}

els.btnSalvarNome?.addEventListener('click', () => salvarEIniciar(false));
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
  const tx = lastActiveTransmission;
  if (tx && hasActiveVideo(tx) && String(tx.selectedPeerId) === String(peerId)) {
    updateClientStates('selected');
    setStatus('Voce esta selecionado - transmitindo para todos');
    return;
  }
  if (tx && hasActiveVideo(tx) && String(tx.selectedPeerId) !== String(peerId)) {
    updateClientStates('watching');
    if (els.stateWatching) els.stateWatching.hidden = true;
    return;
  }
  updateClientStates('sharing');
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

  if (parsed.displayControl) {
    applyDisplayControlUpdate(parsed.displayControl);
  }

  lastActiveTransmission = parsed.transmission;
  if (parsed.audioSources?.length) {
    lastAudioSources = parsed.audioSources;
  }

  if (!sessionReady) {
    pendingRoomSnapshot = snapshot;
    pendingTransmission = parsed.transmission;
    pendingAudioSources = parsed.audioSources;
    return;
  }

  if (!force && mediaKey && mediaKey === lastAppliedSnapshotKey) {
    return;
  }
  lastAppliedSnapshotKey = mediaKey;

  await applyTransmission(parsed.transmission);
  await syncClientAudioMonitor(parsed.audioSources).catch((e) =>
    errors.handle(e, 'audio-sync')
  );
}

async function reconcileRemoteMediaState() {
  lastConsumedSelectionKey = '';
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
  const tx = pendingTransmission || lastActiveTransmission;
  if (tx) {
    lastActiveTransmission = normalizeTransmission(tx);
    await applyTransmission(tx);
  }
  const audio = pendingAudioSources?.length ? pendingAudioSources : lastAudioSources;
  if (audio?.length) {
    await syncClientAudioMonitor(audio).catch((e) => errors.handle(e, 'audio-sync'));
  }
  pendingTransmission = null;
  pendingAudioSources = null;
}

async function applyPendingRemoteJoinState(tx, audio) {
  if (tx) {
    await applyTransmission(tx);
    debugClientLog('H2', 'applyPendingRemoteJoinState tx', {
      selectedPeerId: tx?.selectedPeerId,
      peerId,
      hasVideo: !!(tx?.producerIds?.video || tx?.producerId)
    });
  }
  if (audio?.length) {
    await syncClientAudioMonitor(audio).catch((e) => errors.handle(e, 'audio-sync'));
  }
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

async function schedulePostJoinWork({ skipRemoteMedia = false } = {}) {
  if (skipRemoteMedia && !viewerOnly) {
    pendingPostPublishRemoteWork = () => reconcileRemoteMediaState();
    debugClientLog('H2', 'schedulePostJoinWork deferred', { peerId, viewerOnly });
    return;
  }

  debugClientLog('H2', 'schedulePostJoinWork', {
    skipRemoteMedia,
    hasTx: !!(pendingTransmission || lastActiveTransmission),
    hasAudio: !!(pendingAudioSources?.length || lastAudioSources?.length),
    viewerOnly,
    peerId
  });

  await reconcileRemoteMediaState();
}

async function bootstrap(isViewer, { deferScreenShare = false } = {}) {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    viewerOnly = isViewer;
    deferScreenShareOnJoin = deferScreenShare;

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
      signaling.enableReconnect = true;
      await schedulePostJoinWork({ skipRemoteMedia: deferScreenShare });
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
  if (joinInFlight) return;
  joinInFlight = true;
  try {
    sessionReady = false;
    hideErro();

    const entrouPromise = signaling.onceType('entrou');
    signaling.send(
      'entrar',
      {
        papel: 'client',
        nome: getNome(),
        maquina: agentHostname,
        pin: roomPin || undefined,
        viewerToken: viewerAccessToken || undefined
      },
      { critical: true }
    );

    const payload = await entrouPromise;
    peerId = payload.peerId;
    signaling.markAuthenticated(true);

    media = new MediaClient(signaling, {
      splitRecvTransports: false,
      onLog: (m, l) => setStatus(m)
    });
    await media.loadDevice(payload.rtpCapabilities);
    media.setVideoQuality(mergeServerQuality(payload.videoQuality, loadPresetId()));
    await media.ensureRecvTransport();

    if (!viewerOnly) {
      assertSecureContext();
      await media.ensureSendTransport();
      const deferShare = deferScreenShareOnJoin;
      deferScreenShareOnJoin = false;
      if (deferShare) {
        setStatus('Conectado - publicando tela...');
        const joinPrefs = getCapturePrefsFromUi();
        if (joinPrefs.microphone) {
          await media.publishMicrophone(joinPrefs);
        }
      } else {
        setStatus('Selecione a tela para compartilhar...');
        await media.startScreenShare(getCapturePrefsFromUi());
        clientDisplayStream = media.localScreenStream;
        const joinPrefs = getCapturePrefsFromUi();
        if (joinPrefs.microphone && !media.hasPublishedMicrophone()) {
          await media.publishMicrophone(joinPrefs);
        }
        signaling.send('status', { status: 'transmitindo' });
        updateClientStates('sharing');
        updateClientMicUi();
        await attachVuMeterIfNeeded();
      }
    } else {
      setStatus('Modo espectador - aguardando transmissao');
      updateClientStates('waiting');
    }

    sessionStarted = true;
    sessionReady = true;
    setBadge('Online', 'online');

    if (pendingRoomSnapshot || pendingTransmission || pendingAudioSources?.length) {
      await reconcileRemoteMediaState();
    }
  } finally {
    joinInFlight = false;
  }
}

async function joinAndStart() {
  return executeJoinAndStart();
}

async function rejoinSession() {
  if (joinInFlight || clientJoinInProgress || bootstrapping) return;
  joinInFlight = true;
  sessionReady = false;
  lastAppliedSnapshotKey = '';
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
  await media?.dispose({
    keepLocalScreenStream: !!stream,
    keepMicTrack: clientMicTrack?.readyState === 'live'
  });
  media = null;
  peerId = null;

  const entrouPromise = signaling.onceType('entrou');
  signaling.send(
    'entrar',
    {
      papel: 'client',
      nome: getNome(),
      maquina: agentHostname,
      pin: roomPin || undefined,
      viewerToken: viewerAccessToken || undefined
    },
    { critical: true }
  );

  const payload = await entrouPromise;
  peerId = payload.peerId;
  signaling.markAuthenticated(true);

  media = new MediaClient(signaling, {
    splitRecvTransports: false,
    onLog: (m, l) => setStatus(m)
  });
  await media.loadDevice(payload.rtpCapabilities);
  media.setVideoQuality(mergeServerQuality(payload.videoQuality, loadPresetId()));
  await media.ensureRecvTransport();

  if (!viewerOnly) {
    await media.ensureSendTransport();
  }

  sessionStarted = true;
  sessionReady = true;
  setBadge('Online', 'online');

  if (!viewerOnly) {
    if (stream) {
      clientDisplayStream = stream;
      await media.publishDisplayStream(stream, publishPrefs);
      if (prefs.microphone && !media.hasPublishedMicrophone()) {
        await media.publishMicrophone(publishPrefs);
      }
      if (!media.hasVideoProducer()) {
        throw new Error('Falha ao republicar video apos reconexao');
      }
      signaling.send('status', { status: 'transmitindo' });
      setStatus('Transmitindo - reconectado');
    } else {
      setStatus('Reconectado - selecione a tela novamente');
      onboardStep = 'identify';
      showIdentifyStep();
    }
    await attachVuMeterIfNeeded();
    updateClientMicUi();
  }

  await schedulePostJoinWork();

  if (!viewerOnly && stream) {
    updateClientStateAfterPublish();
  } else if (viewerOnly && (!lastActiveTransmission || !hasActiveVideo(lastActiveTransmission))) {
    setStatus('Modo espectador - aguardando transmissao');
    updateClientStates('waiting');
  }
  } finally {
    joinInFlight = false;
  }
}

function applyDisplayControlUpdate(payload) {
  const { ativo, fontes } = payload || {};
  displayControlActive = !!ativo;
  displaySources = fontes || [];
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

  const sources = sortDisplaySources(displaySources);
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

async function handleServerMessage(msg) {
  if (msg.type === 'estadoSala') {
    await applyRoomSnapshot(msg.payload);
    return;
  }
  if (msg.type === 'clientesSilenciados') {
    const mutedIds = msg.payload?.mutedPeerIds || [];
    mutedClients.clear();
    for (const id of mutedIds) {
      mutedClients.add(String(id));
    }
    applyClientAudioMute();
    return;
  }
  if (msg.type === 'fontesAudio') {
    const sources = msg.payload?.sources || [];
    lastAudioSources = sources;
    if (!sessionReady) {
      pendingAudioSources = sources;
      return;
    }
    await syncClientAudioMonitor(sources);
  }
  if (msg.type === 'transmissaoAtiva') {
    debugClientLog('H2', 'transmissaoAtiva received', {
      selectedPeerId: msg.payload?.selectedPeerId?.slice(0, 8) || null,
      producerVideo: msg.payload?.producerIds?.video?.slice(0, 8) || msg.payload?.producerId?.slice(0, 8) || null,
      hasVideo: !!(msg.payload?.producerIds?.video || msg.payload?.producerId)
    });
    if (!sessionReady) {
      pendingTransmission = msg.payload;
      lastActiveTransmission = normalizeTransmission(msg.payload);
      return;
    }
    const key = roomSnapshotMediaKey({
      transmission: msg.payload,
      audioSources: lastAudioSources
    });
    if (key === lastAppliedSnapshotKey) return;
    lastAppliedSnapshotKey = key;
    await applyTransmission(msg.payload);
  }
  if (msg.type === 'erro' && sessionReady) {
    errors.handle(new Error(msg.payload?.mensagem), 'servidor');
    showErro(msg.payload?.mensagem);
  }
  if (msg.type === 'consumerFechado') {
    const consumerId = msg.payload?.consumerId;
    if (consumerId) {
      await roomAudioMonitor?.removeByConsumerId(consumerId);
    }
    const wasVideoConsumer = media?.remoteConsumers?.video?.id === consumerId;
    if (wasVideoConsumer) {
      media.remoteConsumers.video = null;
      if (els.video) els.video.srcObject = null;
      lastConsumedSelectionKey = '';
      setStatus('Stream remota encerrada');
      if (lastActiveTransmission && hasActiveVideo(lastActiveTransmission)) {
        await applyTransmission(lastActiveTransmission);
      } else {
        hideLtOverlay();
        updateClientStreamBadge(null);
        updateClientStates(viewerOnly ? 'waiting' : 'sharing');
      }
    }
    await syncClientAudioMonitor(lastAudioSources).catch((e) =>
      errors.handle(e, 'audio-sync')
    );
  }
  if (msg.type === 'qualidadeAtualizada') {
    const presetId = msg.payload?.presetId;
    if (!presetId) return;
    savePresetId(presetId);
    if (media) {
      media.setVideoQuality(mergeServerQuality(media.videoQuality, presetId));
    }
    showToast(
      'Qualidade atualizada pelo host - recompartilhe a tela para aplicar',
      'info'
    );
  }
  if (msg.type === 'controleExibicaoAtualizado') {
    applyDisplayControlUpdate(msg.payload);
  }
  if (msg.type === 'promovidoCoHost') {
    initCoHost(signaling, media, peerId);
  }
  if (msg.type === 'demovidoCoHost') {
    if (els.sidebar) els.sidebar.hidden = true;
    const mainEl = els.clientMain || document.querySelector('.client-main');
    mainEl?.classList.remove('sidebar-open');
    mainEl?.classList.remove('sidebar-collapsed');
    els.sidebar?.classList.remove('is-collapsed');
  }
}

function queueTransmission(raw) {
  const gen = ++transmissionGeneration;
  transmissionWork = transmissionWork
    .then(() => runTransmission(raw, gen))
    .catch((e) => {
      const entry = errors.handle(e, 'consume');
      showErro(entry.friendly, entry.technical);
    });
}

async function runTransmission(raw, gen = transmissionGeneration) {
  if (gen !== transmissionGeneration) return;

  const tx = normalizeTransmission(raw);
  lastActiveTransmission = tx;
  const selectionKey = transmissionSelectionKey(tx);

  debugClientLog('H2', 'runTransmission', {
    selectedPeerId: tx.selectedPeerId?.slice(0, 8) || null,
    peerId: peerId?.slice(0, 8) || null,
    hasActiveVideo: hasActiveVideo(tx),
    selectionKey
  });

  try {
    if (!hasActiveVideo(tx)) {
      lastConsumedSelectionKey = '';
      await media?.detachMedia({ videoEl: els.video, audioEl: null });
      hideLtOverlay();
      updateClientStreamBadge(tx);
      if (tx.interrompidaPor) {
        if (els.interruptedMessage) {
          els.interruptedMessage.textContent = `Transmissao interrompida por ${tx.interrompidaPor}`;
        }
        updateClientStates('interrupted');
      } else if (tx.finalizadaPor) {
        if (els.finalizedMessage) {
          els.finalizedMessage.textContent = `Transmissao finalizada por ${tx.finalizadaPor}`;
        }
        updateClientStates('finalized');
      } else {
        updateClientStates(tx.paused ? 'paused' : viewerOnly ? 'waiting' : 'sharing');
      }
      if (lastAudioSources.length) {
        await syncClientAudioMonitor(lastAudioSources).catch((e) => errors.handle(e, 'audio-sync'));
      }
      return;
    }

    const isSelectedSelf = String(tx.selectedPeerId) === String(peerId);

    updateClientStates(isSelectedSelf && !tx.paused ? 'selected' : tx.paused ? 'paused' : 'watching');
    if (isSelectedSelf && !tx.paused) {
      setStatus('Voc\u00ea est\u00e1 selecionado \u2014 transmitindo para todos');
    } else {
      if (els.watchingLabel) els.watchingLabel.textContent = tx.peerName || 'Transmiss\u00e3o ativa';
      setStatus(tx.paused ? 'Transmiss\u00e3o pausada pelo host' : `Assistindo: ${tx.peerName || 'fonte'}`);
    }

    const nextVideoProducer = tx.producerIds?.video;
    if (nextVideoProducer && !tx.paused && media) {
      if (gen !== transmissionGeneration) return;

      const currentProducerId = media.remoteConsumers?.video?.producerId;
      const needsConsume =
        !currentProducerId ||
        currentProducerId !== nextVideoProducer ||
        media.remoteConsumers.video?.closed ||
        !els.video?.srcObject;

      if (needsConsume) {
        debugClientLog('H1', 'runTransmission consume start', {
          producerVideo: nextVideoProducer.slice(0, 8),
          selectionKey
        });
        await media.consumeRemoteMedia(tx.producerIds, {
          videoEl: els.video,
          audioEl: null
        });
        lastConsumedSelectionKey = selectionKey;
      }
      try {
        await els.video?.play?.();
      } catch (_) {}
    }

    applyLtOverlayForTransmission(tx);
    els.stateWatching.hidden = true;
    await syncClientAudioMonitor(lastAudioSources).catch((e) => errors.handle(e, 'audio-sync'));
  } catch (e) {
    debugClientLog('D', 'runTransmission consume failed', {
      error: String(e?.message || e),
      name: e?.name || ''
    });
    if (e.message?.includes('Autoplay') || e.name === 'NotAllowedError') {
      clientMicAutoplayNeeded = true;
      updateClientMicUi();
    }
    throw e;
  }
}

function applyTransmission(raw) {
  queueTransmission(raw);
  return transmissionWork;
}

els.btnSettings?.addEventListener('click', () => openSettingsModal());
els.btnSettingsSave?.addEventListener('click', () => saveSettingsModal());
els.btnSettingsClose?.addEventListener('click', () => closeSettingsModal());

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
  const prefs = getCapturePrefsFromUi();
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

installAudioUnlock(() => {
  roomAudioMonitor?.resume();
  els.audio?.play?.().catch(() => {});
  if (roomAudioMonitor && !roomAudioMonitor.isAutoplayBlocked?.()) {
    clientMicAutoplayNeeded = false;
    updateClientMicUi();
  }
  vu.resume();
  attachVuMeterIfNeeded();
});