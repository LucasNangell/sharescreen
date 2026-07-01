/**
 * Cliente WebSocket robusto com reconnect, timeouts e fila de mensagens críticas.
 */
export const ConnectionState = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  DISCONNECTED: 'disconnected',
  FAILED: 'failed'
};

export function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws`;
}

export class SignalingClient {
  constructor(url, options = {}) {
    this.url = url;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.onLog = options.onLog || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
    this.enableReconnect = options.enableReconnect !== false;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 12;
    this.ws = null;
    this.intentionalClose = false;
    this.reconnectAttempt = 0;
    this.listeners = new Set();
    this._state = ConnectionState.IDLE;
    this._pendingCritical = [];
    this._onceHandlers = new Map();
    this._lastCloseCode = null;
    this._lastCloseReason = '';
    this.authenticated = false;
  }

  get state() {
    return this._state;
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  setState(next) {
    if (this._state === next) return;
    this._state = next;
    this.onStateChange(next);
  }

  addListener(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  removeListener(fn) {
    this.listeners.delete(fn);
  }

  dispatch(msg) {
    for (const fn of this.listeners) fn(msg);
    this._resolveOnce(msg);
  }

  _resolveOnce(msg) {
    if (!msg?.type) return;
    const key = msg.type;

    if (key === 'erro') {
      for (const [type, list] of this._onceHandlers.entries()) {
        const remaining = [];
        for (const entry of list) {
          try {
            if (entry.filter(msg)) {
              clearTimeout(entry.timer);
              entry.resolve(msg.payload);
            } else {
              remaining.push(entry);
            }
          } catch (e) {
            remaining.push(entry);
          }
        }
        if (remaining.length) this._onceHandlers.set(type, remaining);
        else this._onceHandlers.delete(type);
      }
      return;
    }

    const list = this._onceHandlers.get(key);
    if (!list?.length) return;
    const remaining = [];
    for (const entry of list) {
      try {
        if (entry.filter(msg)) {
          clearTimeout(entry.timer);
          entry.resolve(msg.payload);
        } else {
          remaining.push(entry);
        }
      } catch (e) {
        remaining.push(entry);
      }
    }
    if (remaining.length) this._onceHandlers.set(key, remaining);
    else this._onceHandlers.delete(key);
  }

  onceType(type, filter = () => true, timeoutMs = 25000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._removeOnce(type, resolve);
        reject(new Error(`Timeout aguardando: ${type}`));
      }, timeoutMs);

      const entry = {
        resolve,
        filter: (msg) => {
          if (msg.type === 'erro') {
            clearTimeout(timer);
            reject(new Error(msg.payload?.mensagem || 'Erro do servidor'));
            return true;
          }
          return msg.type === type && filter(msg);
        },
        timer
      };

      if (!this._onceHandlers.has(type)) this._onceHandlers.set(type, []);
      this._onceHandlers.get(type).push(entry);
    });
  }

  _removeOnce(type, resolve) {
    const list = this._onceHandlers.get(type);
    if (!list) return;
    this._onceHandlers.set(
      type,
      list.filter((e) => e.resolve !== resolve)
    );
  }

  connect() {
    this._retireSocket(this.ws);
    this.intentionalClose = false;
    this.setState(
      this.reconnectAttempt > 0 ? ConnectionState.RECONNECTING : ConnectionState.CONNECTING
    );
    const socket = new WebSocket(this.url);
    this.ws = socket;

    socket.onopen = () => {
      if (this.ws !== socket) return;
      this.reconnectAttempt = 0;
      this.authenticated = false;
      this._lastCloseCode = null;
      this._lastCloseReason = '';
      this.setState(ConnectionState.CONNECTED);
      this.onLog('WebSocket conectado', 'info');
      // onOpen reenvia `entrar` — fila antiga causava duplicata e derrubava o host
      this._pendingCritical = this._pendingCritical.filter((packet) => {
        try {
          return JSON.parse(packet).type !== 'entrar';
        } catch {
          return false;
        }
      });
      this._flushCriticalQueue();
      this.onOpen?.();
    };

    socket.onmessage = (ev) => {
      if (this.ws !== socket) return;
      try {
        const msg = JSON.parse(ev.data);
        this.dispatch(msg);
      } catch {
        this.onLog('Mensagem WebSocket inválida', 'warn');
      }
    };

    socket.onclose = (ev) => {
      if (this.ws !== socket) return;
      this.authenticated = false;
      this._lastCloseCode = ev?.code ?? null;
      this._lastCloseReason = ev?.reason || '';
      this.setState(ConnectionState.DISCONNECTED);
      this.onClose?.(this._lastCloseCode, this._lastCloseReason);
      if (!this.intentionalClose && this.enableReconnect) {
        this.scheduleReconnect();
      }
    };

    socket.onerror = () => {
      if (this.ws !== socket) return;
      this.onLog('Erro no WebSocket', 'error');
    };
  }

  _retireSocket(ws) {
    if (!ws) return;
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      try {
        ws.close(1000, 'Nova conexão');
      } catch (_) {}
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      this.setState(ConnectionState.FAILED);
      this.onLog('Reconexão esgotada — recarregue a página', 'error');
      return;
    }
    const delay = Math.min(30000, 1000 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.setState(ConnectionState.RECONNECTING);
    this.onLog(`Reconectando em ${Math.round(delay / 1000)}s (tentativa ${this.reconnectAttempt})`, 'warn');
    setTimeout(() => {
      if (!this.intentionalClose) this.connect();
    }, delay);
  }

  send(type, payload = {}, { critical = false } = {}) {
    const packet = JSON.stringify({ type, payload });
    if (!this.connected) {
      if (critical) {
        this._pendingCritical.push(packet);
        this.onLog(`Mensagem ${type} enfileirada (WS desconectado)`, 'warn');
        return;
      }
      throw new Error('WebSocket não conectado');
    }
    this.ws.send(packet);
  }

  _flushCriticalQueue() {
    while (this.connected && this._pendingCritical.length) {
      this.ws.send(this._pendingCritical.shift());
    }
  }

  markAuthenticated(value = true) {
    this.authenticated = value;
  }

  close() {
    this.intentionalClose = true;
    this.authenticated = false;
    this.setState(ConnectionState.DISCONNECTED);
    this._retireSocket(this.ws);
    this.ws = null;
    this.clearPending();
    this._pendingCritical = [];
  }

  clearPending() {
    this._onceHandlers.clear();
  }
}
