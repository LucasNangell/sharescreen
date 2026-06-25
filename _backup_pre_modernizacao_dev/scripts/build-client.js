import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

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

console.log('Bundles gerados: public/client e public/host');
