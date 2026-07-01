@echo off
chcp 65001 >nul
title ShareScreen - Preparar pacote de producao
cd /d "%~dp0"

echo.
echo === Preparar deploy producao ===
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado.
    pause
    exit /b 1
)

echo [1/5] Dependencias...
call npm install
if errorlevel 1 (
    echo [ERRO] npm install falhou.
    pause
    exit /b 1
)

echo [2/5] Certificado TLS...
if not exist "certs\server.crt" call npm run cert:prod

echo [3/5] Build producao (minificado)...
call npm run build:prod
if errorlevel 1 (
    echo [ERRO] build:prod falhou.
    pause
    exit /b 1
)

echo [4/5] Montando pacote-servidor\...
if exist "pacote-servidor" rmdir /s /q "pacote-servidor"
mkdir "pacote-servidor"
mkdir "pacote-servidor\src\shared"

xcopy /E /I /Q /Y "certs" "pacote-servidor\certs\" >nul
xcopy /E /I /Q /Y "config" "pacote-servidor\config\" >nul
xcopy /E /I /Q /Y "public" "pacote-servidor\public\" >nul
xcopy /E /I /Q /Y "server" "pacote-servidor\server\" >nul
xcopy /E /I /Q /Y "scripts" "pacote-servidor\scripts\" >nul
xcopy /E /I /Q /Y "turn" "pacote-servidor\turn\" >nul
xcopy /E /I /Q /Y "node_modules" "pacote-servidor\node_modules\" >nul
copy /Y "src\shared\recording-filename.js" "pacote-servidor\src\shared\" >nul
copy /Y "src\shared\http-signaling-wire.js" "pacote-servidor\src\shared\" >nul
copy /Y "package.json" "pacote-servidor\" >nul
copy /Y "start-producao.bat" "pacote-servidor\" >nul
copy /Y "turn-credentials.local.bat.example" "pacote-servidor\" >nul
copy /Y "verificar-producao.bat" "pacote-servidor\" >nul
copy /Y "fix-data-permissoes.bat" "pacote-servidor\" >nul
if exist "LEIA-ME-SERVIDOR.txt" copy /Y "LEIA-ME-SERVIDOR.txt" "pacote-servidor\" >nul
if exist "data" xcopy /E /I /Q /Y "data" "pacote-servidor\data\" >nul
if exist "users.json" copy /Y "users.json" "pacote-servidor\" >nul

del /Q "pacote-servidor\public\host\*.map" 2>nul
del /Q "pacote-servidor\public\client\*.map" 2>nul
if exist "pacote-servidor\public\admin" rmdir /s /q "pacote-servidor\public\admin"

echo [5/5] Verificando mediasoup-worker...
if not exist "pacote-servidor\node_modules\mediasoup\worker\out\Release\mediasoup-worker.exe" (
    echo [ERRO] mediasoup-worker.exe ausente no pacote.
    pause
    exit /b 1
)

echo.
echo [OK] Pacote pronto: %~dp0pacote-servidor\
echo      Copie para o servidor ou rode: deploy-producao.bat
echo.
pause
