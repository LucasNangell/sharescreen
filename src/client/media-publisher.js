/**
 * Publish desacoplado: video, microfone e system audio independentes.
 */
export class MediaPublisher {
  constructor(media, signaling) {
    this.media = media;
    this.signaling = signaling;
  }

  async publishVideo(stream, prefs = {}) {
    await this.media.publishDisplayStream(stream, {
      ...prefs,
      microphone: false,
      systemAudio: false
    });
    return this.media.hasVideoProducer();
  }

  async publishMicrophone(prefs) {
    return this.media.publishMicrophone(prefs);
  }

  async publishSystemAudio(stream, prefs = {}) {
    if (stream) this.media.localScreenStream = stream;
    this.media.setCapturePrefs({ ...prefs, systemAudio: true });
    return this.media.publishSystemAudioFromDisplay(stream);
  }

  async syncAudioToggles(prefs, stream = null) {
    return this.media.syncPublishedAudio(prefs, stream);
  }

  async confirmMediaReady() {
    if (!this.media?.hasVideoProducer?.()) {
      return { ok: false, erro: 'Sem producer de video local' };
    }
    this.signaling.send('midiaPronta', {});
    try {
      const ack = await Promise.race([
        this.signaling.onceType('midiaProntaOk'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout midiaProntaOk')), 8000)
        )
      ]);
      if (ack && ack.ok === false) {
        return ack;
      }
      return ack || { ok: true };
    } catch (err) {
      return { ok: false, erro: err.message || 'midiaPronta falhou' };
    }
  }
}
