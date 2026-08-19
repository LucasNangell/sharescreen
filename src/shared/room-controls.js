/**
 * Controles de sala compartilhados entre o painel host e o client co-host.
 * Nao captura midia local: efeitos de mídia passam por hooks.
 */
import { UiStateMachine } from './ui-state.js';
import {
  parseRoomSnapshot,
  resolveRoomClients,
  reconcileRoomClients,
  hasAuthoritativeRoomRoster,
  enrichRoomSourcesState
} from './transmission.js';
import { formatSourceDisplayName, buildDisplaySourceCard } from './source-cards.js';
import { sortDisplaySources, peerHasPublishedAudio } from './display-sources.js';
import { loadPresetId, savePresetId, getPreset, bitrateMbps } from './quality-manager.js';
import {
  CLIENT_MIC_PUBLISH_DEFAULTS,
  SHARED_ROOM_MIC_PRESET,
  normalizeMicrophoneFilterPrefs
} from './mic-dsp.js';
import { fetchClientAudioFilterPreset } from './audio-filter-presets.js';

const MUTE_ICON_ON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c0 3.28-2.64 5.91-5.91 5.91S6.09 14.28 6.09 11H4.07c0 3.95 2.87 7.23 6.65 7.88v2.02h2.56v-2.02c3.78-.65 6.65-3.93 6.65-7.88h-2.02z"/></svg>';
const MUTE_ICON_OFF = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
const PLAY_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
const PAUSE_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';

function snapshotVersion(snapshot, parsed = null) {
  const p = parsed || parseRoomSnapshot(snapshot || {});
  return snapshot?.version || p.version || 0;
}

