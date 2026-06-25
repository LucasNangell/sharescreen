/**
 * Presets de qualidade — baixa latência, equilibrado, alta qualidade.
 */
export const PRESETS = {
  highQuality: {
    id: 'highQuality',
    label: 'Máxima (32 Mbps)',
    description: 'Resolução nativa, máxima nitidez — recomendado em LAN',
    maxBitrate: 32_000_000,
    startBitrateKbps: 26000,
    targetFrameRate: 30,
    maxFrameRate: 30,
    preferH264: true,
    lowLatency: true,
    contentHint: 'detail',
    videoBitsPerSecond: 28_000_000
  },
  balanced: {
    id: 'balanced',
    label: 'Alta (16 Mbps)',
    description: 'Excelente nitidez com uso moderado de banda',
    maxBitrate: 16_000_000,
    startBitrateKbps: 13000,
    targetFrameRate: 30,
    maxFrameRate: 30,
    preferH264: true,
    lowLatency: true,
    contentHint: 'detail',
    videoBitsPerSecond: 14_000_000
  },
  standard: {
    id: 'standard',
    label: 'Padrão (12 Mbps)',
    description: 'Boa qualidade para uso geral em rede local',
    maxBitrate: 12_000_000,
    startBitrateKbps: 10000,
    targetFrameRate: 30,
    maxFrameRate: 30,
    preferH264: true,
    lowLatency: true,
    contentHint: 'detail',
    videoBitsPerSecond: 10_000_000
  },
  lowLatency: {
    id: 'lowLatency',
    label: 'Baixa (8 Mbps)',
    description: 'Qualidade adequada para redes mais limitadas',
    maxBitrate: 8_000_000,
    startBitrateKbps: 6500,
    targetFrameRate: 30,
    maxFrameRate: 30,
    preferH264: true,
    lowLatency: true,
    contentHint: 'detail',
    videoBitsPerSecond: 6_000_000
  }
};

const STORAGE_KEY = 'sharescreen_quality_preset';

export function getDefaultPresetId() {
  return 'highQuality';
}

export function bitrateMbps(preset) {
  return Math.round((preset?.maxBitrate ?? 0) / 1_000_000);
}

export function loadPresetId() {
  try {
    return localStorage.getItem(STORAGE_KEY) || getDefaultPresetId();
  } catch {
    return getDefaultPresetId();
  }
}

export function savePresetId(id) {
  localStorage.setItem(STORAGE_KEY, id);
}

export function getPreset(id) {
  return PRESETS[id] || PRESETS.highQuality;
}

export function mergeServerQuality(serverQuality = {}, presetId = loadPresetId()) {
  const preset = getPreset(presetId);
  const serverMax = serverQuality.maxBitrate ?? preset.maxBitrate;
  return {
    ...serverQuality,
    maxBitrate: Math.min(preset.maxBitrate, serverMax),
    startBitrateKbps: Math.max(
      preset.startBitrateKbps,
      serverQuality.startBitrateKbps ?? 0
    ),
    targetFrameRate: Math.min(
      preset.targetFrameRate,
      serverQuality.targetFrameRate ?? preset.targetFrameRate
    ),
    maxFrameRate: Math.min(
      preset.maxFrameRate,
      serverQuality.maxFrameRate ?? preset.maxFrameRate
    ),
    preferH264: preset.preferH264,
    lowLatency: preset.lowLatency,
    contentHint: preset.contentHint,
    videoBitsPerSecond: preset.videoBitsPerSecond,
    presetId: preset.id,
    presetLabel: preset.label,
    stunServers: serverQuality.stunServers,
    turnServers: serverQuality.turnServers,
    turnEnabled: serverQuality.turnEnabled
  };
}

export function buildDisplayMediaConstraints(quality = {}) {
  const fpsIdeal = quality.targetFrameRate ?? 30;
  const fpsMax = quality.maxFrameRate ?? 30;

  const video = {
    frameRate: { ideal: fpsIdeal, max: fpsMax },
    resizeMode: 'none'
  };

  // Resolução nativa do monitor — sem cap artificial em 1080p
  if (typeof screen !== 'undefined' && screen.width > 0 && screen.height > 0) {
    video.width = { ideal: screen.width };
    video.height = { ideal: screen.height };
  }

  return {
    video,
    audio: false,
    preferCurrentTab: false,
    selfBrowserSurface: 'exclude',
    surfaceSwitching: 'include',
    systemAudio: 'exclude'
  };
}

export function buildDisplayConstraintsWithAudio(quality, wantSystemAudio) {
  const base = buildDisplayMediaConstraints(quality);
  if (wantSystemAudio) {
    base.audio = true;
    base.systemAudio = 'include';
  }
  return base;
}

export function pickScreenCodec(device, preferH264 = true) {
  if (!device?.rtpCapabilities?.codecs) return null;
  const codecs = device.rtpCapabilities.codecs;
  if (preferH264) {
    return (
      codecs.find((c) => c.mimeType.toLowerCase() === 'video/h264') ||
      codecs.find((c) => c.mimeType.toLowerCase() === 'video/vp8')
    );
  }
  return (
    codecs.find((c) => c.mimeType.toLowerCase() === 'video/vp8') ||
    codecs.find((c) => c.mimeType.toLowerCase() === 'video/h264')
  );
}

export function buildVideoProduceOptions(track, device, quality = {}) {
  const maxBitrate = quality.maxBitrate ?? 10_000_000;
  const maxFramerate = quality.targetFrameRate ?? 30;
  const maxKbps = Math.floor(maxBitrate / 1000);
  const startKbps = quality.startBitrateKbps ?? Math.floor(maxKbps * 0.85);

  const opts = {
    track,
    encodings: [
      {
        maxBitrate,
        maxFramerate,
        scalabilityMode: 'L1T1',
        priority: 'high'
      }
    ],
    codecOptions: {
      videoGoogleStartBitrate: startKbps,
      videoGoogleMaxBitrate: maxKbps,
      videoGoogleMinBitrate: Math.floor(maxKbps * 0.6)
    },
    appData: { mediaTag: 'screen' }
  };

  const codec = pickScreenCodec(device, quality.preferH264 !== false);
  if (codec) opts.codec = codec;
  return opts;
}

export function buildAudioProduceOptions(device, quality = {}) {
  const maxBitrate = quality.maxAudioBitrate ?? 128_000;
  const opts = {
    track: null,
    encodings: [{ maxBitrate }],
    appData: { mediaTag: 'audio' }
  };
  const opus = device?.rtpCapabilities?.codecs?.find(
    (c) => c.mimeType.toLowerCase() === 'audio/opus'
  );
  if (opus) opts.codec = opus;
  return opts;
}

export function applyContentHint(track, hint = 'motion') {
  if (!track || !('contentHint' in track)) return;
  try {
    track.contentHint = hint;
  } catch (_) {}
}
