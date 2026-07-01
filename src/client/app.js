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
import { ErrorManager, assertSecureContext } from '../shared/error-manager.js';
import {
  mergeServerQuality,
  loadPresetId,
  savePresetId,
  buildDisplayConstraintsWithAudio
} from '../shared/quality-manager.js';
import { showToast } from '../shared/toast.js';
import { HostAudioMonitor } from '../shared/host-audio-monitor.js';
import { normalizeRemoteAudioSources, audioTraceSync, audioTrace, audioSourcesSignature } from '../shared/audio-sources.js';
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
let pendingTransmission = null;
let pendingAudioSources = null;
let pendingRoomSnapshot = null;
let pendingMicrophoneFilterPrefs = null;
let sessionStarted = false;
let sessionReady = false;
let viewerOnly = false;
let roomAudioMonitor = null;
let clientMicAutoplayNeeded = false;
let syncClientAudioPromise = null;
let syncClientAudioPending = false;
let lastAudioSources = [];
let lastAppliedAudioSig = '';
let fontesAudioDebounceTimer = null;
let hostPeerId = null;
let audioHealthTimer = null;
let deferScreenShareOnJoin = false;
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

function updateClientStates(mode, _tx, opts = {}) {
  els.stateSharing.hidden = mode !== 'sharing';
  els.stateSelected.hidden = mode !== 'selected';
  els.stateWatching.hidden = mode !== 'watching' || !!opts.hideWatchingBanner;
  els.stateWaiting.hidden = mode !== 'waiting';
  els.statePaused.hidden = mode !== 'paused';
  if (els.stateInterrupted) els.stateInterrupted.hidden = mode !== 'interrupted';
  if (els.stateFinalized) els.stateFinalized.hidden = mode !== 'finalized';
}

