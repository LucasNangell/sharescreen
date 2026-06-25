import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import express from 'express';
import { initMediasoup, closeMediasoup, getAnnouncedIp } from './mediasoup-manager.js';
import { attachSignaling } from './signaling.js';
import { logger } from './logger.js';
import { getLanIPv4 } from './network.js';
import config, { getServerHost } from '../config/default.js';
import { listAgentClients } from './agent-bridge.js';
import { saveRecording } from './recording-save.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const isDev = process.argv.includes('--dev');

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
  app.use(express.json());

  app.get('/api/info', (_req, res) => {
    res.json({
      lanIp: getAnnouncedIp(),
      httpsPort: config.httpsPort,
      maxClients: config.maxClients,
      rtcPorts: `${config.rtcMinPort}-${config.rtcMaxPort}`
    });
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
      const filename = req.headers['x-recording-filename'];
      const result = saveRecording(req.body, filename);
      if (!result.ok) {
        res.status(result.erro?.includes('inválido') ? 400 : 500).json(result);
        return;
      }
      res.json(result);
    }
  );

  app.get('/api/diagnostico', (_req, res) => {
    res.json({
      servidor: 'ShareScreen LAN SFU',
      versao: '1.0.0',
      ipLocal: getLanIPv4(),
      announcedIp: getAnnouncedIp(),
      mediasoup: true,
      codecPreferido: config.preferredVideoCodec,
      bitrateInicial: config.initialVideoBitrate,
      bitrateMaximo: config.maxVideoBitrate,
      fpsAlvo: config.targetFrameRate,
      capturaNativa: 'resizeMode none — resolução do monitor'
    });
  });

  app.use('/host', express.static(path.join(publicDir, 'host')));
  app.use('/client', express.static(path.join(publicDir, 'client')));
  app.use('/vendor', express.static(path.join(publicDir, 'vendor')));
  app.use('/shared', express.static(path.join(publicDir, 'shared')));

  app.get('/host', (_req, res) => {
    res.sendFile(path.join(publicDir, 'host', 'index.html'));
  });
  app.get('/client', (_req, res) => {
    res.sendFile(path.join(publicDir, 'client', 'index.html'));
  });
  app.get('/', (_req, res) => {
    res.redirect('/host');
  });

  return app;
}

async function main() {
  const lanIp = getLanIPv4();
  await initMediasoup();

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
