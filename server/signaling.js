import { WebSocketServer } from 'ws';
import { room, logClientTrace } from './room-manager.js';
import { getRtpCapabilities } from './mediasoup-manager.js';
import { logger } from './logger.js';
import config, { getVideoQualityForClients } from '../config/default.js';
import { dispatchOpenClient, listAgentClients } from './agent-bridge.js';
import { validateJoinAuth, getSessionHostToken } from './auth-dev.js';
import { debugLog } from './debug-log.js';
import { registerClientByName, saveAudioFilterPreset, renameAudioFilterPreset } from './client-db.js';
import { getClientIpFromWs } from './client-ip.js';
import { debugSessionLog } from './debug-session-log.js';

function transmissionHasActiveVideo(payload = {}) {
  const producerIds = payload.producerIds || {};
  return !!(producerIds.video || payload.producerId);
}

function parseMessage(raw) {
  try {
    return JSON.parse(raw.toString());
  } catch {
    return null;
  }
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
        logger.error('Erro na sinalização', { type: msg.type, error: err.message });
        enviar({
          type: 'erro',
          payload: { mensagem: err.message || 'Erro interno' }
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

      const existingPeer = getPeer();
      if (existingPeer && existingPeer.ws === ws) {
        if (existingPeer.role !== papel) {
          throw new Error('Esta conexão já está autenticada com outro papel');
        }
        room.cleanupPeerMedia(existingPeer);
        existingPeer.displayName = nome.trim() || existingPeer.displayName;
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
        publishIntent
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
      if (!isHostOrCoHost(peer)) throw new Error('Apenas o host/co-host pode definir co-hosts');
      const { peerId, ativo } = msg.payload || {};
      const target = room.peers.get(peerId);
      if (target) {
        target.isCoHost = !!ativo;
        if (ativo) {
          room.displayControllerIds.add(peerId);
          target.send({
            type: 'promovidoCoHost',
            payload: {
              hostToken: config.hostToken || getSessionHostToken() || '',
              nome: target.displayName
            }
          });
          room.sendDisplayControlSnapshot(target);
        } else {
          room.displayControllerIds.delete(peerId);
          target.send({ type: 'demovidoCoHost' });
          room.sendDisplayControlSnapshot(target);
        }
        room.notifyHostState();
      }
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
      if (target.displayName && prefs) {
        saveAudioFilterPreset('client', target.displayName, prefs);
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

    case 'clientTrace': {
      if (!peer) throw new Error('Não autenticado');
      logClientTrace(peer, msg.payload || {});
      break;
    }

    default:
      throw new Error(`Tipo de mensagem desconhecido: ${msg.type}`);
  }
}
