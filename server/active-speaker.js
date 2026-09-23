import { getRouter } from './mediasoup-manager.js';
import { logger } from './logger.js';

let observer = null;
let initPromise = null;
/** @type {Map<string, { peerId: string, roomId: string | null }>} producerId -> owner */
const producerPeerMap = new Map();
const dominantSpeakerHandlers = new Map();
const lastDominantByRoom = new Map();

export function setDominantSpeakerHandler(roomId, handler) {
  const key = String(roomId || 'default');
  if (typeof handler === 'function') dominantSpeakerHandlers.set(key, handler);
  else dominantSpeakerHandlers.delete(key);
}

export function getLastDominantSpeaker(roomId) {
  const value = lastDominantByRoom.get(String(roomId || 'default'));
  return value ? { ...value } : null;
}

export async function ensureActiveSpeakerObserver() {
  if (observer) return observer;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const router = getRouter();
    observer = await router.createActiveSpeakerObserver();
    observer.on('dominantspeaker', (dominantSpeaker) => {
      const producer = dominantSpeaker?.producer;
      const producerId = producer?.id;
      if (!producerId) return;
      const owner = producerPeerMap.get(producerId);
      if (!owner) return;
      const roomKey = String(owner.roomId || 'default');
      const info = {
        peerId: owner.peerId,
        producerId,
        roomId: owner.roomId,
        volume: producer?.volume ?? null
      };
      lastDominantByRoom.set(roomKey, info);
      dominantSpeakerHandlers.get(roomKey)?.(info);
    });
    logger.info('[active-speaker] ActiveSpeakerObserver criado', { observerId: observer.id });
    return observer;
  })();

  try {
    return await initPromise;
  } catch (err) {
    initPromise = null;
    throw err;
  }
}

export async function trackMicProducer(producer, peerId, roomId = null) {
  if (!producer?.id || !peerId) return;
  await ensureActiveSpeakerObserver();
  producerPeerMap.set(producer.id, { peerId: String(peerId), roomId });
  try {
    await observer.addProducer({ producerId: producer.id });
    logger.debug('[active-speaker] producer monitorado', {
      peerId: String(peerId).slice(0, 8),
      producerId: producer.id.slice(0, 8)
    });
  } catch (err) {
    logger.warn('[active-speaker] falha ao monitorar producer', {
      peerId: String(peerId).slice(0, 8),
      producerId: producer.id.slice(0, 8),
      err: err?.message
    });
  }
}

export async function untrackMicProducer(producerId) {
  if (!producerId) return;
  const owner = producerPeerMap.get(producerId);
  producerPeerMap.delete(producerId);
  if (!observer) return;
  try {
    await observer.removeProducer({ producerId });
  } catch (_) {}
  const roomKey = String(owner?.roomId || 'default');
  if (lastDominantByRoom.get(roomKey)?.producerId === producerId) {
    lastDominantByRoom.delete(roomKey);
    dominantSpeakerHandlers.get(roomKey)?.(null);
  }
}

export async function closeActiveSpeakerObserver() {
  producerPeerMap.clear();
  lastDominantByRoom.clear();
  dominantSpeakerHandlers.clear();
  if (observer) {
    try {
      observer.close();
    } catch (_) {}
    observer = null;
  }
  initPromise = null;
}
