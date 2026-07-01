import { SignalingClient, wsUrl } from './signaling-client.js';
import { HttpSignalingClient } from './http-signaling-client.js';

const WSS_PROBE_MS = 5000;

function waitForWebSocketOpen(client, timeoutMs = WSS_PROBE_MS) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ok);
    };

    const timer = setTimeout(() => {
      client.close();
      finish(false);
    }, timeoutMs);

    const origOpen = client.onOpen;
    const origClose = client.onClose;

    client.onOpen = () => {
      client.onOpen = origOpen;
      client.onClose = origClose;
      finish(true);
    };

    client.onClose = () => {
      if (!client.connected) finish(false);
      origClose?.();
    };

    client.connect();
  });
}

/**
 * Internet publica (cgrafsysvm.camara.leg.br): WSS bloqueado no periodo — so HTTP.
 */
export function shouldUseHttpSignalingOnly({
  hostname = location.hostname,
  token = '',
  serverTransport = ''
} = {}) {
  if (String(token || '').trim()) return true;
  if (String(serverTransport || '').toLowerCase() === 'http') return true;
  return isPublicInternetHost(hostname);
}

export class AdaptiveSignalingClient {
  constructor(options = {}) {
    this._options = options;
    this._inner = null;
    this._listeners = new Set();
    this.transport = 'ws';
    this.isHttpSignaling = false;
    this._onOpen = options.onOpen;
    this._onClose = options.onClose;
    this.onLog = options.onLog || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
    this._enableReconnect = options.enableReconnect !== false;
  }

  get enableReconnect() {
    return this._enableReconnect;
  }

  set enableReconnect(value) {
    this._enableReconnect = value;
    if (this._inner) this._inner.enableReconnect = value;
  }

  get onOpen() {
    return this._onOpen;
  }

  set onOpen(fn) {
    this._onOpen = fn;
    if (this._inner) this._inner.onOpen = fn;
  }

  get onClose() {
    return this._onClose;
  }

  set onClose(fn) {
    this._onClose = fn;
    if (this._inner) this._inner.onClose = fn;
  }

  get connected() {
    return !!this._inner?.connected;
  }

  get state() {
    return this._inner?.state;
  }

  _attachInner(inner) {
    this._inner = inner;
    inner.onOpen = this._onOpen;
    inner.onClose = this._onClose;
    for (const fn of this._listeners) {
      inner.addListener(fn);
    }
  }

  addListener(fn) {
    this._listeners.add(fn);
    this._inner?.addListener(fn);
    return () => this.removeListener(fn);
  }

  removeListener(fn) {
    this._listeners.delete(fn);
    this._inner?.removeListener(fn);
  }

  dispatch(msg) {
    this._inner?.dispatch(msg);
  }

  onceType(type, filter, timeoutMs) {
    if (!this._inner) {
      throw new Error('Sinalizacao nao conectada');
    }
    return this._inner.onceType(type, filter, timeoutMs);
  }

  send(type, payload, options) {
    if (!this._inner) {
      throw new Error('Sinalizacao nao conectada');
    }
    return this._inner.send(type, payload, options);
  }

  markAuthenticated(value) {
    this._inner?.markAuthenticated(value);
  }

  close() {
    this._inner?.close();
    this._inner = null;
  }

  clearPending() {
    this._inner?.clearPending();
  }

  async connect() {
    if (this._inner?.connected) {
      this.onOpen?.();
      return;
    }

    const wsClient = new SignalingClient(wsUrl(), {
      ...this._options,
      enableReconnect: false,
      onLog: this.onLog,
      onStateChange: this.onStateChange,
      onClose: this.onClose
    });

    const opened = await waitForWebSocketOpen(wsClient, WSS_PROBE_MS);
    if (opened) {
      this._attachInner(wsClient);
      this.transport = 'ws';
      this.isHttpSignaling = false;
      wsClient.enableReconnect = this._enableReconnect;
      this.onOpen?.();
      return;
    }

    wsClient.close();
    this._useHttpInner();
  }

  _useHttpInner() {
    this.onLog('Usando sinalizacao HTTP (sem WebSocket)', 'info');
    const httpClient = new HttpSignalingClient({
      ...this._options,
      enableReconnect: false,
      onLog: this.onLog,
      onStateChange: this.onStateChange,
      onClose: this.onClose
    });
    this._attachInner(httpClient);
    this.transport = 'http';
    this.isHttpSignaling = true;
    httpClient.onOpen = this.onOpen;
    httpClient.connect();
  }
}

export function isPublicInternetHost(hostname = location.hostname) {
  return /cgrafsysvm\.camara\.leg\.br/i.test(hostname || '');
}

export function isMeetRoute(pathname = location.pathname) {
  return /\/meet\/?/i.test(pathname || '');
}

export function createSignalingClient(options = {}, { httpOnly = false, useFallback = false } = {}) {
  if (httpOnly) {
    const client = new HttpSignalingClient({ ...options, enableReconnect: false });
    client.transport = 'http';
    client.isHttpSignaling = true;
    return client;
  }
  if (useFallback) {
    return new AdaptiveSignalingClient(options);
  }
  const client = new SignalingClient(wsUrl(), options);
  client.isHttpSignaling = false;
  client.transport = 'ws';
  return client;
}

/** Aguarda POST HTTP antes de resolver onceType (evita race no long-poll). */
export async function signalingSend(signaling, type, payload, options) {
  const queued = signaling.send(type, payload, options);
  if (signaling?.isHttpSignaling && queued?.then) {
    await queued;
  }
}
