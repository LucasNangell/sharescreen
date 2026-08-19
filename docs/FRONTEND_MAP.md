# FRONTEND MAP — ShareScreen LAN

Mapeamento do frontend da aplicação. O projeto não usa frameworks reativos (como React/Vue) e é estruturado em **Vanilla JS** moderno, empacotado por **esbuild**.

## Informações Gerais
* **Framework:** Nenhum (Vanilla HTML5 / CSS3 / ES6+).
* **Pasta de Código-Fonte:** [src/](file:///e:/Projetos/Trabalho/Screen%20Share/src)
* **Pasta de Distribuição/Estáticos:** [public/](file:///e:/Projetos/Trabalho/Screen%20Share/public)
* **Build Tool:** `esbuild` executado pelo script [build-client.js](file:///e:/Projetos/Trabalho/Screen%20Share/scripts/build-client.js).

---

## Estrutura das Páginas e Rotas

A aplicação possui três páginas principais carregadas diretamente pelo servidor Express:

| Rota / Tela | Arquivo HTML de Origem | Arquivo JS de Código-Fonte | Arquivo JS Empacotado (Destino) | Estilo CSS |
| --- | --- | --- | --- | --- |
| **Visualizador (Client)** | [index.html (Client)](file:///e:/Projetos/Trabalho/Screen%20Share/public/client/index.html) | [app.js (Client)](file:///e:/Projetos/Trabalho/Screen%20Share/src/client/app.js) | [app.bundle.js (Client)](file:///e:/Projetos/Trabalho/Screen%20Share/public/client/app.bundle.js) | [style.css (Client)](file:///e:/Projetos/Trabalho/Screen%20Share/public/client/style.css) |
| **Painel de Transmissão (Host)** | [index.html (Host)](file:///e:/Projetos/Trabalho/Screen%20Share/public/host/index.html) | [app.js (Host)](file:///e:/Projetos/Trabalho/Screen%20Share/src/host/app.js) | [app.bundle.js (Host)](file:///e:/Projetos/Trabalho/Screen%20Share/public/host/app.bundle.js) | [style.css (Host)](file:///e:/Projetos/Trabalho/Screen%20Share/public/host/style.css) |
| **Painel Admin** | [index.html (Admin)](file:///e:/Projetos/Trabalho/Screen%20Share/public/admin/index.html) | [admin.js](file:///e:/Projetos/Trabalho/Screen%20Share/public/admin/admin.js) | (Sem compilação/esbuild direto) | (Usa estilos globais) |

---

## Componentes e Módulos Compartilhados (`src/shared/`)

Os arquivos em [src/shared/](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared) contêm toda a lógica de suporte comum ao Host e ao Client:

* **Sinalização:** [signaling-client.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/signaling-client.js) — Conexão WebSocket e eventos de sala.
* **WebRTC/Mediasoup:** [media-client.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/media-client.js) — Criação de transports, producers e consumers do `mediasoup-client`.
* **Filtros de audio:** aplicados na origem (producer) via `mic-dsp.js`. O host envia prefs de clients por `definirFiltroAudioClient` (API `/api/audio-filter` + cache `sharescreen_audio_presets`). O próprio host aplica o modal no microfone publicado (`media.setMicrophoneFilterPrefs`) e persiste `kind: 'host'` (API + `sharescreen_host_mic_prefs`). **Todos os participantes ouvem a mesma trilha filtrada.** `host-audio-monitor.js` reproduz áudio remoto em passthrough (volume/mute por canal). O host pode ligar um monitor local opt-in (`self-audio-monitor.js`) da trilha já publicada, desligado por padrão e sem persistência, para ouvir o mesmo sinal que os clients. `mutedPeerIds` no servidor é a fonte única de mute: `btn-host-mic`, `btn-client-mic` e `source-mute-btn` dos cards refletem o mesmo estado.
* **Saúde da publicação de microfone:** `mic-publish-health.js` decide quando cair para a trilha crua. O grafo de `mic-dsp.js` expõe `outputAnalyser` (pós-ganho), `gateGainNode` e `gateActive`, e `media-client.js` mede tudo na mesma janela — um portão fechado (VAD, proximidade ou RMS) não é confundido com grafo mudo. Após um fallback para trilha crua, `hasPendingMicFilterRestore()` faz o watchdog do host (e o desbloqueio de áudio no client) refazer a publicação com filtros.
* **Recv transports:** Host e client usam `splitRecvTransports: true` em `MediaClient` para isolar consumo de audio auxiliar do video.
* **Gerenciador de Áudio:** [audio-manager.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/audio-manager.js) — Controle de dispositivos de áudio, microfone e áudio do sistema. `resolveDefaultMicrophoneDeviceId()` traduz a entrada virtual `default` do Chrome para o deviceId concreto, e `setupMicrophonePicker()` devolve `ready` — host (`joinHost`, `iniciarCompartilhamentoHost`) e client (`runPublisherFlowBody`, `attachVuMeterIfNeeded`) aguardam essa promessa antes de capturar, para não publicar com dispositivo diferente do exibido no `<select>`.
* **Monitoramento de Áudio:** [host-audio-monitor.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/host-audio-monitor.js) e [audio-level-meter.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/audio-level-meter.js) — Medidores VU no painel do host. Sync incremental de canais (`syncFromSources`, `syncPeerSources`), `pinnedPeerIds` para preservar áudio do host no client, `recoverOutputIfSilent()` e `countLiveChannels()`, filas separadas de consumo em `media-client.js` (`_runVideoMediaOp` / `_runAudioMediaOp`). Host e client deduplicam sync por `audioSourcesSignature` (`lastAppliedAudioSig`), debounce de `fontesAudio` (~80ms) e `repairAllAudioIfNeeded` / `repairHostRemoteAudioIfNeeded` com watchdog 5s no client.
* **Filtro Chroma Key (Lower Thirds):** [lt-chroma.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/lt-chroma.js) — Algoritmo em canvas 2D que remove a cor verde (ou outra chroma configurada) do vídeo de Lower Thirds frame a frame.
* **Modais e Layout de Overlays:** [lt-modal.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/lt-modal.js) e [lt-overlay.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/lt-overlay.js) — Exibição e ajuste de posicionamento de lower thirds.
* **Anotações e quadro branco:** [drawing-surface.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/drawing-surface.js) — canvas sobre `#preview-area` com toolbar colapsável `#annotation-toolbar` (lápis, reta, retângulo, elipse, seta, texto, cor, espessura). Modo efêmero (fade 3s) em vídeo normal via `anotacaoSegmento`; modo persistente no quadro branco via `quadroBrancoElemento`. [drawing-primitives.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/drawing-primitives.js) — renderização compartilhada. [annotation-toolbar.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/annotation-toolbar.js) — UI colapsável canto inferior esquerdo. [whiteboard-engine.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/whiteboard-engine.js) — canvas branco 1920×1080 + `captureStream` publicado pelo host (`#btn-quadro-branco`).
* **Popout Studio (modo OBS):** [studio-state.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/studio-state.js) — cenas nomeadas (até 4 fontes), layouts (`full`, `split-h`, `split-v`, `pip-br`, `pip-bl`), `crop`/`frame` normalizados por slot, persistência em `sessionStorage`. [studio-compositor.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/studio-compositor.js) — compositor canvas multi-fonte com recorte 9-param e posicionamento. [studio-transform-editor.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/studio-transform-editor.js) — overlay interativo de crop/transform no Preview (Modo Estúdio ON). Integração em [app.js (Host)](file:///e:/Projetos/Trabalho/Screen%20Share/src/host/app.js) (`openControlsPopout`, template `#studio-popout-shell` em [index.html (Host)](file:///e:/Projetos/Trabalho/Screen%20Share/public/host/index.html)). Compositor de Program (go-live) roda na janela principal do host para evitar throttling do RAF no popout. [media-client.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/media-client.js): `consumePreviewVideo`, `publishSyntheticVideoStream`, `repairHostVideoIfNeeded` (watchdog de vídeo do host).
* **Gravação:** [recording-client.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/recording-client.js) — Grava via `MediaRecorder` e envia chunks em tempo real para `/api/gravacao/stream/*` (sem acumular na RAM); fallback legado em memória se streaming indisponível. [recording-compositor.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/recording-compositor.js) compõe o vídeo gravado com badge em canvas, e [recording-audio-mixer.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/recording-audio-mixer.js) monta a trilha de áudio da gravação a partir das `consumer.track` WebRTC (paridade com o áudio ouvido pelos clients). O host pode definir opcionalmente um client como áudio padrão da gravação (`sharescreen_rec_default_audio_client` no localStorage) para gravar só essa fonte e evitar eco. Em `pagehide`, gravações ativas são finalizadas como `_incompleto.webm` no servidor.
* **Ponte Meet (anti-eco ao vivo):** preset/botão no host envia `definirModoPonteMeet`; clients em `src/client/app.js` filtram fontes `system` via `excludeSourceTypes` em `audio-sources.js` enquanto `meetBridgeLiveMode` estiver ativo (evita loopback do Meet nos clients LAN).
* **Controle de UI:** [ui-state.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/ui-state.js), [toast.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/toast.js), [source-cards.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/source-cards.js).

---

## Configuração Visual e Estilos

* **CSS do Tema Principal:** [theme.css](file:///e:/Projetos/Trabalho/Screen%20Share/public/shared/theme.css) — Define as variáveis CSS (`--bg-primary`, `--accent-color`, etc.), fontes Google Fonts (Inter) e estilo padrão.
* **CSS de Componentes Comuns:** [components.css](file:///e:/Projetos/Trabalho/Screen%20Share/public/shared/components.css) — Estilo de botões, modais, toasts e formulários.
* **CSS da Tela de Client:** [style.css (Client)](file:///e:/Projetos/Trabalho/Screen%20Share/public/client/style.css) — Customizações de layout específicas da tela de visualização.
* **CSS da Tela de Host:** [style.css (Host)](file:///e:/Projetos/Trabalho/Screen%20Share/public/host/style.css) — Layout em grid de transmissão, barra lateral de controle e VU meter do Host.

---

## Fluxos Importantes do Frontend

### Fluxo 1: Inicialização da Transmissão (Host)
Arquivos envolvidos:
* [app.js (Host)](file:///e:/Projetos/Trabalho/Screen%20Share/src/host/app.js)
* [signaling-client.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/signaling-client.js)
* [media-client.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/media-client.js)

Passos:
1. O Host carrega a página e conecta ao WebSocket no servidor ([signaling-client.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/signaling-client.js)).
2. Solicita permissão e captura a tela via `getDisplayMedia`.
3. Negocia e cria um Send Transport (`mediasoup`) para enviar o vídeo/áudio capturado ([media-client.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/media-client.js)).
4. Opcionalmente inicializa a gravação, enviando chunks do `MediaRecorder` em streaming para o servidor a cada segundo.

### Fluxo 2: Recepção de Fluxo (Client)
Arquivos envolvidos:
* [app.js (Client)](file:///e:/Projetos/Trabalho/Screen%20Share/src/client/app.js)
* [media-client.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/media-client.js)

Passos:
1. O Client conecta ao WebSocket e escuta pelo evento de nova transmissão (`transmission:start`).
2. Solicita ao servidor os parâmetros para criar um Recv Transport (`mediasoup`).
3. Conecta o transport e consome o fluxo de vídeo e áudio vindo do Host ([media-client.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/media-client.js)).
4. Ativa o áudio após interação do usuário (Play).

### Fluxo 3: Processamento do Chroma Key (Lower Thirds no Client)
Arquivos envolvidos:
* [lt-chroma.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/lt-chroma.js)
* [app.js (Client)](file:///e:/Projetos/Trabalho/Screen%20Share/src/client/app.js)

Passos:
1. O Client faz o download do vídeo WebM de Lower Third registrado para a máquina.
2. Renderiza o vídeo em um elemento oculto de `<video>`.
3. Executa um laço `requestAnimationFrame` que desenha cada frame do vídeo em um `<canvas>`.
4. O algoritmo em [lt-chroma.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/lt-chroma.js) varre a imagem do canvas pixel a pixel e substitui a cor verde por transparência (alfa = 0).

### Fluxo 4: Anotações e quadro branco
Arquivos envolvidos:
* [drawing-surface.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/drawing-surface.js)
* [annotation-toolbar.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/annotation-toolbar.js)
* [whiteboard-engine.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/whiteboard-engine.js)
* [app.js (Host)](file:///e:/Projetos/Trabalho/Screen%20Share/src/host/app.js)
* [app.js (Client)](file:///e:/Projetos/Trabalho/Screen%20Share/src/client/app.js)
* [signaling.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/signaling.js)

Passos:
1. Participante expande `#annotation-toolbar`, escolhe ferramenta/cor e desenha no canvas overlay.
2. Em transmissão de vídeo normal: traços via `anotacaoSegmento` (coordenadas 0–1), fade 3s em todos os peers.
3. Host ativa **Quadro branco** (`#btn-quadro-branco`): `WhiteboardEngine` → `publishSyntheticVideoStream` → `selecionar(hostPeerId)`; `transmissaoAtiva.sourceKind = 'whiteboard'`.
4. No quadro branco: elementos persistentes via `quadroBrancoElemento` (estado na sala, máx. 500); host renderiza no canvas transmitido; overlay nos clients para feedback imediato.
5. Host/co-host pode limpar com `#annotation-clear` → `quadroBrancoLimpar`.

### Fluxo 5: Popout Studio Mode (Host)
Arquivos envolvidos:
* [app.js (Host)](file:///e:/Projetos/Trabalho/Screen%20Share/src/host/app.js)
* [studio-state.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/studio-state.js)
* [studio-compositor.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/studio-compositor.js)
* [studio-transform-editor.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/studio-transform-editor.js)
* [media-client.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/media-client.js)
* [index.html (Host)](file:///e:/Projetos/Trabalho/Screen%20Share/public/host/index.html) — template `#studio-popout-shell`

Passos:
1. Host clica `#btn-popout-controls` → popout com layout grid (previews/cenas à esquerda, controles full-height à direita). Modo Estúdio OFF preserva fluxo legado simplificado.
2. Com **Modo Estúdio** ativo: painéis Program (espelho de `#preview-video`) e Preview (cena preparada); editor de crop/transform por slot (`#studio-transform-overlay`); lista de cenas em `sessionStorage`.
3. Clique em participante adiciona fonte à cena em edição (não vai ao ar até **Transição**). Selecionar slot na lista permite arrastar/redimensionar frame ou recortar (botão Recorte / Alt).
4. Cena com 1 fonte sem crop/transform: `selecionarClient` via `selecionar()`. Cena com crop, frame editado ou multi-fonte: compositor canvas na janela principal → `publishSyntheticVideoStream` + `selecionar(hostPeerId)`.
5. Watchdog de vídeo do host (`repairHostVideoIfNeeded`, intervalo 5s) detecta track morta e alerta recompartilhar.

---

## Onde realizar alterações (Guia IA)

* **Alterar textos, títulos ou botões da tela do host:** Modifique o arquivo [index.html (Host)](file:///e:/Projetos/Trabalho/Screen%20Share/public/host/index.html).
* **Alterar lógica de controle de transmissão (como botões do menu ou gravação):** Edite [app.js (Host)](file:///e:/Projetos/Trabalho/Screen%20Share/src/host/app.js).
* **Alterar design de botões, modais ou cores corporativas:** Edite [theme.css](file:///e:/Projetos/Trabalho/Screen%20Share/public/shared/theme.css) ou [components.css](file:///e:/Projetos/Trabalho/Screen%20Share/public/shared/components.css).
* **Ajustar filtros de remoção de fundo (Chroma Key):** Edite [lt-chroma.js](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared/lt-chroma.js).
* **Adicionar novas requisições HTTP para a API:** Edite o arquivo relevante em `src/` (geralmente [app.js (Host)](file:///e:/Projetos/Trabalho/Screen%20Share/src/host/app.js) ou [app.js (Client)](file:///e:/Projetos/Trabalho/Screen%20Share/src/client/app.js)).
