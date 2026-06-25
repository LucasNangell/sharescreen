# ShareScreen — rotas obrigatórias no Caddy (antes do `/api` do Controle OBS)

Proxy: `https://127.0.0.1:3443` (start-producao.bat)

Headers obrigatórios em **todas** as rotas ShareScreen:
- `X-Real-IP: {remote_host}`
- `X-Forwarded-For: {remote_host}` ← necessário para auto-preenchimento de nome por IP (TRUST_PROXY=1)
- `X-Forwarded-Proto`, `X-Forwarded-Host`

## Rede interna (cgrafsysvm.redecamara.camara.gov.br)

| Rota | Destino Node | Notas |
|------|--------------|-------|
| `/host/*` | `/host/*` | Painel host |
| `/meet/*` | `/client/*` | `uri replace /meet /client` (equiv. nginx `proxy_pass .../client/`) |
| `/shared/*` | `/shared/*` | CSS/JS compartilhados |
| `/vendor/*` | `/vendor/*` | mediasoup-client |
| `/ws` | `/ws` | WebSocket (timeout 86400s) |
| `/api/gravacao*` | `/api/gravacao*` | body até 4GB |
| `/api/link-externo` | `/api/link-externo` | + header `X-Host-Token` |
| `/api/info` | `/api/info` | |
| `/api/registro-cliente` | `/api/registro-cliente` | **Antes do catch-all `/api` OBS** |
| `/api/lower-third*` | `/api/lower-third*` | body até 256MB |
| `/lt-videos/*` | `/lt-videos/*` | Vídeos Lower Third |

Ordem: rotas ShareScreen **antes** de `handle /api/*` → Controle OBS (4040).

## Internet (cgrafsysvm.camara.leg.br)

- `/host`, `/client` → 404
- `/meet/*` → só com `?token=`
- `/shared/*`, `/vendor/*`, `/ws`, `/api/info`, `/lt-videos/*`
- Demais `/api/*` → 404 (OBS bloqueado)

## Problemas corrigidos nesta migração

1. Nome não preenchia por IP → faltava `/api/registro-cliente` no proxy + `X-Forwarded-For`
2. Lower Third não aparecia → faltava `/lt-videos/` no proxy
3. SQLite readonly → `fix-data-permissoes.bat` no servidor (não é rota Caddy)
