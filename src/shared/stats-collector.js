/**
 * Coleta métricas WebRTC via getStats (mediasoup).
 */
const prevSamples = new WeakMap();

export async function collectWebRtcStats(mediaClient) {
  const out = {
    bitrateKbps: null,
    packetLoss: null,
    rttMs: null,
    fps: null,
    timestamp: Date.now()
  };

  const targets = mediaClient?.getStatsTargets?.() || [];
  if (!targets.length) return out;

  let packetsLost = 0;
  let packetsReceived = 0;
  let rttSum = 0;
  let rttCount = 0;
  let bytesReceived = 0;

  for (const { consumer, producer, kind } of targets) {
    const target = consumer || producer;
    if (!target?.getStats) continue;

    try {
      const statsReport = await target.getStats();
      statsReport.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === kind) {
          packetsLost += report.packetsLost || 0;
          packetsReceived += report.packetsReceived || 0;
          bytesReceived += report.bytesReceived || 0;
          if (report.framesPerSecond) out.fps = report.framesPerSecond;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          if (report.currentRoundTripTime != null) {
            rttSum += report.currentRoundTripTime * 1000;
            rttCount += 1;
          }
        }
      });
    } catch (_) {}
  }

  if (packetsReceived + packetsLost > 0) {
    out.packetLoss =
      Math.round((packetsLost / (packetsReceived + packetsLost)) * 1000) / 10;
  }
  if (rttCount) out.rttMs = Math.round(rttSum / rttCount);

  const prev = prevSamples.get(mediaClient);
  if (prev && bytesReceived > prev.bytes && out.timestamp > prev.ts) {
    const dtSec = (out.timestamp - prev.ts) / 1000;
    if (dtSec > 0) {
      out.bitrateKbps = Math.round(((bytesReceived - prev.bytes) * 8) / dtSec / 1000);
    }
  }
  prevSamples.set(mediaClient, { bytes: bytesReceived, ts: out.timestamp });

  return out;
}
