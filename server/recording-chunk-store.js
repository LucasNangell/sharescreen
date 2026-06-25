/**
 * Armazenamento temporário de chunks de gravação (DEV).
 */
const uploads = new Map();

const TTL_MS = 2 * 60 * 60 * 1000;

export function saveChunk(uploadId, chunkIndex, chunkTotal, buffer) {
  if (!uploadId || chunkIndex == null) {
    return { ok: false, erro: 'uploadId e chunkIndex obrigatórios' };
  }

  let entry = uploads.get(uploadId);
  if (!entry) {
    entry = {
      chunks: new Map(),
      total: Number(chunkTotal) || 0,
      createdAt: Date.now()
    };
    uploads.set(uploadId, entry);
  }

  entry.chunks.set(Number(chunkIndex), Buffer.from(buffer));
  if (chunkTotal) entry.total = Number(chunkTotal);

  return { ok: true, received: entry.chunks.size, total: entry.total };
}

export function assembleUpload(uploadId) {
  const entry = uploads.get(uploadId);
  if (!entry) return { ok: false, erro: 'Upload não encontrado' };

  const indices = [...entry.chunks.keys()].sort((a, b) => a - b);
  if (entry.total && indices.length !== entry.total) {
    return { ok: false, erro: `Chunks incompletos (${indices.length}/${entry.total})` };
  }

  const buffers = indices.map((i) => entry.chunks.get(i));
  uploads.delete(uploadId);
  return { ok: true, buffer: Buffer.concat(buffers) };
}

export function pruneOldUploads() {
  const now = Date.now();
  for (const [id, entry] of uploads.entries()) {
    if (now - entry.createdAt > TTL_MS) uploads.delete(id);
  }
}
