/**
 * Configuração padrão — ajuste para sua LAN.
 *
 * Produção (padrão): 10.1.1.73
 * Desenvolvimento:     $env:SHARESCREEN_SERVER_HOST="10.120.1.12" antes de npm start
 */
const PROD_HOST = '10.1.1.73';

const config = {
  httpsPort: 3443,
  httpPort: 3080,
  wsPingInterval: 25000,
  maxClients: 10,
  rtcMinPort: 40000,
  rtcMaxPort: 40100,

  /** IP nas URLs (Chrome/agente) */
  serverHost: process.env.SHARESCREEN_SERVER_HOST || PROD_HOST,
  /**
   * IP anunciado no WebRTC (ICE). null = detecta automaticamente a LAN.
   * Produção: start-producao.bat define ANNOUNCED_IP=10.1.1.73
   */
  announcedIp: process.env.ANNOUNCED_IP || null,
  /** IP público nos candidatos ICE quando PUBLIC_URL está ativo (link /meet/) */
  publicAnnouncedIp: process.env.PUBLIC_ANNOUNCED_IP || '',

  preferredVideoCodec: 'video/H264',
  /** LAN: bitrate alto desde o início evita ramp-up visível */
  initialVideoBitrate: 32_000_000,
  maxVideoBitrate: 32_000_000,
  maxIncomingBitrate: 40_000_000,
  startBitrateKbps: 26000,
  targetFrameRate: 30,
  maxFrameRate: 30,
  lowLatency: true,

  audio: {
    enabled: true,
    systemAudioDefault: true,
    microphoneDefault: true,
    maxBitrate: 128_000
  },

  certDir: 'certs',
  certKey: 'certs/server.key',
  certCrt: 'certs/server.crt',

  /**
   * Integração auxiliar_agent.py — abre Google Chrome (não main.py).
   */
  /** Gravações do painel host (UNC no cgrafsysvm) */
  recordingsDir:
    process.env.SHARESCREEN_RECORDINGS_DIR ||
    '\\\\cgrafsysvm\\ApogeeFiles\\Gravaçoes Treinamento',

  agent: {
    dbPath:
      process.env.SHARESCREEN_AGENT_DB ||
      '\\\\redecamara\\dfsdata\\cgraf\\sefoc\\deputados\\_Temp\\2025\\LUCAS\\Computadores\\auxiliar_system.db',
    /** Vazio = agente localiza chrome.exe automaticamente */
    chromePath:
      process.env.SHARESCREEN_CHROME ||
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    pythonPath: process.env.SHARESCREEN_PYTHON || 'python',
    screenIndex: 0,
    engine: 'chrome',
    /** Considera agente online se last_seen < N segundos (heartbeat do agente ~3s) */
    onlineMaxAgeSeconds: 20
  },

  /** DEV / segurança — vazio = sem PIN (compatível com deploy legado) */
  dev: process.env.SHARESCREEN_DEV === '1',
  roomPin: process.env.SHARESCREEN_ROOM_PIN || '',
  hostToken: process.env.SHARESCREEN_HOST_TOKEN || '',
  trustProxy: process.env.TRUST_PROXY === '1',
  publicUrl: process.env.PUBLIC_URL || '',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
  stunServers: (process.env.STUN_SERVERS || 'stun:stun.l.google.com:19302')
    .split(',')
    .filter(Boolean)
    .map((url) => ({ urls: url.trim() })),
  turnServers: parseTurnServers()
};

function parseTurnServers() {
  if (process.env.TURN_SERVERS) {
    try {
      const parsed = JSON.parse(process.env.TURN_SERVERS);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  const username = (process.env.TURN_USERNAME || '').trim();
  const credential = (process.env.TURN_PASSWORD || process.env.TURN_CREDENTIAL || '').trim();
  if (!username || !credential) return [];

  let urls = (process.env.TURN_URLS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!urls.length) {
    const publicUrl = (process.env.PUBLIC_URL || '').trim();
    if (publicUrl) {
      try {
        const host = new URL(publicUrl).hostname;
        urls = [
          `turn:${host}:3478?transport=udp`,
          `turn:${host}:3478?transport=tcp`,
          `turns:${host}:5349?transport=tcp`
        ];
      } catch {
        /* ignore */
      }
    }
  }

  if (!urls.length) return [];
  return [{ urls, username, credential }];
}

export function getServerHost() {
  return config.serverHost;
}

export function getVideoQualityForClients() {
  return {
    maxBitrate: config.maxVideoBitrate,
    startBitrateKbps: config.startBitrateKbps,
    targetFrameRate: config.targetFrameRate,
    maxFrameRate: config.maxFrameRate,
    preferH264: config.preferredVideoCodec.toLowerCase().includes('h264'),
    lowLatency: config.lowLatency !== false,
    serverHost: config.serverHost,
    rtcPortRange: `${config.rtcMinPort}-${config.rtcMaxPort}`,
    audioEnabled: config.audio?.enabled !== false,
    systemAudioDefault: config.audio?.systemAudioDefault !== false,
    microphoneDefault: !!config.audio?.microphoneDefault,
    maxAudioBitrate: config.audio?.maxBitrate ?? 128_000,
    stunServers: config.stunServers,
    turnServers: config.turnServers,
    turnEnabled: config.turnServers.length > 0
  };
}

export default config;
