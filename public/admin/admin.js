const $ = (id) => document.getElementById(id);

function setStatus(msg, isError = false) {
  const el = $('admin-status');
  if (!el) return;
  el.textContent = msg || '';
  el.className = isError ? 'status-err' : '';
}

async function api(path, options = {}) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
  return data;
}

function rowTemplate(user = {}) {
  const tr = document.createElement('tr');
  tr.dataset.name = user.name || '';
  tr.innerHTML = `
    <td class="field-inline"><input type="text" class="inp-name" value="${esc(user.name || '')}" maxlength="64" /></td>
    <td class="field-inline"><input type="text" class="inp-computer" value="${esc(user.computerName || '')}" maxlength="64" /></td>
    <td class="field-inline"><input type="text" class="inp-ip" value="${esc(user.ip || '')}" /></td>
    <td class="lt-cell">
      <input type="file" class="inp-lt" accept=".webm,video/webm" />
      <span class="lt-hint">${user.lowerThird ? '✓ configurado' : '—'}</span>
    </td>
    <td><button type="button" class="btn btn-primary btn-sm btn-save">Salvar</button></td>
  `;
  tr.querySelector('.btn-save').addEventListener('click', () => saveRow(tr));
  return tr;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

async function saveRow(tr) {
  const name = tr.querySelector('.inp-name')?.value.trim();
  const computerName = tr.querySelector('.inp-computer')?.value.trim();
  const ip = tr.querySelector('.inp-ip')?.value.trim();
  const file = tr.querySelector('.inp-lt')?.files?.[0];

  if (!name || !ip) {
    setStatus('Nome e IP são obrigatórios', true);
    return;
  }

  try {
    setStatus(`Salvando ${name}…`);
    await api('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ip, computerName })
    });

    if (file) {
      const buf = await file.arrayBuffer();
      const ltRes = await fetch('/api/admin/lower-third', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-LT-Client-Name': name,
          'X-LT-Width': '640',
          'X-LT-Height': '360',
          'X-LT-Orig-Width': '1920',
          'X-LT-Orig-Height': '1080',
          'X-LT-Chroma-Color': '#00FF00',
          'X-LT-Chroma-Tolerance': '40'
        },
        body: buf
      });
      const ltData = await ltRes.json().catch(() => ({}));
      if (!ltRes.ok) throw new Error(ltData.erro || 'Falha ao salvar LT');
      tr.querySelector('.lt-hint').textContent = '✓ configurado';
      tr.querySelector('.inp-lt').value = '';
    }

    tr.dataset.name = name;
    setStatus(`${name} salvo com sucesso`);
  } catch (e) {
    setStatus(e.message || 'Erro ao salvar', true);
  }
}

async function loadUsers() {
  const data = await api('/api/admin/users');
  const body = $('users-body');
  body.innerHTML = '';
  for (const u of data.users || []) {
    body.appendChild(rowTemplate(u));
  }
  setStatus(`${(data.users || []).length} usuário(s) carregado(s)`);
}

$('btn-reload')?.addEventListener('click', () => loadUsers().catch((e) => setStatus(e.message, true)));
$('btn-seed')?.addEventListener('click', async () => {
  try {
    const r = await api('/api/admin/seed', { method: 'POST' });
    setStatus(`Importados ${r.imported || 0} usuário(s) de users.json`);
    await loadUsers();
  } catch (e) {
    setStatus(e.message, true);
  }
});
$('btn-resolve')?.addEventListener('click', async () => {
  try {
    setStatus('Resolvendo IPs via ping…');
    const r = await api('/api/admin/users/resolve-ips', { method: 'POST' });
    const changed = (r.results || []).filter((x) => x.changed).length;
    setStatus(`Ping concluído — ${changed} IP(s) atualizado(s)`);
    await loadUsers();
  } catch (e) {
    setStatus(e.message, true);
  }
});
$('btn-add')?.addEventListener('click', () => {
  $('users-body')?.prepend(rowTemplate({}));
});

loadUsers().catch((e) => setStatus(e.message, true));
