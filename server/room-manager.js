import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/default.js';
import { createWebRtcTransport, getRouter, getRtpCapabilities } from './mediasoup-manager.js';
import { logger } from './logger.js';
import { getLowerThirdForDisplayName } from './client-db.js';
import { getClientIpFromWs } from './client-ip.js';
import { debugSessionLog } from './debug-session-log.js';
import {
  ensureActiveSpeakerObserver,
  setDominantSpeakerHandler,
  trackMicProducer,
  untrackMicProducer
} from './active-speaker.js';

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

function liveProducerId(producer) {
  return producer && !producer.closed ? producer.id || null : null;
}

const AUDIO_SOURCE_PRIORITY = {
  microphone: 0,
  system: 1,
  mixed: 2
};

function enforceDualPublishPolicy(peer, newSlot, room) {
  const policy = config.audio?.dualPublishPolicy || 'allow-both';
  if (policy === 'allow-both' || !AUDIO_PRODUCER_SLOTS.includes(newSlot)) return null;

  const newPri = AUDIO_SOURCE_PRIORITY[newSlot] ?? 2;
  for (const slot of AUDIO_PRODUCER_SLOTS) {
    if (slot === newSlot) continue;
    const existing = peer.producers[slot];
    if (!existing || existing.closed) continue;
    const existingPri = AUDIO_SOURCE_PRIORITY[slot] ?? 2;
    if (newPri < existingPri) {
      room.closeProducer(peer, slot);
      peer.send({
        type: 'audioPolicyAplicada',
        payload: { policy, kept: newSlot, closed: slot }
      });
      logger.info('[audio] política anti-eco: producer fechado', {
        peerId: peer.id.slice(0, 8),
        kept: newSlot,
        closed: slot,
        policy
      });
    } else if (newPri > existingPri) {
      peer.send({
        type: 'audioPolicyAplicada',
        payload: { policy, kept: slot, blocked: newSlot }
      });
      const err = new Error(`Política de áudio (${policy}): ${slot} já ativo`);
      err.code = 'AUDIO_POLICY_BLOCKED';
      throw err;
    }
  }
  return null;
}

function computeAudioSourcesSignature(sources) {
  const byProducer = new Map();
  for (const raw of sources || []) {
    const peerId = raw?.peerId || raw?.id;
    const producerId = raw?.producerId || raw?.producerIds?.audio;
    const source = raw?.source || 'microphone';
    if (!peerId || !producerId) continue;
    if (byProducer.has(producerId)) continue;
    byProducer.set(producerId, { peerId: String(peerId), producerId, source });
  }
  return [...byProducer.values()]
    .map((s) => `${s.peerId}:${s.source}:${s.producerId}`)
    .sort()
    .join('|');
}

/**
 * Estado de um peer (host ou client).
 */
export class Peer {
  constructor(
    ws,
    role,
    displayName,
    agentHostname = '',
    { isExternal = false, publishIntent = 'publisher', userId = null, username = null, userRole = null } = {}
  ) {
    this.id = randomPeerId();
    this.ws = ws;
    this.role = role;
    this.displayName = displayName || (role === 'host' ? 'Painel Host' : `Client ${shortId(this.id)}`);
    this.agentHostname = (agentHostname || '').trim().toUpperCase();
    this.isExternal = !!isExternal;
    this.publishIntent = publishIntent === 'viewer' ? 'viewer' : 'publisher';
    this.userId = userId || null;
    this.username = username || null;
    this.userRole = userRole || null;
    this.mediaReadyAck = { video: false, microphone: false, system: false };
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
    this.cleaningUpMedia = false;
    this.clientIp = '';
  }

