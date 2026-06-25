# Deploy Internet — Preparação DEV

Documentação para publicação futura (não deployada nesta etapa).

## Requisitos

| Item | Detalhe |
|------|---------|
| HTTPS | Obrigatório para `getDisplayMedia` fora de localhost |
| WSS | WebSocket seguro atrás de proxy |
| UDP 40000–40100 | mediasoup WebRTC — não passa por Nginx |
| TCP 3443 ou 443 | HTTP(S) + WSS |

## Variáveis de ambiente

| Variável | Uso |
|----------|-----|
| `PUBLIC_URL` | URL pública (ex. `https://meet.exemplo.gov.br`) |
| `ANNOUNCED_IP` | IP público ou IP interno anunciado no ICE |
| `SHARESCREEN_SERVER_HOST` | Host nas URLs do agente |
| `TRUST_PROXY` | `1` se atrás de Nginx/Load Balancer |
| `STUN_SERVERS` | `stun:stun.l.google.com:19302` (padrão) |
| `TURN_SERVERS` | JSON array para NAT restrito |
| `SHARESCREEN_ROOM_PIN` | PIN de sala |
| `SHARESCREEN_HOST_TOKEN` | Token fixo de host |
| `ALLOWED_ORIGINS` | Origens CORS permitidas (futuro) |

## Nginx (referência)

Ver `nginx/HTTPS-NGINX.md` e `nginx/https-sharescreen.conf`.

- `/host/` → Node `/host/`
- `/meet/` → Node `/client/`
- `/ws` → WebSocket upgrade

## TURN

Em internet real com NAT simétrico, **TURN é necessário** além de STUN. Configure `TURN_SERVERS` e repasse ao cliente via `videoQuality` (já exposto em `getVideoQualityForClients`).

## Segurança

- Use certificado confiável (mkcert na LAN, CA corporativa ou Let's Encrypt)
- Ative PIN em produção (`SHARESCREEN_ROOM_PIN`)
- Proteja `POST /api/gravacao` com token de host (`SHARESCREEN_HOST_TOKEN`)
- Rate limit no proxy para uploads
- **HTTPS obrigatório** fora de localhost para captura de tela/microfone

## Limitações conhecidas

- Após queda de WebSocket, o host deve clicar em "Compartilhar tela novamente" (evita popup sem consentimento)
- Drift A/V em gravações longas — limitação do MediaRecorder/navegador
- TURN necessário em NAT simétrico — STUN sozinho pode não bastar na internet
