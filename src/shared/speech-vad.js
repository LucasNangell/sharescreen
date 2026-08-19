/** Wrapper Silero VAD (@ricky0123/vad-web) para detecção de fala na publicação. */

const DEFAULT_BASE = '/shared/vad/';

let micVadModule = null;

async function loadMicVadModule() {
  if (micVadModule) return micVadModule;
  micVadModule = await import('@ricky0123/vad-web');
  return micVadModule;
}

/**
 * Monitora fala em um MediaStream existente (sem segunda captura de microfone).
 * @returns {Promise<{ destroy: () => void, isSpeaking: () => boolean } | null>}
 */
export async function createSpeechVadController({
  stream,
  baseAssetPath = DEFAULT_BASE,
  hangoverMs = 400,
  onSpeechChange = null
} = {}) {
  if (!stream?.getAudioTracks?.()?.length) return null;

  const { MicVAD } = await loadMicVadModule();
  let speaking = false;
  let hangoverTimer = null;

  const setSpeaking = (next) => {
    const value = !!next;
    if (value) {
      if (hangoverTimer) {
        clearTimeout(hangoverTimer);
        hangoverTimer = null;
      }
      if (!speaking) {
        speaking = true;
        onSpeechChange?.(true);
      }
      return;
    }
    if (!speaking) return;
    if (hangoverTimer) clearTimeout(hangoverTimer);
    hangoverTimer = setTimeout(() => {
      hangoverTimer = null;
      speaking = false;
      onSpeechChange?.(false);
    }, hangoverMs);
  };

  const vad = await MicVAD.new({
    baseAssetPath,
    onnxWASMBasePath: baseAssetPath,
    startOnLoad: false,
    getStream: async () => stream,
    pauseStream: async () => {},
    resumeStream: async () => stream,
    onSpeechStart: () => setSpeaking(true),
    onSpeechEnd: () => setSpeaking(false),
    onVADMisfire: () => setSpeaking(false)
  });

  await vad.start();

  return {
    isSpeaking: () => speaking,
    destroy: () => {
      if (hangoverTimer) clearTimeout(hangoverTimer);
      try {
        vad.destroy();
      } catch (_) {}
    }
  };
}
