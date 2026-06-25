import { randomUUID } from 'crypto';
import config from '../config/default.js';
import { createWebRtcTransport, getRouter, getRtpCapabilities } from './mediasoup-manager.js';
import { logger } from './logger.js';

function shortId(peerId) {
  return peerId.slice(0, 8);
}

function randomPeerId() {
  return randomUUID().replace(/-/g, '').slice(0, 16);
}

function producerSlot(kind) {
  return kind === 'audio' ? 'audio' : 'video';
}

/**
 * Estado de um peer (host ou client).
 */
export class Peer {
  constructor(ws, role, displayName, agentHostname = '') {
    this.id = randomPeerId();
    this.ws = ws;
    this.role = role;
    this.displayName = displayName || (role === 'host' ? 'Painel Host' : `Client ${shortId(this.id)}`);
    this.agentHostname = (agentHostname || '').trim().toUpperCase();
    this.status = 'conectado';
    this.sendTransport = null;
    this.recvTransport = null;
    this.producers = { video: null, audio: null };
    this.consumers = new Map();
    this.connectedAt = Date.now();
    this.lastError = null;
  }

  getProducerIds() {
    return {
      video: this.producers.video?.id ?? null,
      audio: this.producers.audio?.id ?? null
    };
  }

  hasVideoProducer() {
    return !!this.producers.video && !this.producers.video.closed;
  }

  hasAudioProducer() {
    return !!this.producers.audio && !this.producers.audio.closed;
  }

  getPublicInfo() {
    const producerIds = this.getProducerIds();
    return {
      id: this.id,
      shortId: shortId(this.id),
      role: this.role,
      displayName: this.displayName,
      agentHostname: this.agentHostname || null,
      status: this.status,
      isProducing: this.hasVideoProducer(),
      hasVideo: this.hasVideoProducer(),
      hasAudio: this.hasAudioProducer(),
      producerId: producerIds.video,
      producerIds,
      lastError: this.lastError,
      connectedAt: this.connectedAt
    };
  }

