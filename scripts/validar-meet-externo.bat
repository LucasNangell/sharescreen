@echo off
chcp 65001 >nul
title ShareScreen — validar meet externo
cd /d "%~dp0\.."

set BASE=https://cgrafsysvm.camara.leg.br
set FAIL=0

echo.
echo === Validacao link externo ===
echo.

echo [1/4] GET %BASE%/api/info
powershell -NoProfile -Command ^
  "$r = Invoke-RestMethod -Uri '%BASE%/api/info' -UseBasicParsing; " ^
  "Write-Host ('  publicMeetOpen: ' + $r.publicMeetOpen); " ^
  "Write-Host ('  turnEnabled: ' + $r.turnEnabled); " ^
  "Write-Host ('  publicAnnouncedIp: ' + $r.publicAnnouncedIp); " ^
  "Write-Host ('  turnSources: ' + ($r.turnSources -join ', ')); " ^
  "if (-not $r.publicMeetOpen) { exit 2 }; if (-not $r.turnEnabled) { exit 3 }"
if errorlevel 3 (
    echo [AVISO] turnEnabled=false — configure TURN_SERVERS em start-producao.bat
    set FAIL=1
)
if errorlevel 2 (
    echo [FALHA] publicMeetOpen=false — defina PUBLIC_MEET_OPEN=1 e reinicie o Node
    set FAIL=1
)

echo.
echo [2/4] POST %BASE%/api/signal/send (sinalizacao HTTP)
powershell -NoProfile -Command ^
  "$body = 'type=entrar&enc=b64json&payload=' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('{\"papel\":\"client\",\"nome\":\"TesteValidacao\",\"meetExterno\":true}')); " ^
  "try { $r = Invoke-WebRequest -Method POST -Uri '%BASE%/api/signal/send' -ContentType 'application/x-www-form-urlencoded;charset=UTF-8' -Body $body -UseBasicParsing; " ^
  "if ($r.StatusCode -ne 200) { exit 1 }; Write-Host '  [OK] HTTP' $r.StatusCode } catch { Write-Host $_.Exception.Message; exit 1 }"
if errorlevel 1 (
    echo [FALHA] POST /api/signal/send
    set FAIL=1
) else (
    echo   [OK] Sinalizacao HTTP responde
)

echo.
echo [3/4] GET %BASE%/meet/?nome=Teste (sem token)
powershell -NoProfile -Command ^
  "try { $r = Invoke-WebRequest -Uri '%BASE%/meet/?nome=Teste' -UseBasicParsing -MaximumRedirection 5; " ^
  "if ($r.StatusCode -ge 400) { exit 1 }; Write-Host ('  [OK] HTTP ' + $r.StatusCode) } catch { Write-Host $_.Exception.Message; exit 1 }"
if errorlevel 1 (
    echo [FALHA] /meet sem token — verifique nginx e PUBLIC_MEET_OPEN
    set FAIL=1
)

echo.
echo [4/4] Checklist manual
echo   - Host: fonte selecionada e transmitindo
echo   - Convidado: Ctrl+F5 em /meet/?nome=...
echo   - Video em #video-remoto OU botao Compartilhar tela
echo   - 4G: turnSources deve incluir openrelay (ENABLE_OPENRELAY_TURN=1)
echo.

if %FAIL%==1 (
    echo Resultado: FALHAS detectadas acima
    exit /b 1
)
echo Resultado: testes automaticos OK
exit /b 0
