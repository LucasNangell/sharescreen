# Demux TLS :443
#
# Host principal -> 127.0.0.1:8443 (HTTPS, WSS com ALPN vazio, default)
# TURN -> turn.cgrafsysvm.camara.leg.br -> 127.0.0.1:5349 (Fase 2: DNS + cert SAN)
#
# IMPORTANTE: WSS e TURNS no mesmo hostname com ALPN vazio sao indistinguiveis no stream.
# Nunca mapear cgrafsysvm.camara.leg.br + ALPN vazio para eturnal.
#
# Certificado eturnal: scripts/setup-eturnal-tls.ps1 (copia chain para Program Files)

stream {
    map_hash_bucket_size 128;

    map "$ssl_preread_server_name:$ssl_preread_alpn_protocols" $tls443_backend {
        ~^turn\.cgrafsysvm\.camara\.leg\.br:         127.0.0.1:5349;
        ~:h2$                                         127.0.0.1:8443;
        ~:http/1\.1$                                  127.0.0.1:8443;
        default                                       127.0.0.1:8443;
    }

    server {
        listen 443;
        listen [::]:443;
        proxy_pass $tls443_backend;
        ssl_preread on;
        proxy_connect_timeout 10s;
        proxy_timeout 3600s;
    }
}