  send(message) {
    if (this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

export class RoomManager {
  constructor() {
    this.peers = new Map();
    this.selectedPeerId = null;
    this.transmissionPaused = false;
  }

  getClientCount() {
    return [...this.peers.values()].filter((p) => p.role === 'client').length;
  }

  getHostPeer() {
    return [...this.peers.values()].find((p) => p.role === 'host');
  }

  getSelectedPeer() {
    return this.selectedPeerId ? this.peers.get(this.selectedPeerId) : null;
  }

  buildTransmissionPayload() {
    const selected = this.getSelectedPeer();
    const producerIds = selected?.getProducerIds() ?? { video: null, audio: null };
    return {
      selectedPeerId: this.selectedPeerId,
      producerId: producerIds.video,
      producerIds,
      peerName: selected?.displayName ?? null,
      paused: this.transmissionPaused
    };
  }

  broadcastToClients(message, exceptPeerId = null) {
    for (const peer of this.peers.values()) {
      if (peer.role !== 'client') continue;
      if (exceptPeerId && peer.id === exceptPeerId) continue;
      peer.send(message);
    }
  }

  notifyHostState() {
    const host = this.getHostPeer();
    if (!host) return;
    host.send({
      type: 'estado',
      payload: this.getHostState()
    });
  }

  getHostState() {
    const clients = [...this.peers.values()]
      .filter((p) => p.role === 'client' || p.role === 'host')
      .map((p) => ({
        ...p.getPublicInfo(),
        ehHost: p.role === 'host',
        selecionado: p.id === this.selectedPeerId,
        pausado: this.transmissionPaused && p.id === this.selectedPeerId
      }));

    const selected = this.getSelectedPeer();
    return {
      clients,
      selecionado: selected
        ? {
            ...selected.getPublicInfo(),
            pausado: this.transmissionPaused
          }
        : null,
      transmissionPaused: this.transmissionPaused,
      rtpCapabilities: getRtpCapabilities()
    };
  }

  addPeer(ws, role, displayName, agentHostname = '') {
    if (role === 'client' && this.getClientCount() >= config.maxClients) {
      throw new Error(`Limite de ${config.maxClients} clients atingido`);
    }
    const peer = new Peer(ws, role, displayName, agentHostname);
    this.peers.set(peer.id, peer);
    logger.info('Peer conectado', { peerId: peer.id, role, name: peer.displayName });
    this.notifyHostState();
    return peer;
  }

  removePeer(peerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    logger.info('Removendo peer e liberando recursos WebRTC', {
      peerId,
      role: peer.role,
      name: peer.displayName
    });

    this.cleanupPeerMedia(peer);

    if (this.selectedPeerId === peerId) {
      this.selectedPeerId = null;
      this.transmissionPaused = false;
      this.broadcastActiveProducer();
    }

    this.peers.delete(peerId);
    this.notifyHostState();
  }

  closeProducer(peer, slot) {
    const producer = peer.producers[slot];
    if (producer && !producer.closed) {
      producer.close();
    }
    peer.producers[slot] = null;
  }

  forEachProducer(peer, fn) {
    for (const slot of ['video', 'audio']) {
      const producer = peer.producers[slot];
      if (producer && !producer.closed) fn(producer, slot);
    }
  }

  async cleanupPeerMedia(peer) {
    try {
      this.closeProducer(peer, 'video');
      this.closeProducer(peer, 'audio');
      for (const consumer of peer.consumers.values()) {
        if (!consumer.closed) consumer.close();
      }
      peer.consumers.clear();
      if (peer.sendTransport && !peer.sendTransport.closed) {
        peer.sendTransport.close();
      }
      if (peer.recvTransport && !peer.recvTransport.closed) {
        peer.recvTransport.close();
      }
    } catch (err) {
      logger.warn('Erro ao limpar mídia do peer', { peerId: peer.id, err: err.message });
    }
    peer.sendTransport = null;
    peer.recvTransport = null;
  }

  stopAllProduction(peer) {
    this.closeProducer(peer, 'video');
    this.closeProducer(peer, 'audio');
    peer.status = 'conectado';
    if (this.selectedPeerId === peer.id) {
      this.selectedPeerId = null;
      this.broadcastActiveProducer();
    }
    this.notifyHostState();
  }

  updatePeerName(peerId, displayName) {
    const peer = this.peers.get(peerId);
    if (!peer || peer.role !== 'client') return false;
    peer.displayName = displayName.trim() || peer.displayName;
    logger.info('Nome do client atualizado', { peerId, name: peer.displayName });
    this.notifyHostState();
    return true;
  }

  setPeerStatus(peerId, status, lastError = null) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.status = status;
    if (lastError) peer.lastError = lastError;
    this.notifyHostState();
  }

  selectClient(peerId) {
    if (!peerId) {
      this.selectedPeerId = null;
      this.transmissionPaused = false;
      this.broadcastActiveProducer();
      this.notifyHostState();
      return { ok: true };
    }

    const peer = this.peers.get(peerId);
    if (!peer || (peer.role !== 'client' && peer.role !== 'host')) {
      return { ok: false, erro: 'Fonte não encontrada' };
    }
    if (!peer.hasVideoProducer()) {
      return { ok: false, erro: 'Esta fonte não está transmitindo tela' };
    }

    this.selectedPeerId = peerId;
    this.transmissionPaused = false;
    const ids = peer.getProducerIds();
    logger.info('Fonte selecionada para retransmissão', {
      peerId,
      name: peer.displayName,
      producerIds: ids
    });
    this.broadcastActiveProducer();
    this.notifyHostState();
    return { ok: true };
  }

  pauseTransmission() {
    if (!this.selectedPeerId) return { ok: false, erro: 'Nenhum client selecionado' };
    this.transmissionPaused = true;
    const peer = this.getSelectedPeer();
    if (peer) {
      this.forEachProducer(peer, (producer) => {
        if (!producer.paused) producer.pause();
      });
    }
    this.broadcastActiveProducer();
    this.notifyHostState();
    logger.info('Transmissão pausada', { peerId: this.selectedPeerId });
    return { ok: true };
  }

  resumeTransmission() {
    if (!this.selectedPeerId) return { ok: false, erro: 'Nenhum client selecionado' };
    this.transmissionPaused = false;
    const peer = this.getSelectedPeer();
    if (peer) {
      this.forEachProducer(peer, (producer) => {
        if (producer.paused) producer.resume();
      });
    }
    this.broadcastActiveProducer();
    this.notifyHostState();
    logger.info('Transmissão retomada', { peerId: this.selectedPeerId });
    return { ok: true };
  }

  clearTransmission() {
    this.selectedPeerId = null;
    this.transmissionPaused = false;
    this.broadcastActiveProducer();
    this.notifyHostState();
    logger.info('Transmissão limpa pelo host');
    return { ok: true };
  }

  broadcastActiveProducer() {
    const payload = this.buildTransmissionPayload();
    for (const peer of this.peers.values()) {
      peer.send({ type: 'transmissaoAtiva', payload });
    }
  }

  async createTransport(peer, direction) {
    const transport = await createWebRtcTransport(peer.id);
    if (direction === 'send') {
      peer.sendTransport = transport;
    } else {
      peer.recvTransport = transport;
    }
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    };
  }

  async connectTransport(peer, { transportId, dtlsParameters, direction }) {
    const transport =
      direction === 'send' ? peer.sendTransport : peer.recvTransport;
    if (!transport || transport.id !== transportId) {
      throw new Error('Transport inválido');
    }
    await transport.connect({ dtlsParameters });
  }

  async produce(peer, { transportId, kind, rtpParameters, appData }) {
    if (!peer.sendTransport || peer.sendTransport.id !== transportId) {
      throw new Error('Transport de envio inválido');
    }

    const slot = producerSlot(kind);
    this.closeProducer(peer, slot);

    const producer = await peer.sendTransport.produce({
      kind: slot === 'audio' ? 'audio' : 'video',
      rtpParameters,
      appData: { ...appData, peerId: peer.id, mediaTag: slot }
    });

    peer.producers[slot] = producer;
    if (slot === 'video') {
      peer.status = 'transmitindo';
    }

    const onProducerClosed = () => {
      if (peer.producers[slot]?.id === producer.id) {
        peer.producers[slot] = null;
      }
      if (!peer.hasVideoProducer()) {
        peer.status = 'conectado';
      }
      if (this.selectedPeerId === peer.id) {
        this.broadcastActiveProducer();
      }
      this.notifyHostState();
    };

    producer.on('transportclose', onProducerClosed);
    producer.on('@close', onProducerClosed);

    logger.info('Producer publicado', {
      peerId: peer.id,
      producerId: producer.id,
      kind: slot
    });

    this.notifyHostState();

    if (this.selectedPeerId === peer.id) {
      this.broadcastActiveProducer();
    }

    return { id: producer.id, kind: slot };
  }

  async consume(peer, { producerId, rtpCapabilities }) {
    const router = getRouter();
    if (!router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('Não é possível consumir este producer com as capacidades atuais');
    }
    if (!peer.recvTransport) {
      throw new Error('Transport de recepção não criado');
    }

    const existing = [...peer.consumers.values()].find(
      (c) => c.producerId === producerId
    );
    if (existing && !existing.closed) {
      return {
        id: existing.id,
        producerId: existing.producerId,
        kind: existing.kind,
        rtpParameters: existing.rtpParameters
      };
    }

    const consumer = await peer.recvTransport.consume({
      producerId,
      rtpCapabilities,
      paused: true
    });

    peer.consumers.set(consumer.id, consumer);

    consumer.on('transportclose', () => {
      peer.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      peer.consumers.delete(consumer.id);
      peer.send({ type: 'consumerFechado', payload: { consumerId: consumer.id } });
    });

    if (consumer.paused) {
      await consumer.resume();
    }

    return {
      id: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters
    };
  }

  async resumeConsumer(peer, consumerId) {
    const consumer = peer.consumers.get(consumerId);
    if (!consumer) {
      logger.warn('retomarConsumer: consumer já removido (ignorado)', {
        peerId: peer.id,
        consumerId
      });
      return { ok: true, ignorado: true };
    }
    if (consumer.paused) {
      await consumer.resume();
    }
    return { ok: true };
  }

  async closeConsumer(peer, consumerId) {
    const consumer = peer.consumers.get(consumerId);
    if (consumer && !consumer.closed) {
      consumer.close();
      peer.consumers.delete(consumerId);
    }
  }
}

export const room = new RoomManager();
