/** Logs de debug da sessao 20cf0e — browser → servidor via POST /api/client-debug */
export function debugClientSessionLog(hypothesisId, location, message, data = {}) {
  // #region agent log
  fetch('/api/client-debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hypothesisId, location, message, data })
  }).catch(() => {});
  // #endregion
}