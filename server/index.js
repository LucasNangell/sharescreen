import './bootstrap-dev.js';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import express from 'express';
import { initMediasoup, closeMediasoup, getAnnouncedIp, getPublicAnnouncedIp, getIceListenIps } from './mediasoup-manager.js';
import { attachSignaling } from './signaling.js';
import { logger } from './logger.js';
import { getLanIPv4 } from './network.js';
import config, { getServerHost, getVideoQualityForClients } from '../config/default.js';
import { listAgentClients } from './agent-bridge.js';
import { saveRecording } from './recording-save.js';
import { saveChunk, assembleUpload, pruneOldUploads } from './recording-chunk-store.js';
import {
  startSession as startRecordingStream,
  appendChunk as appendRecordingStreamChunk,
  finishSession as finishRecordingStream,
  pruneStaleSessions as pruneStaleRecordingStreams
} from './recording-stream-session.js';
import {
  listPendingRecordingDownloads,
  prunePendingRecordingDownloads,
  registerRecordingForDownload,
  sendPendingRecordingDownload,
  canAccessPendingRecordingDownloads
} from './recording-downloads.js';
import { validateRecordingUpload, createViewerLinkToken, getSessionHostToken } from './auth-dev.js';
import {
  lookupClientByIp,
  registerClientByName,
  getLowerThirdForDisplayName,
  saveLowerThird,
  getLowerThirdsDir,
  getAudioFilterPreset,
  saveAudioFilterPreset,
  listAllClients,
  isDbReadonly,
  upsertClient,
  seedUsersFromJsonFile,
  seedUsersIfEmpty,
  verifyDataDirWritable,
  listUserSettings,
  setUserSetting,
  getUserSetting
} from './client-db.js';
import { getClientIpFromRequest } from './client-ip.js';
import { getAgentDebugLogPath } from './room-manager.js';
import { rooms } from './room-registry.js';
import { getDebugSessionRing, debugSessionLog } from './debug-session-log.js';
import {
  initAuth,
  loginUser,
  logoutUser,
  resolveSessionUser,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  optionalAuth,
  requireAuthOrHostToken
} from './auth-session.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const isDev = process.argv.includes('--dev');

function loadAppBuildId() {
  try {
    const raw = fs.readFileSync(path.join(publicDir, 'shared', 'build-id.json'), 'utf8');
    const data = JSON.parse(raw);
    return data.buildId || 'unknown';
  } catch {
    return isDev ? 'dev' : 'unknown';
  }
}

const appBuildId = loadAppBuildId();

function attachRecordingDownload(result) {
  if (!result?.ok || !result.path || !result.filename) return result;
  try {
    const pending = registerRecordingForDownload(result);
    return {
      ...result,
      downloadUrl: pending.downloadUrl,
      downloadExpiresAt: pending.expiresAt
    };
  } catch (err) {
    logger.error('Gravação salva sem disponibilidade de download', {
      filename: result.filename,
      error: err.message
    });
    return { ...result, downloadErro: err.message };
  }
}

function requireRecordingDownloadAccess(req, res, next) {
  const user = resolveSessionUser(req);
  const requiredToken = (getSessionHostToken() || config.hostToken || '').trim();
  const suppliedToken = String(req.headers['x-host-token'] || '').trim();
  if (!canAccessPendingRecordingDownloads({ user, requiredToken, suppliedToken })) {
    res.status(403).json({ ok: false, erro: 'Acesso às gravações pendentes não autorizado' });
    return;
  }
  if (user) req.user = user;
  next();
}

function applyNoStoreHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function staticAssetHeaders(res, filePath) {
  const name = path.basename(filePath).toLowerCase();
  if (name.endsWith('.html')) {
    applyNoStoreHeaders(res);
    return;
  }
  if (name === 'build-id.json' || name.endsWith('.bundle.js') || name.endsWith('.bundle.js.map')) {
    applyNoStoreHeaders(res);
    return;
  }
  if (name === 'sw.js') {
    applyNoStoreHeaders(res);
    return;
  }
  if (name.endsWith('.webmanifest')) {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
    return;
  }
  if (name.endsWith('.css') || name.endsWith('.js') || name.endsWith('.png')) {
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
  }
}

