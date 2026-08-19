/**
 * Captura de áudio, mixagem Web Audio e VU meter leve.
 */
import { startTrackLevelMeter } from './audio-level-meter.js';

export const DEFAULT_CAPTURE_PREFS = {
  systemAudio: false,
  microphone: true,
  microphoneDeviceId: ''
};

const STORAGE_KEY = 'sharescreen_capture_prefs';

export function loadCapturePrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CAPTURE_PREFS };
    return { ...DEFAULT_CAPTURE_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CAPTURE_PREFS };
  }
}

export function saveCapturePrefs(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

/** Desbloqueia AudioContext após gesto do usuário (autoplay policy). */
export function installAudioUnlock(onUnlock) {
  const unlock = async () => {
    try {
      const done = await onUnlock?.();
      if (done === true) {
        document.removeEventListener('pointerdown', unlock, true);
        document.removeEventListener('keydown', unlock, true);
      }
    } catch (_) {}
  };
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });
}

export function buildMicrophoneConstraints(deviceId = '', { disableAutoGainControl = false } = {}) {
  const audio = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: !disableAutoGainControl,
    channelCount: 1
  };
  if (deviceId) audio.deviceId = { ideal: deviceId };
  return { audio, video: false };
}

export async function requestMicrophonePermission(onLog) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: buildMicrophoneConstraints().audio,
    video: false
  });
  stream.getTracks().forEach((t) => t.stop());
  onLog?.('Permissão de microfone concedida');
}

export function buildMicrophoneDeviceChoices(devices = []) {
  return [
    { deviceId: '', label: 'Microfone padrão do sistema' },
    ...(devices || []).map((d, i) => ({
      deviceId: d.deviceId || '',
      label: String(d.label || '').trim() || `Microfone ${i + 1}`
    }))
  ];
}

/**
 * Traduz a entrada virtual `default` do Chrome para o deviceId concreto do dispositivo
 * padrão do sistema, para que a captura não dependa de constraint vazia.
 */
export function resolveDefaultMicrophoneDeviceId(devices = []) {
  const list = devices || [];
  if (!list.length) return '';
  const virtualDefault = list.find((d) => d.deviceId === 'default');
  if (virtualDefault?.groupId) {
    const concrete = list.find(
      (d) => d.deviceId !== 'default' && d.groupId === virtualDefault.groupId
    );
    if (concrete) return concrete.deviceId;
  }
  const firstConcrete = list.find((d) => d.deviceId && d.deviceId !== 'default');
  return firstConcrete?.deviceId || list[0].deviceId || '';
}

export function describeMicrophoneAccessIssue({
  isSecureContext = true,
  permissionError = null,
  deviceCount = 0
} = {}) {
  if (!isSecureContext) {
    return 'Contexto inseguro — abra em HTTPS ou localhost para listar microfones (Chrome bloqueia HTTP).';
  }
  if (permissionError && !deviceCount) {
    return 'Permissão de microfone bloqueada — permita o acesso nas configurações do navegador.';
  }
  return null;
}

export async function listMicrophoneDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((d) => d.kind === 'audioinput' && d.deviceId)
    .map((d, i) => ({
      deviceId: d.deviceId,
      groupId: d.groupId || '',
      label: d.label?.trim() || `Microfone ${i + 1}`
    }));
}

function ensureDefaultMicrophoneOption(selectEl) {
  if (!selectEl) return;
  if ([...selectEl.options].some((o) => o.value === '')) return;
  const padrao = document.createElement('option');
  padrao.value = '';
  padrao.textContent = 'Microfone padrão do sistema';
  selectEl.insertBefore(padrao, selectEl.firstChild);
}