export function createRoomControls(options = {}) {
  const caps = {
    canManageCoHosts: false,
    audioFilters: false,
    modes: false,
    recording: false,
    ...options.capabilities
  };
  const hooks = options.hooks || {};
  const notify = (message, type) => hooks.notify?.(message, type);
  const $id = (id) => {
    const doc = options.getDoc?.() || document;
    return doc.getElementById(id);
  };

  const ui = options.ui || new UiStateMachine({ onChange: syncControlButtons });
  const mutedClients = options.mutedClients || new Set();
  const cardVuElements = new Map();
  const sentAudioFilterKeys = new Map();

  let estado = { clients: [], selecionado: null, controleExibicao: [] };
  let lastAppliedRoomVersion = 0;
  let mounted = false;
  let bound = false;
  let activeContextClient = null;
  let activeAudioFiltersClient = null;
  let originalAudioFilterPrefs = null;
  let meetBridgeLiveMode = false;
  let sharedRoomMode = false;
  let dominantSpeakerPeerId = null;
  let playbackMuted = false;
  const unsubscribers = [];

  function readEstado() {
    return options.getEstado?.() || estado;
  }

  function writeEstado(next) {
    estado = next;
    options.setEstado?.(next);
  }

  function signaling() {
    return options.getSignaling?.() || null;
  }

  function selfPeerId() {
    return options.getSelfPeerId?.() || null;
  }

  function hostPeerId() {
    return options.getHostPeerId?.() || null;
  }

  function canCommand() {
    if (typeof hooks.canCommand === 'function') return !!hooks.canCommand();
    const sig = signaling();
    return !!(sig?.connected && sig?.authenticated);
  }

  function isHostPeer(c) {
    return !!(
      c?.ehHost ||
      c?.role === 'host' ||
      (hostPeerId() && String(c?.id) === String(hostPeerId()))
    );
  }

  function on(el, type, handler) {
    if (!el) return;
    el.addEventListener(type, handler);
    unsubscribers.push(() => el.removeEventListener(type, handler));
  }

  function syncControlButtons() {
    const btnPausar = $id('btn-pausar');
    const btnRetomar = $id('btn-retomar');
    const btnLimpar = $id('btn-limpar');
    const btnPlayPause = $id('btn-playpause');
    if (btnPausar) {
      btnPausar.disabled = !ui.canPause();
      btnPausar.hidden = ui._flags.isPaused;
    }
    if (btnRetomar) {
      btnRetomar.hidden = !ui._flags.isPaused;
      btnRetomar.disabled = !ui.canResume();
    }
    if (btnLimpar) btnLimpar.disabled = !ui._flags.hasSelection;
    if (btnPlayPause) {
      const isPaused = ui._flags.isPaused;
      btnPlayPause.disabled = isPaused ? !ui.canResume() : !ui.canPause();
      btnPlayPause.title = isPaused ? 'Retomar transmissao' : 'Pausar transmissao';
      btnPlayPause.innerHTML = isPaused ? PLAY_ICON : PAUSE_ICON;
    }
    hooks.onControlButtonsSynced?.(ui);
  }

  function updateQualityHint() {
    const select = $id('quality-preset');
    const hint = $id('quality-hint');
    const preset = getPreset(select?.value || loadPresetId());
    if (hint) hint.textContent = `${preset.description} - ate ${bitrateMbps(preset)} Mbps`;
  }

  async function applyQuality(presetId) {
    savePresetId(presetId);
    updateQualityHint();
    await hooks.onQualityChanged?.(presetId);
    if (canCommand()) {
      signaling()?.send('definirQualidade', { presetId });
    }
    notify(`Qualidade: ${getPreset(presetId).label}`, 'info');
  }

  function toggleClientMute(peerId) {
    const muted = !mutedClients.has(peerId);
    signaling()?.send('definirClientMute', { peerId, muted });
  }

  async function toggleDisplayControl(peerId, ativo) {
    if (!canCommand()) {
      notify('Aguarde a conexao com o servidor', 'warn');
      return;
    }
    const sig = signaling();
    try {
      const resultPromise = sig.onceType('controleExibicaoResultado');
      sig.send('definirControleExibicao', { peerId, ativo });
      const res = await resultPromise;
      if (!res.ok) throw new Error(res.erro || 'Falha ao delegar controle');
      notify(
        ativo ? 'Controle de exibicao delegado ao client' : 'Controle de exibicao revogado',
        'success'
      );
    } catch (e) {
      hooks.onError?.(e, 'controle-exibicao');
      notify(e.message || 'Falha ao delegar controle', 'error');
    }
  }

  async function selectPeer(peerId) {
    if (!canCommand()) {
      notify('Aguarde a conexao com o servidor', 'warn');
      return;
    }
    const sig = signaling();
    try {
      hooks.setStatus?.('Selecionando fonte...');
      const resultPromise = sig.onceType('selecaoResultado');
      sig.send('selecionarClient', { peerId });
      const res = await resultPromise;
      if (!res.ok) throw new Error(res.erro || 'Falha na selecao');
      notify('Fonte selecionada', 'success');
      hooks.setStatus?.('Carregando video da fonte...');
    } catch (e) {
      hooks.onError?.(e, 'selecionar');
      notify(e.message || 'Falha na selecao', 'error');
    }
  }

  async function pauseTransmission() {
    if (!canCommand()) return;
    const sig = signaling();
    const resultPromise = sig.onceType('pausaResultado');
    sig.send('pausarTransmissao', {});
    const r = await resultPromise;
    if (!r.ok) {
      hooks.onError?.(new Error(r.erro), 'pausar');
      return;
    }
    ui.set({ isPaused: true, hasPreview: true });
    hooks.onPaused?.();
    notify('Transmissao pausada', 'info');
  }

  async function resumeTransmission() {
    if (!canCommand()) return;
    const sig = signaling();
    const resultPromise = sig.onceType('retomadaResultado');
    sig.send('retomarTransmissao', {});
    const r = await resultPromise;
    if (!r.ok) {
      hooks.onError?.(new Error(r.erro), 'retomar');
      return;
    }
    ui.set({ isPaused: false });
    hooks.onResumed?.();
    notify('Transmissao retomada', 'success');
  }

  async function clearTransmission() {
    if (!canCommand()) return;
    const sig = signaling();
    const resultPromise = sig.onceType('limpezaResultado');
    sig.send('limparTransmissao', {});
    await resultPromise;
    await hooks.onSelectionCleared?.();
    const next = { ...readEstado(), selecionado: null };
    writeEstado(next);
    ui.set({ hasSelection: false, hasPreview: false });
    renderLista();
  }

  function buildSourceCard(c, onSelect, isTransmissionSection = false) {
    const ownerDocument = options.getDoc?.() || document;
    const card = buildDisplaySourceCard(c, onSelect, {
      noSharingHighlight: !isTransmissionSection,
      ownerDocument,
      decorateBody: (body, source) => {
        if (peerHasPublishedAudio(source)) {
          const isMuted = mutedClients.has(source.id);
          const muteBtn = ownerDocument.createElement('button');
          muteBtn.type = 'button';
          muteBtn.className = `source-mute-btn${isMuted ? ' is-muted' : ''}`;
          const ownMic = isHostPeer(source) || String(source.id) === String(selfPeerId());
          muteBtn.title = isMuted
            ? ownMic
              ? 'Ativar meu microfone'
              : 'Ativar audio'
            : ownMic
              ? 'Silenciar meu microfone'
              : 'Silenciar audio';
          muteBtn.innerHTML = isMuted ? MUTE_ICON_OFF : MUTE_ICON_ON;
          muteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleClientMute(source.id);
          });
          body.append(muteBtn);
        }
        hooks.decorateCardBody?.(body, source, ownerDocument);
      },
      decorateRow: (row, source) => {
        hooks.decorateCardRow?.(row, source, ownerDocument);
        if (!peerHasPublishedAudio(source)) return;
        const vuColumn = ownerDocument.createElement('div');
        vuColumn.className = 'source-vu-column';
        vuColumn.title = 'Nivel de audio';
        const vuFill = ownerDocument.createElement('div');
        vuFill.className = 'source-vu-fill';
        vuColumn.append(vuFill);
        row.append(vuColumn);
        const key = String(source.id);
        if (!cardVuElements.has(key)) cardVuElements.set(key, []);
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

  function updateTransmissionCard() {
    const container = $id('transmission-card-container');
    if (!container) return;
    const cardDoc = container.ownerDocument || document;
    container.innerHTML = '';
    const sel = readEstado().selecionado;
    if (sel && (sel.isProducing || sel.hasVideo || sel.producerIds?.video)) {
      container.appendChild(buildSourceCard(sel, () => {}, true));
    } else {
      const empty = cardDoc.createElement('div');
      empty.className = 'transmission-card-empty';
      empty.textContent = 'Nenhuma transmissao ativa';
      container.appendChild(empty);
    }
  }

  function updateTransmissionSectionVu(level, active) {
    const fill = $id('transmission-vu-fill');
    const col = $id('transmission-vu-column');
    if (!fill || !col) return;
    const pct = Math.min(100, Math.max(0, Math.round(level * 120)));
    fill.style.height = `${pct}%`;
    col.classList.toggle('is-active', active);
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
    const current = readEstado();
    let selectedLevel = 0;
    let selectedActive = false;
    for (const [peerId, info] of levels || []) {
      const id = String(peerId);
      const level = info?.level || 0;
      const active = !!info?.active || level > 0.02;
      if (current.selecionado && String(current.selecionado.id) === id) {
        selectedLevel = level;
        selectedActive = active;
      }
      const list = cardVuElements.get(id) || [];
      const pct = Math.min(100, Math.max(0, Math.round(level * 120)));
      for (const vu of list) {
        if (vu.fill) vu.fill.style.height = `${pct}%`;
        vu.column?.classList.toggle('is-active', active);
      }
    }
    if (current.selecionado) updateTransmissionSectionVu(selectedLevel, selectedActive);
    else updateTransmissionSectionVu(0, false);
    updateDominantSpeakerIndicators();
  }

  function renderLista() {
    const lista = $id('lista-clients');
    if (!lista || !mounted) return;
    const listDoc = lista.ownerDocument || document;
    lista.innerHTML = '';
    cardVuElements.clear();
    const current = readEstado();
    const participants = current.clients || [];
    if (!participants.length) {
      const li = listDoc.createElement('li');
      li.className = 'hint-text';
      li.textContent = 'Nenhuma fonte conectada';
      lista.appendChild(li);
      updateTransmissionCard();
      if (!current.selecionado) updateTransmissionSectionVu(0, false);
      ui.set({
        hasSelection: false,
        isPaused: !!current.selecionado?.pausado
      });
      return;
    }

    for (const c of sortDisplaySources(participants)) {
      lista.appendChild(buildSourceCard(c, (peerId) => selectPeer(peerId), false));
    }
    const selecionadoInfo = $id('selecionado-info');
    if (selecionadoInfo) {
      selecionadoInfo.textContent = current.selecionado
        ? `Selecionado: ${formatSourceDisplayName(current.selecionado)}`
        : 'Nenhuma fonte selecionada';
    }
    updateTransmissionCard();
    if (!current.selecionado) updateTransmissionSectionVu(0, false);
    ui.set({
      hasSelection: !!current.selecionado,
      isPaused: !!current.selecionado?.pausado
    });
    hooks.afterRenderLista?.(current);
  }

  function closeContextMenu() {
    const menu = $id('custom-context-menu');
    if (menu) menu.hidden = true;
    activeContextClient = null;
  }

  function openContextMenu(e, client) {
    activeContextClient = client;
    const menu = $id('custom-context-menu');
    if (!menu) return;
    const isHostCard = isHostPeer(client);
    const isCoHost = !!client.isCoHost;
    const isTrocaTelas = (readEstado().controleExibicao || []).includes(client.id);

    const cohostBtn = $id('ctx-cohost');
    const trocaTelasBtn = $id('ctx-troca-telas');
    if (cohostBtn) {
      cohostBtn.hidden = isHostCard || !caps.canManageCoHosts;
      if (!cohostBtn.hidden) {
        cohostBtn.classList.toggle('is-active', isCoHost);
        const textEl = cohostBtn.querySelector('.ctx-text');
        if (textEl) textEl.textContent = isCoHost ? 'Remover co-host' : 'Tornar co-host';
      }
    }
    if (trocaTelasBtn) {
      trocaTelasBtn.hidden = isHostCard;
      if (!isHostCard) trocaTelasBtn.classList.toggle('is-active', isTrocaTelas);
    }
    const audioBtn = $id('ctx-audio');
    if (audioBtn) audioBtn.hidden = !caps.audioFilters;
    const recAudioBtn = $id('ctx-rec-audio');
    if (recAudioBtn) recAudioBtn.hidden = true;

    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.hidden = false;
  }

  function populateAudioFiltersUi(prefs) {
    const setVal = (id, value, labelId, fmt) => {
      const input = $id(id);
      if (!input) return;
      input.value = value;
      const label = $id(labelId);
      if (label) label.textContent = fmt(input.value);
    };
    setVal('audio-gain', prefs.gain !== undefined ? prefs.gain : 1.0, 'audio-gain-val', (v) => `${Number(v).toFixed(1)}x`);
    setVal('audio-bass', prefs.bass !== undefined ? prefs.bass : 0, 'audio-bass-val', (v) => `${v} dB`);
    setVal('audio-treble', prefs.treble !== undefined ? prefs.treble : 0, 'audio-treble-val', (v) => `${v} dB`);
    const hpEnabled = $id('audio-hp-enabled');
    if (hpEnabled) hpEnabled.checked = !!prefs.highpass;
    const peakEnabled = $id('audio-peak-enabled');
    if (peakEnabled) peakEnabled.checked = !!prefs.peaking;
    const compEnabled = $id('audio-comp-enabled');
    if (compEnabled) compEnabled.checked = !!prefs.compressor;
    const gateEnabled = $id('audio-gate-enabled');
    if (gateEnabled) gateEnabled.checked = !!prefs.noiseGate;
    const sensitivityEnabled = $id('audio-sensitivity-enabled');
    if (sensitivityEnabled) sensitivityEnabled.checked = !!prefs.micSensitivity;
    const speechGateEnabled = $id('audio-speech-gate-enabled');
    if (speechGateEnabled) {
      speechGateEnabled.checked = prefs.speechGate === 'soft' || prefs.speechGate === 'hard';
    }
    const mlNsEnabled = $id('audio-ml-ns-enabled');
    if (mlNsEnabled) mlNsEnabled.checked = !!prefs.noiseSuppressionMl;
    const nearFieldEnabled = $id('audio-nearfield-enabled');
    if (nearFieldEnabled) {
      nearFieldEnabled.checked = prefs.nearFieldGate === 'soft' || prefs.nearFieldGate === 'strict';
    }
    setVal(
      'audio-nearfield-threshold',
      prefs.nearFieldThreshold !== undefined ? prefs.nearFieldThreshold : 0.5,
      'audio-nearfield-threshold-val',
      (v) => Number(v).toFixed(2)
    );
    setVal('audio-hp-frequency', prefs.highpassFreq || 80, 'audio-hp-freq-val', (v) => `${v} Hz`);
    setVal('audio-peak-frequency', prefs.peakingFreq || 3000, 'audio-peak-freq-val', (v) => `${v} Hz`);
    setVal(
      'audio-peak-gain',
      prefs.peakingGain !== undefined ? prefs.peakingGain : 3,
      'audio-peak-gain-val',
      (v) => `${v} dB`
    );
    setVal(
      'audio-gate-threshold',
      prefs.noiseGateThreshold !== undefined ? prefs.noiseGateThreshold : -45,
      'audio-gate-thresh-val',
      (v) => `${v} dB`
    );
    setVal(
      'audio-capture-distance',
      prefs.micCaptureDistance !== undefined ? prefs.micCaptureDistance : 6,
      'audio-capture-distance-val',
      (v) => `${v}/10`
    );
  }

  function readAudioFilterPrefsFromUi() {
    return {
      gain: Number($id('audio-gain')?.value !== undefined ? $id('audio-gain')?.value : 1.0),
      bass: Number($id('audio-bass')?.value || 0),
      treble: Number($id('audio-treble')?.value || 0),
      highpass: !!$id('audio-hp-enabled')?.checked,
      highpassFreq: Number($id('audio-hp-frequency')?.value || 80),
      peaking: !!$id('audio-peak-enabled')?.checked,
      peakingFreq: Number($id('audio-peak-frequency')?.value || 3000),
      peakingGain: Number($id('audio-peak-gain')?.value || 3),
      compressor: !!$id('audio-comp-enabled')?.checked,
      noiseGate: !!$id('audio-gate-enabled')?.checked,
      noiseGateThreshold: Number($id('audio-gate-threshold')?.value || -45),
      micSensitivity: !!$id('audio-sensitivity-enabled')?.checked,
      micCaptureDistance: Number($id('audio-capture-distance')?.value || 6),
      speechGate: $id('audio-speech-gate-enabled')?.checked ? 'soft' : 'off',
      noiseSuppressionMl: !!$id('audio-ml-ns-enabled')?.checked,
      nearFieldGate: $id('audio-nearfield-enabled')?.checked ? 'soft' : 'off',
      nearFieldThreshold: Number($id('audio-nearfield-threshold')?.value || 0.5)
    };
  }

  function audioFilterNameCacheKey(displayName) {
    const name = String(displayName || '').trim().toLowerCase();
    return name ? `name:${name}` : '';
  }

  function rememberAudioFilterPrefs(client, prefs) {
    const key = JSON.stringify(normalizeMicrophoneFilterPrefs(prefs));
    if (client?.id) sentAudioFilterKeys.set(String(client.id), key);
    const nameKey = audioFilterNameCacheKey(client?.displayName);
    if (nameKey) sentAudioFilterKeys.set(nameKey, key);
  }

  function sendAudioFiltersToClient(client, prefs, { force = false } = {}) {
    if (!client?.id || !signaling()) return;
    if (String(client.id) === String(selfPeerId())) return;
    const normalized = normalizeMicrophoneFilterPrefs(prefs);
    const key = JSON.stringify(normalized);
    const id = String(client.id);
    if (!force && sentAudioFilterKeys.get(id) === key) return;
    rememberAudioFilterPrefs(client, normalized);
    signaling().send('definirFiltroAudioClient', { peerId: client.id, prefs: normalized });
  }

  function getAppliedClientAudioFilterPrefs(clientOrPeerId) {
    const client = clientOrPeerId && typeof clientOrPeerId === 'object' ? clientOrPeerId : null;
    const id = String(client?.id || clientOrPeerId || '');
    const nameKey = audioFilterNameCacheKey(client?.displayName);
    const sentKey =
      (id && sentAudioFilterKeys.get(id)) || (nameKey && sentAudioFilterKeys.get(nameKey));
    if (sentKey) {
      try {
        return normalizeMicrophoneFilterPrefs(JSON.parse(sentKey));
      } catch {
        /* fallback */
      }
    }
    return normalizeMicrophoneFilterPrefs(CLIENT_MIC_PUBLISH_DEFAULTS);
  }

  function previewAudioFiltersFromUi() {
    const client = activeAudioFiltersClient;
    if (!client) return;
    const prefs = readAudioFilterPrefsFromUi();
    if (isHostPeer(client) && hooks.onHostAudioFiltersPreview) {
      hooks.onHostAudioFiltersPreview(prefs);
      return;
    }
    sendAudioFiltersToClient(client, prefs, { force: true });
  }

  async function openAudioFiltersModal(client) {
    if (!client || !caps.audioFilters) return;
    if (isHostPeer(client) && hooks.openHostAudioFilters) {
      hooks.openHostAudioFilters(client);
      return;
    }
    activeAudioFiltersClient = client;
    const stored = await fetchClientAudioFilterPreset(client.displayName);
    if (activeAudioFiltersClient !== client) return;
    const prefs = stored || getAppliedClientAudioFilterPrefs(client);
    if (stored) rememberAudioFilterPrefs(client, stored);
    originalAudioFilterPrefs = { ...prefs };
    const nameEl = $id('audio-filters-client-name');
    if (nameEl) nameEl.textContent = client.displayName || '-';
    const selfSection = $id('audio-self-monitor-section');
    if (selfSection) selfSection.hidden = true;
    populateAudioFiltersUi(prefs);
    const modal = $id('audio-filters-modal');
    if (modal) modal.hidden = false;
  }

  function closeAudioFiltersModal({ revert = false } = {}) {
    const modal = $id('audio-filters-modal');
    if (modal) modal.hidden = true;
    if (revert && activeAudioFiltersClient && originalAudioFilterPrefs) {
      sendAudioFiltersToClient(activeAudioFiltersClient, originalAudioFilterPrefs, { force: true });
    }
    activeAudioFiltersClient = null;
    originalAudioFilterPrefs = null;
  }

  function syncMeetBridgeUi() {
    const chk = $id('chk-meet-bridge-live');
    if (chk) chk.checked = meetBridgeLiveMode;
  }

  function syncSharedRoomUi() {
    const chk = $id('chk-shared-room-mode');
    if (chk) chk.checked = sharedRoomMode;
    const hint = $id('shared-room-hint');
    if (hint) hint.hidden = !sharedRoomMode;
  }

  function sendMeetBridgeLiveMode(ativo) {
    meetBridgeLiveMode = !!ativo;
    syncMeetBridgeUi();
    hooks.onMeetBridgeChanged?.(meetBridgeLiveMode);
    if (canCommand()) signaling()?.send('definirModoPonteMeet', { ativo: meetBridgeLiveMode });
  }

  function sendSharedRoomMode(ativo) {
    sharedRoomMode = !!ativo;
    syncSharedRoomUi();
    hooks.onSharedRoomChanged?.(sharedRoomMode);
    if (canCommand()) signaling()?.send('definirModoSalaCompartilhada', { ativo: sharedRoomMode });
  }

  function applySharedRoomPresetToClients() {
    sendSharedRoomMode(true);
    const preset = normalizeMicrophoneFilterPrefs(SHARED_ROOM_MIC_PRESET);
    for (const client of readEstado().clients || []) {
      if (!client?.id || String(client.id) === String(selfPeerId())) continue;
      sendAudioFiltersToClient(client, preset, { force: true });
    }
    notify('Preset Sala compartilhada aplicado', 'success');
  }

  function applyRoomSnapshot(snapshot, { source = 'snapshot' } = {}) {
    if (!snapshot) return false;
    const parsed = parseRoomSnapshot(snapshot);
    const version = snapshotVersion(snapshot, parsed);
    if (version && version < lastAppliedRoomVersion) return false;

    const existing = readEstado().clients || [];
    let roomClients = resolveRoomClients(snapshot, parsed);
    const authoritative = hasAuthoritativeRoomRoster(snapshot);
    if (version && authoritative) {
      roomClients = reconcileRoomClients(existing, roomClients, { allowRemovals: true });
    } else if (existing.length && roomClients.length < existing.length) {
      roomClients = reconcileRoomClients(existing, roomClients, { allowRemovals: false });
    }
    if (version) lastAppliedRoomVersion = Math.max(lastAppliedRoomVersion, version);

    const transmission = parsed.transmission;
    writeEstado(
      enrichRoomSourcesState(
        {
          clients: roomClients,
          selecionado: snapshot.selecionado
            ? { ...snapshot.selecionado, selecionado: true }
            : authoritative
              ? null
              : readEstado().selecionado,
          controleExibicao: snapshot.controleExibicao ?? readEstado().controleExibicao ?? []
        },
        transmission
      )
    );

    if (parsed.mutedPeerIds) {
      mutedClients.clear();
      for (const id of parsed.mutedPeerIds) mutedClients.add(String(id));
    }
    if (snapshot.meetBridgeLiveMode !== undefined) {
      meetBridgeLiveMode = !!snapshot.meetBridgeLiveMode;
      syncMeetBridgeUi();
    }
    if (snapshot.sharedRoomMode !== undefined) {
      sharedRoomMode = !!snapshot.sharedRoomMode;
      syncSharedRoomUi();
    }
    if (snapshot.dominantSpeakerPeerId !== undefined) {
      dominantSpeakerPeerId = snapshot.dominantSpeakerPeerId
        ? String(snapshot.dominantSpeakerPeerId)
        : null;
    }
    const current = readEstado();
    ui.set({
      hasSelection: !!current.selecionado,
      isPaused: !!(snapshot.transmissionPaused || current.selecionado?.pausado)
    });
    if (mounted) renderLista();
    hooks.onSnapshotApplied?.(snapshot, parsed, source);
    return true;
  }

  function applyLegacyEstado(payload) {
    return applyRoomSnapshot(payload || {}, { source: 'estado' });
  }

  function setMutedFromRoom(ids) {
    mutedClients.clear();
    for (const id of ids || []) mutedClients.add(String(id));
    if (mounted) renderLista();
  }

  function applyTransmissionFlags(tx = {}) {
    const current = readEstado();
    if (tx.selectedPeerId) {
      const sel =
        current.clients.find((c) => String(c.id) === String(tx.selectedPeerId)) ||
        current.selecionado;
      writeEstado({
        ...current,
        selecionado: sel
          ? { ...sel, selecionado: true, pausado: !!tx.paused }
          : current.selecionado
      });
    } else if (tx.selectedPeerId === null) {
      writeEstado({ ...current, selecionado: null });
    }
    ui.set({
      hasSelection: !!readEstado().selecionado,
      isPaused: !!tx.paused
    });
    if (mounted) renderLista();
  }

  function updateMuteButtonIcon() {
    const btn = $id('btn-mute-audio');
    if (!btn) return;
    btn.title = playbackMuted ? 'Ativar audio' : 'Silenciar audio';
    btn.innerHTML = playbackMuted
      ? `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="1" x2="1" y2="23"></line></svg>`
      : `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
  }

  function applyLocalCoHostFlag(peerId, ativo) {
    const id = String(peerId);
    const flag = !!ativo;
    const current = readEstado();
    const next = {
      ...current,
      clients: (current.clients || []).map((c) =>
        String(c.id) === id
          ? { ...c, isCoHost: flag, permissions: { ...(c.permissions || {}), isCoHost: flag } }
          : c
      )
    };
    if (next.selecionado && String(next.selecionado.id) === id) {
      next.selecionado = {
        ...next.selecionado,
        isCoHost: flag,
        permissions: { ...(next.selecionado.permissions || {}), isCoHost: flag }
      };
    }
    writeEstado(next);
    renderLista();
  }

  function bindEvents() {
    if (bound) return;
    bound = true;
    on($id('btn-pausar'), 'click', () => pauseTransmission());
    on($id('btn-retomar'), 'click', () => resumeTransmission());
    on($id('btn-limpar'), 'click', () => clearTransmission());
    on($id('btn-playpause'), 'click', () => {
      if (ui._flags.isPaused) resumeTransmission();
      else pauseTransmission();
    });
    on($id('quality-preset'), 'change', (e) => applyQuality(e.target.value));
    on($id('btn-mute-audio'), 'click', () => {
      playbackMuted = !playbackMuted;
      hooks.onPlaybackMuteChanged?.(playbackMuted);
      updateMuteButtonIcon();
    });
    on($id('btn-sidebar-collapse'), 'click', () => {
      const sidebar = $id('sidebar');
      const collapsed = !sidebar?.classList.contains('is-collapsed');
      sidebar?.classList.toggle('is-collapsed', collapsed);
      const appMain =
        (options.getDoc?.() || document).querySelector('.app-main') ||
        (options.getDoc?.() || document).querySelector('.client-main');
      appMain?.classList.toggle('sidebar-collapsed', collapsed);
    });
    on($id('ctx-cohost'), 'click', () => {
      if (!activeContextClient || !caps.canManageCoHosts) return;
      const targetState = !activeContextClient.isCoHost;
      signaling()?.send('definirCoHost', {
        peerId: activeContextClient.id,
        ativo: targetState
      });
      applyLocalCoHostFlag(activeContextClient.id, targetState);
      closeContextMenu();
    });
    on($id('ctx-troca-telas'), 'click', () => {
      if (!activeContextClient) return;
      const isTrocaTelas = (readEstado().controleExibicao || []).includes(activeContextClient.id);
      toggleDisplayControl(activeContextClient.id, !isTrocaTelas);
      closeContextMenu();
    });
    on($id('ctx-audio'), 'click', () => {
      if (!activeContextClient) return;
      openAudioFiltersModal(activeContextClient).catch((e) => hooks.onError?.(e, 'audio-filters'));
      closeContextMenu();
    });
    on($id('btn-audio-filters-save'), 'click', () => {
      previewAudioFiltersFromUi();
      if (activeAudioFiltersClient) {
        rememberAudioFilterPrefs(activeAudioFiltersClient, readAudioFilterPrefsFromUi());
      }
      closeAudioFiltersModal();
    });
    on($id('btn-audio-filters-cancel'), 'click', () => closeAudioFiltersModal({ revert: true }));
    on($id('btn-audio-filters-reset'), 'click', () => {
      populateAudioFiltersUi(normalizeMicrophoneFilterPrefs(CLIENT_MIC_PUBLISH_DEFAULTS));
      previewAudioFiltersFromUi();
    });
    const modal = $id('audio-filters-modal');
    if (modal) {
      on(modal, 'input', () => previewAudioFiltersFromUi());
      on(modal, 'change', () => previewAudioFiltersFromUi());
    }
    on($id('chk-meet-bridge-live'), 'change', (e) => sendMeetBridgeLiveMode(e.target.checked));
    on($id('chk-shared-room-mode'), 'change', (e) => sendSharedRoomMode(e.target.checked));
    on($id('btn-shared-room-preset'), 'click', () => applySharedRoomPresetToClients());
    const clickDoc = options.getDoc?.() || document;
    const onDocClick = (e) => {
      const menu = $id('custom-context-menu');
      if (menu && !menu.hidden) {
        const isMenuClick = menu.contains(e.target) || e.target.closest?.('.ctx-item');
        if (!isMenuClick) closeContextMenu();
      }
    };
    clickDoc.addEventListener('click', onDocClick);
    unsubscribers.push(() => clickDoc.removeEventListener('click', onDocClick));
  }

  function unbindEvents() {
    while (unsubscribers.length) {
      try {
        unsubscribers.pop()();
      } catch {
        /* ignore */
      }
    }
    bound = false;
  }

  function mount() {
    mounted = true;
    bindEvents();
    const preset = $id('quality-preset');
    if (preset && !preset.value) preset.value = loadPresetId();
    updateQualityHint();
    updateMuteButtonIcon();
    ui.set({ wsConnected: true, wsWasConnected: true });
    renderLista();
  }

  function unmount() {
    mounted = false;
    unbindEvents();
    closeContextMenu();
    closeAudioFiltersModal();
    const lista = $id('lista-clients');
    if (lista) lista.innerHTML = '';
    cardVuElements.clear();
  }

  function rebind() {
    if (!mounted) return;
    unbindEvents();
    bindEvents();
  }

  function destroy() {
    unmount();
    lastAppliedRoomVersion = 0;
    writeEstado({ clients: [], selecionado: null, controleExibicao: [] });
  }

  function selfIsCoHost(peerId) {
    const id = String(peerId || selfPeerId() || '');
    const me = (readEstado().clients || []).find((c) => String(c.id) === id);
    return !!(me?.isCoHost || me?.permissions?.isCoHost);
  }

  return {
    mount,
    unmount,
    rebind,
    destroy,
    applyRoomSnapshot,
    applyLegacyEstado,
    applyTransmissionFlags,
    setMutedFromRoom,
    renderLista,
    selectPeer,
    toggleClientMute,
    toggleDisplayControl,
    applyQuality,
    updateCardVuMeters,
    updateDominantSpeakerIndicators,
    setDominantSpeaker(peerId) {
      dominantSpeakerPeerId = peerId ? String(peerId) : null;
      updateDominantSpeakerIndicators();
    },
    selfIsCoHost,
    getEstado: readEstado,
    ui,
    mutedClients
  };
}
