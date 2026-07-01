import { randomUUID } from 'crypto';
import { room } from './room-manager.js';
import { handleMessage } from './signaling.js';
import { logger } from './logger.js';
import {
  WIRE_ENC,
  decodeWirePayload,
  wrapWireMessage
} from '../src/shared/http-signaling-wire.js';

const sessions = new Map();
const MAX_POLL_WAIT_MS = 30000;

function createHttpChannel(session, req) {
  const channel = {
    readyState: 1,
    _clientReq: req,
    _sessionId: session.id,
    _isHttpChannel: true,
    send(data) {
      if (session.closed || channel.readyState !== 1) return;
      const obj = typeof data === 'string' ? JSON.parse(data) : data;
      if (session.syncReplies) {
        session.syncReplies.push(obj);
        return;
      }
      session.outbox.push(obj);
      for (const resolve of session.pollWaiters.splice(0)) {
        resolve();
      }
    },
    close(code = 1000, reason = '') {
      if (session.closed) return;
      session.closed = true;
      channel.readyState = 3;
      for (const resolve of session.pollWaiters.splice(0)) {
        resolve();
      }
      if (session.peer) {
        room.removePeer(session.peer.id);
        session.peer = null;
      }
      sessions.delete(session.id);
      logger.info('Sessao HTTP encerrada', { sessionId: session.id, code, reason });
    }
  };
  session.channel = channel;
  return channel;
}

function getSession(sessionId) {
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session || session.closed) return null;
  return session;
}

function createSession(req) {
  const id = randomUUID().replace(/-/g, '');
  const session = {
    id,
    closed: false,
    outbox: [],
    pollWaiters: [],
    syncReplies: null,
    peer: null,
    channel: null
  };
  createHttpChannel(session, req);
  sessions.set(id, session);
  return session;
}

async function processHttpMessage(session, msg) {
  const channel = session.channel;
  let peer = session.peer;
  session.syncReplies = [];

  const enviar = (obj) => {
    channel.send(obj);
  };

  try {
    await handleMessage(enviar, channel, msg, (p) => {
      peer = p;
      session.peer = p;
    }, () => peer);
  } catch (err) {
    logger.error('Erro na sinalizacao HTTP', { type: msg.type, error: err.message });
    enviar({
      type: 'erro',
      payload: { mensagem: err.message || 'Erro interno' }
    });
  }

  const replies = session.syncReplies;
  session.syncReplies = null;
  return replies;
}

function parseHttpSendBody(body) {
  const raw = body || {};
  const type = String(raw.type || '').trim();
  const sessionId = String(raw.sessionId || '').trim() || null;
  let payload = raw.payload;
  if (raw.enc === WIRE_ENC) {
    payload = decodeWirePayload(payload);
  } else if (payload != null && typeof payload === 'string' && raw.enc !== 'json') {
    try {
      payload = JSON.parse(payload);
    } catch {
      /* mantem string */
    }
  }
  return { sessionId, type, payload };
}

function wireMessagesForHttp(messages) {
  return (messages || []).map(wrapWireMessage);
}

export function attachHttpSignaling(app) {
  app.post('/api/signal/send', async (req, res) => {
    try {
      const { sessionId, type, payload } = parseHttpSendBody(req.body);
      if (!type) {
        res.status(400).json({ ok: false, erro: 'type obrigatorio' });
        return;
      }

      let session = getSession(sessionId);
      if (!session) {
        session = createSession(req);
      }

      const messages = await processHttpMessage(session, { type, payload });
      res.json({ ok: true, sessionId: session.id, messages: wireMessagesForHttp(messages) });
    } catch (err) {
      logger.error('POST /api/signal/send', { error: err.message });
      res.status(500).json({ ok: false, erro: err.message || 'Erro interno' });
    }
  });

  app.get('/api/signal/poll', async (req, res) => {
    const sessionId = String(req.query.sessionId || '').trim();
    const session = getSession(sessionId);
    if (!session) {
      res.status(404).json({ ok: false, erro: 'Sessao invalida' });
      return;
    }

    const timeoutMs = Math.min(
      MAX_POLL_WAIT_MS,
      Math.max(1000, Number(req.query.timeout) || 25000)
    );

    if (session.outbox.length) {
      res.json({ ok: true, messages: wireMessagesForHttp(session.outbox.splice(0)) });
      return;
    }

    await new Promise((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      session.pollWaiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });

    if (session.closed) {
      res.json({ ok: true, messages: [], closed: true });
      return;
    }

    res.json({ ok: true, messages: wireMessagesForHttp(session.outbox.splice(0)) });
  });

  app.delete('/api/signal/session', (req, res) => {
    const sessionId = String(req.body?.sessionId || req.query?.sessionId || '').trim();
    const session = getSession(sessionId);
    if (session) {
      session.channel.close(1000, 'Cliente encerrou');
    }
    res.json({ ok: true });
  });

  logger.info('Sinalizacao HTTP ativa em /api/signal/*');
}
