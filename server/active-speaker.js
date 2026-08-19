import { getRouter } from './mediasoup-manager.js';
import { logger } from './logger.js';

let observer = null;
let initPromise = null;
/** @type {Map<string, string>} producerId -> peerId */
const producerPeerMap = new Map();
/** @type {((info: { peerId: string, producerId: string, volume?: number } | null) => void) | null} */
let onDominantSpeaker = null;
let lastDominant = null;

export function setDominantSpeakerHandler(handler) {
  onDominantSpeaker = typeof handler === 'function' ? handler : null;
}

export function getLastDominantSpeaker() {
  return lastDominant ? { ...lastDominant } : null;
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
      const peerId = producerPeerMap.get(producerId);
      if (!peerId) return;
      lastDominant = {
        peerId,
        producerId,
        volume: producer?.volume ?? null
      };
      onDominantSpeaker?.(lastDominant);
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

export async function trackMicProducer(producer, peerId) {
  if (!producer?.id || !peerId) return;
  await ensureActiveSpeakerObserver();
  producerPeerMap.set(producer.id, String(peerId));
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
  producerPeerMap.delete(producerId);
  if (!observer) return;
  try {
    await observer.removeProducer({ producerId });
  } catch (_) {}
  if (lastDominant?.producerId === producerId) {
    lastDominant = null;
    onDominantSpeaker?.(null);
  }
}

export async function closeActiveSpeakerObserver() {
  producerPeerMap.clear();
  lastDominant = null;
  if (observer) {
    try {
      observer.close();
    } catch (_) {}
    observer = null;
  }
  initPromise = null;
}
