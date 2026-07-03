import { formatRecordingFilename } from './recording-filename.js';

export const RecordingState = {
  IDLE: 'idle',
  RECORDING: 'recording',
  FINALIZING: 'finalizing',
  UPLOADING: 'uploading',
  SAVED: 'saved',
  ERROR: 'error'
};

const CHUNK_UPLOAD_RETRIES = 3;
const CHUNK_RETRY_DELAY_MS = 1500;

/**
 * Gravação com streaming em tempo real para o servidor (fallback legado em memória).
 */
export class RecordingClient {
  constructor({ onLog, onStateChange, onProgress, onTimer } = {}) {
    this.onLog = onLog || (() => {});
    this.onStateChange = onStateChange || (() => {});
    this.onProgress = onProgress || (() => {});
    this.onTimer = onTimer || (() => {});
    this.mediaRecorder = null;
    this.chunks = [];
    this._mimeType = 'video/webm';
    this._state = RecordingState.IDLE;
    this._timerInterval = null;
    this._startedAt = 0;
    this._approxBytes = 0;
    this._bytesPersisted = 0;
    this._hostToken = '';
    this._streamingEnabled = true;
    this._streamSessionId = null;
    this._nextChunkIndex = 0;
    this._customDir = '';
    this._uploadQueue = [];
    this._uploadQueueActive = false;
    this._stopResolve = null;
    this._legacyMode = false;
    this._finishRequested = false;
  }

  get state() {
    return this._state;
  }

  get bytesPersisted() {
    return this._bytesPersisted;
  }

  isStreaming() {
    return !!this._streamSessionId && !this._legacyMode;
  }

  setState(s) {
    this._state = s;
    this.onStateChange(s);
  }

  setHostToken(token) {
    this._hostToken = token || '';
  }

  _headers(extra = {}) {
    const headers = { ...extra };
    if (this._hostToken) headers['X-Host-Token'] = this._hostToken;
    return headers;
  }

  _pickMimeType() {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return 'video/webm';
  }