const txSync = new TransmissionSync({
  getMedia: () => media,
  getVideoEl: () => els.video,
  getPeerId: () => peerId,
  isViewerOnly: () => viewerOnly,
  onStateChange: (mode, _tx, opts) => updateClientStates(mode, _tx, opts),
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



function expectedAudioSourceCount() {
  return normalizeRemoteAudioSources(lastAudioSources, { excludePeerId: peerId }).length;
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

  const list = normalizeRemoteAudioSources(lastAudioSources, { excludePeerId: peerId });
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
    if (active < expected) {
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
      pinnedPeerIds: hostPeerId ? [hostPeerId] : [],
      onAutoplayBlocked: onRemoteAudioAutoplayBlocked
    });
    roomAudioMonitor.connectOutput(els.audio);
    roomAudioMonitor.setManualMuted(mutedClients);
  } else if (peerId) {
    roomAudioMonitor.excludePeerId = String(peerId);
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
      const list = normalizeRemoteAudioSources(
        sources?.length ? sources : lastAudioSources,
        { excludePeerId: peerId }
      );
      if (sources?.length) lastAudioSources = sources;
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
          normalizeRemoteAudioSources(lastAudioSources, { excludePeerId: peerId })
        );
      }
      await monitor.recoverOutputIfSilent?.();
      monitor.connectOutput(els.audio);
      await monitor.resume();
      if (monitor.isAutoplayBlocked?.() || (monitor.channelCount > 0 && els.audio?.paused)) {
        onRemoteAudioAutoplayBlocked();
      } else if (!monitor.channelCount) {
        clientMicAutoplayNeeded = false;
        updateClientMicUi();
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
  stopAudioHealthWatchdog();
  if (fontesAudioDebounceTimer) {
    clearTimeout(fontesAudioDebounceTimer);
    fontesAudioDebounceTimer = null;
  }
  lastAppliedAudioSig = '';
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
    if (!media.hasVideoProducer()) {
      if (!hasPendingDisplayStream()) {
        throw new Error('Captura de tela expirada - selecione a tela novamente');
      }
      await media.publishDisplayStream(clientDisplayStream, publishPrefs);
    }
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
    const activeTx = txSync.lastActiveTransmission;
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
  const cached = (localStorage.getItem(STORAGE_NAME) || displayName || '').trim();
  let serverNome = null;
  try {
    const reg = await fetch('/api/registro-cliente').then((r) => r.json());
    serverNome = reg?.nome ? String(reg.nome).trim() : null;
  } catch (_) {}

  const namesMatch = (a, b) =>
    a && b && a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;

  if (cached) {
    if (!namesMatch(cached, serverNome)) {
      try {
        await fetch('/api/registro-cliente', {
          method: 'POST',
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
  if (els.chkViewerOnly) els.chkViewerOnly.checked = false;

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
  const tx = txSync.lastActiveTransmission;
  if (tx && hasActiveVideo(tx) && String(tx.selectedPeerId) === String(peerId)) {
    updateClientStates('selected');
    setStatus('Voce esta selecionado - transmitindo para todos');
    return;
  }
  if (tx && hasActiveVideo(tx) && String(tx.selectedPeerId) !== String(peerId)) {
    updateClientStates('watching', tx, { hideWatchingBanner: true });
    return;
  }
  updateClientStates('sharing');
}

async function applyRoomSnapshot(snapshot, { force = false } = {}) {
  if (!snapshot) return;

  const parsed = parseRoomSnapshot(snapshot);
  applyHostPeerFromSnapshot(parsed);

  if (parsed.mutedPeerIds) {
    mutedClients.clear();
    for (const id of parsed.mutedPeerIds) {
      mutedClients.add(String(id));
    }
    applyClientAudioMute();
  }

  if (parsed.displayControl) {
    applyDisplayControlUpdate(parsed.displayControl);
  }

  if (parsed.audioSources?.length) {
    lastAudioSources = parsed.audioSources;
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
    hasTx: !!(pendingTransmission || txSync.lastActiveTransmission),
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
  let deferredShare = false;
  try {
    sessionReady = false;
    stopAudioHealthWatchdog();
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
      splitRecvTransports: true,
      onLog: (m, l) => setStatus(m)
    });
    await media.loadDevice(payload.rtpCapabilities);
    media.setVideoQuality(mergeServerQuality(payload.videoQuality, loadPresetId()));
    await media.ensureRecvTransport();
    await applyPendingMicrophoneFilters();

    if (!viewerOnly) {
      assertSecureContext();
      await media.ensureSendTransport();
      const deferShare = deferScreenShareOnJoin;
      deferScreenShareOnJoin = false;
      deferredShare = deferShare;
      if (deferShare) {
        const joinPrefs = getCapturePrefsFromUi();
        const publishPrefs =
          clientMicTrack?.readyState === 'live'
            ? { ...joinPrefs, prefetchedMicTrack: clientMicTrack }
            : joinPrefs;
        if (hasPendingDisplayStream()) {
          setStatus('Publicando tela...');
          await media.publishDisplayStream(clientDisplayStream, publishPrefs);
          if (!media.hasVideoProducer()) {
            throw new Error('Falha ao publicar video - tente novamente');
          }
          signaling.send('status', { status: 'transmitindo' });
          updateClientStates('sharing');
          updateClientMicUi();
          await attachVuMeterIfNeeded();
        } else {
          setStatus('Conectado - publicando tela...');
          if (joinPrefs.microphone) {
            await media.publishMicrophone(publishPrefs);
          }
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
    startAudioHealthWatchdog();
    setBadge('Online', 'online');

    if (
      !deferredShare &&
      (pendingRoomSnapshot || pendingTransmission || pendingAudioSources?.length)
    ) {
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
    splitRecvTransports: true,
    onLog: (m, l) => setStatus(m)
  });
  await media.loadDevice(payload.rtpCapabilities);
  media.setVideoQuality(mergeServerQuality(payload.videoQuality, loadPresetId()));
  await media.ensureRecvTransport();
  await applyPendingMicrophoneFilters();

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
  } else if (viewerOnly && (!txSync.lastActiveTransmission || !hasActiveVideo(txSync.lastActiveTransmission))) {
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
  if (msg.type === 'estadoSala') {
    await applyRoomSnapshot(msg.payload);
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
    return;
  }
  if (msg.type === 'erro' && sessionReady) {
    errors.handle(new Error(msg.payload?.mensagem), 'servidor');
    showErro(msg.payload?.mensagem);
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