import { WebSocketServer } from 'ws';
import { room, logClientTrace } from './room-manager.js';
import { getRtpCapabilities } from './mediasoup-manager.js';
import { logger } from './logger.js';
import config, { getVideoQualityForClients } from '../config/default.js';
import { dispatchOpenClient, listAgentClients } from './agent-bridge.js';
import { validateJoinAuth, getSessionHostToken } from './auth-dev.js';
import { validateWsSession } from './auth-session.js';
import { debugLog } from './debug-log.js';
import { registerClientByName, saveAudioFilterPreset, renameAudioFilterPreset } from './client-db.js';
import { getClientIpFromWs } from './client-ip.js';
import { debugSessionLog } from './debug-session-log.js';

function transmissionHasActiveVideo(payload = {}) {
  const producerIds = payload.producerIds || {};
  return !!(producerIds.video || payload.producerId);
}

function assertJoinSession(ws, payload = {}) {
  const { viewerToken, hostToken } = payload;
  if (viewerToken) return null;
  const configuredHost = (config.hostToken || '').trim();
  const sessionHost = (getSessionHostToken() || '').trim();
  if (hostToken && (hostToken === configuredHost || hostToken === sessionHost)) {
    return null;
  }
  const user = validateWsSession(ws._clientReq);
  if (!user) {
    throw new Error('Faça login para entrar na sala');
  }
  return user;
}

function parseMessage(raw) {
  try {
    return JSON.parse(raw.toString());
  } catch {
    return null;
  }
}

const annotationRateByPeer = new Map();
const whiteboardRateByPeer = new Map();
const ANNOTATION_MAX_MSG_PER_SEC = 20;
const WHITEBOARD_MAX_MSG_PER_SEC = 30;
const ANNOTATION_MAX_POINTS = 30;
const VALID_DRAW_SHAPES = ['stroke', 'line', 'rect', 'ellipse', 'arrow', 'text'];

function rateAllowed(map, peerId, maxPerSec) {
  const now = Date.now();
  let bucket = map.get(peerId);
  if (!bucket || now - bucket.windowStart >= 1000) {
    bucket = { windowStart: now, count: 0 };
    map.set(peerId, bucket);
  }
  if (bucket.count >= maxPerSec) return false;
  bucket.count += 1;
  return true;
}

function annotationRateAllowed(peerId) {
  return rateAllowed(annotationRateByPeer, peerId, ANNOTATION_MAX_MSG_PER_SEC);
}

function whiteboardRateAllowed(peerId) {
  return rateAllowed(whiteboardRateByPeer, peerId, WHITEBOARD_MAX_MSG_PER_SEC);
}

function normalizeDrawShape(shape) {
  return VALID_DRAW_SHAPES.includes(shape) ? shape : 'stroke';
}

function validateAnnotationSegment(payload, senderPeerId) {
  if (!payload || typeof payload !== 'object') return null;
  const { strokeId, peerId, points, color, width, final } = payload;
  if (typeof strokeId !== 'string' || !strokeId.trim()) return null;
  if (String(peerId) !== String(senderPeerId)) return null;
  if (!Array.isArray(points) || points.length === 0 || points.length > ANNOTATION_MAX_POINTS) return null;
  const normalized = [];
  for (const p of points) {
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return null;
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return null;
    normalized.push({ x: p.x, y: p.y });
  }
  const shape = normalizeDrawShape(payload.shape);
  const text =
    shape === 'text' && typeof payload.text === 'string'
      ? payload.text.slice(0, 500)
      : undefined;
  return {
    strokeId: strokeId.trim(),
    peerId: String(peerId),
    peerName: typeof payload.peerName === 'string' ? payload.peerName.slice(0, 120) : '',
    points: normalized,
    color: typeof color === 'string' ? color.slice(0, 32) : '#e53935',
    width: typeof width === 'number' && width > 0 && width <= 20 ? width : 3,
    shape,
    text,
    fontSize:
      typeof payload.fontSize === 'number' && payload.fontSize > 0 && payload.fontSize <= 1
        ? payload.fontSize
        : undefined,
    final: !!final
  };
}

