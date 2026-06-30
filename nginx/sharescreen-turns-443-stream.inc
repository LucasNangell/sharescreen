# Demux TLS :443 — ALPN + SNI opcional
#
# HTTPS (h2 / http/1.1) -> 127.0.0.1:8443 (NGINX / Node)
# TURN TLS (sem ALPN)     -> 127.0.0.1:5349 (eturnal)
# turn.cgrafsysvm...      -> 5349 (quando DNS existir)
#
# Node: TURN_URLS=turns:cgrafsysvm.camara.leg.br:443?transport=tcp
# Nao usar turn.* sem DNS publico — hostname inexistente quebra ICE.

stream {
    map_hash_bucket_size 128;

    map "$ssl_preread_server_name:$ssl_preread_alpn_protocols" $tls443_backend {
        ~^turn\.cgrafsysvm\.camara\.leg\.br:   127.0.0.1:5349;
        ~:h2$                                   127.0.0.1:8443;
        ~:http/1\.1$                            127.0.0.1:8443;
        default                                 127.0.0.1:5349;
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
