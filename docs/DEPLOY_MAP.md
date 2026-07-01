# DEPLOY MAP — ShareScreen LAN

Mapeamento de desenvolvimento, build, empacotamento, variáveis de ambiente e deploy em produção.

## Ambientes e Inicialização

A aplicação possui scripts prontos (.bat) para facilitar a execução no Windows:

### 1. Desenvolvimento (DEV Local)
* **Comando:** Executar [start-dev.bat](file:///e:/Projetos/Trabalho/Screen%20Share/start-dev.bat) ou `npm run dev`.
* **Comportamento:**
  * Define `SHARESCREEN_DEV=1` (libera endpoints `/api/admin/*`).
  * Detecta automaticamente o IPv4 LAN da maquina, define `SHARESCREEN_SERVER_HOST`/`ANNOUNCED_IP` e anuncia os IPv4 LAN validos nos candidatos ICE/WebRTC (fallback para `127.0.0.1` se nao houver LAN).
  * Grava os vídeos locais em `_dev_recordings/` na raiz do projeto.
  * Habilita a geracao e escuta de source maps no frontend, mantendo o guard de cache nas paginas Host/Client.

### 2. Produção (PROD)
* **Comando:** Executar [start-producao.bat](file:///e:/Projetos/Trabalho/Screen%20Share/start-producao.bat) ou `npm start`.
* **Comportamento:**
  * Escuta no IP oficial `10.1.1.73` e porta `3443`.
  * Grava arquivos na pasta de rede configurada em `SHARESCREEN_RECORDINGS_DIR` (UNC `\\cgrafsysvm\...`).
  * Bloqueia rotas administrativas e exige token nos uploads.
  * Executa o utilitário PowerShell `scripts/liberar-portas.ps1` para matar processos travados nas portas `3443` e `3080`.

---

## Scripts Relevantes (`package.json`)

* `npm run dev` — Executa o servidor com a flag `--dev` (modo desenvolvimento).
* `npm run build` — Compila os arquivos do frontend em `/public`.
* `npm run build:prod` — Compila minificando arquivos JS e removendo mapas de debug para produção.
* `npm run cert` / `npm run cert:prod` — Executa o gerador de certificados TLS autoassinados armazenando-os na pasta `/certs`.
* `npm run postinstall` — Copia o arquivo estático do cliente do mediasoup (`mediasoup-client.js`) para a pasta pública `/public/vendor`.

---

## Fluxo de Compilação e Deploy (PROD)

Para subir novas atualizações para o servidor de produção, siga a sequência:

1. **Preparar Pacote:** Execute o arquivo [preparar-deploy.bat](file:///e:/Projetos/Trabalho/Screen%20Share/preparar-deploy.bat).
   * Ele instala as dependências (`npm install`).
   * Gera certificados se estiverem ausentes.
   * Compila o frontend minificado (`npm run build:prod`).
   * Consolida todos os arquivos necessários para o servidor rodar dentro da pasta temporária `pacote-servidor/`.
2. **Deploy via Rede:** Execute o arquivo [deploy-producao.bat](file:///e:/Projetos/Trabalho/Screen%20Share/deploy-producao.bat).
   * Ele realiza uma cópia sincronizada via `robocopy` da pasta `pacote-servidor/` para a pasta de produção `\\cgrafsysvm\Sistemas CGraf\Screen Share`.
3. **Verificação no Servidor:** No servidor de produção, execute [verificar-producao.bat](file:///e:/Projetos/Trabalho/Screen%20Share/verificar-producao.bat) para garantir integridade e em seguida o [start-producao.bat](file:///e:/Projetos/Trabalho/Screen%20Share/start-producao.bat) para subir o serviço.

---

## Variáveis de Ambiente

As configurações são resolvidas no arquivo [default.js](file:///e:/Projetos/Trabalho/Screen%20Share/config/default.js). Abaixo estão listadas as variáveis suportadas:

| Variável de Ambiente | Uso/Significado | Exemplo comum em Produção |
| --- | --- | --- |
| `SHARESCREEN_DEV` | Define se o ambiente é de desenvolvimento. | `1` (ou vazio para produção) |
| `SHARESCREEN_SERVER_HOST` | Endereço IP principal para o Express/WebSocket escutar. | `10.1.1.73` |
| `ANNOUNCED_IP` | IP enviado nos candidatos ICE (WebRTC) para conexão local. | `10.1.1.73` |
| `PUBLIC_ANNOUNCED_IP` | IP externo anunciado caso haja conexões via Internet. | `200.219.133.192` |
| `PUBLIC_URL` | URL pública externa apontada pelo DNS do proxy corporativo. | `https://cgrafsysvm.camara.leg.br` |
| `TRUST_PROXY` | Diz ao Express para ler IPs a partir de cabeçalhos de proxy. | `1` |
| `SHARESCREEN_RECORDINGS_DIR` | Caminho físico ou rede UNC para salvar gravações do host. | `\\cgrafsysvm\ApogeeFiles\Gravaçoes Treinamento` |
| `SHARESCREEN_ROOM_PIN` | PIN exigido na entrada de espectadores (opcional). | `(Vazio = Sem PIN)` |
| `SHARESCREEN_HOST_TOKEN` | Token exigido para que o host realize upload de Lower Thirds. | `*(Token seguro gerado)*` |
| `TURN_USERNAME` | Nome de usuário configurado no TURN Server (se ativo). | `sharescreen` |
| `TURN_PASSWORD` / `TURN_CREDENTIAL` | Senha correspondente para autenticar no TURN. | `*(Senha segura)*` |
| `TURN_URLS` | Lista de servidores TURN separados por vírgula. | `turns:cgrafsysvm.camara.leg.br:443?transport=tcp` |

---

## Configuração do NGINX e TURN

### NGINX
Os arquivos de configuração do servidor NGINX para hospedar a aplicação sob HTTPS reverso estão contidos na pasta [/nginx](file:///e:/Projetos/Trabalho/Screen%20Share/nginx):
* [https-sharescreen.conf](file:///e:/Projetos/Trabalho/Screen%20Share/nginx/https-sharescreen.conf) — Configurações padrão de Proxy Pass para as portas 3443 e 3080.
* [sharescreen-static-locations.conf](file:///e:/Projetos/Trabalho/Screen%20Share/nginx/sharescreen-static-locations.conf) — Mapeamento LAN (rede interna): APIs, estáticos e gravação.
* [cgrafsysvm-sharescreen-internet-locations.conf](file:///e:/Projetos/Trabalho/Screen%20Share/nginx/cgrafsysvm-sharescreen-internet-locations.conf) — Bloco internet (`cgrafsysvm.camara.leg.br`): `/meet` com token, `/ws`, `/api/info`, `/api/registro-cliente`, `/api/lower-third`, `/lt-videos/`; bloqueia `/host` e `/client`.
* [sharescreen-turns-443-stream.inc](file:///e:/Projetos/Trabalho/Screen%20Share/nginx/sharescreen-turns-443-stream.inc) — Demux TLS na 443 (HTTPS → 8443, TURN → eturnal 5349).
* [nginx.conf.cgrafsysvm-producao.conf](file:///e:/Projetos/Trabalho/Screen%20Share/nginx/nginx.conf.cgrafsysvm-producao.conf) — Referência completa do `nginx.conf` de produção com demux.

**Deploy NGINX:** copiar `nginx.conf.cgrafsysvm-producao.conf` para `\\cgrafsysvm\nginx\conf\nginx.conf` (ou aplicar o bloco `stream` + `listen 127.0.0.1:8443`) e executar:

```powershell
cd C:\nginx
.\nginx.exe -t -p C:\nginx -c conf\nginx.conf
.\nginx.exe -s reload -p C:\nginx -c conf\nginx.conf
```

### TURN Server — eturnal (Windows)

O link externo precisa de **eturnal** (serviço Windows) + **ShareScreen (Node)**:

| Programa | O que faz | Como iniciar |
| --- | --- | --- |
| **ShareScreen (Node)** | Página, API, WebSocket, vídeo na LAN | `start-producao.bat` |
| **eturnal** | Relay TURN para convidados da internet (TURNS:443) | Serviço Windows em `C:\eturnal` |

O Node **não** inicia o TURN. Sem eturnal ativo ou sem demux NGINX na 443, o convidado externo abre a página mas a mídia fica em "Conectando...".

**Config:** [turn/eturnal.yml](file:///e:/Projetos/Trabalho/Screen%20Share/turn/eturnal.yml) → produção: `C:\eturnal\etc\eturnal.yml`  
Certificados TLS: `C:\nginx\conf\ssl\cgrafsysvm-leg-chain.crt` e `.key`

#### Instalação eturnal (já feita no cgrafsysvm)

1. Binário em `C:\eturnal` (ou `\\cgrafsysvm\eturnal`)
2. Editar `etc\eturnal.yml` (credentials, `relay_ipv4_addr`, TLS 5349, relay 49160–49252)
3. Firewall interno: `scripts\setup-eturnal-firewall.ps1` (Administrador)
4. Certificado TLS local: `scripts\setup-eturnal-tls.ps1` (copia chain para `Program Files\eturnal\etc\ssl\`)
5. Reiniciar serviço eturnal: `cd "C:\Program Files\eturnal\bin"` → `eturnal.cmd restart`

**Nota Windows:** `eturnalctl` e `reload` são scripts Linux; no Windows use **`eturnal.cmd restart`**.

#### Demux NGINX (perímetro só 80/443)

- **Host principal** `cgrafsysvm.camara.leg.br` → sempre NGINX `:8443` (HTTPS, API, **WSS** `/ws`)
  - ALPN `h2` / `http/1.1` e **ALPN vazio** (WebSocket) → `:8443` via `default`
- **TURN (Fase 2):** `turn.cgrafsysvm.camara.leg.br` → eturnal `:5349` (exige DNS A + cert SAN)
- **Não** rotear ALPN vazio do host principal para eturnal — WSS e TURNS são indistinguíveis no mesmo hostname

Verificação: `scripts\verificar-wss-externo.bat` (handshake WSS + `/api/info` buildId).

**Proxy `/ws` internet:** `proxy_pass https://127.0.0.1:3443/ws` com `Connection "upgrade"` (sem upstream keepalive). Ver [`cgrafsysvm-sharescreen-internet-locations.conf`](file:///e:/Projetos/Trabalho/Screen%20Share/nginx/cgrafsysvm-sharescreen-internet-locations.conf).

**Sinalização HTTP (link `/meet?token=`):** espectadores externos usam `POST/GET /api/signal/*` (long-poll), sem WebSocket. Rotas no NGINX internet e em `server/signaling-http.js`.

#### WSS falha em 4G mas OK no servidor (perímetro)

Se `verificar-wss-externo.bat` no cgrafsysvm passa mas o browser em 4G mostra `WebSocket connection failed`, a causa é **proxy/WAF corporativo** na borda (não o ShareScreen).

1. Abrir chamado: texto em `scripts\chamado-infra-wss.txt` (passthrough TCP :443 ou WebSocket no proxy).
2. Após correção infra: `scripts\validar-meet-externo.bat` (checklist 4G + Fase 2 TURN).

#### Fase 2 — ativar TURN na 443 (quando DNS existir)

1. DNS: `turn.cgrafsysvm.camara.leg.br` A → `200.219.133.192`
2. Certificado leg com SAN `turn.cgrafsysvm.camara.leg.br` → `scripts\setup-eturnal-tls.ps1`
3. Em `start-producao.bat`: `set TURN_URLS=turns:turn.cgrafsysvm.camara.leg.br:443?transport=tcp`
4. Reiniciar eturnal + Node; validar relay no WebRTC internals (4G)

#### Ordem no cgrafsysvm

1. Confirmar eturnal ativo (`Listening on ...:5349 (tls)` no log)
2. Aplicar `nginx.conf` com demux e `nginx -t` + reload
3. `start-producao.bat` (Node)
4. `curl https://cgrafsysvm.camara.leg.br/api/info` → `"turnEnabled": true`

**Atalho (Administrador no cgrafsysvm):** `scripts\aplicar-eturnal-producao.bat` — firewall, reload eturnal, `nginx -t` + reload e teste `/api/info`.

**Legado:** scripts coturn (`start-turn.bat`, `build-coturn-windows.bat`, `turn/turnserver.conf`) — obsoletos; não usar.

#### Opção alternativa — TURN na nuvem

Substituir `TURN_URLS` por `TURN_SERVERS` (JSON) do provedor. Não requer eturnal local.

### Perímetro apenas 80/443 (internet)
| Camada | Porta | Observação |
| --- | --- | --- |
| URL, HTML, REST, WSS | 80 → 443 | NGINX proxy para Node `127.0.0.1:3443` |
| Mídia WebRTC direta | UDP 40000–40100 | Não passa por proxy HTTP; `PUBLIC_ANNOUNCED_IP` no Node |
| TURN relay | TURNS **443** TCP | Fase 2: `turns:turn.cgrafsysvm.camara.leg.br:443?transport=tcp`; demux SNI → eturnal **5349** |

Sem TURN ativo ou sem demux na 443, o convidado externo conecta (sinalização) mas a mídia fica em "Conectando...". A LAN interna não é afetada.

---

## Cuidados importantes com Deploy (Guia IA)

* **Binários Nativos do Mediasoup:** O `mediasoup` compila um binário C++ nativo chamado `mediasoup-worker.exe` (situado dentro de `node_modules/mediasoup/worker/out/Release/`).
  * **Atenção:** Você **não pode** rodar `npm install` em uma máquina (ex: Linux) e fazer deploy por cópia simples para o Windows Server, pois o worker compilado será incompatível. Sempre realize o install de dependências na máquina de build ou no servidor Windows final.
* **Liberação de Firewall:** O WebRTC/SFU exige tráfego UDP nas portas configuradas em `rtcMinPort`/`rtcMaxPort` (padrão `40000` a `40100`). O script PowerShell [liberar-portas.ps1](file:///e:/Projetos/Trabalho/Screen%20Share/scripts/liberar-portas.ps1) deve ser executado com permissões de administrador se houver bloqueios locais no Windows Server.
