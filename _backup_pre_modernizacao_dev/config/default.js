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

  preferredVideoCodec: 'video/H264',
  /** Bitrates moderados = menos buffer no decoder (menor delay na LAN) */
  initialVideoBitrate: 4_000_000,
  maxVideoBitrate: 8_000_000,
  maxIncomingBitrate: 10_000_000,
  startBitrateKbps: 2500,
  targetFrameRate: 30,
  maxFrameRate: 30,
  lowLatency: true,

  audio: {
    enabled: true,
    systemAudioDefault: true,
    microphoneDefault: false,
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
  }
};

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
    maxAudioBitrate: config.audio?.maxBitrate ?? 128_000
  };
}

export default config;
