import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/default.js';
import { createWebRtcTransport, getRouter, getRtpCapabilities } from './mediasoup-manager.js';
import { logger } from './logger.js';
import { getLowerThirdForDisplayName } from './client-db.js';

const _agentDebugLogPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'debug-2b48e6.log'
);

const _sessionDebugLogPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'debug-0e898e.log'
);

function sessionDebugLog(tag, message, data = {}) {
  const entry = {
    sessionId: '0e898e',
    timestamp: Date.now(),
    location: 'room-manager.js',
    message: `${tag} ${message}`,
    data
  };
  try {
    fs.appendFileSync(_sessionDebugLogPath, `${JSON.stringify(entry)}\n`);
  } catch (_) {}
  logger.info(`${tag} ${message}`, data);
}

export function getAgentDebugLogPath() {
  return _agentDebugLogPath;
}

function agentDebugLog(payload) {
  const entry = { sessionId: '2b48e6', timestamp: Date.now(), ...payload };
  try {
    fs.appendFileSync(_agentDebugLogPath, `${JSON.stringify(entry)}\n`);
  } catch (_) {}
  logger.info('[debug-2b48e6] ' + (payload.message || 'event'), payload.data || {});
}

function shortId(peerId) {
  return peerId.slice(0, 8);
}

function randomPeerId() {
  return randomUUID().replace(/-/g, '').slice(0, 16);
}

function producerSlot(kind, appData = {}) {
  if (kind === 'video') return 'video';
  const source = appData?.source;
  if (source === 'microphone' || source === 'system' || source === 'mixed') return source;
  return 'mixed';
}

const AUDIO_PRODUCER_SLOTS = ['microphone', 'system', 'mixed'];

/**
 * Estado de um peer (host ou client).
 */
export class Peer {
  constructor(ws, role, displayName, agentHostname = '', { isExternal = false } = {}) {
    this.id = randomPeerId();
    this.ws = ws;
    this.role = role;
    this.displayName = displayName || (role === 'host' ? 'Painel Host' : `Client ${shortId(this.id)}`);
    this.agentHostname = (agentHostname || '').trim().toUpperCase();
    this.isExternal = !!isExternal;
    this.status = 'conectado';
    this.sendTransport = null;
    this.recvTransport = null;
    this.recvTransports = new Map();
    this.producers = { video: null, microphone: null, system: null, mixed: null };
    this.consumers = new Map();
    this.connectedAt = Date.now();
    this.lastError = null;
    this.isCoHost = false;
    this.replacingProducers = new Set();
  }

  getProducerIds() {
    const microphone = this.producers.microphone?.id ?? null;
    const system = this.producers.system?.id ?? null;
    const mixed = this.producers.mixed?.id ?? null;
    const audio = microphone || system || mixed;
    return {
      video: this.producers.video?.id ?? null,
      audio,
      microphone,
      system,
      mixed
    };
  }

  hasVideoProducer() {
    return !!this.producers.video && !this.producers.video.closed;
  }

  hasAudioProducer() {
    return AUDIO_PRODUCER_SLOTS.some(
      (slot) => this.producers[slot] && !this.producers[slot].closed
    );
  }