  async _startStreamSession(customDir = '') {
    const res = await fetch('/api/gravacao/stream/start', {
      method: 'POST',
      headers: {
        ...this._headers(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ customDir: customDir || '' })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok || !data.sessionId) {
      throw new Error(data.erro || `Falha ao iniciar streaming (${res.status})`);
    }
    return data.sessionId;
  }

  _enqueueChunk(blob) {
    if (!blob?.size) return;
    const index = this._nextChunkIndex++;
    this._uploadQueue.push({ index, blob });
    this._drainUploadQueue();
  }

  async _drainUploadQueue() {
    if (this._uploadQueueActive || this._legacyMode || !this._streamSessionId) return;
    this._uploadQueueActive = true;
    try {
      while (this._uploadQueue.length > 0) {
        const item = this._uploadQueue[0];
        let lastError = null;
        for (let attempt = 0; attempt < CHUNK_UPLOAD_RETRIES; attempt++) {
          try {
            const res = await fetch('/api/gravacao/stream/chunk', {
              method: 'POST',
              headers: {
                ...this._headers(),
                'X-Session-Id': this._streamSessionId,
                'X-Chunk-Index': String(item.index),
                'Content-Type': 'application/octet-stream'
              },
              body: item.blob
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.ok) {
              throw new Error(data.erro || `Chunk ${item.index} falhou (${res.status})`);
            }
            this._bytesPersisted = data.bytesWritten ?? this._bytesPersisted + item.blob.size;
            this._uploadQueue.shift();
            lastError = null;
            break;
          } catch (err) {
            lastError = err;
            if (attempt < CHUNK_UPLOAD_RETRIES - 1) {
              await new Promise((r) => setTimeout(r, CHUNK_RETRY_DELAY_MS * (attempt + 1)));
            }
          }
        }
        if (lastError) {
          this.setState(RecordingState.ERROR);
          this.onLog(`Falha ao enviar chunk ${item.index}: ${lastError.message}`, 'error');
          throw lastError;
        }
      }
    } finally {
      this._uploadQueueActive = false;
      if (this._stopResolve && this._uploadQueue.length === 0) {
        const resolve = this._stopResolve;
        this._stopResolve = null;
        resolve();
      }
    }
  }

  async _flushUploadQueue() {
    if (this._legacyMode) return;
    await this._drainUploadQueue();
    if (this._uploadQueue.length > 0) {
      await new Promise((resolve) => {
        this._stopResolve = resolve;
        this._drainUploadQueue().catch(() => resolve());
      });
    }
  }

  async start(stream, quality = {}, { customDir = '' } = {}) {
    if (!stream?.getVideoTracks?.().length) {
      throw new Error('Nenhum vídeo disponível para gravar');
    }
    const liveVideo = stream.getVideoTracks().some((t) => t.readyState === 'live');
    if (!liveVideo) throw new Error('Stream de vídeo não está ativo');
    if (this.mediaRecorder?.state === 'recording') {
      throw new Error('Gravação já em andamento');
    }

    this.chunks = [];
    this._approxBytes = 0;
    this._bytesPersisted = 0;
    this._nextChunkIndex = 0;
    this._uploadQueue = [];
    this._legacyMode = false;
    this._streamSessionId = null;
    this._customDir = customDir || '';
    this._finishRequested = false;
    this._mimeType = this._pickMimeType();
    const vbps = quality.videoBitsPerSecond ?? 2_500_000;

    if (this._streamingEnabled) {
      try {
        this._streamSessionId = await this._startStreamSession(this._customDir);
        this.onLog('Gravação em streaming para o servidor', 'info');
      } catch (err) {
        this._legacyMode = true;
        this.onLog(`Streaming indisponível, usando buffer local: ${err.message}`, 'warn');
      }
    } else {
      this._legacyMode = true;
    }

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: this._mimeType,
      videoBitsPerSecond: vbps
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (!e.data?.size) return;
      this._approxBytes += e.data.size;
      if (this._legacyMode) {
        this.chunks.push(e.data);
      } else {
        this._enqueueChunk(e.data);
      }
    };

    this.mediaRecorder.onerror = () => {
      this.setState(RecordingState.ERROR);
      this.onLog('Erro no MediaRecorder', 'error');
    };

    this.mediaRecorder.start(1000);
    this._startedAt = Date.now();
    this._timerInterval = setInterval(() => {
      const sec = Math.floor((Date.now() - this._startedAt) / 1000);
      const bytes = this.isStreaming() ? this._bytesPersisted : this._approxBytes;
      this.onTimer(sec, bytes);
    }, 1000);

    this.setState(RecordingState.RECORDING);
    this.onLog('Gravação iniciada', 'info');
  }

  stop() {
    return new Promise((resolve, reject) => {
      const mr = this.mediaRecorder;
      if (!mr || mr.state === 'inactive') {
        resolve(this._legacyMode ? null : { streaming: true });
        return;
      }

      this.setState(RecordingState.FINALIZING);
      clearInterval(this._timerInterval);

      mr.onstop = async () => {
        this.mediaRecorder = null;
        try {
          if (this._legacyMode) {
            const blob = new Blob(this.chunks, { type: this._mimeType });
            this.chunks = [];
            resolve(blob.size > 0 ? blob : null);
            return;
          }
          await this._flushUploadQueue();
          resolve({ streaming: true });
        } catch (err) {
          this.setState(RecordingState.ERROR);
          reject(err);
        }
      };

      mr.onerror = () => {
        this.setState(RecordingState.ERROR);
        reject(new Error('Falha ao finalizar gravação'));
      };

      try {
        mr.stop();
      } catch (e) {
        reject(e);
      }
    });
  }

  async finishStream(filename, customDir = '') {
    if (!this._streamSessionId || this._legacyMode) {
      return null;
    }
    if (this._finishRequested) return null;
    this._finishRequested = true;

    try {
      await this._flushUploadQueue();
      const res = await fetch('/api/gravacao/stream/finish', {
        method: 'POST',
        headers: {
          ...this._headers(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: this._streamSessionId,
          filename,
          customDir: customDir || this._customDir || '',
          incomplete: false
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.erro || `Falha ao finalizar gravação (${res.status})`);
      }
      this._streamSessionId = null;
      this.setState(RecordingState.SAVED);
      this.onProgress(100);
      return data;
    } catch (err) {
      this.setState(RecordingState.ERROR);
      throw err;
    }
  }

  finishIncomplete(filename = '') {
    if (!this._streamSessionId || this._legacyMode || this._finishRequested) return;
    this._finishRequested = true;

    const payload = {
      sessionId: this._streamSessionId,
      filename,
      incomplete: true
    };

    fetch('/api/gravacao/stream/finish', {
      method: 'POST',
      headers: {
        ...this._headers(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});

    this._streamSessionId = null;
  }

  prepareIncompleteFinish(filename = '') {
    if (this.isRecording() && this.mediaRecorder) {
      try {
        clearInterval(this._timerInterval);
        this.mediaRecorder.stop();
      } catch (_) {}
    }
    this.finishIncomplete(filename);
  }

  resetIdle() {
    this._streamSessionId = null;
    this._legacyMode = false;
    this._finishRequested = false;
    this._uploadQueue = [];
    this.setState(RecordingState.IDLE);
  }

  isRecording() {
    return this.mediaRecorder?.state === 'recording';
  }

  async upload(blob, filename = formatRecordingFilename(new Date()), customDir = '') {
    if (!blob?.size) throw new Error('Gravação vazia');

    this.setState(RecordingState.UPLOADING);

    const headers = {
      'Content-Type': 'application/octet-stream',
      'X-Recording-Filename': filename
    };
    if (customDir) headers['X-Recording-Dir'] = customDir;
    if (this._hostToken) headers['X-Host-Token'] = this._hostToken;

    const useChunked = blob.size > 8 * 1024 * 1024;

    try {
      if (useChunked && typeof fetch === 'function') {
        return await this._uploadChunked(blob, filename, headers, customDir);
      }
      return await this._uploadSimple(blob, filename, headers);
    } catch (e) {
      this.setState(RecordingState.ERROR);
      throw e;
    }
  }

  _uploadSimple(blob, filename, headers) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/gravacao');
      for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          this.onProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      };
      xhr.onload = () => {
        let data = {};
        try {
          data = JSON.parse(xhr.responseText);
        } catch (_) {}
        if (xhr.status >= 200 && xhr.status < 300) {
          this.setState(RecordingState.SAVED);
          this.onProgress(100);
          resolve(data);
        } else {
          reject(new Error(data.erro || `HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Falha de rede ao enviar gravação'));
      xhr.send(blob);
    });
  }

  async _uploadChunked(blob, filename, headers, customDir = '') {
    const chunkSize = 2 * 1024 * 1024;
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const total = Math.ceil(blob.size / chunkSize);

    for (let i = 0; i < total; i++) {
      const start = i * chunkSize;
      const part = blob.slice(start, start + chunkSize);
      const res = await fetch('/api/gravacao/chunk', {
        method: 'POST',
        headers: {
          ...headers,
          'X-Upload-Id': uploadId,
          'X-Chunk-Index': String(i),
          'X-Chunk-Total': String(total),
          'Content-Type': 'application/octet-stream'
        },
        body: part
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.erro || `Chunk ${i} falhou`);
      this.onProgress(Math.round(((i + 1) / total) * 90));
    }

    const finishRes = await fetch('/api/gravacao/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this._hostToken ? { 'X-Host-Token': this._hostToken } : {})
      },
      body: JSON.stringify({ uploadId, filename, customDir })
    });
    const result = await finishRes.json().catch(() => ({}));
    if (!finishRes.ok) throw new Error(result.erro || 'Falha ao finalizar upload');
    this.setState(RecordingState.SAVED);
    this.onProgress(100);
    return result;
  }

  async stopAndUpload(stream, quality) {
    const result = await this.stop();
    if (!result) {
      this.setState(RecordingState.IDLE);
      return null;
    }
    if (result.streaming) {
      const filename = formatRecordingFilename(new Date());
      return this.finishStream(filename);
    }
    const filename = formatRecordingFilename(new Date());
    return this.upload(result, filename);
  }
}
