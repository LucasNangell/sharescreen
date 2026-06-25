# HTTPS no Nginx para ShareScreen

O Chrome **exige HTTPS** para compartilhar tela (`getDisplayMedia`).  
Com `http://cgrafsysvm/meet` a página abre, mas a captura pode falhar.

A estratégia abaixo habilita **HTTPS só para ShareScreen** (`/host`, `/meet`, `/ws`).  
Sagra, OBS, Apogee, backup etc. **continuam em HTTP** na porta 80.

---

## Passo 1 — Certificado

Escolha **uma** opção.

### Opção A — Certificado interno (recomendado na rede)

Use o certificado que a TI da Câmara já emite para `cgrafsysvm`, ou peça um `.pfx`/`.crt` + `.key`.

Converta PFX para PEM (se necessário), no PowerShell:

```powershell
# Exemplo com OpenSSL instalado
openssl pkcs12 -in certificado.pfx -nocerts -out C:\nginx\conf\ssl\cgrafsysvm.key
openssl pkcs12 -in certificado.pfx -clcerts -nokeys -out C:\nginx\conf\ssl\cgrafsysvm.crt
```

### Opção B — mkcert (rede local, confiança nos PCs)

No servidor, instale [mkcert](https://github.com/FiloSottile/mkcert) e rode:

```powershell
mkdir C:\nginx\conf\ssl -Force
mkcert -install
mkcert -cert-file C:\nginx\conf\ssl\cgrafsysvm.crt -key-file C:\nginx\conf\ssl\cgrafsysvm.key cgrafsysvm 10.1.1.73 localhost
```

Copie o arquivo `rootCA.pem` do mkcert para os PCs clientes e instale como autoridade confiável (ou rode `mkcert -install` em cada PC).

### Opção C — Autoassinado (rápido, aviso no Chrome)

No servidor com OpenSSL:

```powershell
mkdir C:\nginx\conf\ssl -Force
openssl req -x509 -nodes -days 825 -newkey rsa:2048 `
  -keyout C:\nginx\conf\ssl\cgrafsysvm.key `
  -out C:\nginx\conf\ssl\cgrafsysvm.crt `
  -subj "/CN=cgrafsysvm" `
  -addext "subjectAltName=DNS:cgrafsysvm,IP:10.1.1.73,DNS:localhost"
```

Em cada PC, abra `https://cgrafsysvm/meet/` uma vez e aceite o aviso de segurança (ou importe o `.crt` em “Autoridades confiáveis”).

---

## Passo 2 — Nginx

**IMPORTANTE:** o arquivo `https-sharescreen.conf` **não substitui** o `nginx.conf` inteiro.  
Ele só contém um bloco `server { }` para ser colocado **dentro** de `http { }`.

Se `nginx -t` disser `"server" directive is not allowed here`, você colou o trecho HTTPS
fora do `http { }`. Use o `nginx copy.conf` como base e adicione o bloco HTTPS dentro de `http { }`.

1. Crie a pasta `C:\nginx\conf\ssl\` com os arquivos `.crt` e `.key`.

2. Em `nginx.conf`, dentro de `http { }`, **após** `upstream sharescreen_node { ... }`,  
   copie o bloco `server { listen 443 ssl; ... }` de `https-sharescreen.conf`  
   (ou use o `nginx.conf` já corrigido no servidor).

3. No `server { listen 80; ... }`, **remova** o bloco inteiro `SISTEMA 4: SHARESCREEN` e coloque no lugar:

```nginx
        # ShareScreen: redireciona HTTP -> HTTPS
        location = /host { return 301 https://$host/host/; }
        location /host/  { return 301 https://$host$request_uri; }
        location = /meet { return 301 https://$host/meet/; }
        location /meet/  { return 301 https://$host$request_uri; }
        location /ws     { return 301 https://$host$request_uri; }
```

4. Ajuste os caminhos em `https-sharescreen.conf` se os certificados estiverem em outro lugar:

```nginx
ssl_certificate     C:/nginx/conf/ssl/cgrafsysvm.crt;
ssl_certificate_key C:/nginx/conf/ssl/cgrafsysvm.key;
```

5. Teste e recarregue:

```cmd
cd C:\nginx
nginx -t
nginx -s reload
```

6. Firewall: libere **TCP 443** (além do 80).

---

## Passo 3 — URLs e config

| Uso | URL |
|-----|-----|
| Host | `https://cgrafsysvm/host/` |
| Client | `https://cgrafsysvm/meet/` |
| WebSocket | `wss://cgrafsysvm/ws` (automático) |

No `config.json` do agente:

```json
"url": "https://cgrafsysvm/meet"
```

O Node (`start-producao.bat`) continua em `127.0.0.1:3443` — o Nginx termina o HTTPS na 443.

---

## HTTPS para TODO o site (opcional)

Se quiser **todos** os sistemas em HTTPS, duplique o `server { listen 80; }` inteiro como `listen 443 ssl` com os mesmos `location` e certificado.  
Isso exige testar cada app (OBS, Apogee, etc.) com HTTPS. Por isso o include separado só para ShareScreen é mais seguro.

---

## Verificar

1. `https://cgrafsysvm/meet/` abre sem erro de certificado (ou após confiar no cert).
2. F12 → Console: não deve aparecer erro de “secure context” ao compartilhar tela.
3. Log do Node: `IP anunciado WebRTC (ICE)` com `10.1.1.73` em produção.