  getProducerIds() {
    const microphone = liveProducerId(this.producers.microphone);
    const system = liveProducerId(this.producers.system);
    const mixed = liveProducerId(this.producers.mixed);
    const audio = microphone || system || mixed;
    return {
      video: liveProducerId(this.producers.video),
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
      userId: this.userId || null,
      username: this.username || null,
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
  constructor({ roomId = null } = {}) {
    this.roomId = roomId;
    this.peers = new Map();
    this.selectedPeerId = null;
    this.transmissionPaused = false;
    this.displayControllerIds = new Set();
    this.interrompidaPor = null;
    this.finalizadaPor = null;
    this.mutedPeerIds = new Set();
    this._lastAudioSourcesSig = '';
    this.meetBridgeLiveMode = false;
    this.sharedRoomMode = !!config.audio?.sharedRoomMode;
    this.dominantSpeakerPeerId = null;
    this.dominantSpeakerProducerId = null;
    this.roomVersion = 0;
    this._emittingRoomState = false;
    this._roomStateDirty = false;
    this.whiteboardActive = false;
    /** @type {object[]} */
    this.whiteboardElements = [];
    this._whiteboardSourcePeerId = null;
    this.coHostIdentities = new Set();
    this.actingHostPeerId = null;
    this._initActiveSpeakerBridge();
  }

  _peerCoHostIdentity(peer) {
    if (!peer || peer.role !== 'client') return '';
    if (peer.userId) return `user:${peer.userId}`;
    const host = String(peer.agentHostname || '').trim().toUpperCase();
    const name = String(peer.displayName || '').trim().toLowerCase();
    if (host && name) return `machine:${host}|${name}`;
    if (name) return `name:${name}`;
    return '';
  }

  _restoreCoHostFromIdentity(peer) {
    if (!peer || peer.role !== 'client') return;
    const identity = this._peerCoHostIdentity(peer);
    if (!identity || !this.coHostIdentities.has(identity)) return;
    peer.isCoHost = true;
    this.displayControllerIds.add(peer.id);
  }

  getActingHostPeer() {
    if (this.actingHostPeerId) {
      const pinned = this.peers.get(this.actingHostPeerId);
      if (pinned && pinned.isCoHost && this.isPeerSocketOpen(pinned)) return pinned;
    }
    return [...this.peers.values()].find((p) => p.isCoHost && this.isPeerSocketOpen(p)) || null;
  }

  getSnapshotHostPeer() {
    return this.getHostPeer() || this.getActingHostPeer();
  }

  setCoHost(targetPeerId, ativo) {
    const target = this.peers.get(targetPeerId);
    if (!target) return { ok: false, erro: 'Peer nao encontrado' };
    if (target.role !== 'client') {
      return { ok: false, erro: 'Apenas clients podem ser co-host' };
    }
    const next = !!ativo;
    if (!!target.isCoHost === next) {
      return { ok: true, unchanged: true };
    }

    target.isCoHost = next;
    const identity = this._peerCoHostIdentity(target);
    if (next) {
      this.displayControllerIds.add(target.id);
      if (identity) this.coHostIdentities.add(identity);
      target.send({
        type: 'promovidoCoHost',
        payload: { nome: target.displayName }
      });
    } else {
      this.displayControllerIds.delete(target.id);
      if (identity) this.coHostIdentities.delete(identity);
      if (this.actingHostPeerId === target.id) this.actingHostPeerId = null;
      target.send({ type: 'demovidoCoHost' });
    }
    this.sendDisplayControlSnapshot(target);
    this.notifyHostState();
    return { ok: true, unchanged: false };
  }

  _initActiveSpeakerBridge() {
    ensureActiveSpeakerObserver().catch((err) => {
      logger.warn('[active-speaker] inicialização adiada', { err: err?.message });
    });
    setDominantSpeakerHandler(this.roomId, (info) => {
      this._onDominantSpeakerChanged(info);
    });
  }

  _onDominantSpeakerChanged(info) {
    const peerId = info?.peerId ? String(info.peerId) : null;
    const producerId = info?.producerId ? String(info.producerId) : null;
    if (peerId === this.dominantSpeakerPeerId && producerId === this.dominantSpeakerProducerId) {
      return;
    }
    this.dominantSpeakerPeerId = peerId;
    this.dominantSpeakerProducerId = producerId;
    if (!this.sharedRoomMode) {
      this.markRoomStateDirty();
      return;
    }
    this.broadcastToRoom({
      type: 'falanteDominante',
      payload: {
        peerId,
        producerId,
        volume: info?.volume ?? null,
        sharedRoomMode: true
      }
    });
  }

  setSharedRoomMode(ativo) {
    this.sharedRoomMode = !!ativo;
    this.broadcastToRoom({
      type: 'modoSalaCompartilhadaAtualizado',
      payload: {
        ativo: this.sharedRoomMode,
        dominantSpeakerPeerId: this.dominantSpeakerPeerId,
        dominantSpeakerProducerId: this.dominantSpeakerProducerId
      }
    });
    if (this.sharedRoomMode && this.dominantSpeakerPeerId) {
      this.broadcastToRoom({
        type: 'falanteDominante',
        payload: {
          peerId: this.dominantSpeakerPeerId,
          producerId: this.dominantSpeakerProducerId,
          sharedRoomMode: true
        }
      });
    }
  }

  getMediaReady(peer) {
    const hasMic = !!(peer.producers.microphone && !peer.producers.microphone.closed);
    const hasSystem = !!(peer.producers.system && !peer.producers.system.closed);
    const videoReady =
      peer.hasVideoProducer() &&
      (peer.role === 'host' || peer.mediaReadyAck.video);
    return {
      video: videoReady,
      microphone: hasMic,
      system: hasSystem
    };
  }

  isPeerSelectable(peer) {
    if (peer.publishIntent === 'viewer') return false;
    return this.getMediaReady(peer).video;
  }

  confirmMediaReady(peer) {
    if (!peer.hasVideoProducer()) {
      return { ok: false, erro: 'Sem producer de video ativo' };
    }
    peer.mediaReadyAck.video = true;
    peer.status = 'transmitindo';
    this.emitRoomState('media-ready');
    return { ok: true };
  }

  isPeerSocketOpen(peer) {
    return peer?.ws?.readyState === 1;
  }

  markRoomStateDirty() {
    if (this._emittingRoomState) {
      this._roomStateDirty = true;
      return;
    }
    this.notifyHostState();
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
      this.markRoomStateDirty();
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

  hasActiveHost() {
    this.purgeStalePeers();
    return !!this.getSnapshotHostPeer();
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
    const sourceKind =
      this.whiteboardActive &&
      this._whiteboardSourcePeerId &&
      String(this.selectedPeerId) === String(this._whiteboardSourcePeerId)
        ? 'whiteboard'
        : null;
    return {
      selectedPeerId: this.selectedPeerId,
      producerId: producerIds.video,
      producerIds,
      peerName:
        sourceKind === 'whiteboard'
          ? 'Quadro branco'
          : selected?.displayName ?? null,
      paused: this.transmissionPaused,
      lowerThird: sourceKind === 'whiteboard' ? null : lowerThird,
      interrompidaPor: this.interrompidaPor || null,
      finalizadaPor: this.finalizadaPor || null,
      sourceKind
    };
  }

  buildWhiteboardStatePayload() {
    return {
      active: this.whiteboardActive,
      elements: this.whiteboardElements.slice()
    };
  }

  startWhiteboard(peerId) {
    this.whiteboardActive = true;
    this._whiteboardSourcePeerId = peerId;
    this.broadcastActiveProducer();
    this.broadcastToRoom({
      type: 'quadroBrancoEstado',
      payload: this.buildWhiteboardStatePayload()
    });
    return { ok: true };
  }

  stopWhiteboard() {
    this.whiteboardActive = false;
    this._whiteboardSourcePeerId = null;
    this.whiteboardElements = [];
    this.broadcastActiveProducer();
    this.broadcastToRoom({
      type: 'quadroBrancoLimpar',
      payload: { ok: true }
    });
    this.broadcastToRoom({
      type: 'quadroBrancoEstado',
      payload: this.buildWhiteboardStatePayload()
    });
    return { ok: true };
  }

  _stopWhiteboardIfSource(peerId) {
    if (!this.whiteboardActive) return;
    if (
      this._whiteboardSourcePeerId &&
      peerId &&
      String(this._whiteboardSourcePeerId) !== String(peerId)
    ) {
      return;
    }
    this.stopWhiteboard();
  }

  addWhiteboardElement(element) {
    const MAX_ELEMENTS = 500;
    if (this.whiteboardElements.length >= MAX_ELEMENTS) {
      return { ok: false, erro: 'Limite de elementos do quadro branco atingido' };
    }
    const existing = this.whiteboardElements.findIndex((e) => e.id === element.id);
    if (existing >= 0) {
      this.whiteboardElements[existing] = element;
    } else {
      this.whiteboardElements.push(element);
    }
    this.broadcastToRoom({
      type: 'quadroBrancoElemento',
      payload: element
    });
    return { ok: true };
  }

  clearWhiteboard() {
    this.whiteboardElements = [];
    this.broadcastToRoom({
      type: 'quadroBrancoLimpar',
      payload: { ok: true }
    });
    return { ok: true };
  }

  sendWhiteboardStateToPeer(peer) {
    if (!peer) return;
    peer.send({
      type: 'quadroBrancoEstado',
      payload: this.buildWhiteboardStatePayload()
    });
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

  broadcastToRoom(message, exceptPeerId = null) {
    for (const peer of this.peers.values()) {
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

  setMeetBridgeLiveMode(ativo) {
    this.meetBridgeLiveMode = !!ativo;
    this.broadcastToClients({
      type: "modoPonteMeetAtualizado",
      payload: { ativo: this.meetBridgeLiveMode }
    });
  }

  notifyHostState() {
    this.emitRoomState('legacy-estado');
  }

  buildRoomState(viewingPeer = null, reason = 'update') {
    this.purgeStalePeers();
    const transmission = this.buildTransmissionPayload();
    const audioSources = this.getAudioSources();
    const peers = [...this.peers.values()]
      .filter((p) => this.isPeerSocketOpen(p))
      .map((p) => this._mapPeerForState(p));

    const host = this.getSnapshotHostPeer();
    const selected =
      transmission.selectedPeerId
        ? peers.find((p) => p.id === transmission.selectedPeerId) ||
          (transmission.producerIds?.video
            ? {
                id: transmission.selectedPeerId,
                displayName: transmission.peerName || 'Fonte',
                producerIds: transmission.producerIds,
                mediaReady: { video: true, microphone: false, system: false },
                selectable: true,
                isProducing: true,
                hasVideo: true,
                selecionado: true,
                pausado: transmission.paused
              }
            : null)
        : null;

    const payload = {
      version: this.roomVersion,
      reason,
      snapshotAt: Date.now(),
      host: host
        ? {
            id: host.id,
            shortId: shortId(host.id),
            displayName: host.displayName,
            hasVideo: host.hasVideoProducer(),
            hasAudio: host.hasAudioProducer(),
            producerIds: host.getProducerIds(),
            mediaReady: this.getMediaReady(host)
          }
        : null,
      peers,
      clients: peers.filter((p) => p.role === 'client' || p.ehHost),
      selecionado: selected,
      transmission,
      audioSources,
      videoProducers: peers
        .filter((p) => p.producerIds?.video)
        .map((p) => ({
          peerId: p.id,
          producerId: p.producerIds.video,
          name: p.displayName,
          origin: p.origin
        })),
      audioProducers: audioSources,
      transmissionPaused: this.transmissionPaused,
      controleExibicao: [...this.displayControllerIds],
      meetBridgeLiveMode: this.meetBridgeLiveMode,
      sharedRoomMode: this.sharedRoomMode,
      dominantSpeakerPeerId: this.dominantSpeakerPeerId,
      mutedPeerIds: [...this.mutedPeerIds],
      whiteboard: this.buildWhiteboardStatePayload(),
      rtpCapabilities: getRtpCapabilities()
    };

    if (viewingPeer?.role === 'client') {
      payload.displayControl = this.buildDisplayControlPayload(viewingPeer.id);
    }

    return payload;
  }

  _emitRoomStateNow(reason = 'update') {
    this._pruneDisplayControllers();
    this.roomVersion += 1;

    if (!config.useLegacyRoomSync) {
      for (const peer of this.peers.values()) {
        if (!this.isPeerSocketOpen(peer)) continue;
        peer.send({
          type: 'roomState',
          payload: this.buildRoomState(peer, reason)
        });
      }
    }

    const hostPayload = this.getHostState();
    // #region agent log
    debugSessionLog('H4', 'room-manager:emitRoomState', reason, {
      version: this.roomVersion,
      clients: (hostPayload.clients || []).map((c) => ({
        id: c.id?.slice(0, 8),
        name: c.displayName,
        publishIntent: c.publishIntent,
        selectable: c.selectable,
        mediaReadyVideo: c.mediaReady?.video,
        hasVideo: c.hasVideo,
        isProducing: c.isProducing,
        producerVideo: c.producerIds?.video?.slice(0, 8) || null
      }))
    });
    try {
      const debug3a = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'debug-3a36be.log');
      fs.appendFileSync(
        debug3a,
        `${JSON.stringify({
          sessionId: '3a36be',
          location: 'room-manager:_emitRoomStateNow',
          message: 'estado broadcast',
          data: {
            reason,
            version: this.roomVersion,
            clientCount: (hostPayload.clients || []).length,
            clientNames: (hostPayload.clients || []).map((c) => c.displayName),
            hostRecipients: this.getHostAndCoHostPeers().map((h) => h.id.slice(0, 8)),
            hypothesisId: 'D'
          },
          timestamp: Date.now()
        })}\n`
      );
    } catch (_) {}
    // #endregion
    for (const host of this.getHostAndCoHostPeers()) {
      host.send({ type: 'estado', payload: hostPayload });
    }
    this.notifyDisplayControllers();
  }

  emitRoomState(reason = 'update') {
    if (this._emittingRoomState) {
      this._roomStateDirty = true;
      return;
    }
    this._emittingRoomState = true;
    try {
      let nextReason = reason;
      do {
        this._roomStateDirty = false;
        this._emitRoomStateNow(nextReason);
        nextReason = 'coalesced';
      } while (this._roomStateDirty);
    } finally {
      this._emittingRoomState = false;
    }
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
    if (!peer || peer.role !== 'client') return;
    peer.send({
      type: 'controleExibicaoAtualizado',
      payload: this.buildDisplayControlPayload(peer.id)
    });
  }

  setDisplayControl(peerId, ativo) {
    if (!peerId) return { ok: false, erro: 'Client inválido' };
    const peer = this.peers.get(peerId);
    if (!peer || peer.role !== 'client') {
      return { ok: false, erro: 'Client não encontrado' };
    }
    if (!peer.hasVideoProducer()) {
      return { ok: false, erro: 'Apenas clients transmitindo podem receber controle' };
    }
    if (ativo) {
      this.displayControllerIds.add(peerId);
    } else {
      this.displayControllerIds.delete(peerId);
    }
    logger.info('Controle de exibição atualizado', {
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
    if (!actorPeer) return { ok: false, erro: 'Não autenticado' };
    const isHost = actorPeer.role === 'host';
    const isDelegated = actorPeer.role === 'client' && this.canControlDisplay(actorPeer.id);
    if (!isHost && !isDelegated) {
      return { ok: false, erro: 'Sem permissão para alternar a exibição' };
    }
    return this.selectClient(peerId);
  }

  _mapPeerForState(peer) {
    const producerIds = peer.getProducerIds();
    const mediaReady = this.getMediaReady(peer);
    return {
      ...peer.getPublicInfo(this),
      mediaReady,
      publishIntent: peer.publishIntent,
      selectable: this.isPeerSelectable(peer),
      producerIds: {
        video: producerIds.video,
        microphone: producerIds.microphone,
        system: producerIds.system,
        mixed: producerIds.mixed,
        audio: producerIds.audio
      },
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
      version: this.roomVersion,
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
      audioSources: this.getAudioSources(),
      meetBridgeLiveMode: this.meetBridgeLiveMode,
      sharedRoomMode: this.sharedRoomMode,
      dominantSpeakerPeerId: this.dominantSpeakerPeerId,
      mutedPeerIds: [...this.mutedPeerIds],
      rtpCapabilities: getRtpCapabilities()
    };
  }

  buildRoomSnapshot(viewingPeer = null) {
    this.purgeStalePeers();
    const host = this.getSnapshotHostPeer();
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
      version: this.roomVersion,
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
      meetBridgeLiveMode: this.meetBridgeLiveMode,
      sharedRoomMode: this.sharedRoomMode,
      dominantSpeakerPeerId: this.dominantSpeakerPeerId,
      rtpCapabilities: getRtpCapabilities(),
      mutedPeerIds: [...this.mutedPeerIds],
      whiteboard: this.buildWhiteboardStatePayload()
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
    if (!config.useLegacyRoomSync) {
      peer.send({
        type: 'roomState',
        payload: this.buildRoomState(peer, 'snapshot')
      });
    }
    peer.send({ type: 'estadoSala', payload: snapshot });
  }

  addPeer(ws, role, displayName, agentHostname = '', { isExternal = false, publishIntent = 'publisher', userId = null, username = null, userRole = null } = {}) {
    this.purgeStalePeers();

    if (role === 'host' && this.getHostPeer()) {
      throw new Error('Já existe um painel host aberto nesta sala. Feche-o antes de abrir outro.');
    }

    if (role === 'client' && !this.hasActiveHost()) {
      throw new Error('A sala ainda não foi aberta pelo host. Aguarde o host iniciar e tente novamente.');
    }

    if (role === 'client' && this.getClientCount() >= config.maxClients) {
      throw new Error(`Limite de ${config.maxClients} clients atingido`);
    }

    let audioSourcesChanged = false;

    if (role === 'host') {
      this.actingHostPeerId = null;
    }

    // Mesma máquina ou convidado externo reconectando — remove sessão anterior ainda aberta
    if (role === 'client') {
      const hostKey = (agentHostname || '').trim().toUpperCase();
      const nameKey = (displayName || '').trim().toLowerCase();
      const newClientIp = getClientIpFromWs(ws);
      let clearedSelection = false;
      for (const [peerId, old] of [...this.peers.entries()]) {
        if (old.role !== 'client' || old.ws === ws) continue;
        const sameMachine = hostKey && old.agentHostname === hostKey;
        const sameExternalGuest =
          isExternal && old.isExternal && old.displayName.trim().toLowerCase() === nameKey;
        const sameNameAndIp =
          !isExternal &&
          !hostKey &&
          nameKey &&
          old.displayName.trim().toLowerCase() === nameKey &&
          !!newClientIp &&
          (old.clientIp || '') === newClientIp;
        if (!sameMachine && !sameExternalGuest && !sameNameAndIp) continue;
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

    const peer = new Peer(ws, role, displayName, agentHostname, {
      isExternal,
      publishIntent,
      userId,
      username,
      userRole
    });
    peer.ws = ws;
    if (role === 'client') {
      peer.clientIp = getClientIpFromWs(ws);
      this._restoreCoHostFromIdentity(peer);
    }
    this.peers.set(peer.id, peer);
    sessionDebugLog('[ROOM_STATE]', 'peer entrou', {
      peerId: peer.id.slice(0, 8),
      role,
      name: peer.displayName,
      publishIntent: peer.publishIntent
    });
    logger.info('Peer conectado', { peerId: peer.id, role, name: peer.displayName });
    this.emitRoomState('peer-joined');
    const sig = computeAudioSourcesSignature(this.getAudioSources());
    if (sig !== this._lastAudioSourcesSig) {
      this.broadcastAudioSources({ force: true });
    } else {
      this.sendAudioSourcesToPeer(peer);
    }
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

    this._stopWhiteboardIfSource(peerId);
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
      const hostSuccessor = [...this.peers.values()].find(
        (p) => p.role === 'host' && this.isPeerSocketOpen(p)
      );
      if (hostSuccessor) {
        this.actingHostPeerId = null;
        logger.info('Painel host sucessor permanece ativo', {
          peerId: hostSuccessor.id,
          name: hostSuccessor.displayName
        });
      } else {
        const coHost = [...this.peers.values()].find((p) => p.isCoHost);
        if (coHost) {
          this.actingHostPeerId = coHost.id;
          logger.info('Co-host assume controles sem alterar papel', {
            peerId: coHost.id,
            name: coHost.displayName,
            role: coHost.role
          });
        } else {
          this.actingHostPeerId = null;
          this.finalizadaPor = peer.displayName;
          this.interrompidaPor = null;
          this.selectedPeerId = null;
          this.transmissionPaused = false;
          this.broadcastActiveProducer();
        }
      }
    }

    this.broadcastAudioSources();
    this.notifyHostState();
  }

  closeProducer(peer, slot) {
    const producer = peer.producers[slot];
    if (producer && !producer.closed) {
      if (slot === 'microphone') {
        untrackMicProducer(producer.id).catch(() => {});
      }
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
    peer.cleaningUpMedia = true;
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
      logger.warn('Erro ao limpar mídia do peer', { peerId: peer.id, err: err.message });
    } finally {
      peer.cleaningUpMedia = false;
    }
    peer.sendTransport = null;
    peer.recvTransport = null;
    peer.recvTransports?.clear();
  }

  stopAllProduction(peer) {
    this._stopWhiteboardIfSource(peer?.id);
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
      if (this.whiteboardActive) {
        this.stopWhiteboard();
      }
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
      return { ok: false, erro: 'Fonte não encontrada' };
    }
    if (!peer.hasVideoProducer()) {
      return { ok: false, erro: 'Esta fonte não está transmitindo tela' };
    }

    const wouldBeWhiteboard =
      this.whiteboardActive &&
      this._whiteboardSourcePeerId &&
      String(peerId) === String(this._whiteboardSourcePeerId);
    if (this.whiteboardActive && !wouldBeWhiteboard) {
      this.stopWhiteboard();
    }

    this.selectedPeerId = peerId;
    this.transmissionPaused = false;
    this.interrompidaPor = null;
    this.finalizadaPor = null;
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
    logger.info('Transmissão pausada', { peerId: this.selectedPeerId });
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
    logger.info('Transmissão retomada', { peerId: this.selectedPeerId });
    return { ok: true };
  }

  clearTransmission(actorPeer) {
    if (this.whiteboardActive) {
      this.stopWhiteboard();
    }
    this.selectedPeerId = null;
    this.transmissionPaused = false;
    this.interrompidaPor = actorPeer ? actorPeer.displayName : 'Host';
    this.finalizadaPor = null;
    this.broadcastActiveProducer();
    this.notifyHostState();
    logger.info('Transmissão limpa pelo host');
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

  sendAudioSourcesToPeer(peer) {
    if (!peer || !this.isPeerSocketOpen(peer)) return;
    const sources = this.getAudioSources();
    peer.send({ type: 'fontesAudio', payload: { sources } });
  }

  broadcastAudioSources({ force = false } = {}) {
    const sources = this.getAudioSources();
    const sig = computeAudioSourcesSignature(sources);
    if (!force && sig === this._lastAudioSourcesSig) return;
    this._lastAudioSourcesSig = sig;
    const payload = { sources };
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
      throw new Error('Transport inválido');
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
    this._stopWhiteboardIfSource(peer?.id);
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
      throw new Error('Transport de envio inválido');
    }

    const slot = producerSlot(kind, appData);
    const replacing = !!peer.producers[slot] && !peer.producers[slot].closed;
    if (replacing) peer.replacingProducers.add(slot);

    let producer;
    try {
      if (AUDIO_PRODUCER_SLOTS.includes(slot)) {
        enforceDualPublishPolicy(peer, slot, this);
      }
      this.closeProducer(peer, slot);

      producer = await peer.sendTransport.produce({
      kind: kind === 'video' ? 'video' : 'audio',
      rtpParameters,
      appData: { ...appData, peerId: peer.id, mediaTag: slot, source: slot === 'video' ? undefined : slot }
    });

    peer.producers[slot] = producer;
    if (slot === 'video') {
      peer.mediaReadyAck.video = true;
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
      if (peer.cleaningUpMedia || isReplacing) return;
      if (!peer.hasVideoProducer()) {
        peer.status = 'conectado';
        peer.mediaReadyAck.video = false;
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
        if (slot === 'microphone') {
          untrackMicProducer(producer.id).catch(() => {});
        }
        logger.info('[audio] producer fechado', {
          peerId: peer.id.slice(0, 8),
          source: slot,
          producerId: producer.id.slice(0, 8)
        });
        this.broadcastAudioSources();
      }
      this.emitRoomState('producer-closed');
    };

    producer.on('transportclose', onProducerClosed);
    producer.on('@close', onProducerClosed);

    logger.info('Producer publicado', {
      peerId: peer.id,
      producerId: producer.id,
      kind: slot
    });

    this.emitRoomState(`produce-${slot}`);
    if (slot === 'video') {
      sessionDebugLog('[VIDEO_PRODUCER]', 'producer de video anunciado ao host', {
        peerId: peer.id.slice(0, 8),
        producerId: producer.id.slice(0, 8),
        hosts: this.getHostAndCoHostPeers().map((h) => h.id.slice(0, 8))
      });
    }
    if (AUDIO_PRODUCER_SLOTS.includes(slot)) {
      logger.info('[audio] producer criado', {
        peerId: peer.id.slice(0, 8),
        source: slot,
        producerId: producer.id.slice(0, 8)
      });
      if (slot === 'microphone') {
        trackMicProducer(producer, peer.id, this.roomId).catch(() => {});
      }
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
    if (!owner) {
      logger.warn('Producer indisponivel para consumo', {
        peerId: peer?.id,
        producerId
      });
      throw new Error('Producer indisponivel');
    }
    if (owner.id === peer.id) {
      logger.warn('Tentativa de consumir o proprio producer', {
        peerId: peer.id,
        producerId
      });
      throw new Error('Nao e possivel consumir o proprio producer');
    }
    const router = getRouter();
    if (!router.canConsume({ producerId, rtpCapabilities })) {
      logger.warn('Producer incompativel com capacidades do consumidor', {
        peerId: peer.id,
        producerId,
        ownerId: owner.id
      });
      throw new Error('Nao e possivel consumir este producer com as capacidades atuais');
    }
    const transport = peer.recvTransports.get(consumerTag) || peer.recvTransport;
    if (!transport) {
      throw new Error('Transport de recepção não criado');
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

  destroy() {
    setDominantSpeakerHandler(this.roomId, null);
    for (const peer of this.peers.values()) this.cleanupPeerMedia(peer);
    this.peers.clear();
  }
}

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
