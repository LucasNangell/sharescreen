import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import config, { getServerHost } from '../config/default.js';
import { logger } from './logger.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const enqueueScript = path.join(rootDir, 'scripts', 'agent_enqueue.py');
const listScript = path.join(rootDir, 'scripts', 'agent_list.py');

/**
 * Comando JSON para auxiliar_agent.py — abre Chrome na URL do client.
 */
export function buildShareScreenCommand({
  clientName,
  serverHost,
  serverPort,
  screenIndex = 0,
  chromePath
}) {
  return JSON.stringify(
    {
      sharescreen: true,
      engine: 'chrome',
      host: serverHost,
      port: serverPort,
      nome: clientName,
      tela: screenIndex,
      chromePath: chromePath || config.agent?.chromePath || ''
    },
    null,
    0
  );
}

export function resolveTargetHostname(peer, explicitHostname) {
  if (explicitHostname?.trim()) {
    return explicitHostname.trim().toUpperCase();
  }
  if (peer?.agentHostname?.trim()) {
    return peer.agentHostname.trim().toUpperCase();
  }
  return '';
}

export async function enqueueAgentCommand(targetHostname, content) {
  const dbPath = config.agent?.dbPath;
  if (!dbPath) {
    return { ok: false, erro: 'Banco do auxiliar_agent não configurado (config.agent.dbPath)' };
  }
  if (!fs.existsSync(dbPath)) {
    return { ok: false, erro: `Banco não encontrado: ${dbPath}` };
  }
  if (!targetHostname) {
    return { ok: false, erro: 'Hostname do PC alvo não informado' };
  }

  const tmpFile = path.join(os.tmpdir(), `sharescreen_cmd_${Date.now()}.txt`);
  try {
    fs.writeFileSync(tmpFile, content, 'utf8');
    const python = config.agent?.pythonPath || 'python';
    await execFileAsync(python, [enqueueScript, dbPath, targetHostname, tmpFile], {
      timeout: 15000,
      windowsHide: true
    });
    logger.info('Comando Chrome enfileirado', { targetHostname, server: getServerHost() });
    return { ok: true, hostname: targetHostname };
  } catch (err) {
    logger.error('Falha ao enfileirar comando', { error: err.message });
    return { ok: false, erro: err.message || 'Falha ao gravar comando no SQLite' };
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch (_) {}
  }
}

export async function listAgentClients() {
  const dbPath = config.agent?.dbPath;
  if (!dbPath || !fs.existsSync(dbPath)) {
    return { ok: false, erro: 'Banco do agente indisponível', agentes: [] };
  }
  const maxAge = config.agent?.onlineMaxAgeSeconds ?? 20;
  const python = config.agent?.pythonPath || 'python';
  try {
    const { stdout } = await execFileAsync(python, [listScript, dbPath, String(maxAge)], {
      timeout: 15000,
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024
    });
    const data = JSON.parse(stdout.trim());
    if (data.erro) {
      return { ok: false, erro: data.erro, agentes: [] };
    }
    return { ok: true, agentes: data.agentes || [] };
  } catch (err) {
    logger.warn('Falha ao listar agentes', { error: err.message });
    return { ok: false, erro: err.message, agentes: [] };
  }
}

export async function dispatchOpenClient(peer, options = {}) {
  const hostname = resolveTargetHostname(peer, options.hostname);
  const clientName =
    options.clientName || peer?.displayName || hostname || 'Client';
  if (!hostname) {
    return {
      ok: false,
      erro:
        'Informe o hostname Windows (?maquina=HOSTNAME na URL do client ou cadastro no peer)'
    };
  }

  const serverHost = options.serverHost || getServerHost();
  const serverPort = options.serverPort || config.httpsPort;
  const content = buildShareScreenCommand({
    clientName,
    serverHost,
    serverPort,
    screenIndex: options.screenIndex ?? config.agent?.screenIndex ?? 0,
    chromePath: options.chromePath
  });

  return enqueueAgentCommand(hostname, content);
}
