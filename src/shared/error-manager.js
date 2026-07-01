/**
 * Classificação de erros e mensagens amigáveis + detalhe técnico.
 */
export const ErrorCodes = {
  PERMISSION_DENIED: 'permission_denied',
  INSECURE_CONTEXT: 'insecure_context',
  MIC_UNAVAILABLE: 'mic_unavailable',
  SCREEN_NOT_SELECTED: 'screen_not_selected',
  WS_DISCONNECTED: 'ws_disconnected',
  ICE_FAILED: 'ice_failed',
  MEDIASOUP_FAILED: 'mediasoup_failed',
  AUTOPLAY_BLOCKED: 'autoplay_blocked',
  RECORDING_UNAVAILABLE: 'recording_unavailable',
  UPLOAD_FAILED: 'upload_failed',
  SERVER_UNAVAILABLE: 'server_unavailable',
  AUTH_FAILED: 'auth_failed',
  UNKNOWN: 'unknown'
};

const FRIENDLY = {
  [ErrorCodes.PERMISSION_DENIED]:
    'Permissão negada. Clique em permitir quando o navegador solicitar tela ou microfone.',
  [ErrorCodes.INSECURE_CONTEXT]:
    'Conexão não segura. Use HTTPS (ou localhost) para compartilhar tela e microfone.',
  [ErrorCodes.MIC_UNAVAILABLE]:
    'Microfone indisponível. Verifique se há um dispositivo conectado e tente novamente.',
  [ErrorCodes.SCREEN_NOT_SELECTED]:
    'Nenhuma tela foi selecionada. Escolha um monitor ou janela no diálogo do navegador.',
  [ErrorCodes.WS_DISCONNECTED]:
    'Conexão com o servidor perdida. Reconectando automaticamente…',
  [ErrorCodes.ICE_FAILED]:
    'Falha na conexão de mídia (ICE). Verifique firewall UDP 40000–40100 na rede.',
  [ErrorCodes.MEDIASOUP_FAILED]:
    'Falha ao publicar ou receber mídia. Tente recompartilhar a tela.',
  [ErrorCodes.AUTOPLAY_BLOCKED]:
    'O navegador bloqueou a reprodução de áudio. Clique em "Ativar áudio".',
  [ErrorCodes.RECORDING_UNAVAILABLE]:
    'Gravação indisponível. Selecione uma transmissão ativa antes de gravar.',
  [ErrorCodes.UPLOAD_FAILED]:
    'Falha ao enviar a gravação ao servidor. Verifique espaço em disco e conexão.',
  [ErrorCodes.SERVER_UNAVAILABLE]:
    'Servidor indisponível. Verifique se o ShareScreen está em execução.',
  [ErrorCodes.AUTH_FAILED]:
    'Acesso negado. Verifique o PIN ou credenciais de host.',
  [ErrorCodes.UNKNOWN]: 'Ocorreu um erro inesperado. Consulte o painel técnico.'
};

export function classifyError(err) {
  const name = err?.name || '';
  const msg = String(err?.message || err || '').toLowerCase();

  if (name === 'NotAllowedError' || msg.includes('permission')) {
    if (
      msg.includes('local network') ||
      msg.includes('private network') ||
      msg.includes('private ip') ||
      msg.includes('mDNS')
    ) {
      return ErrorCodes.ICE_FAILED;
    }
    if (msg.includes('microphone') || msg.includes('microfone')) {
      return ErrorCodes.MIC_UNAVAILABLE;
    }
    return ErrorCodes.PERMISSION_DENIED;
  }
  if (msg.includes('secure context') || msg.includes('https')) {
    return ErrorCodes.INSECURE_CONTEXT;
  }
  if (msg.includes('ice') || (msg.includes('transport') && msg.includes('failed'))) {
    return ErrorCodes.ICE_FAILED;
  }
  if (msg.includes('websocket') || msg.includes('desconect')) {
    return ErrorCodes.WS_DISCONNECTED;
  }
  if (msg.includes('autoplay') || msg.includes('play()')) {
    return ErrorCodes.AUTOPLAY_BLOCKED;
  }
  if (msg.includes('grav') || msg.includes('record')) {
    return ErrorCodes.RECORDING_UNAVAILABLE;
  }
  if (msg.includes('upload') || msg.includes('enviar grava')) {
    return ErrorCodes.UPLOAD_FAILED;
  }
  if (
    msg.includes('pin inválido') ||
    msg.includes('pin invalido') ||
    msg.includes('acesso negado')
  ) {
    return ErrorCodes.AUTH_FAILED;
  }
  if (msg.includes('não autenticado') || msg.includes('nao autenticado')) {
    return ErrorCodes.WS_DISCONNECTED;
  }
  if (msg.includes('timeout')) {
    return ErrorCodes.SERVER_UNAVAILABLE;
  }
  return ErrorCodes.UNKNOWN;
}

export class ErrorManager {
  constructor({ onToast, onTechnicalLog } = {}) {
    this.onToast = onToast || (() => {});
    this.onTechnicalLog = onTechnicalLog || (() => {});
    this.lastErrors = [];
    this.maxHistory = 50;
  }

  handle(err, context = '') {
    const code = classifyError(err);
    const technical = err?.stack || String(err?.message || err);
    const friendly = FRIENDLY[code] || FRIENDLY[ErrorCodes.UNKNOWN];

    const entry = {
      code,
      friendly,
      technical,
      context,
      at: new Date().toISOString()
    };

    this.lastErrors.unshift(entry);
    if (this.lastErrors.length > this.maxHistory) this.lastErrors.pop();

    this.onTechnicalLog(`[${code}] ${context}: ${technical}`, 'error');
    this.onToast(friendly, 'error');

    return entry;
  }

  getHistory() {
    return [...this.lastErrors];
  }
}

export function assertSecureContext() {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    const e = new Error('Secure context required for getDisplayMedia');
    e.code = ErrorCodes.INSECURE_CONTEXT;
    throw e;
  }
}
