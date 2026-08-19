@echo off
chcp 65001 >nul
title ShareScreen - Reiniciar servico NSSM
cd /d "%~dp0"

echo.
echo === Reiniciar servico ShareScreenLAN ===
echo Execute no cgrafsysvm (nao e comando remoto).
echo.

where nssm >nul 2>&1
if errorlevel 1 (
    echo [ERRO] nssm nao encontrado no PATH desta sessao.
    echo        Alternativa: nssm restart ShareScreenLAN
    pause
    exit /b 1
)

sc query ShareScreenLAN >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Servico ShareScreenLAN nao esta instalado.
    echo        Rode install-servico-producao.bat como Administrador.
    pause
    exit /b 1
)

echo Reiniciando ShareScreenLAN...
nssm stop ShareScreenLAN >nul 2>&1
timeout /t 2 /nobreak >nul
nssm start ShareScreenLAN
REM nssm start devolve 1 com SERVICE_START_PENDING; isso nao e falha.
echo Aguardando o servico ficar RUNNING...
set /a _WAIT=0
:wait_running
sc query ShareScreenLAN | findstr /I /C:"RUNNING" >nul
if not errorlevel 1 goto :running_ok
sc query ShareScreenLAN | findstr /I /C:"STOPPED" >nul
if not errorlevel 1 (
    echo [ERRO] Servico parou apos o start. Veja logs\service-stderr.log
    nssm status ShareScreenLAN
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul
set /a _WAIT+=2
if %_WAIT% LSS 45 goto :wait_running
echo [ERRO] Timeout aguardando RUNNING. Veja logs\service-stderr.log
nssm status ShareScreenLAN
pause
exit /b 1

:running_ok
nssm status ShareScreenLAN
echo.
echo Diagnostico: https://10.1.1.73:3443/api/diagnostico
echo.
pause
exit /b 0
