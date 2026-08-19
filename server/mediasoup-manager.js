import mediasoup from 'mediasoup';
import config from '../config/default.js';
import { resolveAnnouncedIp, resolvePublicAnnouncedIp, buildIceListenIps } from './network.js';
import { logger } from './logger.js';
import { debugLog } from './debug-log.js';

let worker = null;
let router = null;
let announcedIp = null;
let publicAnnouncedIp = null;

const startKbps = Math.floor((config.startBitrateKbps || 8000));

const audioStartKbps = Math.floor((config.audio?.maxBitrate || 128_000) / 1000);

const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
    parameters: {
      useinbandfec: 1,
      usedtx: 0,
      'x-google-start-bitrate': Math.min(audioStartKbps, 128)
    }
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e033',
      'level-asymmetry-allowed': 1,
      'x-google-start-bitrate': startKbps
    }
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e02a',
      'level-asymmetry-allowed': 1,
      'x-google-start-bitrate': startKbps
    }
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f',
      'level-asymmetry-allowed': 1,
      'x-google-start-bitrate': startKbps
    }
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '4d0032',
      'level-asymmetry-allowed': 1,
      'x-google-start-bitrate': startKbps
    }
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '64002a',
      'level-asymmetry-allowed': 1,
      'x-google-start-bitrate': startKbps
    }
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': startKbps
    }
  }
];

export async function initMediasoup() {
  announcedIp = resolveAnnouncedIp(
    process.env.ANNOUNCED_IP || config.announcedIp || null
  );
  publicAnnouncedIp = await resolvePublicAnnouncedIp(announcedIp);
  const iceIp = getAnnouncedIp();
  logger.info('IP anunciado WebRTC (ICE)', {
    lan: iceIp,
    public: publicAnnouncedIp || null,
    publicUrl: (config.publicUrl || '').trim() || null,
    devLocalhost: iceIp === '127.0.0.1'
  });
  debugLog('A', 'mediasoup-manager.js:initMediasoup', 'ICE IPs resolved', {
    lanIp: iceIp,
    publicIp: publicAnnouncedIp || null,
    hasPublicUrl: !!(config.publicUrl || '').trim()
  });
  if ((config.publicUrl || '').trim() && !publicAnnouncedIp) {
    logger.warn(
      'PUBLIC_URL configurado sem IP público ICE — espectadores externos podem falhar. ' +
        'Defina PUBLIC_ANNOUNCED_IP ou libere resolução DNS externa.'
    );
  }
  logger.info('Inicializando mediasoup (SFU)', {
    announcedIp: iceIp,
    publicAnnouncedIp: publicAnnouncedIp || undefined,
    rtcPorts: `${config.rtcMinPort}-${config.rtcMaxPort}`
  });

  worker = await mediasoup.createWorker({
    logLevel: 'warn',
    rtcMinPort: config.rtcMinPort,
    rtcMaxPort: config.rtcMaxPort
  });

  worker.on('died', () => {
    logger.error('Worker mediasoup encerrou inesperadamente');
    process.exit(1);
  });

  router = await worker.createRouter({ mediaCodecs });
  logger.info('Router mediasoup criado', { routerId: router.id });
  return { worker, router, announcedIp };
}

export function getRouter() {
  if (!router) throw new Error('Router mediasoup não inicializado');
  return router;
}

export function getRtpCapabilities() {
  return getRouter().rtpCapabilities;
}

export function getAnnouncedIp() {
  return announcedIp || resolveAnnouncedIp(null);
}

export function getPublicAnnouncedIp() {
  return publicAnnouncedIp || null;
}

export function getIceListenIps() {
  return buildIceListenIps(getAnnouncedIp(), getPublicAnnouncedIp());
}

export async function createWebRtcTransport(peerId) {
  const router = getRouter();
  const listenIps = getIceListenIps();
  const transport = await router.createWebRtcTransport({
    listenIps,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: config.initialVideoBitrate,
    maxIncomingBitrate: config.maxIncomingBitrate || config.maxVideoBitrate * 1.25
  });

  transport.appData = { peerId };

  const announcedHosts = listenIps.map((entry) => entry.announcedIp);
  logger.info('Transport WebRTC criado', {
    peerId,
    transportId: transport.id,
    iceAnnouncedHosts: announcedHosts,
    udpPorts: `${config.rtcMinPort}-${config.rtcMaxPort}`,
    iceCandidates: transport.iceCandidates?.map((c) => c.ip).join(', ')
  });
  debugLog('A', 'mediasoup-manager.js:createWebRtcTransport', 'transport created', {
    peerId,
    transportId: transport.id,
    announcedHosts,
    candidateIps: transport.iceCandidates?.map((c) => c.ip) || []
  });

  transport.on('icestatechange', (iceState) => {
    if (iceState === 'connected') {
      logger.info('Transport ICE conectado', { peerId, transportId: transport.id });
    } else if (iceState === 'failed' || iceState === 'disconnected') {
      logger.warn('Transport ICE com problema', {
        peerId,
        transportId: transport.id,
        iceState,
        dica: 'Libere UDP 40000-40100 no firewall para os IPs ' + announcedHosts.join(', ')
      });
    }
  });

  transport.on('dtlsstatechange', (dtlsState) => {
    if (dtlsState === 'closed') {
      logger.debug('Transport DTLS fechado', { peerId, transportId: transport.id });
    }
  });

  transport.on('@close', () => {
    logger.debug('Transport fechado', { peerId, transportId: transport.id });
  });

  return transport;
}

export async function closeMediasoup() {
  const { closeActiveSpeakerObserver } = await import('./active-speaker.js');
  await closeActiveSpeakerObserver();
  if (router) {
    router.close();
    router = null;
  }
  if (worker) {
    worker.close();
    worker = null;
  }
}
