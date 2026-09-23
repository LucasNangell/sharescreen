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
sudo ufw reload
```

As portas 80 e 443 continuam sendo atendidas pelo Caddy. Não é necessário nem
correto tentar fazer proxy da faixa UDP pelo Caddy.

Se a VPS também usa Coturn como fallback, libere as portas do listener e a
faixa de relay configurada no `turnserver.conf`, tanto no UFW quanto no firewall
do provedor. Exemplo para uma faixa de relay reduzida:

```bash
sudo ufw allow 3478/udp
sudo ufw allow 3478/tcp
sudo ufw allow 5349/tcp
sudo ufw allow 49160:49200/udp
sudo ufw allow 49160:49200/tcp
sudo ufw reload
```

O `turnserver.conf` correspondente deve conter `min-port=49160` e
`max-port=49200`. A presença de `TURN_USERNAME` e `TURN_PASSWORD` no ambiente
apenas anuncia o TURN ao navegador; não inicia o Coturn nem abre suas portas.

Com uma transmissão ativa, confirme que o mediasoup está escutando na faixa e
que o Coturn, quando usado, está realmente ativo:

```bash
sudo ss -lunp | grep -E ':(400[0-9]{2}|40100)\b'
sudo ss -lntp | grep -E ':(400[0-9]{2}|40100)\b'
sudo systemctl status coturn --no-pager -l
sudo ss -lntup | grep -E ':(3478|5349)\b'
```

Também é obrigatório abrir as mesmas portas no firewall/painel de rede do
provedor da VPS; o UFW sozinho não remove bloqueios externos.

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
