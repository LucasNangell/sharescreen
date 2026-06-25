const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const current = LEVELS[process.env.LOG_LEVEL || 'info'] ?? LEVELS.info;

function stamp() {
  return new Date().toISOString();
}

export function log(level, message, meta) {
  if ((LEVELS[level] ?? 99) < current) return;
  const prefix = `[${stamp()}] [${level.toUpperCase()}]`;
  if (meta !== undefined) {
    console.log(prefix, message, meta);
  } else {
    console.log(prefix, message);
  }
}

export const logger = {
  debug: (m, meta) => log('debug', m, meta),
  info: (m, meta) => log('info', m, meta),
  warn: (m, meta) => log('warn', m, meta),
  error: (m, meta) => log('error', m, meta)
};
