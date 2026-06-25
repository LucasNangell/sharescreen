@echo off
chcp 65001 >nul
title ShareScreen - Verificar instalacao
cd /d "%~dp0"

set SHARESCREEN_SERVER_HOST=10.1.1.73
set ANNOUNCED_IP=10.1.1.73

echo.
echo === Verificacao ShareScreen (servidor) ===
echo Nao executa npm install — apenas confere arquivos.
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Instale Node.js 18 LTS: https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules\mediasoup\worker\out\Release\mediasoup-worker.exe" (
    echo [ERRO] mediasoup-worker.exe ausente.
    echo        O pacote foi copiado incompleto. No PC de desenvolvimento rode: preparar-deploy.bat
    echo        e copie de novo a pasta pacote-servidor inteira.
    pause
    exit /b 1
)

if not exist "public\host\app.bundle.js" (
    echo [ERRO] public\host\app.bundle.js ausente.
    pause
    exit /b 1
)

if not exist "public\client\app.bundle.js" (
    echo [ERRO] public\client\app.bundle.js ausente.
    pause
    exit /b 1
)

if not exist "certs\server.crt" (
    echo [ERRO] certs\server.crt ausente.
    pause
    exit /b 1
)

if not exist "server\index.js" (
    echo [ERRO] server\index.js ausente.
    pause
    exit /b 1
)

if not exist "src\shared\recording-filename.js" (
    echo [ERRO] src\shared\recording-filename.js ausente.
    echo        Rode preparar-deploy.bat no PC de desenvolvimento e copie o pacote de novo.
    pause
    exit /b 1
)

echo [OK] Todos os arquivos necessarios estao presentes.
echo.
echo Inicie o servidor com: start-producao.bat
echo URLs Nginx: http://cgrafsysvm/host/  e  http://cgrafsysvm/meet/
echo.
pause