function validateWhiteboardElement(payload, senderPeerId) {
  if (!payload || typeof payload !== 'object') return null;
  const { id, peerId, points } = payload;
  if (typeof id !== 'string' || !id.trim()) return null;
  if (String(peerId) !== String(senderPeerId)) return null;
  if (!Array.isArray(points) || points.length === 0 || points.length > ANNOTATION_MAX_POINTS) return null;
  const normalized = [];
  for (const p of points) {
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return null;
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return null;
    normalized.push({ x: p.x, y: p.y });
  }
  const type = normalizeDrawShape(payload.type || payload.shape);
  const text =
    type === 'text' && typeof payload.text === 'string'
      ? payload.text.slice(0, 500)
      : undefined;
  if (type === 'text' && !text) return null;
  return {
    id: id.trim(),
    type,
    peerId: String(peerId),
    peerName: typeof payload.peerName === 'string' ? payload.peerName.slice(0, 120) : '',
    points: normalized,
    color: typeof payload.color === 'string' ? payload.color.slice(0, 32) : '#e53935',
    width: typeof payload.width === 'number' && payload.width > 0 && payload.width <= 20 ? payload.width : 3,
    text,
    fontSize:
      typeof payload.fontSize === 'number' && payload.fontSize > 0 && payload.fontSize <= 1
        ? payload.fontSize
        : undefined
  };
}

export function attachSignaling(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    ws._clientReq = req;
    let peer = null;
    let alive = true;

    ws.on('pong', () => {
      alive = true;
    });

    const pingTimer = setInterval(() => {
      if (!alive) {
        logger.warn('WebSocket sem resposta — encerrando', { peerId: peer?.id });
        ws.terminate();
        return;
      }
      alive = false;
      ws.ping();
    }, config.wsPingInterval);

    const enviar = (obj) => {
      if (ws.readyState === 1) ws.send(JSON.stringify(obj));
    };

    ws.on('message', async (raw) => {
      const msg = parseMessage(raw);
      if (!msg || !msg.type) return;

      try {
        await handleMessage(enviar, ws, msg, (p) => {
          peer = p;
        }, () => peer);
      } catch (err) {
        const producerId = msg.payload?.producerId;
        const mensagem = err.message || 'Erro interno';
        const transientConsume =
          msg.type === 'consumir' &&
          /indisponivel|proprio producer|capacidades/i.test(mensagem);
        const meta = { type: msg.type, producerId, error: mensagem };
        if (transientConsume) logger.warn('Erro na sinalização', meta);
        else logger.error('Erro na sinalização', meta);
        enviar({
          type: 'erro',
          payload: {
            mensagem,
            tipo: msg.type,
            producerId: producerId || undefined
          }
        });
      }
    });

    ws.on('close', (code, reason) => {
      clearInterval(pingTimer);
      // #region agent log
      logger.info('WebSocket encerrado', {
        peerId: peer?.id,
        role: peer?.role,
        code,
        reason: reason?.toString() || ''
      });
      // #endregion
      if (peer) {
        room.removePeer(peer.id);
      }
    });

    ws.on('error', (err) => {
      logger.warn('Erro WebSocket', { error: err.message });
    });
  });

  logger.info('Servidor de sinalização WebSocket ativo em /ws');
  return wss;
}

function sendPeerJoinSnapshot(enviar, peer = null) {
  if (!peer) {
    enviar({ type: 'estadoSala', payload: room.buildRoomSnapshot(peer) });
    return;
  }
  room.sendRoomSnapshot(peer);
  const transmission = room.buildTransmissionPayload();
  if (transmissionHasActiveVideo(transmission)) {
    enviar({ type: 'transmissaoAtiva', payload: transmission });
  }
  room.sendWhiteboardStateToPeer(peer);
}

