import mediasoup from 'mediasoup';
import config from '../config/default.js';
import { resolveAnnouncedIp } from './network.js';
import { logger } from './logger.js';

let worker = null;
let router = null;
let announcedIp = null;

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
      /* Baseline (42e01f) = sem B-frames, menor latência que Main (4d0032) */
      'profile-level-id': '42e01f',
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
  const iceIp = getAnnouncedIp();
  logger.info('IP anunciado WebRTC (ICE)', { iceIp });
  logger.info('Inicializando mediasoup (SFU)', {
    announcedIp: iceIp,
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

export async function createWebRtcTransport(peerId) {
  const router = getRouter();
  const iceHost = getAnnouncedIp();
  const transport = await router.createWebRtcTransport({
    listenIps: [{ ip: '0.0.0.0', announcedIp: iceHost }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: config.initialVideoBitrate,
    maxIncomingBitrate: config.maxIncomingBitrate || config.maxVideoBitrate * 1.25
  });

  transport.appData = { peerId };

  logger.info('Transport WebRTC criado', {
    peerId,
    transportId: transport.id,
    iceAnnouncedHost: iceHost,
    udpPorts: `${config.rtcMinPort}-${config.rtcMaxPort}`,
    iceCandidates: transport.iceCandidates?.map((c) => c.ip).join(', ')
  });

  transport.on('icestatechange', (iceState) => {
    if (iceState === 'connected') {
      logger.info('Transport ICE conectado', { peerId, transportId: transport.id });
    } else if (iceState === 'failed' || iceState === 'disconnected') {
      logger.warn('Transport ICE com problema', {
        peerId,
        transportId: transport.id,
        iceState,
        dica: 'Libere UDP 40000-40100 no firewall do Windows para o IP ' + iceHost
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
  if (router) {
    router.close();
    router = null;
  }
  if (worker) {
    worker.close();
    worker = null;
  }
}
