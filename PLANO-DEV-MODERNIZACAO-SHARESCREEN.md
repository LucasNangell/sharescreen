# Plano DEV — Modernização Profissional ShareScreen LAN

**Projeto:** `sharescreen-lan` v1.0.0  
**Data:** 16 de junho de 2026  
**Etapa:** Base DEV segura (sem nova UI, sem refatoração do core de mídia)  
**Workspace DEV:** `E:\Projetos\Trabalho\Screen Share`  
**Produção (intocada):** `\\cgrafsysvm\Sistemas CGraf\Screen Share`

---

## 1. Status do isolamento DEV

### 1.1 Evidências

| Verificação | Resultado | Evidência |
|-------------|-----------|-----------|
| Workspace de trabalho | `E:\Projetos\Trabalho\Screen Share` | Caminho local, separado da rede de produção |
| Produção não alterada | Confirmado | Nenhum comando executou escrita em `\\cgrafsysvm\...` |
| `start-producao.bat` | Não executado | Apenas `npm run build` e `node --check` em DEV |
| Git | Inicializado nesta etapa | Repositório criado apenas em `E:\Projetos\Trabalho\Screen Share` |
| Branch DEV | `dev/modernizacao-profissional-baixa-latencia` | `git branch --show-current` |
| Scripts de produção | Preservados | `start-producao.bat`, `verificar-producao.bat` inalterados |
| Nginx produção | Não alterado | Arquivos em `nginx/` apenas copiados para backup |

### 1.2 Modelo de isolamento adotado

Como o projeto **não era repositório Git** antes desta etapa:

