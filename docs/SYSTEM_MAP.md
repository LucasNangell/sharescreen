# SYSTEM MAP — ShareScreen LAN

Este documento mapeia a arquitetura, estrutura de pastas e componentes do projeto **ShareScreen LAN** para acelerar a localização de arquivos por futuras IAs.

## Stack Principal
* **Backend:** Node.js (ES Modules, >=18.0.0), Express, WebSockets (`ws`), SQLite (`better-sqlite3`).
* **WebRTC / SFU:** Mediasoup (v3) para roteamento de mídia de alta performance.
* **Frontend:** Single Page Applications (SPAs) escritas em Vanilla JS + HTML5 + CSS3, compiladas com `esbuild`.
* **Segurança / Infra:** HTTPS/TLS com certificados autoassinados (essencial para WebRTC em LAN), suporte a NGINX e Caddy, e TURN Server (coturn) opcional para acesso externo.

---

## Arquitetura Geral
A aplicação atua como um sistema de compartilhamento de tela de ultra-baixa latência em rede local (LAN).
1. **Host (Streamer):** Captura a tela e áudio do sistema/microfone usando `getDisplayMedia`, inicializa um Producer no `mediasoup` e envia mídia ao servidor. Também pode gravar localmente e enviar os chunks para armazenamento no servidor.
2. **Client (Espectador):** Conecta-se ao servidor via WebSocket, inicializa um Consumer no `mediasoup` e recebe o fluxo de vídeo e áudio do Host. Renderiza Lower Thirds com remoção de fundo (Chroma Key).
3. **Signaling (Sinalização):** Servidor WebSocket gerencia negociações SDP (WebRTC) e troca de mensagens de controle.
4. **Persistência:** Banco SQLite local mapeia IPs de máquinas da LAN a nomes amigáveis de usuários e configurações de Lower Thirds.

```mermaid
graph TD
    subgraph Cliente (Navegador)
        C[Client / public/client] <-->|Signaling WebSocket| S[Server / server/signaling]
        C <-->|WebRTC Consumer| MS[Mediasoup Router / SFU]
    end
    subgraph Host (Navegador)
        H[Host / public/host] <-->|Signaling WebSocket| S
        H <-->|WebRTC Producer| MS
        H -->|Gravação WebM| R[Upload Chunks]
    end
    subgraph Servidor (Node.js)
        S <--> MS
        S <--> DB[(SQLite / data/sharescreen.db)]
        R --> RS[recording-save.js]
    end
```

---

## Estrutura Principal de Pastas
* `/certs` — Certificados TLS/SSL autoassinados (`server.key`, `server.crt`).
* `/config` — Configurações globais de rede, portas e caminhos de arquivos.
* `/data` — Banco de dados SQLite (`sharescreen.db`) e diretório de vídeos de lower-thirds.
* `/docs` — Documentos técnicos e relatórios de modificações.
* `/nginx` — Configurações de servidores reversos (NGINX/Caddy) para roteamento e HTTPS.
* `/public` — Páginas estáticas servidas ao navegador (HTML, CSS e bundles JS finais).
* `/scripts` — Utilitários de compilação, geração de certificados, liberação de portas e preparação de deploy.
* `/server` — Código do backend Node.js (sinalização, banco de dados, mediasoup).
* `/src` — Código-fonte JS moderno do frontend antes da compilação.
* `/turn` — Configuração para servidor de relay TURN (Coturn).

---

## Onde encontrar cada área do sistema

