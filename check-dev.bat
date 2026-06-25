@echo off
chcp 65001 >nul
title ShareScreen - Verificacao DEV
cd /d "%~dp0"

set SHARESCREEN_DEV=1

echo.
echo === Verificacao ShareScreen — AMBIENTE DEV ===
echo Workspace: %CD%
echo Producao (NAO tocada): \\cgrafsysvm\Sistemas CGraf\Screen Share
echo.

set ERR=0

where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao instalado.
    set ERR=1
) else (
    for /f "tokens=*" %%v in ('node -v') do echo [OK] Node.js %%v
)

echo.
echo --- Sintaxe server (node --check) ---
for %%f in (server\*.js) do (
    node --check "%%f" >nul 2>&1
    if errorlevel 1 (
        echo [ERRO] Sintaxe invalida: %%f
        set ERR=1
    ) else (
        echo [OK] %%f
    )
)

echo.
echo --- Fontes frontend ---
if exist "src\host\app.js" (echo [OK] src\host\app.js) else (echo [FALTA] src\host\app.js & set ERR=1)
if exist "src\client\app.js" (echo [OK] src\client\app.js) else (echo [FALTA] src\client\app.js & set ERR=1)
if exist "src\shared\signaling.js" (echo [OK] src\shared\signaling.js) else (echo [FALTA] src\shared\signaling.js)

echo.
echo --- Bundles atuais (runtime) ---
if exist "public\host\app.bundle.js" (echo [OK] public\host\app.bundle.js) else (echo [ERRO] bundle host ausente & set ERR=1)
if exist "public\client\app.bundle.js" (echo [OK] public\client\app.bundle.js) else (echo [ERRO] bundle client ausente & set ERR=1)

echo.
echo --- Backup pre-modernizacao ---
if exist "_backup_pre_modernizacao_dev\MANIFESTO-BACKUP.txt" (
    echo [OK] _backup_pre_modernizacao_dev\
    type "_backup_pre_modernizacao_dev\MANIFESTO-BACKUP.txt"
) else (
    echo [AVISO] Backup _backup_pre_modernizacao_dev nao encontrado
)

echo.
echo --- Git DEV ---
git rev-parse --abbrev-ref HEAD 2>nul
if errorlevel 1 (
    echo [AVISO] Git nao inicializado neste workspace
) else (
    git branch --show-current
)

echo.
if %ERR% equ 0 (
    echo [OK] Verificacao DEV concluida sem erros criticos.
) else (
    echo [ATENCAO] Verificacao DEV encontrou pendencias — veja PLANO-DEV-MODERNIZACAO-SHARESCREEN.md
)
echo.
pause
exit /b %ERR%
