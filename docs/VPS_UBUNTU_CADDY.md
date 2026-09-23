# VPS Ubuntu com Caddy e WebRTC

O Caddy publica a interface HTTPS e o WebSocket, mas não encaminha a mídia do
WebRTC. O servidor mediasoup precisa anunciar um IP acessível pela internet e
receber diretamente o intervalo de portas RTC.

No ambiente do serviço `sharescreen`, defina valores próprios da VPS:

```ini
PUBLIC_URL=https://seu-dominio.exemplo
SHARESCREEN_SERVER_HOST=seu-dominio.exemplo
ANNOUNCED_IP=IP_PUBLICO_DA_VPS
PUBLIC_ANNOUNCED_IP=IP_PUBLICO_DA_VPS
TRUST_PROXY=1
```

Abra no firewall local e no firewall/provedor da VPS, para o IP público dela:

```bash
sudo ufw allow 40000:40100/udp
sudo ufw allow 40000:40100/tcp
```

As portas 80 e 443 continuam sendo atendidas pelo Caddy. Não é necessário nem
correto tentar fazer proxy da faixa UDP pelo Caddy.

Depois de salvar o ambiente do serviço, execute o deploy:

```bash
sudo systemctl stop sharescreen
sudo -u sharescreen git -C /opt/sharescreen/app pull --ff-only
sudo -u sharescreen bash -c 'cd /opt/sharescreen/app && npm ci && npm run build:prod && npm run check'
sudo systemctl start sharescreen
```

Verifique `https://seu-dominio.exemplo/api/info`: `iceAnnouncedHosts` deve
conter o IP público, nunca somente um IP privado como `10.x`, `172.16-31.x` ou
`192.168.x`.