1. **Isolamento físico:** DEV em disco local `E:\`; produção em share `\\cgrafsysvm\`.
2. **Git inicializado** somente no workspace DEV com branch dedicada.
3. **Variáveis DEV** isoladas em `start-dev.bat` (localhost, pasta `_dev_recordings`).
4. **Backup local** `_backup_pre_modernizacao_dev/` antes de qualquer modernização.

### 1.3 Caminhos proibidos (não alterar diretamente)

| Caminho | Motivo |
|---------|--------|
| `\\cgrafsysvm\Sistemas CGraf\Screen Share` | Deploy produção |
| `\\cgrafsysvm\ApogeeFiles\Gravaçoes Treinamento` | UNC gravações reais |
| `\\cgrafsysvm\nginx\conf\nginx.conf` | Nginx produção (referenciado em docs) |
| Qualquer execução de `start-producao.bat` neste PC como “teste” | Sobe serviço com IP 10.1.1.73 |

---

## 2. Arquivos protegidos por backup

Pasta: **`_backup_pre_modernizacao_dev/`**  
Manifesto: `_backup_pre_modernizacao_dev/MANIFESTO-BACKUP.txt`

### 2.1 Conteúdo copiado

```
_backup_pre_modernizacao_dev/
├── MANIFESTO-BACKUP.txt
├── public/
│   ├── host/   (index.html, style.css, app.bundle.js)
│   └── client/ (index.html, style.css, app.bundle.js)
├── server/     (cópia completa)
├── config/     (cópia completa)
├── scripts/
│   ├── build-client.js
│   └── *.ps1
├── nginx/      (configs existentes)
├── package.json
├── start-producao.bat
└── verificar-producao.bat
```

### 2.2 Rollback rápido (procedimento)

Para restaurar artefatos pré-modernização no workspace DEV:

```powershell
cd "E:\Projetos\Trabalho\Screen Share"
Copy-Item "_backup_pre_modernizacao_dev\public\*" "public\" -Recurse -Force
Copy-Item "_backup_pre_modernizacao_dev\server\*" "server\" -Recurse -Force
Copy-Item "_backup_pre_modernizacao_dev\config\*" "config\" -Recurse -Force
Copy-Item "_backup_pre_modernizacao_dev\package.json" "package.json" -Force
```

Bundles funcionais de produção estão preservados neste backup.

---

## 3. Diagnóstico dos fontes frontend ausentes

### 3.1 Estado no workspace DEV

| Arquivo | DEV | Observação |
|---------|-----|------------|
| `src/host/app.js` | **AUSENTE** | Build quebra |
| `src/client/app.js` | **AUSENTE** | Build quebra |
| `src/shared/recording-filename.js` | **PRESENTE** | Hash idêntico ao backup externo |
| `src/shared/signaling.js` | **AUSENTE** | |
| `src/shared/sfu-session.js` | **AUSENTE** | Core mediasoup-client |
| `src/shared/media-capture.js` | **AUSENTE** | getDisplayMedia/getUserMedia |
| `src/shared/screen-recorder.js` | **AUSENTE** | MediaRecorder |
| `src/shared/transmission.js` | **AUSENTE** | |
| `src/shared/microphone-picker.js` | **AUSENTE** | |
| `src/shared/video-quality.js` | **AUSENTE** | |

### 3.2 Backup externo encontrado

**Caminho:** `D:\Antigravity\Backup\ControleOBSNDI\ShareScreen`

| Verificação | Resultado |
|-------------|-----------|
| `src/host/app.js` | Existe |
| `src/client/app.js` | Existe |
| Módulos `src/shared/*` | 8 arquivos (lista completa abaixo) |
| `public/host/app.bundle.js` | Tamanho **258.806 bytes** — **idêntico** ao DEV atual |
| `recording-filename.js` | SHA256 **idêntico** ao DEV |

**Arquivos no backup externo (`src/`):**

- `src/client/app.js`
- `src/host/app.js`
- `src/shared/media-capture.js`
- `src/shared/microphone-picker.js`
- `src/shared/recording-filename.js`
- `src/shared/screen-recorder.js`
- `src/shared/sfu-session.js`
- `src/shared/signaling.js`
- `src/shared/transmission.js`
- `src/shared/video-quality.js`

### 3.3 Decisão desta etapa

**NÃO foi feita cópia automática** do backup externo para o DEV, conforme instrução.

**Motivo:** bundles atuais em `public/` já correspondem byte-a-byte ao backup externo; a restauração dos fontes será **Fase 1** da próxima etapa, com diff e build validado antes de sobrescrever bundles.

### 3.4 Plano se backup externo indisponível

Reconstrução limpa a partir de:

- Protocolo WebSocket (`server/signaling.js`)
- HTML/CSS atuais (`public/host`, `public/client`)
- Bundles minificados (referência comportamental)
- Módulos server (`room-manager.js`, `mediasoup-manager.js`)
- Relatório `RELATORIO-SISTEMA-TRANSMISSAO-LOCAL.md`

---

## 4. Contrato WebSocket atual

**Endpoint:** `ws://` ou `wss://` + `location.host` + `/ws`  
**Formato:** JSON `{ type: string, payload?: object }`  
**Implementação server:** `server/signaling.js`  
**Implementação client (backup externo):** `src/shared/signaling.js` + `src/shared/sfu-session.js`

### 4.1 Mensagens Client → Server

| type | Quem envia | payload esperado | Resposta esperada | Efeito no estado | Risco se alterado |
|------|------------|------------------|-------------------|------------------|-------------------|
| `entrar` | host, client | `{ papel: 'host'\|'client', nome?, maquina? }` | `entrou` + (`estado` ou `transmissaoAtiva`) | Cria `Peer` em `room.peers`; host recebe snapshot; client recebe transmissão atual | **CRÍTICO** — quebra join de todos os clientes |
| `atualizarNome` | client | `{ nome: string }` | `nomeAtualizado` | Atualiza `peer.displayName`; notifica host | Alto — UI client |
| `criarTransporte` | todos | `{ direction: 'send'\|'recv' }` | `transporteCriado` | Cria WebRTC transport mediasoup no peer | **CRÍTICO** — quebra WebRTC |
| `conectarTransporte` | todos | `{ transportId, dtlsParameters, direction }` | `transporteConectado` | `transport.connect()` | **CRÍTICO** |
| `produzir` | host, client | `{ transportId, kind, rtpParameters, appData? }` | `produzido` `{ id, kind }` | Cria producer; status `transmitindo` se vídeo | **CRÍTICO** |
| `pararProducao` | todos | `{}` | `producaoParada` | Fecha producers locais; limpa seleção se era fonte ativa | Alto |
| `consumir` | todos | `{ producerId, rtpCapabilities }` | `consumido` `{ id, producerId, kind, rtpParameters }` | Cria consumer (paused→resume server-side) | **CRÍTICO** |
| `retomarConsumer` | todos | `{ consumerId }` | `consumerRetomado` | Resume consumer pausado | Médio — **não usado** no source backup atual (resume feito client-side) |
| `fecharConsumer` | todos | `{ consumerId }` | `consumerFechado` | Fecha consumer local | Médio |
| `status` | todos | `{ status, erro? }` | `statusOk` | Atualiza `peer.status` / `lastError`; notifica host | Baixo |
| `selecionarClient` | host | `{ peerId }` | `selecaoResultado` | Define `selectedPeerId`; broadcast `transmissaoAtiva` | **CRÍTICO** — fluxo central |
| `pausarTransmissao` | host | `{}` | `pausaResultado` | Pausa producers da fonte selecionada | Alto |
| `retomarTransmissao` | host | `{}` | `retomadaResultado` | Resume producers | Alto |
| `limparTransmissao` | host | `{}` | `limpezaResultado` | Limpa seleção e broadcast | Alto |
| `abrirClientRemoto` | host | `{ peerId?, hostname?, screenIndex?, clientName? }` | `abrirClientResultado` | Enfileira comando agent SQLite | Médio — integração agent |
| `abrirTodosRemotos` | host | `{ ... }` | `abrirTodosResultado` | Abre Chrome em todos agentes online | Médio |
| `listarAgentes` | host | `{}` | `agentesLista` | Lista PCs do agent | Baixo |

### 4.2 Mensagens Server → Client (push)

| type | Quando | payload principal | Efeito | Risco se alterado |
|------|--------|-------------------|--------|-------------------|
| `entrou` | Após `entrar` | `peerId`, `rtpCapabilities`, `videoQuality` | Inicializa mediasoup Device | **CRÍTICO** |
| `estado` | Host join / mudança sala | `clients[]`, `selecionado`, `transmissionPaused` | Atualiza lista host | Alto |
| `transmissaoAtiva` | Seleção/pause/clear/producer close | `selectedPeerId`, `producerIds`, `peerName`, `paused` | Dispara consume no client | **CRÍTICO** |
| `transporteCriado` | Resposta criarTransporte | ICE + DTLS params | Setup transport | **CRÍTICO** |
| `transporteConectado` | Resposta conectarTransporte | `{ ok: true }` | Callback connect | **CRÍTICO** |
| `produzido` | Resposta produzir | `{ id, kind }` | ID producer | **CRÍTICO** |
| `consumido` | Resposta consumir | consumer params | Attach track | **CRÍTICO** |
| `consumerFechado` | Producer remoto fechou | `{ consumerId }` | Limpa consumer UI | Alto |
| `nomeAtualizado` | Resposta atualizarNome | `{ ok: true }` | ACK | Baixo |
| `selecaoResultado` | Resposta selecionarClient | `{ ok, erro? }` | Feedback host | Médio |
| `pausaResultado` / `retomadaResultado` / `limpezaResultado` | Controles host | `{ ok, erro? }` | Feedback | Médio |
| `producaoParada` | Resposta pararProducao | `{ ok: true }` | ACK | Baixo |
| `consumerRetomado` | Resposta retomarConsumer | `{ consumerId }` | ACK | Baixo |
| `statusOk` | Resposta status | `{ ok: true }` | ACK | Baixo |
| `abrirClientResultado` / `abrirTodosResultado` | Agent | resultado operação | UI host | Baixo |
| `agentesLista` | listarAgentes | `{ agentes[] }` | UI host | Baixo |
| `erro` | Qualquer exceção | `{ mensagem }` | Exibição erro | Alto — formato estável |

### 4.3 Confirmação nos bundles atuais

Busca textual em `public/host/app.bundle.js` e `public/client/app.bundle.js` confirma presença dos tipos listados. Tipos de agent (`abrirClientRemoto`, etc.) existem no server; uso no host bundle/UI pode ser limitado — verificar ao restaurar `src/host/app.js`.

### 4.4 Keepalive

- Ping/pong WebSocket a cada `config.wsPingInterval` (25.000 ms)
- Conexão sem pong → `ws.terminate()` + `room.removePeer()`

---

## 5. Arquitetura atual preservada (core WebRTC intocável)

### 5.1 Princípios invioláveis nesta modernização

| Regra | Status |
|-------|--------|
| Manter mediasoup SFU | Obrigatório |
| Não substituir por P2P mesh, canvas, MJPEG, HLS, WS chunks | Obrigatório |
| Não adicionar transcoding server-side no live | Obrigatório |
| Preservar baixa latência | Obrigatório |

### 5.2 Codecs (`server/mediasoup-manager.js`)

| Codec | mimeType | Parâmetros relevantes |
|-------|----------|----------------------|
| Áudio | `audio/opus` | `useinbandfec: 1`, `usedtx: 0`, `x-google-start-bitrate` |
| Vídeo preferido | `video/H264` | Baseline `profile-level-id: 42e01f`, `packetization-mode: 1` |
| Vídeo fallback | `video/VP8` | `x-google-start-bitrate` |

`config.preferredVideoCodec`: `video/H264`

### 5.3 Bitrates e FPS (`config/default.js`)

| Parâmetro | Valor |
|-----------|-------|
| `initialVideoBitrate` | 4.000.000 bps |
| `maxVideoBitrate` | 8.000.000 bps |
| `maxIncomingBitrate` | 10.000.000 bps |
| `startBitrateKbps` | 2500 |
| `targetFrameRate` / `maxFrameRate` | 30 |
| `lowLatency` | `true` |
| `audio.maxBitrate` | 128.000 bps |

### 5.4 UDP / ICE

| Parâmetro | Valor |
|-----------|-------|
| `rtcMinPort` / `rtcMaxPort` | 40000 – 40100 |
| `listenIps` | `0.0.0.0` + `announcedIp` |
| `enableUdp` | true |
| `enableTcp` | true |
| `preferUdp` | true |
| Resolução IP | `server/network.js` → `resolveAnnouncedIp()` |

### 5.5 mediasoup transports

- **Send transport** por peer: `peer.sendTransport` — produce vídeo/áudio
- **Recv transport** por peer: `peer.recvTransport` — consume
- Criação: `room.createTransport(peer, direction)`
- Conexão: `room.connectTransport(peer, { transportId, dtlsParameters, direction })`

### 5.6 Producers e consumers

- Slots: `peer.producers.video`, `peer.producers.audio`
- Produce: `room.produce()` — substitui producer existente do mesmo slot
- Consume: `room.consume()` — dedupe por `producerId`; `paused: true` → `resume()` server-side
- Client-side (backup): `consumer.resume()` + `requestKeyFrame()` + `playoutDelayHint = 0`

### 5.7 Fluxo host seleciona fonte

1. Host envia `selecionarClient` com `peerId`
2. `room.selectClient()` valida `hasVideoProducer()`
3. `selectedPeerId` atualizado; `broadcastActiveProducer()` → `transmissaoAtiva` para **todos**
4. Peers chamam `consumir` com `producerIds.video` e `producerIds.audio`
5. Pause/resume: `pauseTransmission()` / `resumeTransmission()` pausam producers no servidor

### 5.8 Fluxo de gravação atual

| Etapa | Onde |
|-------|------|
| Captura para gravar | `SfuSession.getRecordableStream()` — tracks remotos ou tela local |
| Gravação | `ScreenRecorder` — MediaRecorder WebM, `timeslice: 1000` ms |
| Upload | `fetch('/api/gravacao')` POST octet-stream |
| Header | `X-Recording-Filename` |
| Nome | `formatRecordingFilename()` |
| Server | `server/recording-save.js` → `config.recordingsDir` |

**DEV:** `start-dev.bat` redireciona gravações para `_dev_recordings/` (não UNC).

---

## 6. Riscos principais

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|---------------|---------|-----------|
| 1 | Alterar protocolo WS sem versionar | Média | Total | Congelar contrato; testes smoke WS |
| 2 | Build sobrescrever bundles bons | Alta | Alto | Backup + diff antes de deploy |
| 3 | Confundir DEV com produção | Média | Crítico | Scripts `*-dev.bat`, variável `SHARESCREEN_DEV=1` |
| 4 | Gravação DEV na UNC real | Baixa | Médio | `SHARESCREEN_RECORDINGS_DIR` local em DEV |
| 5 | Regressão latência (canvas/chunks) | Média | Alto | Code review; proibir alternativas no prompt |
| 6 | Perda fontes frontend | Já ocorreu | Alto | Restaurar de `D:\Antigravity\Backup\...` Fase 1 |
| 7 | ICE/firewall UDP | Operacional | Alto | Documentar portas; não mudar range sem motivo |
| 8 | Copiar DEV para produção sem pacote | Média | Alto | Manter fluxo `preparar-pacote-deploy.ps1` separado |

---

## 7. Plano de implementação em fases

### Fase 0 — Base DEV (esta etapa) ✅

- [x] Isolamento DEV (Git + branch)
- [x] Backup `_backup_pre_modernizacao_dev/`
- [x] Auditoria WS + WebRTC
- [x] Scripts `start-dev.bat`, `build-dev.bat`, `check-dev.bat`
- [x] Este documento

### Fase 1 — Restaurar frontend source (próxima)

- Copiar `src/` do backup externo para DEV (com diff)
- `npm run build` → validar bundles equivalentes
- Commit Git na branch DEV
- **Não alterar** `server/` nem protocolo WS

### Fase 2 — UI/UX profissional

- Refatorar HTML/CSS (design system)
- Manter IDs DOM críticos ou mapear em camada fina
- Preservar chamadas `SignalingClient` / `SfuSession`

### Fase 3 — Estabilidade

- Reconnect WS (já em `signaling.js` backup)
- Indicadores ICE/conexão na UI
- Tratamento erro visível

### Fase 4 — Segurança LAN leve

- PIN opcional no `entrar` (extensão protocolo — versionar)
- HTTPS local dev com `npm run cert`

### Fase 5 — Gravação confiável

- Feedback upload; opcional chunked
- Manter MediaRecorder até avaliar server-side

### Fase 6 — Deploy

- `preparar-pacote-deploy.ps1` apenas a partir de branch estável
- Nunca copiar direto de DEV para `\\cgrafsysvm\` sem pacote

---

## 8. Arquivos que serão criados (próximas fases)

| Arquivo | Fase | Propósito |
|---------|------|-----------|
| `src/host/app.js` | 1 | Restaurar do backup |
| `src/client/app.js` | 1 | Restaurar do backup |
| `src/shared/*.js` | 1 | Módulos compartilhados |
| `public/shared/styles.css` | 2 | CSS unificado (proposto) |
| `README-DEV.md` | 1 | Guia desenvolvedor |
| Testes smoke `tests/ws-smoke.test.js` | 3 | Opcional |
| `config/dev.local.js` | 4 | Overrides locais (opcional) |

**Criados nesta etapa:**

- `PLANO-DEV-MODERNIZACAO-SHARESCREEN.md`
- `start-dev.bat`, `build-dev.bat`, `check-dev.bat`
- `.gitignore`
- `_backup_pre_modernizacao_dev/**`

---

## 9. Arquivos que serão alterados (próximas fases)

| Arquivo | Fase | Tipo alteração |
|---------|------|----------------|
| `public/host/index.html` | 2 | UI |
| `public/host/style.css` | 2 | UI |
| `public/client/index.html` | 2 | UI |
| `public/client/style.css` | 2 | UI |
| `public/host/app.bundle.js` | 1–2 | Rebuild |
| `public/client/app.bundle.js` | 1–2 | Rebuild |
| `src/**` | 1–3 | Lógica frontend |

**Não alterar sem revisão arquitetural:**

- `server/mediasoup-manager.js`
- `server/room-manager.js` (exceto extensões backward-compatible)
- `config/default.js` bitrates/codecs (sem tuning medido)

---

## 10. Arquivos proibidos de alteração direta

| Arquivo / caminho | Motivo |
|-------------------|--------|
| `\\cgrafsysvm\Sistemas CGraf\Screen Share\**` | Produção |
| UNC `\\cgrafsysvm\ApogeeFiles\Gravaçoes Treinamento` | Dados reais |
| `start-producao.bat` | IP produção 10.1.1.73 |
| Nginx ativo em `\\cgrafsysvm\nginx\conf\` | Infra produção |
| `_backup_pre_modernizacao_dev/**` | Somente leitura (snapshot) |
| Bundles em backup | Referência rollback |

Alterações em `server/signaling.js` só com tabela de compatibilidade WS atualizada e testes.

---

## 11. Critérios objetivos de aceite

### Esta etapa (Fase 0)

| Critério | Atendido |
|----------|----------|
| Alterações apenas em DEV local | ✅ |
| Produção não tocada | ✅ |
| Backup local criado | ✅ |
| Branch Git DEV | ✅ |
| Contrato WS documentado | ✅ |
| Core WebRTC mapeado | ✅ |
| `npm run build` testado (falha esperada) | ✅ |
| `node --check` server OK | ✅ |
| Scripts DEV sem UNC/IP produção | ✅ |
| Nova UI não implementada | ✅ |

### Próxima etapa (Fase 1)

| Critério | Como validar |
|----------|--------------|
| `src/host/app.js` e `src/client/app.js` presentes | `check-dev.bat` |
| `npm run build` sucesso | exit code 0 |
| Bundles novos ≈ funcionais antigos | teste manual host/client localhost |
| Nenhuma mudança em `server/` | `git diff server/` vazio |
| Latência não regressiva | inspeção — sem canvas/chunks |

---

## 12. Plano de rollback

### Nível 1 — Bundles/UI

```powershell
Copy-Item "_backup_pre_modernizacao_dev\public" "public" -Recurse -Force
```

### Nível 2 — Server + config

```powershell
Copy-Item "_backup_pre_modernizacao_dev\server" "server" -Recurse -Force
Copy-Item "_backup_pre_modernizacao_dev\config" "config" -Recurse -Force
```

### Nível 3 — Git

```bash
git checkout dev/modernizacao-profissional-baixa-latencia
git restore .
```

### Nível 4 — Produção

Produção não foi alterada nesta etapa. Se futuro deploy falhar, restaurar pacote anterior em `\\cgrafsysvm\` a partir de `pacote-servidor` anterior.

---

## 13. Validação executada nesta etapa

### 13.1 `node --check` (server)

Todos os arquivos `server/*.js` — **sintaxe OK**.

### 13.2 `npm run build`

```
ERROR: Could not resolve "E:\Projetos\Trabalho\Screen Share\src\client\app.js"
Exit code: 1
```

**Esperado** — confirma dependência dos fontes ausentes. Bundles em `public/` **não foram sobrescritos** (build falhou no client primeiro).

### 13.3 Scripts DEV

| Script | Função |
|--------|--------|
| `start-dev.bat` | Sobe servidor em `127.0.0.1`, gravações em `_dev_recordings/` |
| `build-dev.bat` | Executa `npm run build` com avisos DEV |
| `check-dev.bat` | Sintaxe server, presença fontes/bundles/backup/git |

---

## 14. O que pode ser feito com segurança agora

1. Restaurar `src/` do backup `D:\Antigravity\Backup\ControleOBSNDI\ShareScreen` para o workspace DEV.
2. Trabalhar exclusivamente na branch `dev/modernizacao-profissional-baixa-latencia`.
3. Testar localmente com `start-dev.bat` (localhost HTTPS).
4. Refatorar HTML/CSS mantendo contrato WS e módulos `sfu-session` / `media-capture`.
5. Evoluir UI sem tocar `mediasoup-manager.js` ou codecs.

## 15. Recomendações para a próxima etapa

1. **Restaurar fontes (Fase 1):** copiar `src/` do backup externo; `git diff` antes de commit.
2. **Validar build:** `build-dev.bat` deve passar; comparar tamanho/hash dos novos bundles.
3. **Smoke test local:** `start-dev.bat` → host + client em duas abas Chrome.
4. **Congelar contrato WS:** qualquer novo campo em `entrar` deve ser opcional e versionado.
5. **UI em camadas:** alterar CSS/HTML primeiro; lógica SFU depois.
6. **Não deployar** para `\\cgrafsysvm\` até Fase 6 com pacote dedicado.

---

## 16. Referências no repositório DEV

| Documento | Conteúdo |
|-----------|----------|
| `RELATORIO-SISTEMA-TRANSMISSAO-LOCAL.md` | Análise completa do sistema |
| `DEPLOY-PRODUCAO.md` | Fluxo deploy (não executar nesta máquina como prod) |
| `nginx/HTTPS-NGINX.md` | HTTPS — aplicar só após teste DEV |

---

*Documento gerado na etapa de base DEV. Produção não foi modificada.*
