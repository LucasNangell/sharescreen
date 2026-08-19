/**
 * Monitor local da trilha de microfone já publicada (pós-DSP).
 * Sem AudioContext próprio: reproduz o mesmo sinal que o SFU distribui.
 */

function ensureSinksContainer() {
  let el = document.getElementById('remote-audio-sinks');
  if (!el) {
    el = document.createElement('div');
    el.id = 'remote-audio-sinks';
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  return el;
}

export function createSelfAudioMonitor({ getTrack, onBlocked } = {}) {
  let enabled = false;
  let volume = 0.7;
  let audioEl = null;
  let boundTrack = null;

  function _unbind() {
    if (!audioEl) return;
    try {
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
    } catch (_) {}
    audioEl = null;
    boundTrack = null;
  }

  async function _bind(track) {
    if (!track || track.readyState !== 'live') {
      _unbind();
      return false;
    }
    if (audioEl && boundTrack === track) {
      audioEl.volume = volume;
      audioEl.muted = false;
      try {
        await audioEl.play();
      } catch (err) {
        onBlocked?.(err);
        return false;
      }
      return true;
    }
    _unbind();
    const el = document.createElement('audio');
    el.autoplay = true;
    el.playsInline = true;
    el.setAttribute('data-self-audio-monitor', '1');
    el.srcObject = new MediaStream([track]);
    el.volume = volume;
    el.muted = false;
    ensureSinksContainer().appendChild(el);
    audioEl = el;
    boundTrack = track;
    try {
      await el.play();
    } catch (err) {
      onBlocked?.(err);
      _unbind();
      return false;
    }
    return true;
  }

  async function refresh() {
    if (!enabled) {
      _unbind();
      return false;
    }
    const track = getTrack?.() || null;
    return _bind(track);
  }

  async function enable() {
    enabled = true;
    return refresh();
  }

  function disable() {
    enabled = false;
    _unbind();
  }

  function setVolume(value) {
    const next = Math.max(0, Math.min(1, Number(value)));
    volume = Number.isFinite(next) ? next : 0.7;
    if (audioEl) audioEl.volume = volume;
  }

  function isEnabled() {
    return enabled;
  }

  function dispose() {
    disable();
  }

  return { enable, disable, setVolume, refresh, isEnabled, dispose };
}