| Área | Arquivo/Pasta Principal | Função | Quando alterar |
| --- | --- | --- | --- |
| **Configurações Globais** | [default.js](file:///e:/Projetos/Trabalho/Screen%20Share/config/default.js) | Portas, codecs, caminhos de rede e chaves de ambiente. | Ajustar IPs de rede local, bitrate, portas RTC ou caminhos de gravação. |
| **Ponto de Entrada** | [index.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/index.js) | Inicialização do Express, rotas da API e servidores HTTP/HTTPS. | Criar/modificar rotas de API, middlewares ou fluxo de startup. |
| **Sinalização** | [signaling.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/signaling.js) | Servidor WebSocket para controle da sala e WebRTC. | Alterar eventos de conexão, ping-pong, negociação ou estado da sala. |
| **Roteador WebRTC** | [mediasoup-manager.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/mediasoup-manager.js) | Inicialização e gerenciamento do SFU mediasoup. | Ajustar codec, portas RTC de mídia, ou configurações de IP anunciado. |
| **Estado da Sala** | [room-manager.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/room-manager.js) | Gerencia a sala ativa, co-hosts e transmissões. | Alterar regras de quem pode transmitir ou controle de concorrência. |
| **Banco de Dados** | [client-db.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/client-db.js) | CRUD de clientes e lower-thirds usando SQLite. | Modificar tabelas, colunas, consultas SQL ou persistência em disco. |
| **Frontend Host** | [app.js (Host)](file:///e:/Projetos/Trabalho/Screen%20Share/src/host/app.js) | Lógica da tela de transmissão (Host). | Adicionar novos botões, controles de gravação ou UI do apresentador. |
| **Frontend Client** | [app.js (Client)](file:///e:/Projetos/Trabalho/Screen%20Share/src/client/app.js) | Lógica da tela de visualização (Client/Espectador). | Alterar a renderização da tela de recepção ou áudio do lado cliente. |
| **Componentes Compartilhados** | [src/shared/](file:///e:/Projetos/Trabalho/Screen%20Share/src/shared) | Módulos reutilizáveis no frontend (transports, áudio, overlays). | Ajustar tratamento de erros, filtros de áudio ou comportamento de canvas. |
| **Estilos Globais** | [theme.css](file:///e:/Projetos/Trabalho/Screen%20Share/public/shared/theme.css) | Variáveis CSS, cores, fontes e temas comuns. | Mudar paleta de cores ou design visual base da aplicação. |

---

## Mapas Técnicos Complementares
* **Frontend:** [FRONTEND_MAP.md](file:///e:/Projetos/Trabalho/Screen%20Share/docs/FRONTEND_MAP.md) — Páginas, estilo e componentes compartilhados.
* **Backend:** [BACKEND_MAP.md](file:///e:/Projetos/Trabalho/Screen%20Share/docs/BACKEND_MAP.md) — Inicialização, endpoints, WebRTC/SFU e WebSockets.
* **Database:** [DATABASE_MAP.md](file:///e:/Projetos/Trabalho/Screen%20Share/docs/DATABASE_MAP.md) — Estrutura de tabelas SQLite e arquivos que a utilizam.
* **Deploy:** [DEPLOY_MAP.md](file:///e:/Projetos/Trabalho/Screen%20Share/docs/DEPLOY_MAP.md) — Inicialização local, build, variáveis de ambiente e arquivos de deploy.

---

## Regras para futuras IAs
“Antes de usar busca global, @codebase ou varrer o projeto inteiro, consulte primeiro este arquivo e o mapa específico da área afetada. Abra apenas os arquivos indicados nos mapas. Se precisar consultar arquivo fora do mapa, explique o motivo antes. Após alterar estrutura, rotas, endpoints, banco, configuração, comandos, deploy ou responsabilidade de arquivos, atualize o mapa correspondente.”

---

## Áreas Sensíveis e Cuidados
* **Mediasoup Workers e Portas UDP:** A faixa de portas `rtcMinPort` (40000) e `rtcMaxPort` (40100) deve estar liberada no Firewall. Modificações em [mediasoup-manager.js](file:///e:/Projetos/Trabalho/Screen%20Share/server/mediasoup-manager.js) podem interromper o tráfego de mídia.
* **IP Anunciado (announcedIp / publicAnnouncedIp):** Sem o IP anunciado correto nas configurações, os candidatos ICE não serão validados e a transmissão ficará travada em "Conectando..." sem áudio ou vídeo.
* **Rede Local (HTTPS):** APIs do navegador como `navigator.mediaDevices.getDisplayMedia` exigem contexto seguro (localhost ou HTTPS). O servidor obrigatoriamente roda em HTTPS na LAN usando os certificados locais em `/certs`.

---

## Convenções de Código
* **Módulos:** O backend usa ES Modules (`import`/`export` em arquivos `.js`). O `package.json` possui `"type": "module"`.
* **Empacotamento:** O frontend usa JS moderno em `/src` que é empacotado pelo `esbuild` em arquivos únicos `/public/*/app.bundle.js`. **Não modifique diretamente os arquivos bundle.js**. Modifique sempre em `/src` e rode `npm run build`.

---

## Histórico de Criação
* **2026-06-24:** Criação inicial dos mapas de sistema para otimização de contexto e redução de consumo de tokens por IAs.
