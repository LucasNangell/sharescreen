@echo off
chcp 65001 >nul
title ShareScreen - Producao (10.1.1.73)
cd /d "%~dp0"

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
set "DEBUG_LOG=%~dp0debug-b07cf8.log"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado. Instale Node.js 18 LTS ou superior.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo Node.js %NODE_VER%

if not exist "node_modules\mediasoup\package.json" (
    echo [ERRO] Dependencias ausentes. Rode preparar-deploy.bat e copie o pacote.
    pause
    exit /b 1
)

if not exist "certs\server.crt" (
    echo [ERRO] Certificado ausente em certs\
    pause
    exit /b 1
)

if not exist "public\host\app.bundle.js" (
    echo [ERRO] Bundles ausentes. Rode preparar-deploy.bat.
    pause
    exit /b 1
)

echo.
echo Liberando portas 3443 e 3080 se estiverem em uso...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\liberar-portas.ps1" -Ports 3443,3080 -DebugLog "%DEBUG_LOG%" -SessionId b07cf8
if errorlevel 1 (
    echo [AVISO] Falha ao liberar portas via PowerShell — tentando metodo alternativo...
    call :kill_port_fallback 3443
    call :kill_port_fallback 3080
)

echo.
echo ========================================
echo  ShareScreen LAN - PRODUCAO
echo  Host:   https://10.1.1.73:3443/host
echo  Client: https://10.1.1.73:3443/client
echo  Nginx:  http://cgrafsysvm/host/
echo ========================================
echo  Ctrl+C para encerrar
echo.

node server\index.js
set EXIT_CODE=%ERRORLEVEL%
if %EXIT_CODE% neq 0 (
    echo.
    echo [ERRO] Servidor encerrou com codigo %EXIT_CODE%.
    pause
)
exit /b %EXIT_CODE%

:kill_port_fallback
set "_PORT=%~1"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%_PORT%" ^| findstr /i "LISTENING OUVINDO"') do (
    if not "%%a"=="0" (
        echo   Porta %_PORT% — encerrando PID %%a
        taskkill /PID %%a /F >nul 2>&1
    )
)
exit /b 0
