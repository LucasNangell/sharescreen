/**
 * Testes unitários leves dos presets de qualidade (Node).
 */
import {
  PRESETS,
  getPreset,
  mergeServerQuality,
  pickScreenCodec,
  buildVideoProduceOptions,
  videoEncodingParamsFromQuality
} from '../src/shared/quality-manager.js';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    failed += 1;
    return;
  }
  console.log(`[OK] ${message}`);
}

const serverQuality = {
  maxBitrate: 32_000_000,
  startBitrateKbps: 26000,
  targetFrameRate: 30,
  maxFrameRate: 30
};

const low = mergeServerQuality(serverQuality, 'lowLatency');
assert(low.maxBitrate === PRESETS.lowLatency.maxBitrate, 'preset baixa usa teto de 8 Mbps');
assert(low.startBitrateKbps <= Math.floor(low.maxBitrate / 1000), 'start bitrate nao excede o teto');
assert(low.startBitrateKbps <= 6500, 'start bitrate da baixa nao herda 26 Mbps do servidor');

const high = mergeServerQuality(serverQuality, 'highQuality');
assert(high.maxBitrate === 32_000_000, 'preset maxima preserva teto de 32 Mbps');
assert(high.startBitrateKbps <= 26000, 'start bitrate da maxima permanece no preset');

const capped = mergeServerQuality({ ...serverQuality, maxBitrate: 10_000_000 }, 'highQuality');
assert(capped.maxBitrate === 10_000_000, 'teto do servidor limita o preset');

assert(getPreset('balanced').id === 'balanced', 'getPreset resolve balanced');
assert(getPreset('missing').id === 'highQuality', 'getPreset desconhecido cai em maxima');

const params = videoEncodingParamsFromQuality(low);
assert(params.maxBitrate === 8_000_000, 'encoding ao vivo usa maxBitrate do preset');
assert(params.maxFramerate === 30, 'encoding ao vivo usa fps do preset');

const device = {
  rtpCapabilities: {
    codecs: [
      { mimeType: 'video/H264', parameters: { 'profile-level-id': '42e01f' } },
      { mimeType: 'video/H264', parameters: { 'profile-level-id': '42e02a' } },
      { mimeType: 'video/H264', parameters: { 'profile-level-id': '4d0032' } },
      { mimeType: 'video/H264', parameters: { 'profile-level-id': '64002a' } },
      { mimeType: 'video/VP8', parameters: {} }
    ]
  }
};

const picked = pickScreenCodec(device, true);
assert(
  picked?.parameters?.['profile-level-id'] === '64002a',
  'pickScreenCodec prefere High level 4.2 a Baseline 3.1'
);

const vp8 = pickScreenCodec(device, false);
assert(vp8?.mimeType.toLowerCase() === 'video/vp8', 'preferH264 false escolhe VP8');

const opts = buildVideoProduceOptions(null, device, high);
assert(opts.encodings[0].maxBitrate === 32_000_000, 'produce encodings seguem o preset');
assert(opts.codecOptions.videoGoogleStartBitrate <= 32000, 'google start bitrate no teto');
assert(opts.codec?.parameters?.['profile-level-id'] === '64002a', 'produce usa o H.264 de maior score');

if (failed) {
  console.error(`\n${failed} falha(s)`);
  process.exit(1);
}
console.log('\nTodos os testes de qualidade passaram.');
