# Deploy em produção (10.1.1.73) — sem npm no servidor

## Resumo

| Onde | O que fazer |
|------|-------------|
| **PC de desenvolvimento** | `preparar-deploy.bat` → gera `pacote-servidor\` |
| **Servidor cgrafsysvm** | Copiar pacote + `verificar-producao.bat` + `start-producao.bat` |

No servidor **só precisa Node.js 18+**. Não rode `npm install` lá.

---

## 1. No PC de desenvolvimento

```cmd
cd /d "d:\Antigravity\Backup\ControleOBSNDI\ShareScreen"
preparar-deploy.bat
```

Isso executa: `npm install`, certificado, `build:prod`, e monta **`pacote-servidor\`** com tudo pronto (incluindo `node_modules` e `mediasoup-worker.exe`).

---

## 2. Copiar para o servidor

Copie **todo o conteúdo** de `pacote-servidor\` para:

```
C:\Sistemas CGraf\Screen Share
```

Substitua arquivos antigos. A pasta `node_modules` deve ir **completa**.

---

## 3. No servidor

1. Instalar [Node.js 18 LTS](https://nodejs.org/) (se ainda não tiver).
2. `verificar-producao.bat` — confere arquivos.
3. `start-producao.bat` — sobe o serviço.
4. Firewall: **TCP 3443**, **UDP 40000–40100**.

---

## URLs

| Acesso | URL |
|--------|-----|
| Nginx host | `http://cgrafsysvm/host/` |
| Nginx clients | `http://cgrafsysvm/meet/` |
| Direto HTTPS | `https://10.1.1.73:3443/host` |

Nginx: `nginx/nginx.conf.cgrafsysvm-completo.conf` → `\\cgrafsysvm\nginx\conf\nginx.conf`

---

## Erro comum

`mediasoup-worker.exe ausente` → o pacote foi copiado sem `node_modules` completo. Rode `preparar-deploy.bat` de novo e copie a pasta inteira.

---

## Lista rápida

Ver também: `DEPLOY-COPIAR.txt`
