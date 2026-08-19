import https from 'https';

const agent = new https.Agent({ rejectUnauthorized: false });

function request(path, { method = 'GET', body, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: '127.0.0.1',
        port: 3443,
        path,
        method,
        agent,
        headers: {
          'Content-Type': 'application/json',
          ...(cookie ? { Cookie: cookie } : {})
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const login = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username: 'admin' })
});
const cookie = (login.headers['set-cookie'] || [])[0]?.split(';')[0] || '';
const me = await request('/api/auth/me', { cookie });
const bad = await request('/api/user-settings');

console.log('login', login.status, login.body);
console.log('me', me.status, me.body);
console.log('protected-without-auth', bad.status, bad.body);
