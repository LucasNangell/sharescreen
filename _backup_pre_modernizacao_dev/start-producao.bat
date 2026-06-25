@echo off
chcp 65001 >nul
title ShareScreen - Producao (10.1.1.73)
cd /d "%~dp0"

set SHARESCREEN_SERVER_HOST=10.1.1.73
set ANNOUNCED_IP=10.1.1.73

where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado. Instale Node.js 18 LTS ou superior.
    echo        https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo Node.js %NODE_VER%

if not exist "node_modules\mediasoup\package.json" (
    echo.
    echo Dependencias ausentes. Execute primeiro: instalar-producao.bat
    pause
    exit /b 1
)

if not exist "certs\server.crt" (
    echo.
    echo Certificado ausente. Execute: instalar-producao.bat
    pause
    exit /b 1
)

if not exist "public\host\app.bundle.js" (
    echo.
    echo Bundles ausentes. Execute: instalar-producao.bat
    pause
    exit /b 1
)

echo.
echo ========================================
echo  ShareScreen LAN - PRODUCAO
echo  Host:   https://10.1.1.73:3443/host
echo  Client: https://10.1.1.73:3443/client
echo ========================================
echo  Firewall: rode abrir-firewall-producao.bat como Admin
echo  UDP 40000-40100 + TCP 3443 no IP 10.1.1.73
echo  Ctrl+C para encerrar
echo.

node server\index.js
if errorlevel 1 (
    echo.
    echo [ERRO] Servidor encerrou com falha. Verifique porta 3443 livre.
    pause
)
