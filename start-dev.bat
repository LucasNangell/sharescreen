@echo off
chcp 65001 >nul
title ShareScreen - DESENVOLVIMENTO (NAO PRODUCAO)
cd /d "%~dp0"

REM ============================================================
REM  AMBIENTE DEV LOCAL — NAO usar em cgrafsysvm / producao
REM  NAO grava na UNC real. NAO usa IP 10.1.1.73 de producao.
REM ============================================================

set SHARESCREEN_DEV=1
set SHARESCREEN_RECORDINGS_DIR=%~dp0_dev_recordings
set LOG_LEVEL=debug
REM Opcional: descomente para exigir PIN em DEV
REM set SHARESCREEN_ROOM_PIN=dev123

if not exist "%SHARESCREEN_RECORDINGS_DIR%" mkdir "%SHARESCREEN_RECORDINGS_DIR%"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO DEV] Node.js nao encontrado. Instale Node.js 18 LTS ou superior.
    pause
    exit /b 1
)

set SHARESCREEN_DEV_IP=
for /f "usebackq tokens=*" %%i in (`node -e "const os=require('os');let ip='';for(const list of Object.values(os.networkInterfaces())){for(const item of list||[]){if(item.family==='IPv4'&&!item.internal&&!item.address.startsWith('169.254.')){ip=item.address;break;}}if(ip)break;}if(ip)console.log(ip);"`) do set SHARESCREEN_DEV_IP=%%i
if "%SHARESCREEN_DEV_IP%"=="" set SHARESCREEN_DEV_IP=127.0.0.1
set SHARESCREEN_SERVER_HOST=%SHARESCREEN_DEV_IP%
set ANNOUNCED_IP=%SHARESCREEN_DEV_IP%
set SHARESCREEN_ICE_LOCALHOST=
if not exist "node_modules\mediasoup\package.json" (
    echo [AVISO DEV] Dependencias ausentes. Execute: npm install
    pause
    exit /b 1
)

if not exist "certs\server.crt" (
    echo [AVISO DEV] Certificado ausente. Execute: npm run cert
    pause
    exit /b 1
)

echo [DEV] Liberando portas 3443 e 3080 (instancia anterior)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\liberar-portas.ps1" -Ports 3443,3080 2>nul
call :kill_port 3443
call :kill_port 3080
timeout /t 1 /nobreak >nul

echo [DEV] Compilando bundles (host/client)...
call npm run build
if errorlevel 1 (
    echo [ERRO DEV] Falha no build. Corrija os erros acima.
    pause
    exit /b 1
)

for /f "usebackq delims=" %%i in (`node -e "try{console.log(require('./public/shared/build-id.json').buildId)}catch(e){console.log('unknown')}"`) do set "DEV_BUILD_ID=%%i"

echo.
echo ========================================
echo  ShareScreen LAN - DESENVOLVIMENTO
echo  Build ID: %DEV_BUILD_ID%
echo  Host:   https://%SHARESCREEN_DEV_IP%:3443/host
echo  Client: https://%SHARESCREEN_DEV_IP%:3443/client
echo  Local:  https://127.0.0.1:3443/host
echo  ICE WebRTC: %ANNOUNCED_IP% (UDP 40000-40100)
echo  Gravacoes DEV: %SHARESCREEN_RECORDINGS_DIR%
echo ========================================
echo  IMPORTANTE: teste SOMENTE nas URLs acima.
echo  http://cgrafsysvm/ aponta para PRODUCAO (VM),
echo  nao para este servidor DEV local.
echo  PRODUCAO NAO AFETADA
echo  Nao rode start-producao.bat neste ambiente
echo  Ctrl+C para encerrar
echo.

node server\index.js --dev
if errorlevel 1 (
    echo.
    echo [ERRO DEV] Servidor encerrou com falha.
    pause
)
exit /b 0

:kill_port
set "_PORT=%~1"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%_PORT%" ^| findstr "LISTENING"') do (
    if not "%%a"=="0" taskkill /PID %%a /F >nul 2>&1
)
exit /b 0
