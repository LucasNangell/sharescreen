@echo off
chcp 65001 >nul
REM Executar NO cgrafsysvm como Administrador
title ShareScreen — aplicar eturnal + demux NGINX
setlocal

set "ETURNAL_HOME=C:\Program Files\eturnal"
set "ETURNAL_CMD=%ETURNAL_HOME%\bin\eturnal.cmd"

if not exist "%ETURNAL_CMD%" (
    echo [ERRO] eturnal.cmd nao encontrado em %ETURNAL_HOME%\bin
    pause
    exit /b 1
)

echo Instalacao eturnal: %ETURNAL_HOME%
echo.

echo === 1. Firewall eturnal (interno) ===
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-eturnal-firewall.ps1"
if errorlevel 1 echo [AVISO] Firewall pode exigir elevacao.

echo.
echo === 2. Certificado TLS eturnal (copia local + permissoes) ===
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-eturnal-tls.ps1"
if errorlevel 1 echo [AVISO] setup-eturnal-tls falhou — confira cert em etc\ssl\

echo.
echo === 3. Servico eturnal (restart carrega eturnal.yml) ===
cd /d "%ETURNAL_HOME%\bin"

call "%ETURNAL_CMD%" list 2>nul | findstr /I "eturnal_1.12.2" >nul
if errorlevel 1 (
    echo Servico nao instalado — instalando eturnal_1.12.2...
    call "%ETURNAL_CMD%" install
    if errorlevel 1 (
        echo [ERRO] eturnal install falhou.
        goto :nginx
    )
)

call "%ETURNAL_CMD%" ping >nul 2>&1
if errorlevel 1 (
    echo Iniciando servico eturnal...
    call "%ETURNAL_CMD%" start
) else (
    echo Reiniciando servico eturnal ^(aplica nova config^)...
    call "%ETURNAL_CMD%" restart
)
if errorlevel 1 (
    echo [AVISO] start/restart retornou erro — tente manualmente:
    echo   cd "%ETURNAL_HOME%\bin"
    echo   eturnal.cmd restart
)

timeout /t 4 /nobreak >nul
echo --- log eturnal (ultimas linhas) ---
powershell -NoProfile -Command "if (Test-Path '%ETURNAL_HOME%\log\eturnal.log') { Get-Content '%ETURNAL_HOME%\log\eturnal.log' -Tail 8 } else { Write-Host 'Log ainda nao criado' }"

:nginx
echo.
echo === 4. NGINX demux 443 ===
cd /d C:\nginx
if not exist nginx.exe (
    echo [ERRO] C:\nginx\nginx.exe ausente.
    goto :done
)
nginx.exe -t -p C:\nginx -c conf\nginx.conf
if errorlevel 1 (
    echo [ERRO] nginx -t falhou.
    goto :done
)
nginx.exe -s reload -p C:\nginx -c conf\nginx.conf
echo [OK] NGINX reload solicitado.

echo.
echo === 5. Validacao rapida ===
echo (curl com --ssl-no-revoke evita erro de revogacao offline no Windows)
where curl >nul 2>&1
if not errorlevel 1 (
    curl --ssl-no-revoke -sS -m 15 "https://cgrafsysvm.camara.leg.br/api/info"
    echo.
) else (
    echo curl ausente — teste no Chrome: https://cgrafsysvm.camara.leg.br/api/info
)
powershell -NoProfile -Command "Test-NetConnection -ComputerName 127.0.0.1 -Port 5349 -WarningAction SilentlyContinue | Select-Object TcpTestSucceeded"
powershell -NoProfile -Command "Test-NetConnection -ComputerName 127.0.0.1 -Port 8443 -WarningAction SilentlyContinue | Select-Object TcpTestSucceeded"

echo.
echo === 6. WSS + buildId ===
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0verificar-wss-externo.ps1"

:done
echo.
echo Reinicie start-producao.bat se o Node ainda nao estiver rodando.
pause
