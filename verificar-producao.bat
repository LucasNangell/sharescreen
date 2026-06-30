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

if not exist "server\client-db.js" (
    echo [ERRO] server\client-db.js ausente.
    pause
    exit /b 1
)

if not exist "scripts\liberar-portas.ps1" (
    echo [ERRO] scripts\liberar-portas.ps1 ausente.
    echo        Rode preparar-deploy.bat no PC de desenvolvimento e copie o pacote de novo.
    pause
    exit /b 1
)

if not exist "node_modules\better-sqlite3\build\Release\better_sqlite3.node" (
    echo [ERRO] better-sqlite3 nativo ausente.
    echo        Rode preparar-deploy.bat no PC de desenvolvimento e copie o pacote de novo.
    pause
    exit /b 1
)

if not exist "data" mkdir "data"
echo probe> "data\.write-probe" 2>nul
if errorlevel 1 (
    echo [ERRO] Pasta data\ sem permissao de escrita.
    echo        No servidor, execute fix-data-permissoes.bat como Administrador.
    pause
    exit /b 1
)
del "data\.write-probe" >nul 2>&1

echo [OK] Todos os arquivos necessarios estao presentes.
echo.
echo Variaveis de producao (start-producao.bat):
echo   PUBLIC_URL=https://cgrafsysvm.camara.leg.br
echo   TURN_URLS=turns:cgrafsysvm.camara.leg.br:443?transport=tcp
echo.
echo Inicie o servidor com: start-producao.bat
echo TURN: eturnal em "C:\Program Files\eturnal" (TLS :5349, demux NGINX :443)
if exist "C:\Program Files\eturnal\etc\eturnal.yml" (
    echo [OK] eturnal.yml em C:\Program Files\eturnal\etc\
) else (
    echo [AVISO] eturnal.yml nao encontrado — confira instalacao eturnal
)
echo NGINX demux 443: cd C:\nginx ^&^& nginx.exe -t -p C:\nginx -c conf\nginx.conf
echo URLs internas: https://cgrafsysvm.redecamara.camara.gov.br/host/ e /client/
echo URL externa:    https://cgrafsysvm.camara.leg.br/meet/?token=...^&nome=...
echo Verifique Node: GET https://cgrafsysvm.camara.leg.br/api/info -^> turnEnabled:true
echo.
pause
