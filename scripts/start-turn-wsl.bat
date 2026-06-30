@echo off
chcp 65001 >nul
title ShareScreen TURN (coturn WSL)
cd /d "%~dp0\.."

set "ROOT=%CD%"
set "CONF_WIN=%ROOT%\turn\turnserver.wsl.conf"
set "SSL_DIR=C:\nginx\conf\ssl"

where wsl >nul 2>&1
if errorlevel 1 (
    echo [ERRO] WSL nao encontrado.
    echo No Windows Server 1809/2019, habilite o recurso:
    echo   Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
    echo Instale uma distro (ex.: Ubuntu) e rode este script novamente.
    pause
    exit /b 1
)

wsl -e true >nul 2>&1
if errorlevel 1 (
    echo [ERRO] WSL sem distro instalada ou nao inicializada.
    echo Instale Ubuntu: wsl --install -d Ubuntu
    echo Ou abra "Ubuntu" no menu Iniciar uma vez para concluir o setup.
    pause
    exit /b 1
)

if not exist "%CONF_WIN%" (
    echo [ERRO] Config ausente: %CONF_WIN%
    pause
    exit /b 1
)

if not exist "%SSL_DIR%\cgrafsysvm-leg-chain.crt" (
    echo [ERRO] Certificado ausente: %SSL_DIR%\cgrafsysvm-leg-chain.crt
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

set "CONF_WSL="
for /f "delims=" %%p in ('wsl wslpath -a "%CONF_WIN%" 2^>nul') do set "CONF_WSL=%%p"
if not defined CONF_WSL set "CONF_WSL=/mnt/c/Sistemas CGraf/Screen Share/turn/turnserver.wsl.conf"

echo.
echo Instalando coturn no WSL (se necessario)...
wsl bash -lc "command -v turnserver >/dev/null || (sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y coturn)"
if errorlevel 1 (
    echo [ERRO] Falha ao instalar coturn no WSL.
    pause
    exit /b 1
)

echo Encerrando turnserver anterior no WSL...
wsl bash -lc "sudo pkill -f 'turnserver.*turnserver.wsl.conf' 2>/dev/null || true"

echo Iniciando turnserver no WSL (daemon)...
wsl bash -lc "sudo turnserver -c '%CONF_WSL%' --pidfile=/var/run/sharescreen-turn.pid -d"
if errorlevel 1 (
    echo [ERRO] Falha ao iniciar turnserver no WSL.
    echo Teste manual: wsl bash -lc "sudo turnserver -c '%CONF_WSL%' -o"
    pause
    exit /b 1
)

timeout /t 2 /nobreak >nul
wsl bash -lc "pgrep -a turnserver || echo [AVISO] processo turnserver nao encontrado"

echo.
echo ========================================
echo  ShareScreen TURN (WSL) — ATIVO
echo  Conf: %CONF_WIN%
echo  UDP/TCP 3478  |  TURNS 5349
echo  Relay UDP 49160-49252
echo ========================================
echo  Proximo passo: start-producao.bat (Node)
echo  Verifique: curl https://cgrafsysvm.camara.leg.br/api/info
echo  Parar: scripts\stop-turn-wsl.bat
echo ========================================
echo.
pause
