import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { makeCacheGuardScript } from './cache-guard-snippet.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function copyBrandIcons() {
  const src = path.join(root, 'logo.png');
  const destDir = path.join(root, 'public/shared/icons');
  const dest = path.join(destDir, 'logo.png');
  if (!fs.existsSync(src)) {
    console.warn('logo.png ausente na raiz — favicon/PWA nao atualizado');
    return;
  }
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('Copiado logo.png para public/shared/icons/logo.png');
}

function copyAudioMlAssets() {
  const sharedDir = path.join(root, 'public/shared');
  const vadSrc = path.join(root, 'node_modules/@ricky0123/vad-web/dist');
  const vadDest = path.join(sharedDir, 'vad');
  const ortSrc = path.join(root, 'node_modules/onnxruntime-web/dist');
  const rnSrc = path.join(root, 'node_modules/@timephy/rnnoise-wasm/dist');
  const rnDest = path.join(sharedDir, 'rnnoise');

  fs.mkdirSync(sharedDir, { recursive: true });

  const vadFiles = [
    'vad.worklet.bundle.min.js',
    'silero_vad_legacy.onnx',
    'silero_vad_v5.onnx'
  ];
  fs.mkdirSync(vadDest, { recursive: true });
  for (const file of vadFiles) {
    const from = path.join(vadSrc, file);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(vadDest, file));
  }

  const ortFiles = fs
    .readdirSync(ortSrc)
    .filter((name) => name.startsWith('ort-wasm') && (name.endsWith('.wasm') || name.endsWith('.mjs')));
  for (const file of ortFiles) {
    fs.copyFileSync(path.join(ortSrc, file), path.join(vadDest, file));
  }

  copyDirRecursive(rnSrc, rnDest);
  console.log('Assets de audio ML copiados para public/shared/vad e public/shared/rnnoise');
}

async function bundleRnnoiseWorklet(isProd) {
  const source = path.join(
    root,
    'node_modules/@timephy/rnnoise-wasm/dist/NoiseSuppressorWorklet.js'
  );
  const destination = path.join(root, 'public/shared/rnnoise/NoiseSuppressorWorklet.js');
  if (!fs.existsSync(source)) {
    throw new Error(`Worklet RNNoise ausente: ${source}`);
  }

  await esbuild.build({
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome90', 'edge90', 'firefox90'],
    minify: isProd,
    sourcemap: !isProd,
    logLevel: 'info',
    entryPoints: [source],
    outfile: destination
  });
  console.log('Worklet RNNoise gerado como bundle autocontido');
}

const isProd = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';

const common = {
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome90', 'edge90', 'firefox90'],
  minify: isProd,
  sourcemap: !isProd,
  logLevel: 'info'
};

if (isProd) {
  console.log('Build de produção (minificado, sem sourcemap)');
}

await esbuild.build({
  ...common,
  entryPoints: [path.join(root, 'src/client/app.js')],
  outfile: path.join(root, 'public/client/app.bundle.js')
});

await esbuild.build({
  ...common,
  entryPoints: [path.join(root, 'src/host/app.js')],
  outfile: path.join(root, 'public/host/app.bundle.js')
});

await esbuild.build({
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['chrome90', 'edge90', 'firefox90'],
  minify: isProd,
  sourcemap: !isProd,
  logLevel: 'info',
  entryPoints: [path.join(root, 'src/shared/audio-ml-entry.js')],
  outfile: path.join(root, 'public/shared/audio-ml.bundle.js')
});

const workletsDir = path.join(root, 'public/shared/worklets');
fs.mkdirSync(workletsDir, { recursive: true });
await esbuild.build({
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['chrome90', 'edge90', 'firefox90'],
  minify: isProd,
  sourcemap: !isProd,
  logLevel: 'info',
  entryPoints: [path.join(root, 'src/shared/worklets/voice-gate-processor.js')],
  outfile: path.join(workletsDir, 'voice-gate-processor.js')
});
console.log('Worklet voice-gate-processor gerado em public/shared/worklets');

await esbuild.build({
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['chrome90', 'edge90', 'firefox90'],
  minify: isProd,
  sourcemap: !isProd,
  logLevel: 'info',
  entryPoints: [path.join(root, 'src/shared/worklets/click-guard-processor.js')],
  outfile: path.join(workletsDir, 'click-guard-processor.js')
});
console.log('Worklet click-guard-processor gerado em public/shared/worklets');

const buildId =
  new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) +
  '-' +
  Math.random().toString(36).slice(2, 8);

const sharedDir = path.join(root, 'public/shared');
fs.mkdirSync(sharedDir, { recursive: true });
fs.writeFileSync(
  path.join(sharedDir, 'build-id.json'),
  JSON.stringify({ buildId, builtAt: new Date().toISOString() }, null, 2),
  'utf8'
);

const hostCssPath = path.join(root, 'public/host/style.css');
const sharedCssPath = path.join(sharedDir, 'host-style.css');
if (fs.existsSync(hostCssPath)) {
  fs.copyFileSync(hostCssPath, sharedCssPath);
  console.log('Copiado host/style.css para shared/host-style.css');
}


const cacheGuardTag = `<script>${makeCacheGuardScript(buildId)}</script>`;
const cacheGuardRegex =
  /<script>\(function\(\)\{[\s\S]*?sharescreen_cache_reload[\s\S]*?\}\)\(\);<\/script>\s*/g;
const cacheGuardDiagRegex =
  /<script>\(function\(\)\{[\s\S]*?cache-guard-after-all-scripts[\s\S]*?\}\)\(\);<\/script>\s*/g;
const htmlPages = [
  path.join(root, 'public/host/index.html'),
  path.join(root, 'public/client/index.html')
];

function stripCacheGuardScripts(html) {
  let prev;
  do {
    prev = html;
    html = html.replace(cacheGuardRegex, '');
    html = html.replace(cacheGuardDiagRegex, '');
  } while (html !== prev);
  return html.replace(/(<!-- SHARESCREEN_CACHE_GUARD -->\s*)+/g, '<!-- SHARESCREEN_CACHE_GUARD -->\n');
}

for (const htmlPath of htmlPages) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = stripCacheGuardScripts(html);
  if (!html.includes('<!-- SHARESCREEN_CACHE_GUARD -->')) {
    html = html.replace(
      /<meta http-equiv="Expires" content="0" \/>\s*/i,
      '$&\n  <!-- SHARESCREEN_CACHE_GUARD -->\n'
    );
  }
  html = html.replace(/<!-- SHARESCREEN_CACHE_GUARD -->/g, cacheGuardTag);
  html = html.replace(/\?v=[^"'\s>]+/g, '?v=__BUILD_ID__');
  html = html.replace(/__BUILD_ID__/g, buildId);
  fs.writeFileSync(htmlPath, html, 'utf8');
}

console.log('Bundles gerados: public/client e public/host');
copyBrandIcons();
copyAudioMlAssets();
await bundleRnnoiseWorklet(isProd);
console.log(`Build ID: ${buildId}`);
