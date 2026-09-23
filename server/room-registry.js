import crypto from 'crypto';
import { RoomManager } from './room-manager.js';

const ROOM_PIN_MIN_LENGTH = 4;
const ROOM_PIN_MAX_LENGTH = 64;

function normalizeRoomPin(value) {
  const pin = String(value || '').trim();
  if (pin.length < ROOM_PIN_MIN_LENGTH || pin.length > ROOM_PIN_MAX_LENGTH) {
    throw new Error(`O PIN da sala deve ter entre ${ROOM_PIN_MIN_LENGTH} e ${ROOM_PIN_MAX_LENGTH} caracteres`);
  }
  return pin;
}

function roomPinKey(pin) {
  return crypto.createHash('sha256').update(`sharescreen-room-pin:v1:${pin}`).digest('hex');
}

function sameToken(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

/**
 * Mantém salas independentes no mesmo router mediasoup. O PIN nunca é retido
 * em texto claro: somente seu identificador SHA-256 é usado para localizá-la.
 */
export class RoomRegistry {
  constructor({ createManager = (roomId) => new RoomManager({ roomId }) } = {}) {
    this.createManager = createManager;
    this.roomsByKey = new Map();
    this.roomsById = new Map();
  }

  createOrResumeHost({ roomPin, roomToken, ownerUserId = null } = {}) {
    const pin = normalizeRoomPin(roomPin);
    const pinKey = roomPinKey(pin);
    let context = this.roomsByKey.get(pinKey);

    if (context) {
      const manager = context.manager;
      if (manager.hasActiveHost()) {
        throw new Error('Já existe um host ativo com este PIN de sala');
      }

      // Mantém clients durante uma breve reconexão do host, mas apenas o
      // painel que recebeu o token opaco da sala pode retomar essa reunião.
      if (manager.peers.size > 0 && !sameToken(roomToken, context.hostToken)) {
        throw new Error('Esta sala está aguardando a reconexão do host original');
      }

      if (manager.peers.size === 0) {
        this._discard(context);
        context = null;
      }
    }

    if (!context) {
      const roomId = crypto.randomUUID();
      context = {
        id: roomId,
        pinKey,
        hostToken: crypto.randomBytes(32).toString('base64url'),
        ownerUserId: ownerUserId || null,
        manager: this.createManager(roomId),
        createdAt: Date.now()
      };
      this.roomsByKey.set(pinKey, context);
      this.roomsById.set(roomId, context);
    }

    return context;
  }

  getForClient(roomPin) {
    const pin = normalizeRoomPin(roomPin);
    const context = this.roomsByKey.get(roomPinKey(pin));
    if (!context || !context.manager.hasActiveHost()) {
      throw new Error('PIN inválido ou sala não está disponível');
    }
    return context;
  }

  getById(roomId) {
    return this.roomsById.get(String(roomId || '')) || null;
  }

  getForViewerLink(roomId) {
    const context = this.getById(roomId);
    if (!context || !context.manager.hasActiveHost()) {
      throw new Error('A sala deste link não está mais disponível');
    }
    return context;
  }

  removePeer(context, peerId) {
    if (!context) return;
    context.manager.removePeer(peerId);
    if (context.manager.peers.size === 0) this._discard(context);
  }

  canManageRoom(roomId, roomToken, userId = null) {
    const context = this.getById(roomId);
    if (!context) return false;
    if (sameToken(roomToken, context.hostToken)) return true;
    return !!userId && !!context.ownerUserId && String(userId) === String(context.ownerUserId);
  }

  hasActiveRooms() {
    return [...this.roomsById.values()].some((context) => context.manager.hasActiveHost());
  }

  getActiveRoomCount() {
    return [...this.roomsById.values()].filter((context) => context.manager.hasActiveHost()).length;
  }

  refreshTransmissionIfSelected(clientName) {
    for (const context of this.roomsById.values()) {
      context.manager.refreshTransmissionIfSelected(clientName);
    }
  }

  _discard(context) {
    this.roomsByKey.delete(context.pinKey);
    this.roomsById.delete(context.id);
    context.manager.destroy?.();
  }
}

export const rooms = new RoomRegistry();
export { normalizeRoomPin };
