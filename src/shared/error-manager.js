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
  ROOM_FULL: 'room_full',
  FORBIDDEN: 'forbidden',
  NOT_AUTHENTICATED: 'not_authenticated',
  NO_SELECTION: 'no_selection',
  TRANSPORT_ERROR: 'transport_error',
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
  [ErrorCodes.ROOM_FULL]:
    'Sala cheia. Aguarde ou peça ao host para liberar vagas.',
  [ErrorCodes.FORBIDDEN]:
    'Sem permissão para esta ação.',
  [ErrorCodes.NOT_AUTHENTICATED]:
    'Sessão expirada. Reconectando automaticamente…',
  [ErrorCodes.NO_SELECTION]:
    'Nenhuma fonte selecionada para esta operação.',
  [ErrorCodes.TRANSPORT_ERROR]:
    'Conexão de mídia instável. Aguarde a reconexão automática.',
  [ErrorCodes.UNKNOWN]: 'Ocorreu um erro inesperado. Tente novamente em instantes.'
};

export function classifyServerMessage(msg) {
  const text = String(msg || '').toLowerCase();

  if (text.includes('limite de') && text.includes('client')) {
    return ErrorCodes.ROOM_FULL;
  }
  if (
    text.includes('pin inválido') ||
    text.includes('pin invalido') ||
    text.includes('acesso negado') ||
    text.includes('link de acesso inválido') ||
    text.includes('link de acesso invalido')
  ) {
    return ErrorCodes.AUTH_FAILED;
  }
  if (text.includes('não autenticado') || text.includes('nao autenticado')) {
    return ErrorCodes.NOT_AUTHENTICATED;
  }
  if (
    text.includes('apenas o host') ||
    text.includes('sem permissao') ||
    text.includes('sem permissão')
  ) {
    return ErrorCodes.FORBIDDEN;
  }
  if (text.includes('nenhum client selecionado') || text.includes('nenhuma transmiss')) {
    return ErrorCodes.NO_SELECTION;
  }
  if (text.includes('transport') && (text.includes('inválido') || text.includes('invalido'))) {
    return ErrorCodes.TRANSPORT_ERROR;
  }
  if (text.includes('timeout') || text.includes('servidor indispon')) {
    return ErrorCodes.SERVER_UNAVAILABLE;
  }
  if (
    text.includes('consumir') ||
    text.includes('producer') ||
    text.includes('capacidades')
  ) {
    return ErrorCodes.MEDIASOUP_FAILED;
  }
  return null;
}

export function isUnrecoverableConsumeError(msg) {
  const text = String(msg || '').toLowerCase();
  if (!text) return false;
  if (text.includes('proprio producer') || text.includes('próprio producer')) return true;
  if (text.includes('producer indisponivel') || text.includes('producer indisponível')) return true;
  if (text.includes('capacidades') && (text.includes('consumir') || text.includes('producer'))) {
    return true;
  }
  return false;
}

export function isTransientServerError(msg, { joinInProgress = false } = {}) {
  const text = String(msg || '').toLowerCase();
  if (joinInProgress && (text.includes('não autenticado') || text.includes('nao autenticado'))) {
    return true;
  }
  if (text.includes('tipo de mensagem desconhecido')) return true;
  if (
    text.includes('producer indisponivel') ||
    text.includes('producer indisponível') ||
    text.includes('proprio producer') ||
    text.includes('próprio producer')
  ) {
    return true;
  }
  return false;
}

export function formatServerError(message) {
  const technical = String(message || '');
  const code = classifyServerMessage(technical) || classifyError(new Error(technical));
  return {
    code,
    friendly: FRIENDLY[code] || FRIENDLY[ErrorCodes.UNKNOWN],
    technical
  };
}

export function classifyError(err) {
  const name = err?.name || '';
  const msg = String(err?.message || err || '').toLowerCase();

  const serverCode = classifyServerMessage(msg);
  if (serverCode) return serverCode;

  if (name === 'NotAllowedError' || msg.includes('permission')) {
    if (
      msg.includes('local network') ||
      msg.includes('private network') ||
      msg.includes('private ip') ||
      msg.includes('mdns')
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
    return ErrorCodes.NOT_AUTHENTICATED;
  }
  if (msg.includes('timeout')) {
    return ErrorCodes.SERVER_UNAVAILABLE;
  }
  return ErrorCodes.UNKNOWN;
}

export class ErrorManager {
  constructor({ onToast, onTechnicalLog, toastDedupeMs = 3000 } = {}) {
    this.onToast = onToast || (() => {});
    this.onTechnicalLog = onTechnicalLog || (() => {});
    this.lastErrors = [];
    this.maxHistory = 50;
    this.toastDedupeMs = toastDedupeMs;
    this._lastToast = { code: '', at: 0 };
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

    const now = Date.now();
    if (
      code !== this._lastToast.code ||
      now - this._lastToast.at >= this.toastDedupeMs
    ) {
      this._lastToast = { code, at: now };
      this.onToast(friendly, 'error');
    }

    return entry;
  }

  handleServerMessage(message, context = 'servidor', { joinInProgress = false } = {}) {
    const technical = String(message || '');
    if (isTransientServerError(technical, { joinInProgress })) {
      this.onTechnicalLog(`[transient] ${context}: ${technical}`, 'warn');
      return null;
    }
    return this.handle(new Error(technical), context);
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
