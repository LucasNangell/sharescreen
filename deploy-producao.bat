@echo off
chcp 65001 >nul
title ShareScreen - Deploy para producao
cd /d "%~dp0"

set "ORIGEM=%~dp0pacote-servidor"
set "DESTINO=\\cgrafsysvm\Sistemas CGraf\Screen Share"

echo.
echo === Deploy ShareScreen para producao ===
echo Origem:  %ORIGEM%
echo Destino: %DESTINO%
echo.

if not exist "%ORIGEM%\server\index.js" (
    echo [ERRO] Pacote nao encontrado. Execute primeiro: preparar-deploy.bat
    pause
    exit /b 1
)

if not exist "%DESTINO%" (
    echo Criando pasta de destino...
    mkdir "%DESTINO%" 2>nul
)

echo Liberando portas no servidor local (se este for o host)...
call :kill_port 3443
call :kill_port 3080
timeout /t 1 /nobreak >nul

echo Copiando arquivos (robocopy /MIR — pasta data\ do servidor preservada)...
robocopy "%ORIGEM%" "%DESTINO%" /MIR /MT:8 /R:2 /W:5 /NFL /NDL /NP /XD data
set RC=%ERRORLEVEL%
if %RC% GEQ 8 (
    echo [ERRO] Robocopy falhou com codigo %RC%
    pause
    exit /b %RC%
)

echo.
echo [OK] Deploy concluido.
echo No servidor: verificar-producao.bat  depois  start-producao.bat
echo.
pause
exit /b 0

:kill_port
set "_PORT=%~1"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%_PORT%" ^| findstr "LISTENING"') do (
    if not "%%a"=="0" taskkill /PID %%a /F >nul 2>&1
)
exit /b 0
