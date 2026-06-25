# DEPLOY MAP — ShareScreen LAN

Mapeamento de desenvolvimento, build, empacotamento, variáveis de ambiente e deploy em produção.

## Ambientes e Inicialização

A aplicação possui scripts prontos (.bat) para facilitar a execução no Windows:

### 1. Desenvolvimento (DEV Local)
* **Comando:** Executar [start-dev.bat](file:///e:/Projetos/Trabalho/Screen%20Share/start-dev.bat) ou `npm run dev`.
* **Comportamento:**
  * Define `SHARESCREEN_DEV=1` (libera endpoints `/api/admin/*`).
  * Escuta em `127.0.0.1` na porta `3443`.
  * Grava os vídeos locais em `_dev_recordings/` na raiz do projeto.
  * Habilita a geração e escuta de source maps no frontend.

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
| `TURN_URLS` | Lista de servidores TURN separados por vírgula. | `turn:10.1.1.73:3478?transport=udp` |

---

## Configuração do NGINX e TURN

### NGINX
Os arquivos de configuração do servidor NGINX para hospedar a aplicação sob HTTPS reverso estão contidos na pasta [/nginx](file:///e:/Projetos/Trabalho/Screen%20Share/nginx):
* [https-sharescreen.conf](file:///e:/Projetos/Trabalho/Screen%20Share/nginx/https-sharescreen.conf) — Configurações padrão de Proxy Pass para as portas 3443 e 3080.
* [sharescreen-static-locations.conf](file:///e:/Projetos/Trabalho/Screen%20Share/nginx/sharescreen-static-locations.conf) — Mapeamento das pastas de arquivos estáticos públicas e de vídeos.

### TURN Server (Coturn)
* Configuração padrão no arquivo: [turnserver.conf](file:///e:/Projetos/Trabalho/Screen%20Share/turn/turnserver.conf).
* Para iniciar o servidor TURN local no Windows em paralelo com a aplicação, execute o arquivo: [start-turn.bat](file:///e:/Projetos/Trabalho/Screen%20Share/scripts/start-turn.bat).

---

## Cuidados importantes com Deploy (Guia IA)

* **Binários Nativos do Mediasoup:** O `mediasoup` compila um binário C++ nativo chamado `mediasoup-worker.exe` (situado dentro de `node_modules/mediasoup/worker/out/Release/`).
  * **Atenção:** Você **não pode** rodar `npm install` em uma máquina (ex: Linux) e fazer deploy por cópia simples para o Windows Server, pois o worker compilado será incompatível. Sempre realize o install de dependências na máquina de build ou no servidor Windows final.
* **Liberação de Firewall:** O WebRTC/SFU exige tráfego UDP nas portas configuradas em `rtcMinPort`/`rtcMaxPort` (padrão `40000` a `40100`). O script PowerShell [liberar-portas.ps1](file:///e:/Projetos/Trabalho/Screen%20Share/scripts/liberar-portas.ps1) deve ser executado com permissões de administrador se houver bloqueios locais no Windows Server.
