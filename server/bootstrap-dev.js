/**
 * Deve ser o primeiro import de server/index.js — define env antes de config/mediasoup.
 */
if (process.argv.includes('--dev')) {
  process.env.SHARESCREEN_DEV ??= '1';
  process.env.SHARESCREEN_SERVER_HOST ??= '127.0.0.1';
  process.env.SHARESCREEN_ICE_LOCALHOST ??= '1';
}
