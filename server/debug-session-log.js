import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const logPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'debug-20cf0e.log');
const ring = [];
const RING_MAX = 200;

function writeEntry(entry) {
  ring.push(entry);
  if (ring.length > RING_MAX) ring.shift();
  try {
    fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`);
  } catch (_) {}
}

/** Aceita (hypothesisId, location, message, data) ou ({ hypothesisId, location, message?, data?, runId? }). */
export function debugSessionLog(hypothesisIdOrEntry, location, message, data = {}) {
  let entry;
  if (typeof hypothesisIdOrEntry === 'object' && hypothesisIdOrEntry !== null) {
    const o = hypothesisIdOrEntry;
    entry = {
      sessionId: '20cf0e',
      hypothesisId: o.hypothesisId,
      location: o.location,
      message: o.message || o.location,
      data: o.data || {},
      runId: o.runId,
      timestamp: Date.now()
    };
  } else {
    entry = {
      sessionId: '20cf0e',
      hypothesisId: hypothesisIdOrEntry,
      location,
      message,
      data,
      timestamp: Date.now()
    };
  }
  writeEntry(entry);
}

export function getDebugSessionRing() {
  return [...ring];
}
