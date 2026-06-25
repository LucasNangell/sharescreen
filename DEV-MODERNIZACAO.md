# DEV — Modernização ShareScreen

## O que foi feito

- Frontend editável em `src/` com módulos compartilhados
- UI profissional host/client (design system em `public/shared/`)
- Reconnect WebSocket com exponential backoff
- Tratamento de erros (`error-manager.js`) + toasts
- Gravação robusta com chunks para arquivos grandes
- Modo espectador no client
- PIN opcional via `SHARESCREEN_ROOM_PIN`
- Endpoints `/api/health`, gravação chunked
- Preservação do core mediasoup/WebRTC

## Estrutura `src/shared/`

| Módulo | Função |
|--------|--------|
| `signaling-client.js` | WebSocket robusto |
| `media-client.js` | mediasoup-client SFU |
| `error-manager.js` | Erros classificados |
| `quality-manager.js` | Presets de qualidade |
| `audio-manager.js` | Mic, mixagem, VU meter |
| `recording-client.js` | MediaRecorder + upload |
| `ui-state.js` | Estados de UI |
| `stats-collector.js` | getStats |
| `toast.js` | Notificações |
| `transmission.js` | Normalização WS |

## Variáveis DEV (`start-dev.bat`)

| Variável | Valor DEV |
|----------|-----------|
| `SHARESCREEN_DEV` | `1` |
| `SHARESCREEN_SERVER_HOST` | `127.0.0.1` |
| `ANNOUNCED_IP` | `127.0.0.1` |
| `SHARESCREEN_RECORDINGS_DIR` | `_dev_recordings/` |
| `SHARESCREEN_ROOM_PIN` | opcional |

## O que NÃO fazer

- Não rodar `start-producao.bat` neste workspace para testes
- Não gravar na UNC de produção
- Não alterar `\\cgrafsysvm\...`

## Auditoria QA (16/06/2026)

Correções pós-modernização documentadas em [RELATORIO-QA-FINAL-DEV.md](RELATORIO-QA-FINAL-DEV.md):

- Overlay de preview ao selecionar fonte
- Controles de áudio no host
- Reconnect sem popup forçado de tela
- VU meter no client
- Métricas de bitrate no diagnóstico
- Histórico de erros no painel técnico

## Próximos passos sugeridos

1. Testes manuais conforme checklist (30 itens)
2. Ajuste fino de presets de qualidade após medição real
3. Deploy via pacote separado após validação