  getPublicInfo(room) {
    const producerIds = this.getProducerIds();
    return {
      id: this.id,
      shortId: shortId(this.id),
      role: this.role,
      displayName: this.displayName,
      agentHostname: this.agentHostname || null,
      origin: this.isExternal ? 'external' : 'local',
      status: this.status,
      isProducing: this.hasVideoProducer(),
      hasVideo: this.hasVideoProducer(),
      hasAudio: this.hasAudioProducer(),
      hasMicrophone: !!(
        this.producers.microphone && !this.producers.microphone.closed
      ),
      hasSystemAudio: !!(
        this.producers.system && !this.producers.system.closed
      ),
      producerId: producerIds.video,
      producerIds,
      lastError: this.lastError,
      connectedAt: this.connectedAt,
      isCoHost: !!this.isCoHost,
      permissions: {
        canPublish: this.role === 'client' || this.role === 'host',
        canControlDisplay: room?.canControlDisplay(this.id) ?? false,
        isCoHost: !!this.isCoHost
      }
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
    this.displayControllerIds = new Set();
    this.interrompidaPor = null;
    this.finalizadaPor = null;
    this.mutedPeerIds = new Set();
  }

  isPeerSocketOpen(peer) {
    return peer?.ws?.readyState === 1;
  }

  purgeStalePeers() {
    let changed = false;
    for (const [peerId, peer] of this.peers) {
      if (this.isPeerSocketOpen(peer)) continue;
      logger.info('Removendo peer com socket inativo', {
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
      changed = true;
    }
    if (changed) {
      this.broadcastAudioSources();
      this.notifyHostState();
    }
  }

  getClientCount() {
    this.purgeStalePeers();
    return [...this.peers.values()].filter(
      (p) => p.role === 'client' && this.isPeerSocketOpen(p)
    ).length;
  }

  getHostPeer() {
    return [...this.peers.values()].find((p) => p.role === 'host');
  }

  getHostPeers() {
    return [...this.peers.values()].filter((p) => p.role === 'host');
  }

  getHostAndCoHostPeers() {
    return [...this.peers.values()].filter((p) => p.role === 'host' || p.isCoHost);
  }

  getSelectedPeer() {
    return this.selectedPeerId ? this.peers.get(this.selectedPeerId) : null;
  }

  buildTransmissionPayload() {
    const selected = this.getSelectedPeer();
    const producerIds = selected?.getProducerIds() ?? { video: null, audio: null };
    const lowerThird =
      selected?.displayName && producerIds.video
        ? getLowerThirdForDisplayName(selected.displayName)
        : null;
    return {
      selectedPeerId: this.selectedPeerId,
      producerId: producerIds.video,
      producerIds,
      peerName: selected?.displayName ?? null,
      paused: this.transmissionPaused,
      lowerThird,
      interrompidaPor: this.interrompidaPor || null,
      finalizadaPor: this.finalizadaPor || null
    };
  }

  refreshTransmissionIfSelected(displayName) {
    const selected = this.getSelectedPeer();
    if (!selected?.displayName) return;
    if (String(selected.displayName).toLowerCase() !== String(displayName).toLowerCase()) return;
    this.broadcastActiveProducer();
  }

  broadcastToClients(message, exceptPeerId = null) {
    for (const peer of this.peers.values()) {
      if (peer.role !== 'client') continue;
      if (exceptPeerId && peer.id === exceptPeerId) continue;
      peer.send(message);
    }
  }

  broadcastQualityPreset(presetId) {
    if (!presetId) return;
    this.broadcastToClients({
      type: 'qualidadeAtualizada',
      payload: { presetId }
    });
  }

  notifyHostState() {
    this._pruneDisplayControllers();
    const payload = this.getHostState();
    for (const host of this.getHostAndCoHostPeers()) {
      host.send({ type: 'estado', payload });
    }
    this.notifyDisplayControllers();
  }

  canControlDisplay(peerId) {
    return this.displayControllerIds.has(peerId);
  }

  buildDisplaySourcesList() {
    this.purgeStalePeers();
    return [...this.peers.values()]
      .filter(
        (p) =>
          (p.role === 'client' || p.role === 'host') &&
          this.isPeerSocketOpen(p) &&
          p.hasVideoProducer()
      )
      .map((p) => ({
        id: p.id,
        displayName: p.displayName,
        isProducing: true,
        ehHost: p.role === 'host',
        selecionado: p.id === this.selectedPeerId
      }));
  }

  buildDisplayControlPayload(peerId) {
    const ativo = this.displayControllerIds.has(peerId);
    return {
      ativo,
      fontes: ativo ? this.buildDisplaySourcesList() : []
    };
  }

  notifyDisplayControllers() {
    for (const peerId of this.displayControllerIds) {
      const peer = this.peers.get(peerId);
      if (!peer || !this.isPeerSocketOpen(peer)) continue;
      peer.send({
        type: 'controleExibicaoAtualizado',
        payload: this.buildDisplayControlPayload(peerId)
      });
    }
  }

  sendDisplayControlSnapshot(peer) {
    if (!peer || peer.role !== 'client' || !this.canControlDisplay(peer.id)) return;
    peer.send({
      type: 'controleExibicaoAtualizado',
      payload: this.buildDisplayControlPayload(peer.id)
    });
  }

  setDisplayControl(peerId, ativo) {
    if (!peerId) return { ok: false, erro: 'Client invÃ¡lido' };
    const peer = this.peers.get(peerId);
    if (!peer || peer.role !== 'client') {
      return { ok: false, erro: 'Client nÃ£o encontrado' };
    }
    if (!peer.hasVideoProducer()) {
      return { ok: false, erro: 'Apenas clients transmitindo podem receber controle' };
    }
    if (ativo) {
      this.displayControllerIds.add(peerId);
    } else {
      this.displayControllerIds.delete(peerId);
    }
    logger.info('Controle de exibiÃ§Ã£o atualizado', {
      peerId,
      name: peer.displayName,
      ativo
    });
    this.notifyHostState();
    const target = this.peers.get(peerId);
    if (target) {
      target.send({
        type: 'controleExibicaoAtualizado',
        payload: this.buildDisplayControlPayload(peerId)
      });
    }
    return { ok: true, peerId, ativo };
  }

  selectDisplaySource(peerId, actorPeer) {
    if (!actorPeer) return { ok: false, erro: 'NÃ£o autenticado' };
    const isHost = actorPeer.role === 'host';
    const isDelegated = actorPeer.role === 'client' && this.canControlDisplay(actorPeer.id);
    if (!isHost && !isDelegated) {
      return { ok: false, erro: 'Sem permissÃ£o para alternar a exibiÃ§Ã£o' };
    }
    return this.selectClient(peerId);
  }

  _mapPeerForState(peer) {
    return {
      ...peer.getPublicInfo(this),
      ehHost: peer.role === 'host',
      selecionado: peer.id === this.selectedPeerId,
      pausado: this.transmissionPaused && peer.id === this.selectedPeerId
    };
  }

  getHostState() {
    this.purgeStalePeers();
    const clients = [...this.peers.values()]
      .filter(
        (p) =>
          (p.role === 'client' || p.role === 'host') && this.isPeerSocketOpen(p)
      )
      .map((p) => this._mapPeerForState(p));

    const selected = this.getSelectedPeer();
    return {
      clients,
      selecionado: selected
        ? {
            ...this._mapPeerForState(selected),
            selecionado: true,
            pausado: this.transmissionPaused
          }
        : null,
      transmissionPaused: this.transmissionPaused,
      controleExibicao: [...this.displayControllerIds],
      rtpCapabilities: getRtpCapabilities()
    };
  }

  buildRoomSnapshot(viewingPeer = null) {
    this.purgeStalePeers();
    const host = this.getHostPeer();
    const transmission = this.buildTransmissionPayload();
    const audioSources = this.getAudioSources();
    const peers = [...this.peers.values()]
      .filter((p) => this.isPeerSocketOpen(p))
      .map((p) => this._mapPeerForState(p));

    const videoProducers = peers
      .filter((p) => p.producerIds?.video)
      .map((p) => ({
        peerId: p.id,
        producerId: p.producerIds.video,
        name: p.displayName,
        origin: p.origin
      }));

    const selected =
      transmission.selectedPeerId
        ? peers.find((p) => p.id === transmission.selectedPeerId) ||
          (transmission.producerIds?.video
            ? {
                id: transmission.selectedPeerId,
                displayName: transmission.peerName || 'Fonte',
                producerIds: transmission.producerIds,
                isProducing: true,
                hasVideo: true,
                selecionado: true,
                pausado: transmission.paused
              }
            : null)
        : null;

    const snapshot = {
      snapshotAt: Date.now(),
      host: host
        ? {
            id: host.id,
            shortId: shortId(host.id),
            displayName: host.displayName,
            hasVideo: host.hasVideoProducer(),
            hasAudio: host.hasAudioProducer(),
            producerIds: host.getProducerIds()
          }
        : null,
      peers,
      clients: peers.filter((p) => p.role === 'client' || p.ehHost),
      selecionado: selected,
      transmission,
      audioSources,
      videoProducers,
      audioProducers: audioSources,
      transmissionPaused: this.transmissionPaused,
      controleExibicao: [...this.displayControllerIds],
      rtpCapabilities: getRtpCapabilities(),
      mutedPeerIds: [...this.mutedPeerIds]
    };

    if (viewingPeer?.role === 'client') {
      snapshot.displayControl = this.buildDisplayControlPayload(viewingPeer.id);
    }

    return snapshot;
  }

  sendRoomSnapshot(peer) {
    if (!peer || !this.isPeerSocketOpen(peer)) return;
    const snapshot = this.buildRoomSnapshot(peer);
    sessionDebugLog('[ROOM_STATE]', 'snapshot enviado', {
      peerId: peer.id.slice(0, 8),
      role: peer.role,
      selectedPeerId: snapshot.transmission?.selectedPeerId?.slice(0, 8) || null,
      activeProducerId: snapshot.transmission?.producerIds?.video?.slice(0, 8) || null,
      videoProducers: (snapshot.videoProducers || []).length,
      peers: (snapshot.peers || []).length
    });
    peer.send({ type: 'estadoSala', payload: snapshot });
  }

  addPeer(ws, role, displayName, agentHostname = '', { isExternal = false } = {}) {
    this.purgeStalePeers();
    if (role === 'client' && this.getClientCount() >= config.maxClients) {
      throw new Error(`Limite de ${config.maxClients} clients atingido`);
    }

    let audioSourcesChanged = false;

    // Um painel host ativo â€” aba antiga deixa de receber atualizaÃ§Ãµes
    if (role === 'host') {
      for (const old of this.getHostPeers()) {
        if (old.ws === ws) continue;
        logger.info('Substituindo host anterior', { peerId: old.id });
        try {
          old.ws?.close(4000, 'Novo painel host conectado');
        } catch (_) {}
        if (old.hasAudioProducer()) audioSourcesChanged = true;
        this.cleanupPeerMedia(old);
        this.peers.delete(old.id);
      }
    }

    // Mesma mÃ¡quina ou convidado externo reconectando â€” remove sessÃ£o anterior ainda aberta
    if (role === 'client') {
      const hostKey = (agentHostname || '').trim().toUpperCase();
      const nameKey = (displayName || '').trim().toLowerCase();
      let clearedSelection = false;
      for (const [peerId, old] of [...this.peers.entries()]) {
        if (old.role !== 'client' || old.ws === ws) continue;
        const sameMachine = hostKey && old.agentHostname === hostKey;
        const sameExternalGuest =
          isExternal && old.isExternal && old.displayName.trim().toLowerCase() === nameKey;
        if (!sameMachine && !sameExternalGuest) continue;
        logger.info('Substituindo client anterior', {
          peerId,
          name: old.displayName,
          hostKey: hostKey || null,
          isExternal: !!isExternal
        });
        try {
          old.ws?.close(4001, 'Client reconectado');
        } catch (_) {}
        if (old.hasAudioProducer()) audioSourcesChanged = true;
        this.cleanupPeerMedia(old);
        if (this.selectedPeerId === peerId) {
          this.selectedPeerId = null;
          this.transmissionPaused = false;
          clearedSelection = true;
        }
        this.peers.delete(peerId);
      }
      if (clearedSelection) {
        this.broadcastActiveProducer();
      }
    }

    if (audioSourcesChanged) {
      this.broadcastAudioSources();
    }

    const peer = new Peer(ws, role, displayName, agentHostname, { isExternal });
    peer.ws = ws;
    this.peers.set(peer.id, peer);
    sessionDebugLog('[ROOM_STATE]', 'peer entrou', {
      peerId: peer.id.slice(0, 8),
      role,
      name: peer.displayName
    });
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

    const isPrimaryHost = peer.role === 'host' && !peer.isCoHost;

    this.cleanupPeerMedia(peer);

    if (this.selectedPeerId === peerId) {
      this.selectedPeerId = null;
      this.transmissionPaused = false;
      this.broadcastActiveProducer();
    }

    this.displayControllerIds.delete(peerId);
    this.mutedPeerIds.delete(peerId);
    this.peers.delete(peerId);

    if (isPrimaryHost) {
      const coHost = [...this.peers.values()].find((p) => p.isCoHost);
      if (coHost) {
        coHost.role = 'host';
        coHost.isCoHost = false;
        logger.info('Co-host promovido a host principal', { peerId: coHost.id, name: coHost.displayName });
      } else {
        this.finalizadaPor = peer.displayName;
        this.interrompidaPor = null;
        this.selectedPeerId = null;
        this.transmissionPaused = false;
        this.broadcastActiveProducer();
      }
    }

    this.broadcastAudioSources();
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
    const video = peer.producers.video;
    if (video && !video.closed) fn(video, 'video');
    for (const slot of AUDIO_PRODUCER_SLOTS) {
      const producer = peer.producers[slot];
      if (producer && !producer.closed) fn(producer, slot);
    }
  }

  async cleanupPeerMedia(peer) {
    try {
      this.closeProducer(peer, 'video');
      for (const slot of AUDIO_PRODUCER_SLOTS) {
        this.closeProducer(peer, slot);
      }
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
      for (const transport of peer.recvTransports?.values() || []) {
        if (transport && !transport.closed) transport.close();
      }
      peer.recvTransports?.clear();
    } catch (err) {
      logger.warn('Erro ao limpar mÃ­dia do peer', { peerId: peer.id, err: err.message });
    }
    peer.sendTransport = null;
    peer.recvTransport = null;
    peer.recvTransports?.clear();
  }

  stopAllProduction(peer) {
    const hadAudio = peer.hasAudioProducer();
    this.closeProducer(peer, 'video');
    for (const slot of AUDIO_PRODUCER_SLOTS) {
      this.closeProducer(peer, slot);
    }
    peer.status = 'conectado';
    if (hadAudio) this.broadcastAudioSources();
    if (this.selectedPeerId === peer.id) {
      this.selectedPeerId = null;
      this.broadcastActiveProducer();
    }
    if (!peer.hasVideoProducer()) {
      this.displayControllerIds.delete(peer.id);
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
      this.interrompidaPor = null;
      this.finalizadaPor = null;
      this.broadcastActiveProducer();
      this.notifyHostState();
      return { ok: true };
    }

    const peer = this.peers.get(peerId);
    if (!peer || (peer.role !== 'client' && peer.role !== 'host')) {
      return { ok: false, erro: 'Fonte nÃ£o encontrada' };
    }
    if (!peer.hasVideoProducer()) {
      return { ok: false, erro: 'Esta fonte nÃ£o estÃ¡ transmitindo tela' };
    }

    this.selectedPeerId = peerId;
    this.transmissionPaused = false;
    this.interrompidaPor = null;
    this.finalizadaPor = null;
    const ids = peer.getProducerIds();
    logger.info('Fonte selecionada para retransmissÃ£o', {
      peerId,
      name: peer.displayName,
      producerIds: ids
    });
    this.broadcastActiveProducer();
    this.notifyHostState();
    return { ok: true };
  }

  _pruneDisplayControllers() {
    for (const peerId of [...this.displayControllerIds]) {
      const peer = this.peers.get(peerId);
      if (!peer || !this.isPeerSocketOpen(peer) || !peer.hasVideoProducer()) {
        this.displayControllerIds.delete(peerId);
      }
    }
  }

  pauseTransmission() {
    if (!this.selectedPeerId) return { ok: false, erro: 'Nenhum client selecionado' };
    this.transmissionPaused = true;
    const peer = this.getSelectedPeer();
    if (peer) {
      const videoProducer = peer.producers.video;
      if (videoProducer && !videoProducer.closed && !videoProducer.paused) {
        videoProducer.pause();
      }
    }
    this.broadcastActiveProducer();
    this.notifyHostState();
    logger.info('TransmissÃ£o pausada', { peerId: this.selectedPeerId });
    return { ok: true };
  }

  resumeTransmission() {
    if (!this.selectedPeerId) return { ok: false, erro: 'Nenhum client selecionado' };
    this.transmissionPaused = false;
    const peer = this.getSelectedPeer();
    if (peer) {
      const videoProducer = peer.producers.video;
      if (videoProducer && !videoProducer.closed && videoProducer.paused) {
        videoProducer.resume();
      }
    }
    this.broadcastActiveProducer();
    this.notifyHostState();
    logger.info('TransmissÃ£o retomada', { peerId: this.selectedPeerId });
    return { ok: true };
  }

  clearTransmission(actorPeer) {
    this.selectedPeerId = null;
    this.transmissionPaused = false;
    this.interrompidaPor = actorPeer ? actorPeer.displayName : 'Host';
    this.finalizadaPor = null;
    this.broadcastActiveProducer();
    this.notifyHostState();
    logger.info('TransmissÃ£o limpa pelo host');
    return { ok: true };
  }

  broadcastActiveProducer() {
    const payload = this.buildTransmissionPayload();
    sessionDebugLog('[ACTIVE_VIDEO]', 'transmissao ativa alterada', {
      selectedPeerId: payload.selectedPeerId?.slice(0, 8) || null,
      producerVideo: payload.producerIds?.video?.slice(0, 8) || null,
      peerName: payload.peerName || null,
      paused: payload.paused,
      recipients: [...this.peers.values()]
        .filter((p) => this.isPeerSocketOpen(p))
        .map((p) => ({ id: p.id.slice(0, 8), role: p.role }))
    });
    for (const peer of this.peers.values()) {
      peer.send({ type: 'transmissaoAtiva', payload });
    }
  }

  getAudioSources() {
    const sources = [];
    for (const p of this.peers.values()) {
      if (!this.isPeerSocketOpen(p)) continue;
      for (const slot of AUDIO_PRODUCER_SLOTS) {
        const producer = p.producers[slot];
        if (!producer || producer.closed) continue;
        sources.push({
          peerId: p.id,
          name: p.displayName,
          producerId: producer.id,
          source: slot
        });
      }
    }
    return sources;
  }

  _findProducerOwner(producerId) {
    for (const p of this.peers.values()) {
      if (p.producers.video && !p.producers.video.closed && p.producers.video.id === producerId) {
        return p;
      }
      for (const slot of AUDIO_PRODUCER_SLOTS) {
        const producer = p.producers[slot];
        if (producer && !producer.closed && producer.id === producerId) {
          return p;
        }
      }
    }
    return null;
  }

  setClientMuted(peerId, muted) {
    const key = String(peerId);
    if (muted) {
      this.mutedPeerIds.add(key);
    } else {
      this.mutedPeerIds.delete(key);
    }
    logger.info(`Client ${key} mute state set to ${muted}`);
    this.broadcastMutedClients();
    this.notifyHostState();
  }

  broadcastMutedClients() {
    const payload = { mutedPeerIds: [...this.mutedPeerIds] };
    for (const peer of this.peers.values()) {
      peer.send({ type: 'clientesSilenciados', payload });
    }
  }

  broadcastAudioSources() {
    const payload = { sources: this.getAudioSources() };
    for (const peer of this.peers.values()) {
      peer.send({ type: 'fontesAudio', payload });
    }
  }

  async createTransport(peer, direction, tag = 'default') {
    const transport = await createWebRtcTransport(peer.id);
    if (direction === 'send') {
      if (peer.sendTransport && !peer.sendTransport.closed) {
        peer.sendTransport.close();
      }
      peer.sendTransport = transport;
    } else {
      const previous = peer.recvTransports.get(tag);
      if (previous && !previous.closed) {
        previous.close();
      }
      peer.recvTransports.set(tag, transport);
      if (tag === 'default') peer.recvTransport = transport;
    }
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      tag
    };
  }

  _findRecvTransport(peer, transportId) {
    for (const transport of peer.recvTransports.values()) {
      if (transport?.id === transportId) return transport;
    }
    return peer.recvTransport;
  }

  async connectTransport(peer, { transportId, dtlsParameters, direction }) {
    const transport =
      direction === 'send' ? peer.sendTransport : this._findRecvTransport(peer, transportId);
    if (!transport || transport.id !== transportId) {
      throw new Error('Transport invÃ¡lido');
    }
    await transport.connect({ dtlsParameters });
  }

  _selectedNeedsReassign() {
    if (!this.selectedPeerId) return true;
    const selected = this.getSelectedPeer();
    return !selected?.hasVideoProducer();
  }

  _ensureSelectedAndBroadcast(peer, slot) {
    if (slot !== 'video' || !peer.hasVideoProducer()) return;

    if (this._selectedNeedsReassign()) {
      this.selectClient(peer.id);
      return;
    }

    if (this.selectedPeerId === peer.id) {
      this.broadcastActiveProducer();
    }
  }

  _onSelectedVideoLost(peer) {
    if (this.selectedPeerId !== peer.id) return;
    const fallback = [...this.peers.values()].find(
      (p) =>
        p.id !== peer.id &&
        this.isPeerSocketOpen(p) &&
        p.hasVideoProducer()
    );
    if (fallback) {
      this.selectClient(fallback.id);
    } else {
      this.broadcastActiveProducer();
    }
  }

  async produce(peer, { transportId, kind, rtpParameters, appData }) {
    if (!peer.sendTransport || peer.sendTransport.id !== transportId) {
      throw new Error('Transport de envio invÃ¡lido');
    }

    const slot = producerSlot(kind, appData);
    const replacing = !!peer.producers[slot] && !peer.producers[slot].closed;
    if (replacing) peer.replacingProducers.add(slot);

    let producer;
    try {
      this.closeProducer(peer, slot);

      producer = await peer.sendTransport.produce({
      kind: kind === 'video' ? 'video' : 'audio',
      rtpParameters,
      appData: { ...appData, peerId: peer.id, mediaTag: slot, source: slot === 'video' ? undefined : slot }
    });

    peer.producers[slot] = producer;
    if (slot === 'video') {
      peer.status = 'transmitindo';
      sessionDebugLog('[VIDEO_PRODUCER]', 'producer de video criado', {
        peerId: peer.id.slice(0, 8),
        producerId: producer.id.slice(0, 8),
        name: peer.displayName
      });
    }
    peer.replacingProducers.delete(slot);

    const onProducerClosed = () => {
      const isReplacing = peer.replacingProducers.has(slot);
      if (peer.producers[slot]?.id === producer.id) {
        peer.producers[slot] = null;
      }
      if (!peer.hasVideoProducer()) {
        peer.status = 'conectado';
        this.displayControllerIds.delete(peer.id);
      }
      if (slot === 'video' && !peer.hasVideoProducer()) {
        sessionDebugLog('[VIDEO_PRODUCER]', 'producer ativo fechado', {
          peerId: peer.id.slice(0, 8),
          producerId: producer.id.slice(0, 8),
          wasSelected: this.selectedPeerId === peer.id
        });
        this._onSelectedVideoLost(peer);
      }
      if (AUDIO_PRODUCER_SLOTS.includes(slot)) {
        logger.info('[audio] producer fechado', {
          peerId: peer.id.slice(0, 8),
          source: slot,
          producerId: producer.id.slice(0, 8)
        });
        this.broadcastAudioSources();
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
    if (slot === 'video') {
      sessionDebugLog('[VIDEO_PRODUCER]', 'producer de video anunciado ao host', {
        peerId: peer.id.slice(0, 8),
        producerId: producer.id.slice(0, 8),
        hosts: this.getHostAndCoHostPeers().map((h) => h.id.slice(0, 8))
      });
      for (const host of this.getHostAndCoHostPeers()) {
        this.sendRoomSnapshot(host);
      }
    }
    if (AUDIO_PRODUCER_SLOTS.includes(slot)) {
      logger.info('[audio] producer criado', {
        peerId: peer.id.slice(0, 8),
        source: slot,
        producerId: producer.id.slice(0, 8)
      });
      this.broadcastAudioSources();
    }

    this._ensureSelectedAndBroadcast(peer, slot);

    return { id: producer.id, kind: slot === 'video' ? 'video' : 'audio', source: slot === 'video' ? null : slot };
    } catch (err) {
      peer.replacingProducers.delete(slot);
      if (!peer.hasVideoProducer()) {
        peer.status = 'conectado';
        this.displayControllerIds.delete(peer.id);
      }
      if (slot === 'video' && !peer.hasVideoProducer()) {
        this._onSelectedVideoLost(peer);
      }
      this.notifyHostState();
      throw err;
    }
  }

  async consume(peer, { producerId, rtpCapabilities, consumerTag = 'default' }) {
    const owner = this._findProducerOwner(producerId);
    if (owner && owner.id === peer.id) {
      throw new Error('Nao e possivel consumir o proprio producer');
    }
    const router = getRouter();
    if (!router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('NÃ£o Ã© possÃ­vel consumir este producer com as capacidades atuais');
    }
    const transport = peer.recvTransports.get(consumerTag) || peer.recvTransport;
    if (!transport) {
      throw new Error('Transport de recepÃ§Ã£o nÃ£o criado');
    }

    const existing = [...peer.consumers.values()].find(
      (c) => c.producerId === producerId && c.transport?.id === transport.id
    );
    if (existing && !existing.closed) {
      return {
        id: existing.id,
        producerId: existing.producerId,
        kind: existing.kind,
        rtpParameters: existing.rtpParameters
      };
    }

    const consumer = await transport.consume({
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
      logger.warn('retomarConsumer: consumer jÃ¡ removido (ignorado)', {
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

export function logClientTrace(peer, { message, data = {} } = {}) {
  agentDebugLog({
    hypothesisId: 'G',
    location: 'client-trace',
    message: message || 'clientTrace',
    data: {
      peerId: peer?.id?.slice(0, 8) || null,
      role: peer?.role || null,
      name: peer?.displayName || null,
      ...data
    }
  });
}
