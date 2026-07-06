# BACKEND MAP — ShareScreen LAN

Mapeamento do backend da aplicação. Estruturado em **Node.js** com **Express** para API REST e servidores de arquivos estáticos, e **WebSockets** + **Mediasoup** para sinalização e transmissão de mídia.

## Informações Gerais
* **Framework:** Express (servidor HTTP/HTTPS).
* **Pasta de Código-Fonte:** [server/](file:///e:/Projetos/Trabalho/Screen%20Share/server)
* **Ponto de Entrada:** [index.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/index.js) (Inicializa os servidores HTTP/HTTPS e associa o servidor WebSocket).

---

## Arquivos do Servidor e Suas Funções

| Arquivo | Função | Quando Alterar |
| --- | --- | --- |
| [index.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/index.js) | Configura Express, rotas REST, headers HTTP de cache, HTTPS, e inicializa o servidor de mídia. | Criar novos endpoints de API ou alterar a lógica de inicialização geral. |
| [signaling.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/signaling.js) | Lida com conexões WebSocket (`ws`), eventos de sala, co-hosts e sinalização WebRTC. | Adicionar novos tipos de mensagens WebSocket ou ajustar as regras de negociação WebRTC. |
| [mediasoup-manager.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/mediasoup-manager.js) | Gerencia workers, routers, transports, producers e consumers do Mediasoup. | Ajustar configurações de codec de vídeo/áudio, bitrates de mídia, ou o range de portas UDP (40000-40100). |
| [room-manager.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/room-manager.js) | Estrutura de estado na memória para a sala ativa, hosts, conexões e logs de sessão. | Alterar o comportamento de quem é o transmissor ativo, logar eventos de sala ou mudar status de co-host. |
| [client-db.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/client-db.js) | Interage com o banco SQLite (`data/sharescreen.db`) para persistência de clients e lower-thirds. | Criar tabelas, alterar colunas, salvar novos metadados de Chroma Key ou seed de usuários. |
| [auth-dev.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/auth-dev.js) | Valida PINs de acesso de DEV e tokens de segurança do host (`SHARESCREEN_HOST_TOKEN`). **Legado** — em transição para sessão por cookie. |
| [auth-session.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/auth-session.js) | Login/logout, cookie HttpOnly `ss_session`, middleware `requireAuth` / `requireAuthOrHostToken`, validação de sessão no WebSocket. |
| [password.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/password.js) | Hash e verificação de senha com `scrypt`. |
| [user-resolve.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/user-resolve.js) | **Descontinuado no startup** — resolve hostname→IP (ping/DNS). Endpoint admin `resolve-ips` retorna 410. |
| [agent-bridge.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/agent-bridge.js) | Integração com banco de dados remoto/local usado por robôs python locais nos computadores dos clients. | Mudar o comportamento de verificação e chamada remota do robô Chrome (`auxiliar_system.db`). |
| [client-ip.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/client-ip.js) | Helper para extração do IP real do cliente contornando proxies ou headers (`x-forwarded-for`). | Corrigir problemas de IPs de clientes incorretos ao passar por NGINX ou proxies de rede local. |
| [recording-save.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/recording-save.js) | Salva arquivos WebM de gravação na pasta configurada (`recordingsDir`); exporta `resolveRecordingDir()`. | Alterar onde os arquivos de gravação finais são armazenados ou formato do arquivo. |
| [recording-chunk-store.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/recording-chunk-store.js) | Gerencia arquivos temporários fragmentados (chunks) e a remontagem (concatenação) deles em um único WebM (upload legado pós-blob). | Mudar políticas de expiração de gravações incompletas ou lógica de concatenação. |
| [recording-stream-session.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/recording-stream-session.js) | Sessões de gravação em streaming: append em disco (`.streaming/*.part`), finish completo ou `_incompleto.webm`. | Alterar política de gravações longas, poda de sessões ou persistência em tempo real. |

---

## Principais Endpoints da API REST

### Autenticação e preferências
* `POST /api/auth/login` — `{ username, password }` → cookie `ss_session` (HttpOnly).
* `POST /api/auth/logout` — Revoga sessão e limpa cookie.
* `GET /api/auth/me` — Retorna usuário autenticado ou 401.
* `GET /api/user-settings` — Lista configurações do usuário (`?namespace=` opcional). Requer sessão.
* `GET /api/user-settings/:namespace/:key` — Lê uma configuração. Requer sessão.
* `PUT /api/user-settings/:namespace/:key` — Salva `{ value }`. Requer sessão.

**Usuário admin inicial:** criado na primeira execução se a tabela `users` estiver vazia. Credenciais via `SHARESCREEN_ADMIN_USER` / `SHARESCREEN_ADMIN_PASSWORD` (padrão: `admin` / `changeme`).

### Demais endpoints
* `GET /api/health` — Verifica status, ambiente (`development`/`production`) e uptime.
* `GET /api/registro-cliente` — Lê o IP do cliente e responde se ele está registrado no banco de dados e qual o nome mapeado.
* `POST /api/registro-cliente` — Recebe `{ nome, computerName }` e associa ao IP do chamador na base SQLite.
* `GET /api/lower-third/:clientName` — Retorna as configurações de lower third salvas (vídeo, croma, tolerância) para o client indicado.
* `GET /api/audio-filter/:kind/:name` — Preset de filtros (`?userId=` opcional). Prioriza `user_id`, fallback por `subject_name` legado.
* `POST /api/audio-filter` — Salva `{ kind, name, prefs, userId? }`. Requer sessão ou `X-Host-Token` (compat.).
* `POST /api/lower-third` — Recebe o binário do vídeo WebM da lower third e salva no servidor associando ao cliente (requer token de host no header).
* `GET /lt-videos/:filename` — Serve os arquivos de vídeo gravados em `data/lower-thirds/`.
* `GET /api/info` — Informa o estado atual do servidor (transmissões, cohosts ativos, build ID).
* `POST /api/gravacao` — Upload legado de gravação WebM completa (binário).
* `POST /api/gravacao/chunk` + `POST /api/gravacao/complete` — Upload legado fragmentado pós-blob.
* `POST /api/gravacao/stream/start` — Inicia sessão de gravação em streaming (`{ customDir? }` → `{ sessionId }`).
* `POST /api/gravacao/stream/chunk` — Append de chunk WebM em disco (`X-Session-Id`, `X-Chunk-Index`).
* `POST /api/gravacao/stream/finish` — Finaliza sessão (`{ sessionId, filename?, incomplete? }`); incompleto gera `*_incompleto.webm`.

### Endpoints Administrativos (Apenas quando `SHARESCREEN_DEV=1`)
* `GET /api/admin/users` — Retorna a lista de todos os usuários no banco SQLite.
* `POST /api/admin/users` — Permite adicionar ou atualizar manualmente dados de um client.
* `POST /api/admin/users/resolve-ips` — **Descontinuado (410)**. Sync de IP por `computer_name` removido do startup.
* `POST /api/admin/seed` — Importa a base inicial de usuários/IPs a partir de `users.json`.

---

## Fluxos Lógicos no Backend

### Fluxo de Inicialização do WebRTC (Mediasoup)
Arquivos envolvidos:
* [index.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/index.js)
* [mediasoup-manager.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/mediasoup-manager.js)

1. No startup, o servidor provisiona usuário admin (se necessário), seed opcional de `clients` a partir de `users.json` quando vazio, e **não** sincroniza mais IP por `computer_name`.
2. O Express inicializa e chama `initMediasoup()`.
3. O Mediasoup cria um Worker nativo (`mediasoup-worker.exe` no Windows).
4. Cria-se o Router do mediasoup com os codecs configurados (preferência por `video/H264`).
5. Os IPs de rede interna são escutados (`announcedIp` e portas UDP configuradas).

### Fluxo de Comunicação de Sinalização (WebSockets)
Arquivos envolvidos:
* [signaling.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/signaling.js)
* [room-manager.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/room-manager.js)

1. Host ou Client conecta via WebSocket com cookie de sessão (mesma origem). Links externos com `viewerToken` continuam sem login. `hostToken` legado ainda aceito temporariamente.
2. A sinalização ouve eventos como `room:join`, `webrtc:create-transport`, `webrtc:connect-transport`, `webrtc:produce`, `webrtc:consume`.
3. `definirFiltroAudioClient` e repassado por WebSocket do host/co-host para o client alvo para atualizar filtros de microfone sem alterar producers de video, gravacao ou ICE. O servidor persiste o preset em `audio_filter_presets` e renomeia ao `atualizarNome`.
4. `getHostState()` inclui `audioSources` (lista de producers de audio ativos) para o host sincronizar consumo sem depender apenas de `fontesAudio`.
5. `addPeer()` envia `fontesAudio` ao novo peer; `broadcastAudioSources()` global só quando a assinatura de producers muda (evita ressync desnecessário nos demais participantes).
6. `definirModoPonteMeet` (host/co-host) ativa `meetBridgeLiveMode` na sala; `getHostState()` e `buildRoomSnapshot()` incluem o flag; clients recebem `modoPonteMeetAtualizado`.
7. `definirClientMute` atualiza `mutedPeerIds` na sala e faz broadcast de `clientesSilenciados`. Host/co-host pode silenciar qualquer client; um client pode silenciar apenas a si (`peerId` deve ser o próprio id).
8. `anotacaoSegmento` (qualquer peer autenticado) valida payload (pontos normalizados, `shape`: `stroke`|`line`|`rect`|`ellipse`|`arrow`|`text`, cor, rate-limit ~20/s) e rebroadcast via `room.broadcastToRoom()`.
9. **Quadro branco:** `quadroBrancoIniciar` / `quadroBrancoParar` (host/co-host); `quadroBrancoElemento` (qualquer peer, só com quadro ativo, rate-limit ~30/s); `quadroBrancoLimpar` (host/co-host). Estado em `room.whiteboardElements`; snapshot em `roomState.whiteboard` e `transmissaoAtiva.sourceKind = 'whiteboard'`.

---

## Guia de Modificações (IA)

* **Alterar regras de quem pode transmitir, controle de concorrência ou limitar quantidade de clients:** Altere [room-manager.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/room-manager.js).
* **Modificar codecs aceitos, taxas de bitrate WebRTC ou mudar portas de transmissão:** Altere [mediasoup-manager.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/mediasoup-manager.js).
* **Criar novos endpoints HTTP ou rotas para arquivos estáticos:** Altere [index.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/index.js).
* **Ajustar regras de CORS, cabeçalhos de segurança ou tokens de autenticação:** Altere [index.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/index.js) ou [auth-dev.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/auth-dev.js).
