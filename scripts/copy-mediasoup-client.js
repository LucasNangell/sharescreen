/**
 * Copia metadados do mediasoup-client (bundle feito via esbuild no build).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vendor = path.join(__dirname, '..', 'public', 'vendor');
if (!fs.existsSync(vendor)) fs.mkdirSync(vendor, { recursive: true });
console.log('Dependências prontas. Execute: npm run build');
