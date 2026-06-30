@echo off
chcp 65001 >nul
title ShareScreen TURN (coturn Docker)
cd /d "%~dp0\.."

set "ROOT=%CD%"
set "CONF=%ROOT%\turn\turnserver.docker.conf"
set "SSL_DIR=C:\nginx\conf\ssl"
set "CONTAINER=sharescreen-turn"

where docker >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Docker nao encontrado no PATH.
    echo Instale Docker Desktop ou Docker Engine no servidor e reinicie o terminal.
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Docker instalado mas o daemon nao esta rodando.
    echo Inicie o servico Docker e tente novamente.
    pause
    exit /b 1
)

for /f "delims=" %%i in ('docker info --format "{{.OSType}}" 2^>nul') do set "DOCKER_OS=%%i"
if /i "%DOCKER_OS%"=="windows" (
    echo [ERRO] Docker em modo Windows ^(OSType: windows^).
    echo A imagem coturn/coturn e Linux e NAO roda neste servidor.
    echo.
    echo Use em vez disso: scripts\start-turn-wsl.bat
    echo   ^(requer WSL + Ubuntu com coturn^)
    echo.
    echo Ou habilite containers Linux no Docker ^(Hyper-V LCOW / VM Linux^).
    pause
    exit /b 1
)

if not exist "%CONF%" (
    echo [ERRO] Config ausente: %CONF%
    pause
    exit /b 1
)

if not exist "%SSL_DIR%\cgrafsysvm-leg-chain.crt" (
    echo [ERRO] Certificado ausente: %SSL_DIR%\cgrafsysvm-leg-chain.crt
    echo Ajuste SSL_DIR neste script ou copie os certificados do NGINX.
    pause
    exit /b 1
)

if not exist "%SSL_DIR%\cgrafsysvm-leg.key" (
    echo [ERRO] Chave ausente: %SSL_DIR%\cgrafsysvm-leg.key
    pause
    exit /b 1
)

echo Liberando firewall TURN (3478 UDP/TCP, 5349 TCP, relay 49160-49252)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "New-NetFirewallRule -DisplayName 'ShareScreen TURN 3478 UDP' -Direction Inbound -Action Allow -Protocol UDP -LocalPort 3478 -Profile Any -ErrorAction SilentlyContinue | Out-Null; ^
   New-NetFirewallRule -DisplayName 'ShareScreen TURN 3478 TCP' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3478 -Profile Any -ErrorAction SilentlyContinue | Out-Null; ^
   New-NetFirewallRule -DisplayName 'ShareScreen TURNS 5349 TCP' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5349 -Profile Any -ErrorAction SilentlyContinue | Out-Null; ^
   New-NetFirewallRule -DisplayName 'ShareScreen TURN relay 49160-49252 UDP' -Direction Inbound -Action Allow -Protocol UDP -LocalPort 49160-49252 -Profile Any -ErrorAction SilentlyContinue | Out-Null"

echo.
echo Baixando imagem coturn/coturn...
docker pull coturn/coturn
if errorlevel 1 (
    echo [ERRO] Falha ao baixar imagem Docker.
    pause
    exit /b 1
)

echo Removendo container anterior (se existir)...
docker rm -f %CONTAINER% >nul 2>&1

echo Iniciando container %CONTAINER%...
docker run -d --name %CONTAINER% --restart unless-stopped ^
  -p 3478:3478/tcp -p 3478:3478/udp ^
  -p 5349:5349/tcp ^
  -p 49160-49252:49160-49252/udp ^
  -v "%CONF%:/etc/coturn/turnserver.conf:ro" ^
  -v "%SSL_DIR%:/etc/ssl/coturn:ro" ^
  coturn/coturn -c /etc/coturn/turnserver.conf

if errorlevel 1 (
    echo [ERRO] Falha ao iniciar container TURN.
    pause
    exit /b 1
)

timeout /t 2 /nobreak >nul
docker ps --filter "name=%CONTAINER%"
echo.
docker logs --tail 20 %CONTAINER%
echo.
echo ========================================
echo  ShareScreen TURN (Docker) — ATIVO
echo  Container: %CONTAINER%
echo  UDP/TCP 3478  |  TURNS 5349
echo  Relay UDP 49160-49252
echo ========================================
echo  Proximo passo: reinicie start-producao.bat (Node)
echo  Verifique: curl https://cgrafsysvm.camara.leg.br/api/info
echo  Logs: docker logs -f %CONTAINER%
echo  Parar:  docker stop %CONTAINER%
echo ========================================
echo.
pause
