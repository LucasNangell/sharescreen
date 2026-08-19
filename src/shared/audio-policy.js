import { normalizeAudioSource, normalizeRemoteAudioSources } from './audio-sources.js';

export const DUAL_PUBLISH_POLICIES = ['mic-wins', 'system-wins', 'allow-both'];

const SOURCE_PRIORITY = {
  microphone: 0,
  system: 1,
  mixed: 2
};

export function sourcePriority(source) {
  return SOURCE_PRIORITY[normalizeAudioSource(source, 'mixed')] ?? 3;
}

/** Mantém no máximo uma fonte por peer (mic > system > mixed). */
export function pickAntiEchoSources(list, { allowDualPeerAudio = false } = {}) {
  if (allowDualPeerAudio) return list || [];
  const byPeer = new Map();
  for (const entry of list || []) {
    const pid = String(entry.peerId);
    const existing = byPeer.get(pid);
    if (!existing || sourcePriority(entry.source) < sourcePriority(existing.source)) {
      byPeer.set(pid, entry);
    }
  }
  return [...byPeer.values()];
}

/**
 * Resolve o que publicar conforme prefs, superfície capturada e política anti-eco.
 */
export function resolvePublishAudioSources(
  prefs = {},
  {
    displaySurface = null,
    dualPublishPolicy = 'allow-both',
    meetBridgeLiveMode = false
  } = {}
) {
  let microphone = !!prefs.microphone;
  let systemAudio = prefs.systemAudio !== false;
  let blockedReason = null;

  if (meetBridgeLiveMode) {
    return { microphone: false, systemAudio: true, blockedReason: 'meet-bridge' };
  }

  if (displaySurface === 'monitor') {
    systemAudio = false;
    if (prefs.systemAudio !== false) {
      blockedReason = 'monitor-no-audio';
    }
  }

  if (dualPublishPolicy === 'mic-wins' && microphone && systemAudio) {
    systemAudio = false;
    blockedReason = blockedReason || 'mic-wins';
  } else if (dualPublishPolicy === 'system-wins' && microphone && systemAudio) {
    microphone = false;
    blockedReason = blockedReason || 'system-wins';
  }

  return { microphone, systemAudio, blockedReason };
}

/** Normaliza fontes remotas e aplica anti-eco opcional na reprodução. */
export function resolvePlaybackSources(
  sources,
  {
    excludePeerId = null,
    excludeSourceTypes = [],
    antiEcho = true,
    allowDualPeerAudio = false,
    ownPeerIds = [],
    ownProducerIds = []
  } = {}
) {
  let list = normalizeRemoteAudioSources(sources, {
    excludePeerId,
    excludeSourceTypes,
    ownPeerIds,
    ownProducerIds
  });
  if (antiEcho && !allowDualPeerAudio) {
    list = pickAntiEchoSources(list, { allowDualPeerAudio });
  }
  return list;
}

export function readDisplaySurfaceFromStream(stream) {
  const videoTrack = stream?.getVideoTracks?.()?.[0];
  if (!videoTrack || videoTrack.readyState !== 'live') return null;
  return videoTrack.getSettings?.()?.displaySurface || null;
}

/**
 * Remove áudio capturado em tela inteira (monitor) e retorna metadados da superfície.
 */
export function stripMonitorSystemAudio(stream, onLog) {
  const displaySurface = readDisplaySurfaceFromStream(stream);
  const audioTracks = stream?.getAudioTracks?.() || [];
  let systemAudioBlocked = false;

  if (displaySurface === 'monitor') {
    for (const track of audioTracks) {
      if (track.readyState !== 'live') continue;
      try {
        track.stop();
      } catch (_) {}
      systemAudioBlocked = true;
    }
    if (systemAudioBlocked) {
      onLog?.(
        'Áudio indisponível em tela inteira — selecione aba ou janela, ou desmarque o áudio',
        'warn'
      );
    }
  }

  return { displaySurface, systemAudioBlocked };
}

export async function applyTabCaptureAudioHints(stream) {
  const displaySurface = readDisplaySurfaceFromStream(stream);
  if (displaySurface !== 'browser') return displaySurface;
  const audioTrack = stream?.getAudioTracks?.()?.find((t) => t.readyState === 'live');
  if (!audioTrack?.applyConstraints) return displaySurface;
  try {
    await audioTrack.applyConstraints({ suppressLocalAudioPlayback: true });
  } catch (_) {}
  return displaySurface;
}

export function dualPublishPolicyFromQuality(quality = {}) {
  const policy = quality.dualPublishPolicy || 'allow-both';
  return DUAL_PUBLISH_POLICIES.includes(policy) ? policy : 'mic-wins';
}