function sendAppHtml(res, filePath) {
  applyNoStoreHeaders(res);
  res.sendFile(filePath);
}

function registerDevAdminRoutes(app) {
  app.get('/api/admin/users', (_req, res) => {
    applyNoStoreHeaders(res);
    res.json({ ok: true, users: listAllClients() });
  });

  app.post('/api/admin/users', (req, res) => {
    applyNoStoreHeaders(res);
    const name = String(req.body?.name || req.body?.user || '').trim();
    const ip = String(req.body?.ip || '').trim();
    const computerName = String(req.body?.computerName || req.body?.computer_name || '').trim();
    const result = upsertClient({ name, ip, computerName });
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post('/api/admin/users/resolve-ips', async (_req, res) => {
    applyNoStoreHeaders(res);
    res.status(410).json({
      ok: false,
      erro: 'Resolução de IP por computer name foi descontinuada. Use login com usuário e senha.'
    });
  });

  app.post('/api/admin/seed', (_req, res) => {
    applyNoStoreHeaders(res);
    const result = seedUsersFromJsonFile(path.join(rootDir, 'users.json'));
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post(
    '/api/admin/lower-third',
    express.raw({ type: ['video/webm', 'application/octet-stream'], limit: '256mb' }),
    (req, res) => {
      applyNoStoreHeaders(res);
      const clientName = String(req.headers['x-lt-client-name'] || '').trim();
      if (!clientName) {
        res.status(400).json({ ok: false, erro: 'Informe o client (x-lt-client-name)' });
        return;
      }
      const meta = {
        width: req.headers['x-lt-width'],
        height: req.headers['x-lt-height'],
        origWidth: req.headers['x-lt-orig-width'],
        origHeight: req.headers['x-lt-orig-height'],
        chromaColor: req.headers['x-lt-chroma-color'],
        chromaTolerance: req.headers['x-lt-chroma-tolerance']
      };
      const result = saveLowerThird(clientName, req.body, meta);
      if (!result.ok) {
        res.status(400).json(result);
        return;
      }
      rooms.refreshTransmissionIfSelected(clientName);
      res.json(result);
    }
  );

  app.use('/admin', express.static(path.join(publicDir, 'admin'), { setHeaders: staticAssetHeaders }));
  app.get('/admin', (_req, res) => {
    sendAppHtml(res, path.join(publicDir, 'admin', 'index.html'));
  });
}

function loadTlsOptions() {
  const keyPath = path.join(rootDir, config.certKey);
  const certPath = path.join(rootDir, config.certCrt);
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    logger.warn(
      'Certificados TLS não encontrados. Execute: npm run cert\n' +
        'Sem HTTPS, getDisplayMedia falha em IPs da LAN (exceto localhost).'
    );
    return null;
  }
  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
}

function createApp() {
  const app = express();
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (config.dev) res.setHeader('X-ShareScreen-Env', 'development');
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  app.post('/api/auth/login', (req, res) => {
    applyNoStoreHeaders(res);
    const { username } = req.body || {};
    const result = loginUser(username);
    if (!result.ok) {
      res.status(401).json(result);
      return;
    }
    setSessionCookie(res, req, result.sessionId);
    res.json({ ok: true, user: result.user });
  });

  app.post('/api/auth/logout', (req, res) => {
    applyNoStoreHeaders(res);
    logoutUser(req);
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    applyNoStoreHeaders(res);
    const user = resolveSessionUser(req);
    if (!user) {
      res.status(401).json({ ok: false, erro: 'Não autenticado' });
      return;
    }
    res.json({ ok: true, user });
  });

  app.get('/api/user-settings', requireAuth, (req, res) => {
    applyNoStoreHeaders(res);
    const namespace = String(req.query.namespace || '').trim();
    res.json({ ok: true, settings: listUserSettings(req.user.id, namespace) });
  });

  app.put('/api/user-settings/:namespace/:key', requireAuth, (req, res) => {
    applyNoStoreHeaders(res);
    const namespace = decodeURIComponent(req.params.namespace || '').trim();
    const key = decodeURIComponent(req.params.key || '').trim();
    const result = setUserSetting(req.user.id, namespace, key, req.body?.value);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  });

  app.get('/api/user-settings/:namespace/:key', requireAuth, (req, res) => {
    applyNoStoreHeaders(res);
    const namespace = decodeURIComponent(req.params.namespace || '').trim();
    const key = decodeURIComponent(req.params.key || '').trim();
    const setting = getUserSetting(req.user.id, namespace, key);
    if (!setting) {
      res.status(404).json({ ok: false, erro: 'Configuração não encontrada' });
      return;
    }
    res.json({ ok: true, ...setting });
  });

  app.get('/api/registro-cliente', (req, res) => {
    applyNoStoreHeaders(res);
    const ip = getClientIpFromRequest(req);
    const reg = lookupClientByIp(ip);
    debugSessionLog({
      runId: 'post-fix',
      hypothesisId: 'H1',
      location: 'GET /api/registro-cliente',
      data: {
        ip,
        nome: reg?.name || null,
        trustProxy: config.trustProxy,
        xForwardedFor: req.get('x-forwarded-for') || null,
        remoteAddress: req.socket?.remoteAddress || null,
        host: req.get('host') || null
      }
    });
    res.json({
      ok: true,
      ip,
      nome: reg?.name || null
    });
  });

  app.post('/api/registro-cliente', (req, res) => {
    applyNoStoreHeaders(res);
    const ip = getClientIpFromRequest(req);
    const nome = String(req.body?.nome || '').trim();
    if (!nome || nome.length > 64) {
      res.status(400).json({ ok: false, erro: 'Nome inválido (máx. 64 caracteres)' });
      return;
    }
    const result = registerClientByName(nome, ip, req.body?.computerName || req.body?.computer_name || '');
    debugSessionLog({
      runId: 'post-fix',
      hypothesisId: 'H2',
      location: 'POST /api/registro-cliente',
      data: {
        ip,
        nome: result.name || nome,
        ok: result.ok,
        erro: result.erro || null,
        trustProxy: config.trustProxy,
        xForwardedFor: req.get('x-forwarded-for') || null,
        remoteAddress: req.socket?.remoteAddress || null,
        host: req.get('host') || null
      }
    });
    res.json({ ...result, nome: result.name || nome });
  });

  if (config.dev) {
    registerDevAdminRoutes(app);
  }

  app.get('/api/lower-third/:clientName', (req, res) => {
    applyNoStoreHeaders(res);
    const lt = getLowerThirdForDisplayName(decodeURIComponent(req.params.clientName || ''));
    if (!lt) {
      res.status(404).json({ ok: false, erro: 'Lower Third não configurado' });
      return;
    }
    res.json({ ok: true, lowerThird: lt });
  });

  app.get('/api/audio-filter/:kind/:name', optionalAuth, (req, res) => {
    applyNoStoreHeaders(res);
    const kind = decodeURIComponent(req.params.kind || '');
    const name = decodeURIComponent(req.params.name || '');
    const userId =
      String(kind).toLowerCase() === 'client'
        ? null
        : String(req.query.userId || req.user?.id || '').trim() || null;
    const preset = getAudioFilterPreset(kind, name, userId);
    res.json({ ok: true, preset: preset || null });
  });

  app.post('/api/audio-filter', requireAuthOrHostToken, express.json({ limit: '32kb' }), (req, res) => {
    applyNoStoreHeaders(res);
    const kind = String(req.body?.kind || '').trim();
    const name = String(req.body?.name || '').trim();
    const prefs = req.body?.prefs;
    const userId =
      String(kind).toLowerCase() === 'client'
        ? String(req.body?.userId || '').trim() || null
        : String(req.body?.userId || req.user?.id || '').trim() || null;
    const result = saveAudioFilterPreset(kind, name, prefs, userId);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  });

  app.post(
    '/api/lower-third',
    express.raw({ type: ['video/webm', 'application/octet-stream'], limit: '256mb' }),
    requireAuthOrHostToken,
    (req, res) => {
      applyNoStoreHeaders(res);
      const clientName = String(req.headers['x-lt-client-name'] || '').trim();
      if (!clientName) {
        res.status(400).json({ ok: false, erro: 'Informe o client (x-lt-client-name)' });
        return;
      }
      const meta = {
        width: req.headers['x-lt-width'],
        height: req.headers['x-lt-height'],
        origWidth: req.headers['x-lt-orig-width'],
        origHeight: req.headers['x-lt-orig-height'],
        chromaColor: req.headers['x-lt-chroma-color'],
        chromaTolerance: req.headers['x-lt-chroma-tolerance']
      };
      const result = saveLowerThird(clientName, req.body, meta);
      if (!result.ok) {
        res.status(400).json(result);
        return;
      }
      rooms.refreshTransmissionIfSelected(clientName);
      res.json(result);
    }
  );

  app.use('/lt-videos', express.static(getLowerThirdsDir(), { setHeaders: staticAssetHeaders }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      env: config.dev ? 'development' : 'production',
      uptime: process.uptime()
    });
  });

  app.get('/api/info', (_req, res) => {
    applyNoStoreHeaders(res);
    res.json({
      lanIp: getAnnouncedIp(),
      publicAnnouncedIp: getPublicAnnouncedIp(),
      iceAnnouncedHosts: getIceListenIps().map((entry) => entry.announcedIp),
      httpsPort: config.httpsPort,
      maxClients: config.maxClients,
      rtcPorts: `${config.rtcMinPort}-${config.rtcMaxPort}`,
      // roomPinRequired é mantido para versões antigas do frontend.
      roomPinRequired: !!(config.roomPin || '').trim(),
      clientPinRequired: !!(config.clientRoomPin || '').trim(),
      hostPinRequired: !!(config.hostPin || '').trim(),
      roomOpen: rooms.hasActiveRooms(),
      activeRoomCount: rooms.getActiveRoomCount(),
      dev: !!config.dev,
      publicUrl: config.publicUrl || null,
      publicClientPath: (config.publicUrl || '').trim() ? '/meet/' : '/client/',
      buildId: appBuildId,
      roomStateProtocol: !config.useLegacyRoomSync,
      turnEnabled: getVideoQualityForClients().turnEnabled
    });
  });

  app.get('/api/debug-session', (_req, res) => {
    applyNoStoreHeaders(res);
    res.json({ sessionId: '20cf0e', entries: getDebugSessionRing() });
  });

  app.post('/api/client-debug', (req, res) => {
    const { hypothesisId, location, message, data, sessionId } = req.body || {};
    if (hypothesisId && location && message) {
      debugSessionLog(hypothesisId, location, message, data || {});
      if (sessionId === '3a36be') {
        try {
          const log3a = path.join(__dirname, '..', 'debug-3a36be.log');
          fs.appendFileSync(
            log3a,
            `${JSON.stringify({ sessionId, hypothesisId, location, message, data: data || {}, timestamp: Date.now() })}\n`
          );
        } catch (_) {}
      }
      if (sessionId === 'c3e9ac') {
        try {
          const c3Log = path.join(__dirname, '..', 'debug-c3e9ac.log');
          fs.appendFileSync(
            c3Log,
            `${JSON.stringify({ sessionId, hypothesisId, location, message, data: data || {}, timestamp: Date.now() })}\n`
          );
        } catch (_) {}
      }
    }
    res.json({ ok: true });
  });

  app.post('/api/link-externo', requireAuthOrHostToken, (req, res) => {
    const nome = String(req.body?.nome || '').trim();
    if (!nome || nome.length > 64) {
      res.status(400).json({ ok: false, erro: 'Informe o nome do convidado (máx. 64 caracteres)' });
      return;
    }
    const roomId = String(req.headers['x-room-id'] || '').trim();
    const roomToken = String(req.headers['x-room-token'] || '').trim();
    if (!rooms.canManageRoom(roomId, roomToken, req.user?.id || null)) {
      res.status(403).json({ ok: false, erro: 'Sem autorização para gerar link desta sala' });
      return;
    }
    const { token, expiresInMs } = createViewerLinkToken(roomId);
    const configuredPublic = (config.publicUrl || '').trim().replace(/\/$/, '');
    let baseUrl = configuredPublic;
    if (!baseUrl) {
      const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
      const host = req.get('x-forwarded-host') || req.get('host');
      baseUrl = `${proto}://${host}`;
    }
    const clientPath = configuredPublic ? '/meet/' : '/client/';
    const params = new URLSearchParams({ token, nome });
    const url = `${baseUrl}${clientPath}?${params.toString()}`;
    res.json({ ok: true, url, expiresInMs, nome });
  });

  app.post('/api/browse-dir', requireAuthOrHostToken, (req, res) => {
    let targetPath = String(req.body?.path || '').trim();
    try {
      if (!targetPath) {
        targetPath = process.cwd();
      }
      targetPath = path.resolve(targetPath);
      if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
        targetPath = process.cwd();
      }
      const items = fs.readdirSync(targetPath, { withFileTypes: true });
      const dirs = items
        .filter((item) => item.isDirectory())
        .map((item) => item.name);
      dirs.sort((a, b) => a.localeCompare(b, 'pt-BR'));
      const parent = path.dirname(targetPath);
      res.json({
        ok: true,
        currentPath: targetPath,
        parent: parent !== targetPath ? parent : null,
        dirs
      });
    } catch (e) {
      res.json({ ok: false, erro: e.message });
    }
  });

  app.get('/api/agentes', async (_req, res) => {
    const result = await listAgentClients();
    res.json({
      ...result,
      serverHost: getServerHost(),
      onlineMaxAgeSeconds: config.agent?.onlineMaxAgeSeconds ?? 20
    });
  });

  app.post(
    '/api/gravacao',
    requireAuthOrHostToken,
    express.raw({ type: 'application/octet-stream', limit: '4gb' }),
    (req, res) => {
      const filename = req.headers['x-recording-filename'];
      const customDir = req.headers['x-recording-dir'];
      const result = saveRecording(req.body, filename, customDir);
      if (!result.ok) {
        res.status(result.erro?.includes('inválido') ? 400 : 500).json(result);
        return;
      }
      res.json(attachRecordingDownload(result));
    }
  );

  app.post(
    '/api/gravacao/chunk',
    requireAuthOrHostToken,
    express.raw({ type: 'application/octet-stream', limit: '32mb' }),
    (req, res) => {
      pruneOldUploads();
      const uploadId = req.headers['x-upload-id'];
      const chunkIndex = req.headers['x-chunk-index'];
      const chunkTotal = req.headers['x-chunk-total'];
      const result = saveChunk(uploadId, chunkIndex, chunkTotal, req.body);
      res.status(result.ok ? 200 : 400).json(result);
    }
  );

  app.post('/api/gravacao/complete', requireAuthOrHostToken, (req, res) => {
    const { uploadId, filename, customDir } = req.body || {};
    const assembled = assembleUpload(uploadId);
    if (!assembled.ok) {
      res.status(400).json(assembled);
      return;
    }
    const result = saveRecording(assembled.buffer, filename, customDir);
    if (!result.ok) {
      res.status(500).json(result);
      return;
    }
    res.json(attachRecordingDownload(result));
  });

  app.post('/api/gravacao/stream/start', requireAuthOrHostToken, (req, res) => {
    pruneStaleRecordingStreams();
    const { customDir } = req.body || {};
    const result = startRecordingStream({ customDir: customDir || '' });
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post(
    '/api/gravacao/stream/chunk',
    requireAuthOrHostToken,
    express.raw({ type: 'application/octet-stream', limit: '32mb' }),
    async (req, res) => {
      const sessionId = req.headers['x-session-id'];
      const chunkIndex = req.headers['x-chunk-index'];
      const result = await appendRecordingStreamChunk(sessionId, chunkIndex, req.body);
      res.status(result.ok ? 200 : 400).json(result);
    }
  );

  app.post('/api/gravacao/stream/finish', requireAuthOrHostToken, async (req, res) => {
    const { sessionId, filename, incomplete } = req.body || {};
    const result = await finishRecordingStream(sessionId, filename || '', { incomplete: !!incomplete });
    if (!result.ok) {
      res.status(result.erro?.includes('inválido') ? 400 : 500).json(result);
      return;
    }
    res.json(attachRecordingDownload(result));
  });

  app.get('/api/gravacao/pendentes', requireRecordingDownloadAccess, (_req, res) => {
    res.json({ ok: true, recordings: listPendingRecordingDownloads() });
  });

  app.get('/api/gravacao/download/:id', (req, res) => {
    const result = sendPendingRecordingDownload(String(req.params.id || ''), res);
    if (!result.ok) res.status(result.status || 404).json({ ok: false, erro: result.erro });
  });

  app.get('/api/diagnostico', (_req, res) => {
    res.json({
      servidor: 'ShareScreen LAN SFU',
      versao: '1.0.0',
      buildId: appBuildId,
      ipLocal: getLanIPv4(),
      announcedIp: getAnnouncedIp(),
      publicAnnouncedIp: getPublicAnnouncedIp(),
      mediasoup: true,
      codecPreferido: config.preferredVideoCodec,
      bitrateInicial: config.initialVideoBitrate,
      bitrateMaximo: config.maxVideoBitrate,
      fpsAlvo: config.targetFrameRate,
      capturaNativa: 'resizeMode none — resolução do monitor'
    });
  });

  app.use('/host', express.static(path.join(publicDir, 'host'), { setHeaders: staticAssetHeaders }));
  app.use('/client', express.static(path.join(publicDir, 'client'), { setHeaders: staticAssetHeaders }));
  app.use('/vendor', express.static(path.join(publicDir, 'vendor'), { setHeaders: staticAssetHeaders }));
  app.use('/shared', express.static(path.join(publicDir, 'shared'), { setHeaders: staticAssetHeaders }));

  app.get('/host', (_req, res) => {
    sendAppHtml(res, path.join(publicDir, 'host', 'index.html'));
  });
  app.get('/client', (_req, res) => {
    sendAppHtml(res, path.join(publicDir, 'client', 'index.html'));
  });
  app.get('/', (_req, res) => {
    res.redirect('/host');
  });

  return app;
}

async function main() {
  const lanIp = getLanIPv4();
  const usersJsonPath = path.join(rootDir, 'users.json');
  const dataWritable = verifyDataDirWritable();
  const seedResult = seedUsersIfEmpty(usersJsonPath);
  const authSeed = initAuth({
    usersJsonPath,
    defaultUsersPassword: process.env.SHARESCREEN_DEFAULT_IMPORTED_PASSWORD || '12345'
  });
  if (!dataWritable.ok || seedResult?.readonly || isDbReadonly()) {
    logger.error(
      'AVISO: data/ ou SQLite sem permissao de escrita — cadastro/LT/filtros de audio nao serao salvos no servidor. ' +
        'Execute fix-data-permissoes.bat como Administrador no servidor e reinicie.',
      { dataWritable, seedResult, dbReadonly: isDbReadonly() }
    );
  }
  if (authSeed?.ok && !authSeed.skipped) {
    logger.info('Usuário admin inicial provisionado', { username: process.env.SHARESCREEN_ADMIN_USER || 'admin' });
  }
  if (authSeed?.ok && (authSeed.imported || authSeed.updated)) {
    logger.info('Usuários do users.json sincronizados para login', {
      imported: authSeed.imported || 0,
      updated: authSeed.updated || 0,
      total: authSeed.total || 0
    });
  }
  debugSessionLog({
    runId: 'post-fix',
    hypothesisId: 'H3',
    location: 'main() startup',
    data: { clientCount: listAllClients().length, dataWritable: dataWritable.ok }
  });
  await pruneStaleRecordingStreams();
  prunePendingRecordingDownloads();
  const recordingCleanupTimer = setInterval(() => {
    pruneStaleRecordingStreams().catch((err) => {
      logger.warn('Falha ao limpar gravações em streaming obsoletas', { error: err.message });
    });
    prunePendingRecordingDownloads();
  }, 60 * 60 * 1000);
  recordingCleanupTimer.unref?.();
  await initMediasoup();
  logger.info('Debug session log (servidor + clientTrace)', { path: getAgentDebugLogPath() });

  const app = createApp();
  const tls = loadTlsOptions();

  const onListenError = (server, port, label) => (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(
        `Porta ${port} (${label}) já está em uso. Encerre a instância anterior:\n` +
          `  netstat -ano | findstr :${port}\n` +
          `  taskkill /PID <PID> /F\n` +
          'Ou altere httpsPort/httpPort em config/default.js'
      );
      closeMediasoup().finally(() => process.exit(1));
      return;
    }
    logger.error('Falha ao iniciar servidor', { error: err.message });
    process.exit(1);
  };

  if (tls) {
    const httpsServer = https.createServer(tls, app);
    httpsServer.on('error', onListenError(httpsServer, config.httpsPort, 'HTTPS'));
    attachSignaling(httpsServer);
    httpsServer.listen(config.httpsPort, '0.0.0.0', () => {
      logger.info('Servidor HTTPS ativo', {
        mode: config.dev ? 'DEV' : 'PROD',
        host: `https://${lanIp}:${config.httpsPort}`,
        hostPage: `https://${lanIp}:${config.httpsPort}/host`,
        clientPage: `https://${lanIp}:${config.httpsPort}/client`
      });
    });

    const httpRedirect = http.createServer((req, res) => {
      const host = req.headers.host?.split(':')[0] || lanIp;
      const port = config.httpsPort;
      res.writeHead(301, { Location: `https://${host}:${port}${req.url}` });
      res.end();
    });
    httpRedirect.on('error', onListenError(httpRedirect, config.httpPort, 'HTTP'));
    httpRedirect.listen(config.httpPort, '0.0.0.0', () => {
      logger.info(`Redirecionamento HTTP :${config.httpPort} → HTTPS :${config.httpsPort}`);
    });
  } else {
    const httpServer = http.createServer(app);
    httpServer.on('error', onListenError(httpServer, config.httpPort, 'HTTP'));
    attachSignaling(httpServer);
    httpServer.listen(config.httpPort, '0.0.0.0', () => {
      logger.warn('Servidor HTTP sem TLS — use apenas em localhost para captura de tela', {
        url: `http://127.0.0.1:${config.httpPort}`
      });
    });
  }

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('Encerrando servidor...', { signal });
    await closeMediasoup();
    process.exit(0);
  };
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
}

main().catch((err) => {
  logger.error('Falha ao iniciar', { error: err.message, stack: err.stack });
  process.exit(1);
});
