/**
 * Cliente de sinalizacao HTTP (long-poll) — mesma API do SignalingClient.
 * Usado por espectadores externos (/meet?token=) quando WebSocket nao passa no proxy.
 */
import { ConnectionState } from './signaling-client.js';
import {
  WIRE_ENC,
  encodeWirePayload,
  unwrapWireMessages
} from './http-signaling-wire.js';

export { ConnectionState };

export class HttpSignalingClient {
  constructor(options = {}) {
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.onLog = options.onLog || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
    this.enableReconnect = options.enableReconnect !== false;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 8;
    this.sessionId = null;
    this.intentionalClose = false;
    this.reconnectAttempt = 0;
    this.listeners = new Set();
    this._state = ConnectionState.IDLE;
    this._pendingCritical = [];
    this._onceHandlers = new Map();
    this._sendQueue = Promise.resolve();
    this._pollAbort = null;
    this._polling = false;
    this.authenticated = false;
    this.isHttpSignaling = true;
    this.transport = 'http';
  }

  get state() {
    return this._state;
  }

  get connected() {
    return this._state === ConnectionState.CONNECTED && !this.intentionalClose;
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
          } catch {
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
      } catch {
        remaining.push(entry);
      }
    }
    if (remaining.length) this._onceHandlers.set(key, remaining);
    else this._onceHandlers.delete(key);
  }

  onceType(type, filter = () => true, timeoutMs = 45000) {
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
    this.intentionalClose = false;
    this.setState(
      this.reconnectAttempt > 0 ? ConnectionState.RECONNECTING : ConnectionState.CONNECTING
    );
    this.reconnectAttempt = 0;
    this.authenticated = false;
    this.setState(ConnectionState.CONNECTED);
    this.onLog('Sinalizacao HTTP conectada', 'info');
    this._flushCriticalQueue();
    this.onOpen?.();
  }

  _startPollLoop() {
    if (this._polling || this.intentionalClose) return;
    this._polling = true;
    this._pollAbort = new AbortController();
    const loop = async () => {
      while (!this.intentionalClose && this.sessionId) {
        try {
          const url = `/api/signal/poll?sessionId=${encodeURIComponent(this.sessionId)}&timeout=25`;
          const res = await fetch(url, { signal: this._pollAbort.signal });
          if (!res.ok) {
            if (res.status === 404) throw new Error('Sessao HTTP expirada');
            throw new Error(`Poll HTTP ${res.status}`);
          }
          const data = await res.json();
          if (data.closed) break;
          for (const msg of unwrapWireMessages(data.messages)) {
            this.dispatch(msg);
          }
        } catch (err) {
          if (this.intentionalClose || err.name === 'AbortError') break;
          this.onLog(`Poll falhou: ${err.message}`, 'warn');
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      this._polling = false;
    };
    loop();
  }

  async _doSend(type, payload, { critical = false } = {}) {
    if (!this.connected && !critical) {
      throw new Error('Sinalizacao HTTP nao conectada');
    }
    const params = new URLSearchParams();
    if (this.sessionId) params.set('sessionId', this.sessionId);
    params.set('type', type);
    params.set('enc', WIRE_ENC);
    params.set('payload', encodeWirePayload(payload));
    const res = await fetch('/api/signal/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: params.toString()
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(errText || `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data.sessionId) {
      const hadSession = !!this.sessionId;
      this.sessionId = data.sessionId;
      if (!hadSession) this._startPollLoop();
    }
    for (const msg of unwrapWireMessages(data.messages)) {
      this.dispatch(msg);
    }
  }

  send(type, payload = {}, options = {}) {
    if (!this.connected) {
      if (options.critical) {
        this._pendingCritical.push({ type, payload, options });
        this.onLog(`Mensagem ${type} enfileirada (HTTP)`, 'warn');
        return this._sendQueue;
      }
      throw new Error('Sinalizacao HTTP nao conectada');
    }
    this._sendQueue = this._sendQueue
      .then(() => this._doSend(type, payload, options))
      .catch((err) => {
        this.onLog(`Envio ${type} falhou: ${err.message}`, 'error');
        throw err;
      });
    return this._sendQueue;
  }

  _flushCriticalQueue() {
    const queue = this._pendingCritical.splice(0);
    for (const item of queue) {
      this.send(item.type, item.payload, { ...item.options, critical: true });
    }
  }

  markAuthenticated(value = true) {
    this.authenticated = value;
  }

  close() {
    this.intentionalClose = true;
    this.authenticated = false;
    this.setState(ConnectionState.DISCONNECTED);
    if (this._pollAbort) this._pollAbort.abort();
    this._polling = false;
    const sid = this.sessionId;
    this.sessionId = null;
    this.clearPending();
    this._pendingCritical = [];
    if (sid) {
      fetch('/api/signal/session', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
        keepalive: true
      }).catch(() => {});
    }
    this.onClose?.();
  }

  clearPending() {
    this._onceHandlers.clear();
  }
}
