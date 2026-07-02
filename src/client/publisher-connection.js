/**
 * Conexao WS do client publisher — single-flight, sem corrida de onOpen.
 * Join de sala (entrar/entrou + mediasoup) fica em runClientJoin — sem timeout global curto.
 */
const CONNECT_TIMEOUT_MS = 45000;

export class PublisherConnection {
  constructor() {
    this.connectPromise = null;
    this.joinPromise = null;
    this.activeConnectId = 0;
  }

  reset() {
    this.connectPromise = null;
    this.joinPromise = null;
    this.activeConnectId += 1;
  }

  /**
   * Garante SignalingClient conectado (cria se necessario).
   */
  async ensureWebSocket({ signaling, createSignaling, isStale = () => false }) {
    if (signaling?.connected) {
      return signaling;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    const connectId = ++this.activeConnectId;

    this.connectPromise = (async () => {
      let client = signaling;
      if (client && !client.connected) {
        try {
          client.close();
        } catch (_) {}
        client = null;
      }

      if (!client) {
        client = createSignaling();
      }

      if (client.connected) {
        return client;
      }

      await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn, value) => {
          if (settled || connectId !== this.activeConnectId) return;
          settled = true;
          clearTimeout(timer);
          fn(value);
        };

        const timer = setTimeout(() => {
          finish(reject, new Error('Timeout ao conectar WebSocket'));
        }, CONNECT_TIMEOUT_MS);

        client.onOpen = () => {
          if (connectId !== this.activeConnectId || isStale()) return;
          finish(resolve);
        };

        client.connect();
      });

      if (connectId !== this.activeConnectId || isStale()) {
        throw new Error('Conexao cancelada');
      }

      if (!client.connected) {
        throw new Error('WebSocket nao conectado apos connect()');
      }

      return client;
    })().finally(() => {
      if (connectId === this.activeConnectId) {
        this.connectPromise = null;
      }
    });

    return this.connectPromise;
  }

  /**
   * Join single-flight — delega para joinFn (runClientJoin) sem timeout global.
   */
  async ensureJoined({ joinFn, isStale = () => false }) {
    if (this.joinPromise) {
      return this.joinPromise;
    }

    this.joinPromise = (async () => {
      try {
        const result = await joinFn();
        if (isStale()) {
          throw new Error('Join cancelado');
        }
        return result;
      } finally {
        this.joinPromise = null;
      }
    })();

    return this.joinPromise;
  }
}