/** @returns {Promise<{ devices: Array, deviceId: string }>} deviceId resolvido para captura. */
export async function populateMicrophoneSelect(
  selectEl,
  { deviceId = '', onLog, skipPermissionProbe = false } = {}
) {
  if (!selectEl) return { devices: [], deviceId: '' };
  const previous = selectEl.value;
  ensureDefaultMicrophoneOption(selectEl);

  const secure =
    typeof window === 'undefined' ? true : window.isSecureContext !== false;
  const insecureHint = describeMicrophoneAccessIssue({ isSecureContext: secure });
  if (insecureHint && !secure) onLog?.(insecureHint, 'warn');

  let permissionError = null;
  if (!skipPermissionProbe) {
    try {
      await requestMicrophonePermission(onLog);
    } catch (e) {
      permissionError = e;
      onLog?.(e?.message || 'Permissão de microfone recusada', 'warn');
    }
  }

  let devices = [];
  try {
    devices = await listMicrophoneDevices();
  } catch (_) {}

  const choices = buildMicrophoneDeviceChoices(devices);
  const keepValue = deviceId || previous || '';
  selectEl.innerHTML = '';
  for (const choice of choices) {
    const opt = document.createElement('option');
    opt.value = choice.deviceId;
    opt.textContent = choice.label;
    selectEl.appendChild(opt);
  }
  const hasOption = (value) => [...selectEl.options].some((o) => o.value === value);
  if (keepValue && hasOption(keepValue)) {
    selectEl.value = keepValue;
  } else {
    const resolvedDefault = resolveDefaultMicrophoneDeviceId(devices);
    selectEl.value = resolvedDefault && hasOption(resolvedDefault) ? resolvedDefault : '';
  }

  const blockedHint = describeMicrophoneAccessIssue({
    isSecureContext: secure,
    permissionError,
    deviceCount: devices.length
  });
  if (blockedHint) onLog?.(blockedHint, 'warn');
  return { devices, deviceId: selectEl.value || '' };
}

export async function acquireMicrophoneTrack(deviceId, onLog, options = {}) {
  const constraints = buildMicrophoneConstraints(deviceId || '', options);
  onLog?.(deviceId ? 'Capturando microfone selecionado…' : 'Capturando microfone padrão…');
  const micStream = await navigator.mediaDevices.getUserMedia(constraints);
  const micTrack = micStream.getAudioTracks()[0];
  if (!micTrack) {
    micStream.getTracks().forEach((t) => t.stop());
    throw new Error('Nenhuma pista de microfone obtida');
  }
  micTrack.addEventListener('ended', () => onLog?.('Microfone encerrado', 'warn'));
  return micTrack;
}

/**
 * Mixagem segura via Web Audio API — retorna MediaStream com uma track.
 */
export class AudioMixer {
  constructor({ onLog } = {}) {
    this.onLog = onLog || (() => {});
    this.ctx = null;
    this.dest = null;
    this.sources = [];
    this.streams = [];
  }

  async mixTracks(tracks) {
    const live = tracks.filter((t) => t && t.readyState === 'live');
    if (live.length === 0) return null;
    if (live.length === 1) return new MediaStream([live[0]]);

    try {
      this.ctx = new AudioContext();
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume().catch(() => {});
      }
      this.dest = this.ctx.createMediaStreamDestination();
      for (const track of live) {
        const stream = new MediaStream([track]);
        this.streams.push(stream);
        const source = this.ctx.createMediaStreamSource(stream);
        source.connect(this.dest);
        this.sources.push(source);
      }
      const outTrack = this.dest.stream.getAudioTracks()[0];
      if (!outTrack) {
        await this.dispose();
        return new MediaStream([live[0]]);
      }
      outTrack.addEventListener('ended', () => this.dispose());
      this.onLog(`Áudio mixado (${live.length} fonte(s))`);
      return this.dest.stream;
    } catch (e) {
      this.onLog('Mixagem indisponível — usando primeira fonte de áudio', 'warn');
      await this.dispose();
      return new MediaStream([live[0]]);
    }
  }

  async dispose() {
    for (const s of this.sources) {
      try {
        s.disconnect();
      } catch (_) {}
    }
    this.sources = [];
    this.streams = [];
    if (this.ctx) {
      await this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.dest = null;
  }
}

/**
 * @deprecated Preferir publishMicrophone / publishSystemAudioFromDisplay separados.
 * Mixagem mic+sistema em um único producer não é mais usada.
 */
