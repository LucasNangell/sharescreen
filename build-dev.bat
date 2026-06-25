@echo off
chcp 65001 >nul
title ShareScreen - Build DEV
cd /d "%~dp0"

set SHARESCREEN_DEV=1

echo.
echo ========================================
echo  Build frontend — AMBIENTE DEV
echo  Saida: public/host e public/client
echo ========================================
echo.

if not exist "src\host\app.js" (
    echo [AVISO] src\host\app.js AUSENTE — build vai falhar.
    echo         Restaure fontes do backup externo antes de buildar.
    echo         Backup: D:\Antigravity\Backup\ControleOBSNDI\ShareScreen\src
    echo.
)

if not exist "src\client\app.js" (
    echo [AVISO] src\client\app.js AUSENTE — build vai falhar.
    echo.
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO DEV] Node.js nao encontrado.
    pause
    exit /b 1
)

call npm run build
set BUILD_EXIT=%ERRORLEVEL%

if %BUILD_EXIT% neq 0 (
    echo.
    echo [FALHA] Build DEV nao concluido. Codigo: %BUILD_EXIT%
    echo Bundles de producao em public/ permanecem intactos se build falhou antes de sobrescrever.
    pause
    exit /b %BUILD_EXIT%
)

echo.
echo [OK] Build DEV concluido. Revise diff dos bundles antes de deploy.
pause
