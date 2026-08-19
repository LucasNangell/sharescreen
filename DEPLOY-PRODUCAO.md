# Deploy em produção (10.1.1.73) — sem npm no servidor

## Resumo

| Onde | O que fazer |
|------|-------------|
| **PC de desenvolvimento** | `preparar-deploy.bat` → gera `pacote-servidor\` |
| **Servidor cgrafsysvm** | Copiar pacote + `verificar-producao.bat` + serviço NSSM |

No servidor precisa **Node.js 18+** e **NSSM já instalado**. Não rode `npm install` lá. Não copie `nssm.exe` — use o NSSM do servidor.

---

## 1. No PC de desenvolvimento

```cmd
cd /d "d:\Antigravity\Backup\ControleOBSNDI\ShareScreen"
preparar-deploy.bat
```

Isso executa: `npm install`, certificado, `build:prod`, e monta **`pacote-servidor\`** com tudo pronto (incluindo `node_modules` e `mediasoup-worker.exe`).

---

## 2. Copiar para o servidor

Se o serviço `ShareScreenLAN` **já estiver rodando**, pare-o **no cgrafsysvm** antes da cópia (`nssm stop ShareScreenLAN`). Não envie stop/start a partir do PC de desenvolvimento.

Copie **todo o conteúdo** de `pacote-servidor\` para:

```
C:\Sistemas CGraf\Screen Share
```

Substitua arquivos antigos. A pasta `node_modules` deve ir **completa**. A pasta `data\` do servidor **não** é sobrescrita (`robocopy /XD data`).

---

## 3. No servidor — primeira vez (serviço Windows)

1. Instalar [Node.js 18 LTS](https://nodejs.org/) (se ainda não tiver). NSSM já deve estar no PATH.
2. `verificar-producao.bat` — confere arquivos.
3. Feche qualquer `start-producao.bat` / Node nas portas 3443 e 3080.
4. Como Administrador: `install-servico-producao.bat`
   - Informe a conta de domínio que hoje abre o bat (UNC de gravação e DB do agente).
   - `LocalSystem` só se você digitar `CONFIRMAR` (pode quebrar UNC).
   - Confirme iniciar o serviço.
5. Confira `nssm status ShareScreenLAN` e `https://10.1.1.73:3443/api/diagnostico`.
6. Reinicie o Windows uma vez para validar Delayed Auto Start **sem login interativo**.
7. Firewall: **TCP 3443**, **UDP 40000–40100**.

`start-producao.bat` permanece como fallback **somente** se o serviço não existir ou estiver parado. Com o serviço RUNNING ele recusa subir um segundo Node.

### Comandos NSSM (equivalente manual)

Valores de `node.exe` e da pasta do app são resolvidos pelo instalador. Equivalente:

```cmd
nssm install ShareScreenLAN "C:\Program Files\nodejs\node.exe" "server\index.js"
nssm set ShareScreenLAN AppDirectory "C:\Sistemas CGraf\Screen Share"
nssm set ShareScreenLAN DisplayName "ShareScreen LAN"
nssm set ShareScreenLAN Description "Servidor ShareScreen LAN (Node + mediasoup)"
nssm set ShareScreenLAN Start SERVICE_DELAYED_AUTO_START
nssm set ShareScreenLAN DependOnService Tcpip LanmanWorkstation
nssm set ShareScreenLAN AppStdout "C:\Sistemas CGraf\Screen Share\logs\service-stdout.log"
nssm set ShareScreenLAN AppStderr "C:\Sistemas CGraf\Screen Share\logs\service-stderr.log"
nssm set ShareScreenLAN AppRotateFiles 1
nssm set ShareScreenLAN AppRotateBytes 10485760
nssm set ShareScreenLAN AppRotateOnline 1
nssm set ShareScreenLAN AppStopMethodConsole 15000
nssm set ShareScreenLAN AppRestartDelay 8000
nssm set ShareScreenLAN AppThrottle 15000
nssm set ShareScreenLAN AppExit Default Restart
nssm set ShareScreenLAN AppEnvironmentExtra SHARESCREEN_SERVER_HOST=10.1.1.73 ANNOUNCED_IP=10.1.1.73 PUBLIC_URL=https://cgrafsysvm.camara.leg.br PUBLIC_ANNOUNCED_IP=200.219.133.192 TRUST_PROXY=1 TURN_USERNAME=sharescreen TURN_PASSWORD=ShareScreenTurn2026! SHARESCREEN_RECORDINGS_DIR=\\cgrafsysvm\ApogeeFiles\Gravaçoes Treinamento
nssm set ShareScreenLAN ObjectName "DOMINIO\usuario" "senha"
nssm start ShareScreenLAN
```

Operação:

```cmd
nssm status ShareScreenLAN
nssm stop ShareScreenLAN
nssm start ShareScreenLAN
nssm restart ShareScreenLAN
nssm remove ShareScreenLAN confirm
```

Não use `scripts\liberar-portas.ps1` no start do serviço.

NSSM 2.24 **não** tem `AppKillProcessTree`. No stop ele já encerra o Node e os processos filhos (`mediasoup-worker`).

---

## 4. Deploys seguintes

No **servidor**: `nssm stop ShareScreenLAN` → copiar o pacote → `reiniciar-servico-producao.bat` (ou `nssm start`).

No **DEV**: `preparar-deploy.bat` + `deploy-producao.bat` (o robocopy avisa para parar o serviço no servidor; não dispara comando remoto).

---

## URLs

| Acesso | URL |
|--------|-----|
| Nginx host | `http://cgrafsysvm/host/` |
| Nginx clients | `http://cgrafsysvm/meet/` |
| Direto HTTPS | `https://10.1.1.73:3443/host` |
| Diagnóstico | `https://10.1.1.73:3443/api/diagnostico` |

Nginx: `nginx/nginx.conf.cgrafsysvm-completo.conf` → `\\cgrafsysvm\nginx\conf\nginx.conf`

---

## Erro comum

`mediasoup-worker.exe ausente` → o pacote foi copiado sem `node_modules` completo. Rode `preparar-deploy.bat` de novo e copie a pasta inteira.

Serviço não sobe após boot → confira Delayed Auto Start, conta com “Log on as a service”, e `logs\service-stderr.log`.

---

## Lista rápida

Ver também: `DEPLOY-COPIAR.txt`
