/**
 * Confirma build/servidor correto (DEV vs producao via nginx).
 */
export async function verifyServerBuild({ onToast, onTitlePrefix } = {}) {
  try {
    const info = await fetch('/api/info', { cache: 'no-store' }).then((r) => r.json());
    const env = info.dev ? 'DEV' : 'PROD';
    const proto = info.roomStateProtocol ? 'roomState' : 'legacy';
    const label = `${env} ${info.buildId} ${proto}`;
    onTitlePrefix?.(`[${label}] `);
    if (info.dev) {
      onToast?.(`Servidor DEV ativo (${info.buildId}, ${proto})`, 'info');
    } else if (!info.roomStateProtocol) {
      onToast?.(
        'Servidor PROD/legado — para testar mudancas use start-dev.bat neste PC (nao cgrafsysvm)',
        'warn'
      );
    }
    return info;
  } catch (e) {
    onToast?.('Nao foi possivel verificar /api/info do servidor', 'warn');
    return null;
  }
}
