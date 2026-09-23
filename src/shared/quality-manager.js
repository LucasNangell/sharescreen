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

export function videoEncodingParamsFromQuality(quality = {}) {
  return {
    maxBitrate: quality.maxBitrate ?? 10_000_000,
    maxFramerate: quality.targetFrameRate ?? 30,
    scaleResolutionDownBy: 1
  };
}

function clampStartBitrateKbps(maxBitrate, presetStart, serverStart) {
  const maxKbps = Math.floor(maxBitrate / 1000);
  const capKbps = Math.min(maxKbps, Math.floor(maxKbps * 0.85));
  const candidates = [presetStart, capKbps];
  if (Number.isFinite(serverStart) && serverStart > 0) candidates.push(serverStart);
  return Math.max(1, Math.min(...candidates.filter((n) => Number.isFinite(n) && n > 0)));
}

export function mergeServerQuality(serverQuality = {}, presetId = loadPresetId()) {
  const preset = getPreset(presetId);
  const serverMax = serverQuality.maxBitrate ?? preset.maxBitrate;
  const maxBitrate = Math.min(preset.maxBitrate, serverMax);
  return {
    ...serverQuality,
    maxBitrate,
    startBitrateKbps: clampStartBitrateKbps(
      maxBitrate,
      preset.startBitrateKbps,
      serverQuality.startBitrateKbps
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

  return {
    video: {
      frameRate: { ideal: fpsIdeal, max: fpsMax },
      resizeMode: 'none'
    },
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

function h264ProfileLevelId(codec) {
  const raw = codec?.parameters?.['profile-level-id'] || codec?.parameters?.profileLevelId || '';
  return String(raw).toLowerCase();
}

function h264CodecScore(codec) {
  const id = h264ProfileLevelId(codec);
  const profileByte = id.slice(0, 2);
  const levelByte = Number.parseInt(id.slice(4, 6), 16);
  const profileRank =
    profileByte === '42' ? 3 : profileByte === '4d' ? 2 : profileByte === '64' ? 1 : 0;
  const level = Number.isFinite(levelByte) ? levelByte : 0;
  return profileRank * 1000 + level;
}

export function pickScreenCodec(device, preferH264 = true) {
  if (!device?.rtpCapabilities?.codecs) return null;
  const codecs = device.rtpCapabilities.codecs;
  const h264 = codecs
    .filter((c) => c.mimeType.toLowerCase() === 'video/h264')
    .sort((a, b) => h264CodecScore(b) - h264CodecScore(a));
  const vp8 = codecs.find((c) => c.mimeType.toLowerCase() === 'video/vp8');
  if (preferH264) return h264[0] || vp8 || null;
  return vp8 || h264[0] || null;
}

export function buildVideoProduceOptions(track, device, quality = {}) {
  const { maxBitrate, maxFramerate, scaleResolutionDownBy } =
    videoEncodingParamsFromQuality(quality);
  const maxKbps = Math.floor(maxBitrate / 1000);
  const startKbps = clampStartBitrateKbps(maxBitrate, quality.startBitrateKbps);

  const opts = {
    track,
    stopTracks: false,
    encodings: [
      {
        maxBitrate,
        maxFramerate,
        scaleResolutionDownBy,
        scalabilityMode: 'L1T1',
        priority: 'high',
        networkPriority: 'high'
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

export function buildAudioProduceOptions(device, quality = {}, source = 'microphone') {
  const micBitrate = quality.micAudioBitrate ?? 48_000;
  const sysBitrate = quality.systemAudioBitrate ?? quality.maxAudioBitrate ?? 96_000;
  const maxBitrate = source === 'system' ? sysBitrate : micBitrate;
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

export function describeVideoCodec(codec) {
  if (!codec?.mimeType) return 'auto';
  const profile = h264ProfileLevelId(codec);
  return profile ? `${codec.mimeType} ${profile}` : codec.mimeType;
}

export async function applySenderResolutionPreference(producer) {
  const sender = producer?.rtpSender;
  if (!sender || typeof sender.getParameters !== 'function') return false;
  try {
    const params = sender.getParameters();
    if (!params) return false;
    params.degradationPreference = 'maintain-resolution';
    if (Array.isArray(params.encodings)) {
      for (const encoding of params.encodings) {
        encoding.scaleResolutionDownBy = 1;
        encoding.networkPriority = 'high';
        encoding.priority = 'high';
      }
    }
    if (typeof sender.setParameters === 'function') {
      await sender.setParameters(params);
    }
    return true;
  } catch (_) {
    return false;
  }
}
