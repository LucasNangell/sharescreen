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
import { validateRecordingUpload, createViewerLinkToken } from './auth-dev.js';
import {
  lookupClientByIp,
  registerClientByName,
  getLowerThirdForDisplayName,
  saveLowerThird,
  getLowerThirdsDir,
  listAllClients,
  upsertClient,
  updateClientIp,
  seedUsersFromJsonFile,
  seedUsersIfEmpty,
  verifyDataDirWritable
} from './client-db.js';
import { getClientIpFromRequest } from './client-ip.js';
import { debugSessionLog } from './debug-session-log.js';
import { resolveComputerIp } from './user-resolve.js';
import { room, getAgentDebugLogPath } from './room-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const isDev = process.argv.includes('--dev');
const CLIENT_IP_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
let clientIpSyncRunning = false;

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
  if (name.endsWith('.css') || name.endsWith('.js')) {
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
    const users = listAllClients();
    const results = [];
    for (const user of users) {
      if (!user.computerName) {
        results.push({ name: user.name, ok: false, erro: 'Sem computer name' });
        continue;
      }
      const resolved = await resolveComputerIp(user.computerName);
      if (!resolved.ok) {
        results.push({ name: user.name, computerName: user.computerName, ...resolved });
        continue;
      }
      if (resolved.ip !== user.ip) {
        updateClientIp(user.name, resolved.ip);
      }
      results.push({
        name: user.name,
        computerName: user.computerName,
        ok: true,
        ip: resolved.ip,
        previousIp: user.ip,
        changed: resolved.ip !== user.ip,
        method: resolved.method
      });
    }
    res.json({ ok: true, results, users: listAllClients() });
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
      room.refreshTransmissionIfSelected(clientName);
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

function writeJsonAscii(filePath, data) {
  const json = `${JSON.stringify(data, null, 2)}\n`.replace(/[^\x00-\x7F]/g, (char) =>
    `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`
  );
  fs.writeFileSync(filePath, json, 'utf8');
}

function updateUsersJsonIp(usersJsonPath, computerName, ip) {
  try {
    if (!fs.existsSync(usersJsonPath)) return false;
    const data = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
    const users = Array.isArray(data.users) ? data.users : [];
    const computer = String(computerName || '').trim().toUpperCase();
    let changed = false;
    for (const user of users) {
      const currentComputer = String(user.computer_name || user.computerName || '').trim().toUpperCase();
      if (currentComputer === computer && user.ip !== ip) {
        user.ip = ip;
        changed = true;
      }
    }
    if (changed) writeJsonAscii(usersJsonPath, data);
    return changed;
  } catch (err) {
    logger.warn('Nao foi possivel atualizar users.json no startup', {
      computerName,
      ip,
      erro: err.message
    });
    return false;
  }
}

async function syncClientIps(usersJsonPath, reason = 'manual') {
  const users = listAllClients().filter((user) => user.computerName);
  if (!users.length) return { checked: 0, changed: 0, failed: 0 };

  let changed = 0;
  let failed = 0;
  for (const user of users) {
    const resolved = await resolveComputerIp(user.computerName);
    if (!resolved.ok) {
      failed += 1;
      logger.warn('Nao foi possivel atualizar IP do client', {
        reason,
        name: user.name,
        computerName: user.computerName,
        erro: resolved.erro
      });
      continue;
    }
    if (resolved.ip === user.ip) continue;

    const dbResult = updateClientIp(user.name, resolved.ip);
    const jsonChanged = updateUsersJsonIp(usersJsonPath, user.computerName, resolved.ip);
    changed += 1;
    logger.info('IP do client atualizado', {
      reason,
      name: user.name,
      computerName: user.computerName,
      previousIp: user.ip,
      ip: resolved.ip,
      method: resolved.method,
      database: dbResult.ok,
      usersJson: jsonChanged
    });
  }

  return { checked: users.length, changed, failed };
}

async function runClientIpSync(usersJsonPath, reason = 'manual') {
  if (clientIpSyncRunning) {
    logger.warn('Verificacao de IPs dos clients ignorada porque outra execucao esta em andamento', { reason });
    return { skipped: true };
  }
  clientIpSyncRunning = true;
  try {
    const result = await syncClientIps(usersJsonPath, reason);
    logger.info('Verificacao de IPs dos clients concluida', { reason, ...result });
    return result;
  } catch (err) {
    logger.error('Falha na verificacao de IPs dos clients', { reason, error: err.message });
    return { ok: false, error: err.message };
  } finally {
    clientIpSyncRunning = false;
  }
}

function scheduleClientIpSync(usersJsonPath) {
  const timer = setInterval(() => {
    runClientIpSync(usersJsonPath, 'periodic').catch((err) => {
      logger.error('Falha inesperada no agendamento de IPs dos clients', { error: err.message });
    });
  }, CLIENT_IP_SYNC_INTERVAL_MS);
  timer.unref?.();
  logger.info('Verificacao periodica de IPs dos clients agendada', { intervalHours: 24 });
  return timer;
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

  app.post(
    '/api/lower-third',
    express.raw({ type: ['video/webm', 'application/octet-stream'], limit: '256mb' }),
    (req, res) => {
      applyNoStoreHeaders(res);
      if (!validateRecordingUpload(req)) {
        res.status(403).json({ ok: false, erro: 'Token de host inválido' });
        return;
      }
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
      room.refreshTransmissionIfSelected(clientName);
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
      roomPinRequired: !!(config.roomPin || '').trim(),
      dev: !!config.dev,
      publicUrl: config.publicUrl || null,
      publicClientPath: (config.publicUrl || '').trim() ? '/meet/' : '/client/',
      buildId: appBuildId,
      turnEnabled: getVideoQualityForClients().turnEnabled
    });
  });

  app.post('/api/link-externo', (req, res) => {
    if (!validateRecordingUpload(req)) {
      res.status(403).json({ ok: false, erro: 'Token de host inválido' });
      return;
    }
    const nome = String(req.body?.nome || '').trim();
    if (!nome || nome.length > 64) {
      res.status(400).json({ ok: false, erro: 'Informe o nome do convidado (máx. 64 caracteres)' });
      return;
    }
    const { token, expiresInMs } = createViewerLinkToken();
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

  app.post('/api/browse-dir', (req, res) => {
    if (!validateRecordingUpload(req)) {
      res.status(403).json({ ok: false, erro: 'Não autorizado' });
      return;
    }
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
    express.raw({ type: 'application/octet-stream', limit: '4gb' }),
    (req, res) => {
      if (!validateRecordingUpload(req)) {
        res.status(403).json({ ok: false, erro: 'Token de host inválido' });
        return;
      }
      const filename = req.headers['x-recording-filename'];
      const customDir = req.headers['x-recording-dir'];
      const result = saveRecording(req.body, filename, customDir);
      if (!result.ok) {
        res.status(result.erro?.includes('inválido') ? 400 : 500).json(result);
        return;
      }
      res.json(result);
    }
  );

  app.post(
    '/api/gravacao/chunk',
    express.raw({ type: 'application/octet-stream', limit: '32mb' }),
    (req, res) => {
      if (!validateRecordingUpload(req)) {
        res.status(403).json({ ok: false, erro: 'Token de host inválido' });
        return;
      }
      pruneOldUploads();
      const uploadId = req.headers['x-upload-id'];
      const chunkIndex = req.headers['x-chunk-index'];
      const chunkTotal = req.headers['x-chunk-total'];
      const result = saveChunk(uploadId, chunkIndex, chunkTotal, req.body);
      res.status(result.ok ? 200 : 400).json(result);
    }
  );

  app.post('/api/gravacao/complete', (req, res) => {
    if (!validateRecordingUpload(req)) {
      res.status(403).json({ ok: false, erro: 'Token de host inválido' });
      return;
    }
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
    res.json(result);
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
  seedUsersIfEmpty(usersJsonPath);
  await runClientIpSync(usersJsonPath, 'startup');
  scheduleClientIpSync(usersJsonPath);
  const dataWritable = verifyDataDirWritable();
  if (!dataWritable.ok) {
    logger.error(
      'AVISO: data/ sem permissão de escrita — cadastro/IP/LT não serão salvos. Rode fix-data-permissoes.bat no servidor.',
      dataWritable
    );
  }
  debugSessionLog({
    runId: 'post-fix',
    hypothesisId: 'H3',
    location: 'main() startup',
    data: { clientCount: listAllClients().length, dataWritable: dataWritable.ok }
  });
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

  process.on('SIGINT', async () => {
    logger.info('Encerrando servidor...');
    await closeMediasoup();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error('Falha ao iniciar', { error: err.message, stack: err.stack });
  process.exit(1);
});
