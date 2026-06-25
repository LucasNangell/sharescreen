/**
 * Gera certificado autoassinado para HTTPS na LAN.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import selfsigned from 'selfsigned';
import config from '../config/default.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const certDir = path.join(root, 'certs');

function getLanIp() {
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    for (const i of list || []) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return '127.0.0.1';
}

function generateWithSelfsigned(lanIp) {
  const attrs = [{ name: 'commonName', value: 'ShareScreen-LAN' }];
  const pems = selfsigned.generate(attrs, {
    keySize: 2048,
    days: 825,
    algorithm: 'sha256',
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: lanIp }
        ]
      }
    ]
  });
  fs.writeFileSync(path.join(certDir, 'server.key'), pems.private);
  fs.writeFileSync(path.join(certDir, 'server.crt'), pems.cert);
}

function generateWithOpenSSL(lanIp) {
  const keyPath = path.join(certDir, 'server.key');
  const crtPath = path.join(certDir, 'server.crt');
  const san = `IP:127.0.0.1,IP:${lanIp},DNS:localhost`;
  execSync(
    `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${crtPath}" -days 825 -nodes -subj "/CN=ShareScreen-LAN" -addext "subjectAltName=${san}"`,
    { stdio: 'inherit', shell: true }
  );
}

if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

const lanIp = process.env.CERT_IP || config.serverHost || getLanIp();
let method = 'selfsigned';

try {
  execSync('openssl version', { stdio: 'ignore' });
  generateWithOpenSSL(lanIp);
  method = 'OpenSSL';
} catch {
  generateWithSelfsigned(lanIp);
}

console.log('\nCertificado gerado em certs/');
console.log(`  Método: ${method}`);
console.log(`  IP no SAN: ${lanIp}`);
console.log(`\n  Host:   https://${lanIp}:3443/host`);
console.log(`  Client: https://${lanIp}:3443/client\n`);