async function handleMessage(enviar, ws, msg, setPeer, getPeer) {
  const peer = getPeer();
  const isHostOrCoHost = (p) => p && (p.role === 'host' || p.isCoHost);

  switch (msg.type) {
    case 'entrar': {
      const { papel, nome, maquina, pin, hostToken, viewerToken } = msg.payload || {};
      if (!['host', 'client'].includes(papel)) {
        throw new Error('Papel inválido. Use host ou client.');
      }
      if (!nome || typeof nome !== 'string' || nome.length > 64) {
        throw new Error('Nome inválido (máx. 64 caracteres)');
      }
      const sessionUser = assertJoinSession(ws, { viewerToken, hostToken });

      const existingPeer = getPeer();
      if (existingPeer && existingPeer.ws === ws) {
        if (existingPeer.role !== papel) {
          throw new Error('Esta conexão já está autenticada com outro papel');
        }
        room.cleanupPeerMedia(existingPeer);
        existingPeer.displayName = nome.trim() || existingPeer.displayName;
        if (sessionUser) {
          existingPeer.userId = sessionUser.id;
          existingPeer.username = sessionUser.username;
          existingPeer.userRole = sessionUser.role;
        }
        if (maquina && papel === 'client') {
          existingPeer.agentHostname = String(maquina).trim().toUpperCase();
        }
        if (papel === 'client' && viewerToken) {
          existingPeer.isExternal = true;
        }
        if (papel === 'client') {
          registerClientByName(nome.trim(), getClientIpFromWs(ws), maquina || '');
        }
        if (papel === 'host') {
          existingPeer.isCoHost = !!msg.payload.isCoHost;
        }
        const auth = validateJoinAuth({ papel, pin, hostToken, viewerToken });
        enviar({
          type: 'entrou',
          payload: {
            peerId: existingPeer.id,
            shortId: existingPeer.id.slice(0, 8),
            papel,
            rtpCapabilities: getRtpCapabilities(),
            videoQuality: getVideoQualityForClients(),
            hostToken: auth.hostToken || undefined
          }
        });
        sendPeerJoinSnapshot(enviar, existingPeer);
        break;
      }

      const auth = validateJoinAuth({ papel, pin, hostToken, viewerToken });
      const publishIntent =
        viewerToken || msg.payload?.publishIntent === 'viewer' ? 'viewer' : 'publisher';
      const newPeer = room.addPeer(ws, papel, nome, maquina, {
        isExternal: !!viewerToken,
        publishIntent,
        userId: sessionUser?.id || null,
        username: sessionUser?.username || null,
        userRole: sessionUser?.role || null
      });
      setPeer(newPeer);
      if (papel === 'client') {
        registerClientByName(nome.trim(), getClientIpFromWs(ws), maquina || '');
      }
      if (papel === 'host') {
        newPeer.isCoHost = !!msg.payload.isCoHost;
      }
      if (papel === 'client' && viewerToken) {
        debugLog('B', 'signaling.js:entrar', 'external client joined', {
          peerId: newPeer.id,
          hasViewerToken: true,
          origin: ws._socket?.remoteAddress || null
        });
      }
      enviar({
        type: 'entrou',
        payload: {
          peerId: newPeer.id,
          shortId: newPeer.id.slice(0, 8),
          papel,
          rtpCapabilities: getRtpCapabilities(),
          videoQuality: getVideoQualityForClients(),
          hostToken: auth.hostToken || undefined
        }
      });
      sendPeerJoinSnapshot(enviar, newPeer);
      // #region agent log
      debugSessionLog('H6', 'signaling:entrar', 'client joined', {
        peerId: newPeer.id.slice(0, 8),
        papel,
        publishIntent,
        isExternal: !!viewerToken
      });
      // #endregion
      break;
    }

    case 'atualizarNome': {
      if (!peer || peer.role !== 'client') throw new Error('Apenas clients podem atualizar nome');
      const { nome } = msg.payload || {};
      const oldName = peer.displayName;
      const newName = String(nome || '').trim();
      room.updatePeerName(peer.id, nome);
      if (oldName && newName) {
        renameAudioFilterPreset('client', oldName, newName);
      }
      registerClientByName(newName, getClientIpFromWs(peer.ws), peer.agentHostname || '');
      enviar({ type: 'nomeAtualizado', payload: { ok: true } });
      break;
    }

    case 'criarTransporte': {
      if (!peer) throw new Error('Não autenticado');
      const { direction, tag } = msg.payload || {};
      const params = await room.createTransport(peer, direction, tag || 'default');
      enviar({ type: 'transporteCriado', payload: { direction, ...params } });
      break;
    }

    case 'conectarTransporte': {
      if (!peer) throw new Error('Não autenticado');
      const { transportId } = msg.payload || {};
      await room.connectTransport(peer, msg.payload);
      enviar({ type: 'transporteConectado', payload: { ok: true, transportId } });
      break;
    }

    case 'produzir': {
      if (!peer || (peer.role !== 'client' && peer.role !== 'host')) {
        throw new Error('Apenas host ou clients podem transmitir mídia');
      }
      const result = await room.produce(peer, msg.payload);
      // #region agent log
      debugSessionLog('H2', 'signaling:produzir', 'produce ok', {
        peerId: peer.id.slice(0, 8),
        kind: result?.kind,
        source: result?.source,
        producerId: result?.id?.slice(0, 8),
        hasVideo: peer.hasVideoProducer(),
        mediaReadyAck: peer.mediaReadyAck
      });
      // #endregion
      enviar({ type: 'produzido', payload: result });
      break;
    }

    case 'midiaPronta': {
      if (!peer || (peer.role !== 'client' && peer.role !== 'host')) {
        throw new Error('Apenas host ou clients podem confirmar midia pronta');
      }
      const result = room.confirmMediaReady(peer);
      // #region agent log
      debugSessionLog('H3', 'signaling:midiaPronta', 'midiaPronta handled', {
        peerId: peer.id.slice(0, 8),
        result,
        hasVideo: peer.hasVideoProducer(),
        selectable: room.isPeerSelectable(peer)
      });
      // #endregion
      enviar({ type: 'midiaProntaOk', payload: result });
      break;
    }

    case 'pararProducao': {
      if (!peer) throw new Error('Não autenticado');
      room.stopAllProduction(peer);
      enviar({ type: 'producaoParada', payload: { ok: true } });
      break;
    }

    case 'consumir': {
      if (!peer) throw new Error('Não autenticado');
      const result = await room.consume(peer, msg.payload);
      enviar({ type: 'consumido', payload: result });
      break;
    }

    case 'retomarConsumer': {
      if (!peer) throw new Error('Não autenticado');
      await room.resumeConsumer(peer, msg.payload.consumerId);
      enviar({ type: 'consumerRetomado', payload: { consumerId: msg.payload.consumerId } });
      break;
    }

    case 'fecharConsumer': {
      if (!peer) throw new Error('Não autenticado');
      await room.closeConsumer(peer, msg.payload.consumerId);
      enviar({ type: 'consumerFechado', payload: { ok: true, consumerId: msg.payload.consumerId } });
      break;
    }

    case 'status': {
      if (!peer) throw new Error('Não autenticado');
      const { status, erro } = msg.payload || {};
      room.setPeerStatus(peer.id, status, erro);
      enviar({ type: 'statusOk', payload: { ok: true } });
      break;
    }

    /* Comandos do host */
    case 'selecionarClient': {
      if (!isHostOrCoHost(peer)) throw new Error('Apenas o host/co-host pode selecionar');
      const { peerId } = msg.payload || {};
      const result = room.selectClient(peerId || null);
      enviar({ type: 'selecaoResultado', payload: result });
      break;
    }

    case 'definirControleExibicao': {
      if (!isHostOrCoHost(peer)) throw new Error('Apenas o host/co-host pode delegar controle');
      const { peerId, ativo } = msg.payload || {};
      const result = room.setDisplayControl(peerId, !!ativo);
      enviar({ type: 'controleExibicaoResultado', payload: result });
      break;
    }

    case 'definirCoHost': {
      if (!peer || peer.role !== 'host') {
        throw new Error('Apenas o host pode definir co-hosts');
      }
      const { peerId, ativo } = msg.payload || {};
      const result = room.setCoHost(peerId, !!ativo);
      if (!result.ok) throw new Error(result.erro || 'Falha ao definir co-host');
      break;
    }

    case 'definirClientMute': {
      const { peerId, muted } = msg.payload || {};
      if (isHostOrCoHost(peer)) {
        room.setClientMuted(peerId, !!muted);
      } else if (peer?.role === 'client' && String(peerId) === String(peer.id)) {
        room.setClientMuted(peer.id, !!muted);
      } else {
        throw new Error('Sem permissao para alterar mute deste client');
      }
      break;
    }

    case 'definirFiltroAudioClient': {
      if (!isHostOrCoHost(peer)) throw new Error('Apenas o host/co-host pode ajustar filtros de audio');
      const { peerId, prefs } = msg.payload || {};
      const target = room.peers.get(peerId);
      if (!target || target.role !== 'client') {
        enviar({ type: 'filtroAudioResultado', payload: { ok: false, erro: 'Client indisponivel', peerId } });
        break;
      }
      target.send({ type: 'filtroAudioAtualizado', payload: { prefs: prefs || {} } });
      if (prefs) {
        saveAudioFilterPreset('client', target.displayName, prefs, target.userId || null);
      }
      enviar({ type: 'filtroAudioResultado', payload: { ok: true, peerId } });
      break;
    }
    case 'selecionarFonte': {
      if (!peer || peer.role !== 'client') throw new Error('Apenas clients podem usar este comando');
      const { peerId } = msg.payload || {};
      const result = room.selectDisplaySource(peerId || null, peer);
      enviar({ type: 'selecaoResultado', payload: result });
      break;
    }

    case 'pausarTransmissao': {
      if (!isHostOrCoHost(peer)) throw new Error('Apenas o host/co-host');
      enviar({ type: 'pausaResultado', payload: room.pauseTransmission() });
      break;
    }

    case 'retomarTransmissao': {
      if (!isHostOrCoHost(peer)) throw new Error('Apenas o host/co-host');
      enviar({ type: 'retomadaResultado', payload: room.resumeTransmission() });
      break;
    }

    case 'limparTransmissao': {
      if (!isHostOrCoHost(peer)) throw new Error('Apenas o host/co-host');
      enviar({ type: 'limpezaResultado', payload: room.clearTransmission(peer) });
      break;
    }

    case 'abrirClientRemoto': {
      if (!isHostOrCoHost(peer)) throw new Error('Apenas o host/co-host pode abrir clients');
      const { peerId, hostname, screenIndex, clientName } = msg.payload || {};
      const alvo = peerId ? room.peers.get(peerId) : null;
      if (peerId && !alvo) {
        enviar({ type: 'abrirClientResultado', payload: { ok: false, erro: 'Client não encontrado' } });
        break;
      }
      const result = await dispatchOpenClient(alvo, {
        hostname,
        screenIndex,
        clientName: clientName || alvo?.displayName
      });
      enviar({ type: 'abrirClientResultado', payload: result });
      break;
    }

    case 'abrirTodosRemotos': {
      if (!isHostOrCoHost(peer)) throw new Error('Apenas o host/co-host');
      const lista = await listAgentClients();
      const online = (lista.agentes || []).filter((a) => a.agentOnline);
      const results = [];
      for (const a of online) {
        const r = await dispatchOpenClient(null, {
          hostname: a.hostname,
          clientName: a.hostname,
          ...(msg.payload || {})
        });
        results.push({ hostname: a.hostname, nome: a.hostname, ...r });
      }
      enviar({ type: 'abrirTodosResultado', payload: { results, total: online.length } });
      break;
    }

    case 'listarAgentes': {
      if (!isHostOrCoHost(peer)) throw new Error('Apenas o host/co-host');
      const result = await listAgentClients();
      enviar({ type: 'agentesLista', payload: result });
      break;
    }

    case 'solicitarEstado': {
      if (!peer) throw new Error('Não autenticado');
      if (!config.useLegacyRoomSync) {
        peer.send({
          type: 'roomState',
          payload: room.buildRoomState(peer, 'requested')
        });
      }
      sendPeerJoinSnapshot(enviar, peer);
      break;
    }

    case 'definirQualidade': {
      if (!isHostOrCoHost(peer)) throw new Error('Apenas o host/co-host pode definir qualidade');
      const { presetId } = msg.payload || {};
      if (!presetId || typeof presetId !== 'string') {
        throw new Error('Preset de qualidade inválido');
      }
      room.broadcastQualityPreset(presetId);
      enviar({ type: 'qualidadeDefinida', payload: { ok: true, presetId } });
      break;
    }

    case 'definirModoPonteMeet': {
      if (!isHostOrCoHost(peer)) throw new Error('Apenas o host/co-host pode definir modo ponte Meet');
      const ativo = !!(msg.payload && msg.payload.ativo);
      room.setMeetBridgeLiveMode(ativo);
      enviar({ type: 'modoPonteMeetDefinido', payload: { ok: true, ativo } });
      break;
    }

    case 'definirModoSalaCompartilhada': {
      if (!isHostOrCoHost(peer)) throw new Error('Apenas o host/co-host pode definir modo sala compartilhada');
      const ativo = !!(msg.payload && msg.payload.ativo);
      room.setSharedRoomMode(ativo);
      enviar({ type: 'modoSalaCompartilhadaDefinido', payload: { ok: true, ativo } });
      break;
    }

    case 'clientTrace': {
      if (!peer) throw new Error('Não autenticado');
      logClientTrace(peer, msg.payload || {});
      break;
    }

    case 'anotacaoSegmento': {
      if (!peer) throw new Error('Não autenticado');
      if (!annotationRateAllowed(peer.id)) break;
      const segment = validateAnnotationSegment(msg.payload, peer.id);
      if (!segment) break;
      room.broadcastToRoom(
        { type: 'anotacaoSegmento', payload: segment },
        peer.id
      );
      break;
    }

    case 'quadroBrancoIniciar': {
      if (!isHostOrCoHost(peer)) throw new Error('Apenas o host/co-host pode iniciar o quadro branco');
      const result = room.startWhiteboard(peer.id);
      enviar({ type: 'quadroBrancoIniciado', payload: result });
      break;
    }

    case 'quadroBrancoParar': {
      if (!isHostOrCoHost(peer)) throw new Error('Apenas o host/co-host pode parar o quadro branco');
      const result = room.stopWhiteboard();
      enviar({ type: 'quadroBrancoParado', payload: result });
      break;
    }

    case 'quadroBrancoElemento': {
      if (!peer) throw new Error('Não autenticado');
      if (!room.whiteboardActive) break;
      if (!whiteboardRateAllowed(peer.id)) break;
      const element = validateWhiteboardElement(msg.payload, peer.id);
      if (!element) break;
      const result = room.addWhiteboardElement(element);
      if (!result.ok) enviar({ type: 'erro', payload: { mensagem: result.erro } });
      break;
    }

    case 'quadroBrancoLimpar': {
      if (!isHostOrCoHost(peer)) throw new Error('Apenas o host/co-host pode limpar o quadro branco');
      const result = room.clearWhiteboard();
      enviar({ type: 'quadroBrancoLimpo', payload: result });
      break;
    }

    default:
      throw new Error(`Tipo de mensagem desconhecido: ${msg.type}`);
  }
}
