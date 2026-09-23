# ShareScreen LAN

Sistema web de compartilhamento de tela e microfone em rede local, com painel host, clients transmissores/espectadores e gravação.

## Ambiente DEV (este workspace)

- **Workspace:** `E:\Projetos\Trabalho\Screen Share`
- **Produção (não alterar):** `\\cgrafsysvm\Sistemas CGraf\Screen Share`

## Início rápido DEV

```cmd
npm install
npm run cert
npm run build
start-dev.bat
```

- Host: https://127.0.0.1:3443/host  
- Client: https://127.0.0.1:3443/client  
- Gravações DEV: `_dev_recordings/`

## Scripts

| Comando | Função |
|---------|--------|
| `npm run build` | Gera bundles a partir de `src/` |
| `npm run build:prod` | Build minificado (publicação futura) |
| `npm run check` | Valida sintaxe server + artefatos |
| `npm run test:smoke` | Smoke test (mesmo que check) |
| `start-dev.bat` | Servidor DEV (localhost) |
| `check-dev.bat` | Verificação manual |

## Testes

```cmd
npm run build
npm run build:prod
npm run check
npm run test:smoke
```

Testes manuais: [CHECKLIST-TESTES-MANUAIS.md](CHECKLIST-TESTES-MANUAIS.md)  
Relatório QA: [RELATORIO-QA-FINAL-DEV.md](RELATORIO-QA-FINAL-DEV.md)

## Arquitetura

- **Backend:** Node.js + Express + mediasoup SFU  
- **Sinalização:** WebSocket JSON em `/ws`  
- **Frontend:** `src/host`, `src/client`, módulos em `src/shared/`  
- **Mídia live:** WebRTC/RTP (não canvas, não HLS, não WS chunks)

## Documentação

- [DEV-MODERNIZACAO.md](DEV-MODERNIZACAO.md) — modernização DEV  
- [DEPLOY-INTERNET-DEV.md](DEPLOY-INTERNET-DEV.md) — preparação internet  
- [CHECKLIST-TESTES-MANUAIS.md](CHECKLIST-TESTES-MANUAIS.md)  
- [ROLLBACK-DEV.md](ROLLBACK-DEV.md)  
- [RELATORIO-QA-FINAL-DEV.md](RELATORIO-QA-FINAL-DEV.md) — auditoria QA final  
- [PLANO-DEV-MODERNIZACAO-SHARESCREEN.md](PLANO-DEV-MODERNIZACAO-SHARESCREEN.md)

## Variáveis de ambiente (DEV)

| Variável | Padrão em `start-dev.bat` |
|----------|---------------------------|
| `SHARESCREEN_DEV` | `1` |
| `SHARESCREEN_SERVER_HOST` | `127.0.0.1` |
| `ANNOUNCED_IP` | `127.0.0.1` |
| `SHARESCREEN_RECORDINGS_DIR` | `_dev_recordings/` |
| `SHARESCREEN_RECORDING_DOWNLOAD_TTL_HOURS` | `24` — remove gravações pendentes que não foram baixadas |
| `SHARESCREEN_ROOM_PIN` | opcional (descomente no bat) |
| `SHARESCREEN_CLIENT_ROOM_PIN` | PIN apenas para clientes/convidados; permite proteger o host no proxy |
| `SHARESCREEN_HOST_PIN` | PIN apenas para host; vazio quando o proxy já o protege |
| `SHARESCREEN_HOST_TOKEN` | opcional |
| `STUN_SERVERS` | `stun:stun.l.google.com:19302` |
| `TURN_SERVERS` | JSON array (vazio em LAN) |

## Portas

| Porta | Protocolo | Uso |
|-------|-----------|-----|
| 3443 | TCP/HTTPS | App + WSS |
| 3080 | TCP/HTTP | Redirect para HTTPS |
| 40000–40100 | UDP | WebRTC (mediasoup) |

## Publicação futura

1. `npm run build:prod`  
2. Configurar HTTPS, `ANNOUNCED_IP`, STUN/TURN — ver [DEPLOY-INTERNET-DEV.md](DEPLOY-INTERNET-DEV.md)  
3. Testes manuais completos  
4. Deploy em servidor separado — **não sobrescrever produção UNC**
