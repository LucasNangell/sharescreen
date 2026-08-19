@echo off
REM Variaveis de runtime de PRODUCAO.
REM Fonte unica para start-producao.bat e para o instalador NSSM.
REM Nao use este arquivo em DEV (start-dev.bat).

set SHARESCREEN_SERVER_HOST=10.1.1.73
set ANNOUNCED_IP=10.1.1.73
set PUBLIC_URL=https://cgrafsysvm.camara.leg.br
REM IP publico para candidatos ICE (espectadores externos). Obrigatorio se DNS aponta para 10.1.1.73.
set PUBLIC_ANNOUNCED_IP=200.219.133.192
set TRUST_PROXY=1

REM TURN — relay para espectadores externos (rode scripts\start-turn.bat em paralelo)
set TURN_USERNAME=sharescreen
set TURN_PASSWORD=ShareScreenTurn2026!

set SHARESCREEN_DEV=
set "SHARESCREEN_RECORDINGS_DIR=\\cgrafsysvm\ApogeeFiles\Gravaçoes Treinamento"
