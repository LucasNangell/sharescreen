import { execFile } from 'child_process';
import { promisify } from 'util';
import dns from 'dns';

const execFileAsync = promisify(execFile);
const dnsLookup = promisify(dns.lookup);

const IP_RE = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/;

function pickIpFromPingOutput(stdout) {
  const text = String(stdout || '');
  const reply =
    /(?:Reply from|Resposta de)\s+(\d{1,3}(?:\.\d{1,3}){3})/i.exec(text) ||
    /(?:from|de)\s+\[?(\d{1,3}(?:\.\d{1,3}){3})\]?/i.exec(text);
  if (reply) return reply[1];
  const all = text.match(new RegExp(IP_RE.source, 'g')) || [];
  return all.find((ip) => !ip.startsWith('127.') && !ip.startsWith('0.')) || null;
}

export async function resolveComputerIp(computerName) {
  const host = String(computerName || '').trim();
  if (!host) return { ok: false, erro: 'Computer name inválido' };

  try {
    const { stdout } = await execFileAsync('ping', ['-n', '1', '-w', '1500', host], {
      windowsHide: true,
      timeout: 5000
    });
    const ip = pickIpFromPingOutput(stdout);
    if (ip) return { ok: true, ip, method: 'ping' };
  } catch (err) {
    const ip = pickIpFromPingOutput(err.stdout || err.stderr || '');
    if (ip) return { ok: true, ip, method: 'ping' };
  }

  try {
    const result = await dnsLookup(host, { family: 4 });
    if (result?.address) return { ok: true, ip: result.address, method: 'dns' };
  } catch (_) {}

  return { ok: false, erro: `Não foi possível resolver ${host}` };
}
