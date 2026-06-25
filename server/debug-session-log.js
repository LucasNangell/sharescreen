import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/default.js';

const logPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'debug-780e75.log');

export function debugSessionLog(payload) {
  if (config.dev) return;
  const line = JSON.stringify({
    sessionId: '780e75',
    timestamp: Date.now(),
    ...payload
  });
  try {
    fs.appendFileSync(logPath, `${line}\n`, 'utf8');
  } catch (_) {}
}
