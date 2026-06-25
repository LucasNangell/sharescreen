import { WebSocketServer } from 'ws';
import { room } from './room-manager.js';
import { getRtpCapabilities } from './mediasoup-manager.js';
import { logger } from './logger.js';
import config, { getVideoQualityForClients } from '../config/default.js';
import { dispatchOpenClient, listAgentClients } from './agent-bridge.js';

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

    ws.on('close', () => {
      clearInterval(pingTimer);
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

async function handleMessage(enviar, ws, msg, setPeer, getPeer) {
  const peer = getPeer();

  switch (msg.type) {
    case 'entrar': {
      const { papel, nome, maquina } = msg.payload || {};
      if (!['host', 'client'].includes(papel)) {
        throw new Error('Papel inválido. Use host ou client.');
      }
      const newPeer = room.addPeer(ws, papel, nome, maquina);
      setPeer(newPeer);
      enviar({
        type: 'entrou',
        payload: {
          peerId: newPeer.id,
          shortId: newPeer.id.slice(0, 8),
          papel,
          rtpCapabilities: getRtpCapabilities(),
          videoQuality: getVideoQualityForClients()
        }
      });
      if (papel === 'host') {
        enviar({ type: 'estado', payload: room.getHostState() });
      } else {
        enviar({
          type: 'transmissaoAtiva',
          payload: room.buildTransmissionPayload()
        });
      }
      break;
    }

    case 'atualizarNome': {
      if (!peer || peer.role !== 'client') throw new Error('Apenas clients podem atualizar nome');
      const { nome } = msg.payload || {};
      room.updatePeerName(peer.id, nome);
      enviar({ type: 'nomeAtualizado', payload: { ok: true } });
      break;
    }

    case 'criarTransporte': {
      if (!peer) throw new Error('Não autenticado');
      const { direction } = msg.payload;
      const params = await room.createTransport(peer, direction);
      enviar({ type: 'transporteCriado', payload: { direction, ...params } });
      break;
    }

    case 'conectarTransporte': {
      if (!peer) throw new Error('Não autenticado');
      await room.connectTransport(peer, msg.payload);
      enviar({ type: 'transporteConectado', payload: { ok: true } });
      break;
    }

    case 'produzir': {
      if (!peer || (peer.role !== 'client' && peer.role !== 'host')) {
        throw new Error('Apenas host ou clients podem transmitir mídia');
      }
      const result = await room.produce(peer, msg.payload);
      enviar({ type: 'produzido', payload: result });
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
      enviar({ type: 'consumerFechado', payload: { ok: true } });
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
      if (!peer || peer.role !== 'host') throw new Error('Apenas o host pode selecionar');
      const { peerId } = msg.payload || {};
      const result = room.selectClient(peerId || null);
      enviar({ type: 'selecaoResultado', payload: result });
      break;
    }

    case 'pausarTransmissao': {
      if (!peer || peer.role !== 'host') throw new Error('Apenas o host');
      enviar({ type: 'pausaResultado', payload: room.pauseTransmission() });
      break;
    }

    case 'retomarTransmissao': {
      if (!peer || peer.role !== 'host') throw new Error('Apenas o host');
      enviar({ type: 'retomadaResultado', payload: room.resumeTransmission() });
      break;
    }

    case 'limparTransmissao': {
      if (!peer || peer.role !== 'host') throw new Error('Apenas o host');
      enviar({ type: 'limpezaResultado', payload: room.clearTransmission() });
      break;
    }

    case 'abrirClientRemoto': {
      if (!peer || peer.role !== 'host') throw new Error('Apenas o host pode abrir clients');
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
      if (!peer || peer.role !== 'host') throw new Error('Apenas o host');
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
      if (!peer || peer.role !== 'host') throw new Error('Apenas o host');
      const result = await listAgentClients();
      enviar({ type: 'agentesLista', payload: result });
      break;
    }

    default:
      throw new Error(`Tipo de mensagem desconhecido: ${msg.type}`);
  }
}