export async function collectAudioForPublish(displayStream, capturePrefs, onLog) {
  const tracks = [];
  const wantSystem = capturePrefs.systemAudio !== false;
  const wantMic = !!capturePrefs.microphone;

  if (wantSystem && displayStream) {
    for (const t of displayStream.getAudioTracks()) {
      if (t.readyState === 'live') tracks.push(t);
    }
    if (!tracks.length && wantSystem) {
      onLog?.(
        'Áudio do sistema não capturado — marque "Compartilhar áudio" no diálogo do Chrome',
        'warn'
      );
    }
  }

  if (wantMic) {
    const prefetched = capturePrefs.prefetchedMicTrack;
    if (prefetched?.readyState === 'live') {
      tracks.push(prefetched);
    } else {
      try {
        const micTrack = await acquireMicrophoneTrack(
          capturePrefs.microphoneDeviceId || '',
          onLog
        );
        tracks.push(micTrack);
      } catch (e) {
        if (e.name === 'NotAllowedError') throw e;
        onLog?.('Microfone não disponível: ' + e.message, 'warn');
      }
    }
  }

  if (!tracks.length) return null;

  if (tracks.length === 1) {
    return { stream: new MediaStream([tracks[0]]), mixer: null };
  }

  const mixer = new AudioMixer({ onLog });
  const mixed = await mixer.mixTracks(tracks);
  if (!mixed) return null;
  return { stream: mixed, mixer };
}

/** Áudio apenas do microfone (sem captura de tela). */
export async function collectStandaloneAudioForPublish(capturePrefs, onLog) {
  if (!capturePrefs?.microphone) return null;
  const prefetched = capturePrefs.prefetchedMicTrack;
  if (prefetched?.readyState === 'live') {
    return new MediaStream([prefetched]);
  }
  try {
    const micTrack = await acquireMicrophoneTrack(
      capturePrefs.microphoneDeviceId || '',
      onLog
    );
    return new MediaStream([micTrack]);
  } catch (e) {
    if (e.name === 'NotAllowedError') throw e;
    onLog?.('Microfone não disponível: ' + e.message, 'warn');
    return null;
  }
}

/**
 * VU meter leve — delega para startTrackLevelMeter.
 */

export class VuMeter {
  constructor() {
    this.stopMeter = null;
    this.level = 0;
    this.onLevel = null;
  }

  attach(track, onLevel) {
    this.detach();
    if (!track || track.readyState !== 'live') return;
    this.onLevel = onLevel;
    this.stopMeter = startTrackLevelMeter(track, {
      onLevel: (smoothed) => {
        this.level = Math.min(100, Math.round(smoothed * 115));
        this.onLevel?.(this.level);
      }
    });
  }

  async resume() {}

  detach() {
    this.stopMeter?.();
    this.stopMeter = null;
    this.level = 0;
  }
}

export function setupMicrophonePicker({
  checkbox,
  wrap,
  select,
  refreshBtn,
  savedDeviceId = '',
  onLog,
  onError,
  onSelectChange,
  onResolved,
  hasLiveTrack = null
}) {
  let lastSavedId = savedDeviceId || '';
  const sync = async () => {
    if (!checkbox?.checked) {
      wrap?.setAttribute('hidden', '');
      return;
    }
    wrap?.removeAttribute('hidden');
    try {
      const skipPermissionProbe = typeof hasLiveTrack === 'function' ? !!hasLiveTrack() : false;
      const result = await populateMicrophoneSelect(select, {
        deviceId: lastSavedId,
        onLog,
        skipPermissionProbe
      });
      const resolved = result?.deviceId || '';
      if (resolved !== lastSavedId) {
        lastSavedId = resolved;
        onResolved?.(resolved);
      }
    } catch (e) {
      onError?.(e.message);
    }
  };
  checkbox?.addEventListener('change', sync);
  refreshBtn?.addEventListener('click', () => sync());
  select?.addEventListener('change', () => {
    lastSavedId = select?.value || '';
    onSelectChange?.();
  });
  const mediaDevices = typeof navigator !== 'undefined' ? navigator.mediaDevices : null;
  if (mediaDevices?.addEventListener) {
    mediaDevices.addEventListener('devicechange', () => {
      sync().catch(() => {});
    });
  }
  // A primeira enumeração é assíncrona; quem publica áudio deve aguardar `ready`
  // para não capturar com deviceId vazio enquanto o <select> ainda está vazio.
  const ready = sync().catch(() => {});
  return {
    refresh: sync,
    ready,
    getDeviceId: () => select?.value || lastSavedId || ''
  };
}
