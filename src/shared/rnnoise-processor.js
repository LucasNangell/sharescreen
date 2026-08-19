/** Integração RNNoise via AudioWorklet (@timephy/rnnoise-wasm). */

const WORKLET_URL = '/shared/rnnoise/NoiseSuppressorWorklet.js';
const WORKLET_NAME = 'NoiseSuppressorWorklet';

let workletLoadPromise = null;

function ensureRnnoiseWorklet(ctx) {
  if (!ctx?.audioWorklet) return Promise.resolve(false);
  if (workletLoadPromise) return workletLoadPromise;
  workletLoadPromise = ctx.audioWorklet
    .addModule(WORKLET_URL)
    .then(() => true)
    .catch((err) => {
      console.warn('[rnnoise] worklet indisponivel:', err);
      workletLoadPromise = null;
      return false;
    });
  return workletLoadPromise;
}

/**
 * Insere nó de supressão de ruído ML entre source e destino.
 * @returns {Promise<AudioNode | null>}
 */
export async function createRnnoiseNode(ctx, sourceNode, destNode) {
  if (!ctx || !sourceNode || !destNode) return null;
  const ok = await ensureRnnoiseWorklet(ctx);
  if (!ok) return null;
  try {
    const node = new AudioWorkletNode(ctx, WORKLET_NAME);
    sourceNode.connect(node);
    node.connect(destNode);
    return node;
  } catch (err) {
    console.warn('[rnnoise] falha ao criar AudioWorkletNode:', err);
    return null;
  }
}
