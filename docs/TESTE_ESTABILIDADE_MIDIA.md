# Testes de estabilidade de midia (DEV)

Execute no ambiente de desenvolvimento antes de qualquer deploy para producao.

## Pre-requisitos

- Servidor DEV rodando (`npm start` ou equivalente)
- Host aberto em `/host/`
- Pelo menos um client em `/client/` (LAN) e opcionalmente viewer externo com token

## Matriz de aceitacao

| # | Cenario | Passos | Criterio de sucesso |
|---|---------|--------|---------------------|
| 1 | Client LAN publica | Auto-nome, captura tela, mic ON ou OFF, confirmar | Host ve fonte **disponivel** em menos de 3s apos publish, sem co-host |
| 2 | Late-join | Host ja transmitindo; client entra depois | Client ve video remoto; ao publicar, host ve nova fonte |
| 3 | Mic ON, system OFF | Client publica so microfone | Host ouve voz; sem eco |
| 4 | System ON, mic OFF | Client publica so audio do sistema | Host ouve desktop; sem mic |
| 5 | Mic + system ON | Ambos ativos no client | Host monitora **so mic** por padrao (sem eco) |
| 6 | 15 clients (simulado) | Abrir multiplas abas/clients ate 15 | Lista responsiva; server estavel |
| 7 | Sem refresh do host | Repetir cenarios 1-5 | Host **nao** precisa recarregar pagina |
| 8 | Pacote deploy | `preparar-deploy.bat` + `verificar-producao.bat` no pacote | `MANIFEST.json` presente; buildId bate bundles |

## Verificacoes rapidas

### roomState no servidor

No console do host (DevTools), apos client publicar:

- Evento `roomState` com `version` incrementando
- Peer do client com `mediaReady.video: true` e `selectable: true` apos `midiaPronta`

### Anti-eco

Com fones de ouvido no host:

- Cenario 5: nao deve haver feedback duplo (voz + desktop misturados do mesmo peer)

### Rollback legado

Se necessario testar protocolo antigo:

```bat
set SHARESCREEN_LEGACY_ROOM_SYNC=1
npm start
```

## Comandos uteis

```bat
preparar-deploy.bat
verificar-producao.bat
npm run build:prod
```

## Registro de teste

| Data | Tester | Cenarios OK | Observacoes |
|------|--------|-------------|-------------|
| | | | |
