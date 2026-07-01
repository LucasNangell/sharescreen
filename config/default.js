import os from 'os';

/**
 * ConfiguraÃƒÂ§ÃƒÂ£o padrÃƒÂ£o Ã¢â‚¬â€ ajuste para sua LAN.
 *
 * ProduÃƒÂ§ÃƒÂ£o (padrÃƒÂ£o): 10.1.1.73
 * Desenvolvimento:     $env:SHARESCREEN_SERVER_HOST="10.120.1.12" antes de npm start
 */
const PROD_HOST = '10.1.1.73';
const isDevRuntime = process.env.SHARESCREEN_DEV === '1' || process.argv.includes('--dev');

function detectLanIPv4() {
  const interfaces = os.networkInterfaces();
  for (const list of Object.values(interfaces)) {
    for (const iface of list || []) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      if (!iface.address || iface.address.startsWith('169.254.')) continue;
      return iface.address;
    }
  }
  return '127.0.0.1';
}

function isLocalhost(value) {
  const host = String(value || '').trim().toLowerCase();
  return host === '127.0.0.1' || host === 'localhost';
}

const config = {
  httpsPort: 3443,
  httpPort: 3080,
  wsPingInterval: 25000,
  maxClients: 10,
  rtcMinPort: 40000,
  rtcMaxPort: 40100,

  /** IP nas URLs (Chrome/agente) */
  serverHost: isDevRuntime && isLocalhost(process.env.SHARESCREEN_SERVER_HOST)
    ? detectLanIPv4()
    : process.env.SHARESCREEN_SERVER_HOST || (isDevRuntime ? detectLanIPv4() : PROD_HOST),
  /**
   * IP anunciado no WebRTC (ICE). null = detecta automaticamente a LAN.
   * ProduÃƒÂ§ÃƒÂ£o: start-producao.bat define ANNOUNCED_IP=10.1.1.73
   */
  announcedIp: process.env.ANNOUNCED_IP || null,
  /** IP pÃƒÂºblico nos candidatos ICE quando PUBLIC_URL estÃƒÂ¡ ativo (link /meet/) */
  publicAnnouncedIp: process.env.PUBLIC_ANNOUNCED_IP || '',

  preferredVideoCodec: 'video/H264',
  /** LAN: bitrate alto desde o inÃƒÂ­cio evita ramp-up visÃƒÂ­vel */
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
   * IntegraÃƒÂ§ÃƒÂ£o auxiliar_agent.py Ã¢â‚¬â€ abre Google Chrome (nÃƒÂ£o main.py).
   */
  /** GravaÃƒÂ§ÃƒÂµes do painel host (UNC no cgrafsysvm) */
  recordingsDir:
    process.env.SHARESCREEN_RECORDINGS_DIR ||
    (isDevRuntime ? '_dev_recordings' : '\\\\cgrafsysvm\\ApogeeFiles\\GravaÃƒÂ§oes Treinamento'),

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

  /** DEV / seguranÃƒÂ§a Ã¢â‚¬â€ vazio = sem PIN (compatÃƒÂ­vel com deploy legado) */
  dev: isDevRuntime,
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
  const servers = [];

  if (process.env.TURN_SERVERS) {
    try {
      const parsed = JSON.parse(process.env.TURN_SERVERS);
      if (Array.isArray(parsed)) servers.push(...parsed);
    } catch {
      /* ignore */
    }
  }

  const username = (process.env.TURN_USERNAME || '').trim();
  const credential = (process.env.TURN_PASSWORD || process.env.TURN_CREDENTIAL || '').trim();
  if (username && credential) {
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

    if (urls.length) {
      servers.push({ urls, username, credential });
    }
  }

  return servers;
}

export function getServerHost() {
  return config.serverHost;
}

export default config;
