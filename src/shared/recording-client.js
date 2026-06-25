import { formatRecordingFilename } from './recording-filename.js';

export const RecordingState = {
  IDLE: 'idle',
  RECORDING: 'recording',
  FINALIZING: 'finalizing',
  UPLOADING: 'uploading',
  SAVED: 'saved',
  ERROR: 'error'
};

/**
 * Gravação robusta com chunks e upload (simples ou em partes).
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
    this._hostToken = '';
  }

  get state() {
    return this._state;
  }

  setState(s) {
    this._state = s;
    this.onStateChange(s);
  }

  setHostToken(token) {
    this._hostToken = token || '';
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

  start(stream, quality = {}) {
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
    this._mimeType = this._pickMimeType();
    const vbps = quality.videoBitsPerSecond ?? 2_500_000;

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: this._mimeType,
      videoBitsPerSecond: vbps
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data?.size > 0) {
        this.chunks.push(e.data);
        this._approxBytes += e.data.size;
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
      this.onTimer(sec, this._approxBytes);
    }, 1000);

    this.setState(RecordingState.RECORDING);
    this.onLog('Gravação iniciada', 'info');
  }

  stop() {
    return new Promise((resolve, reject) => {
      const mr = this.mediaRecorder;
      if (!mr || mr.state === 'inactive') {
        resolve(null);
        return;
      }

      this.setState(RecordingState.FINALIZING);
      clearInterval(this._timerInterval);

      mr.onstop = () => {
        const blob = new Blob(this.chunks, { type: this._mimeType });
        this.chunks = [];
        this.mediaRecorder = null;
        resolve(blob.size > 0 ? blob : null);
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

  resetIdle() {
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

    // Upload simples com progresso via XMLHttpRequest
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
    const blob = await this.stop();
    if (!blob) {
      this.setState(RecordingState.IDLE);
      return null;
    }
    const filename = formatRecordingFilename(new Date());
    return this.upload(blob, filename);
  }
}
