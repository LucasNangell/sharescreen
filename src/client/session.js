export const SessionPhase = {
  IDLE: 'idle',
  CAPTURING: 'capturing',
  JOINING: 'joining',
  PUBLISHING: 'publishing',
  ACTIVE: 'active',
  VIEWER_ACTIVE: 'viewer_active'
};

/**
 * Fase da sessao do client (substitui flags soltas durante o fluxo join/publish).
 */
export class ClientSession {
  constructor() {
    this.phase = SessionPhase.IDLE;
    this.publishIntent = 'publisher';
  }

  setPhase(phase) {
    this.phase = phase;
  }

  setPublishIntent(intent) {
    this.publishIntent = intent === 'viewer' ? 'viewer' : 'publisher';
  }

  isViewer() {
    return this.publishIntent === 'viewer';
  }

  reset() {
    this.phase = SessionPhase.IDLE;
  }
}

const BACKOFF_MS = [0, 1000, 2500];

function waitForRoomSnapshot(signaling, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(payload || null);
    };
    const onRoomState = (msg) => {
      if (msg?.type === 'roomState' && msg.payload) finish(msg.payload);
    };
    const onEstadoSala = (msg) => {
      if (msg?.type === 'estadoSala' && msg.payload) finish(msg.payload);
    };
    const cleanup = () => {
      clearTimeout(timer);
      signaling?.removeListener?.(onRoomState);
      signaling?.removeListener?.(onEstadoSala);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    signaling?.addListener?.(onRoomState);
    signaling?.addListener?.(onEstadoSala);
  });
}

/**
 * Solicita roomState ao servidor com retry (late-join / pos-publish).
 */
export async function requestRoomStateWithRetry(signaling, { attempts = 3, timeoutMs = 5000 } = {}) {
  if (!signaling?.connected || !signaling?.authenticated) return null;

  for (let i = 0; i < attempts; i += 1) {
    if (BACKOFF_MS[i]) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS[i]));
    }
    try {
      const waitPromise = waitForRoomSnapshot(signaling, timeoutMs);
      signaling.send('solicitarEstado', {});
      const payload = await waitPromise;
      if (payload) return payload;
    } catch (_) {}
  }
  return null;
}

export function joinPayloadExtras(session, { viewerOnly = false, viewerToken = '' } = {}) {
  const publishIntent =
    viewerOnly || viewerToken ? 'viewer' : session?.publishIntent || 'publisher';
  return { publishIntent };
}
