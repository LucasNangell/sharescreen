@echo off
chcp 65001 >nul
REM Fase 2 — ativar TURN na 443 apos DNS turn.cgrafsysvm.camara.leg.br
REM Executar NO cgrafsysvm como Administrador (apos infra criar DNS + cert SAN)

echo === Fase 2: TURN via turn.cgrafsysvm.camara.leg.br ===
echo.
echo Pre-requisitos:
echo   1. DNS A: turn.cgrafsysvm.camara.leg.br -^> 200.219.133.192
echo   2. Cert leg com SAN turn.cgrafsysvm.camara.leg.br
echo   3. Demux NGINX ja roteia turn.* -^> eturnal :5349
echo.

set "BAT=%~dp0..\start-producao.bat"
if not exist "%BAT%" set "BAT=\\cgrafsysvm\Sistemas CGraf\Screen Share\start-producao.bat"

findstr /C:"turn.cgrafsysvm.camara.leg.br:443" "%BAT%" >nul 2>&1
if not errorlevel 1 (
    echo [OK] start-producao.bat ja usa turn.cgrafsysvm...
    goto :tls
)

echo Atualizando TURN_URLS em start-producao.bat...
powershell -NoProfile -Command ^
  "$p='%BAT%'; $c=Get-Content -Raw $p; $c=$c -replace 'set TURN_URLS=turns:cgrafsysvm\.camara\.leg\.br:443\?transport=tcp','set TURN_URLS=turns:turn.cgrafsysvm.camara.leg.br:443?transport=tcp'; Set-Content -Path $p -Value $c -NoNewline"
if errorlevel 1 (
    echo [ERRO] Nao foi possivel atualizar start-producao.bat
    pause
    exit /b 1
)
echo [OK] TURN_URLS atualizado.

:tls
echo.
echo === Certificado eturnal ===
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-eturnal-tls.ps1"

echo.
echo === Reiniciar eturnal + Node ===
call "%~dp0aplicar-eturnal-producao.bat"

echo.
echo Teste em 4G: WebRTC internals -^> candidato relay via turn.cgrafsysvm...
pause
