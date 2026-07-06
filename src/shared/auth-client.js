const FETCH_OPTS = { credentials: 'same-origin' };

async function parseJsonResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  const text = (await res.text()).trim();
  if (text.startsWith('<')) {
    throw new Error(
      'Servidor retornou HTML em vez de JSON. Verifique se o proxy nginx encaminha /api/auth/* para o Node.'
    );
  }
  throw new Error(text || `Resposta inválida do servidor (${res.status})`);
}

export function authDisplayName(user) {
  if (!user) return '';
  return String(user.displayName || user.username || '').trim();
}

export async function fetchCurrentUser() {
  try {
    const res = await fetch('/api/auth/me', FETCH_OPTS);
    const data = await parseJsonResponse(res);
    if (!data.ok) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function login(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...FETCH_OPTS,
    body: JSON.stringify({ username, password })
  });
  return parseJsonResponse(res);
}

export async function logout() {
  const res = await fetch('/api/auth/logout', { method: 'POST', ...FETCH_OPTS });
  return parseJsonResponse(res);
}

export function ensureLoginModalElements(ids = {}) {
  const modal = document.getElementById(ids.modal || 'login-modal');
  const usernameInput = document.getElementById(ids.username || 'login-username');
  const passwordInput = document.getElementById(ids.password || 'login-password');
  const submitBtn = document.getElementById(ids.submit || 'btn-login-submit');
  const errorEl = document.getElementById(ids.error || 'login-error');
  return { modal, usernameInput, passwordInput, submitBtn, errorEl };
}

export async function requireAuthSession(options = {}) {
  const { modal, usernameInput, passwordInput, submitBtn, errorEl } = ensureLoginModalElements(
    options.ids || {}
  );
  if (!modal || !usernameInput || !passwordInput || !submitBtn) {
    throw new Error('Tela de login indisponível');
  }

  const existing = await fetchCurrentUser();
  if (existing) {
    modal.hidden = true;
    options.onAuthenticated?.(existing);
    return existing;
  }

  options.onLoginRequired?.();

  return new Promise((resolve, reject) => {
    const showError = (message) => {
      if (errorEl) {
        errorEl.textContent = message || '';
        errorEl.hidden = !message;
      }
    };

    const cleanup = () => {
      submitBtn.removeEventListener('click', onSubmit);
      usernameInput.removeEventListener('keydown', onKeydown);
      passwordInput.removeEventListener('keydown', onKeydown);
    };

    const onSubmit = async () => {
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      if (!username || !password) {
        showError('Informe usuário e senha');
        return;
      }
      submitBtn.disabled = true;
      showError('');
      try {
        const result = await login(username, password);
        if (!result.ok) {
          showError(result.erro || 'Falha no login');
          return;
        }
        modal.hidden = true;
        cleanup();
        options.onAuthenticated?.(result.user);
        resolve(result.user);
      } catch (err) {
        showError(err.message || 'Falha no login');
      } finally {
        submitBtn.disabled = false;
      }
    };

    const onKeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSubmit();
      }
    };

    modal.hidden = false;
    usernameInput.focus();
    submitBtn.addEventListener('click', onSubmit);
    usernameInput.addEventListener('keydown', onKeydown);
    passwordInput.addEventListener('keydown', onKeydown);
  });
}

export async function logoutAndReload() {
  try {
    await logout();
  } catch (_) {}
  location.reload();
}

export function bindLogoutControl({ wrapEl, labelEl, buttonEl, user, onLogout }) {
  const show = !!user;
  if (wrapEl) wrapEl.hidden = !show;
  if (!show) return;
  if (labelEl) labelEl.textContent = `Conectado como ${authDisplayName(user)}`;
  if (buttonEl && !buttonEl.dataset.bound) {
    buttonEl.dataset.bound = '1';
    buttonEl.addEventListener('click', () => (onLogout || logoutAndReload)());
  }
}
