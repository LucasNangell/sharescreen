@echo off
chcp 65001 >nul
title ShareScreen — eturnal
setlocal

set "ETURNAL_HOME=C:\Program Files\eturnal"
set "ETURNAL_CMD=%ETURNAL_HOME%\bin\eturnal.cmd"

if not exist "%ETURNAL_CMD%" (
    echo [ERRO] eturnal nao encontrado em %ETURNAL_HOME%
    pause
    exit /b 1
)

cd /d "%ETURNAL_HOME%\bin"
echo Config: %ETURNAL_HOME%\etc\eturnal.yml
echo.

call "%ETURNAL_CMD%" list
echo.

call "%ETURNAL_CMD%" ping >nul 2>&1
if errorlevel 1 (
    echo eturnal parado — instalando/iniciando...
    call "%ETURNAL_CMD%" install 2>nul
    call "%ETURNAL_CMD%" start
) else (
    echo eturnal ativo — reiniciando para aplicar config...
    call "%ETURNAL_CMD%" restart
)

timeout /t 4 /nobreak >nul
if exist "%ETURNAL_HOME%\log\eturnal.log" (
    echo.
    echo --- log ---
    powershell -NoProfile -Command "Get-Content '%ETURNAL_HOME%\log\eturnal.log' -Tail 10"
)
pause
