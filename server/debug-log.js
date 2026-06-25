import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, '..', 'debug-67508d.log');
const SESSION_ID = '67508d';

export function debugLog(hypothesisId, location, message, data = {}, runId = 'pre-fix') {
  // #region agent log
  try {
    const line =
      JSON.stringify({
        sessionId: SESSION_ID,
        hypothesisId,
        location,
        message,
        data,
        timestamp: Date.now(),
        runId
      }) + '\n';
    fs.appendFileSync(LOG_PATH, line, 'utf8');
  } catch (_) {}
  // #endregion
}
