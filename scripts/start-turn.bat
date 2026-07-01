@echo off
chcp 65001 >nul
title ShareScreen TURN (coturn)
cd /d "%~dp0\.."

set "CONF=%~dp0..\turn\turnserver.conf"
set "TURN_EXE="

where turnserver >nul 2>&1
if not errorlevel 1 set "TURN_EXE=turnserver"

if not defined TURN_EXE if exist "C:\coturn\turnserver.exe" set "TURN_EXE=C:\coturn\turnserver.exe"
if not defined TURN_EXE if exist "C:\Program Files\coturn\turnserver.exe" set "TURN_EXE=C:\Program Files\coturn\turnserver.exe"

if not defined TURN_EXE (
    echo [ERRO] turnserver nao encontrado.
    echo Instale coturn e adicione ao PATH, ou copie turnserver.exe para C:\coturn\
    echo Download: https://github.com/coturn/coturn
    pause
    exit /b 1
)

if not exist "%CONF%" (
    echo [ERRO] Config ausente: %CONF%
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
echo ========================================
echo  ShareScreen TURN (coturn)
echo  UDP/TCP 3478  |  TURNS 5349
echo  Conf: %CONF%
echo ========================================
echo  Peça a infra para encaminhar 3478 e 5349
echo  do VIP publico (200.219.133.x) para este servidor.
echo  Ctrl+C para encerrar
echo.

"%TURN_EXE%" -c "%CONF%"
pause
