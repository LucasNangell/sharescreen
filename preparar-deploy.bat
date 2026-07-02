@echo off
chcp 65001 >nul
title ShareScreen - Preparar pacote de producao
cd /d "%~dp0"

echo.
echo === Preparar deploy producao ===
echo Fonte unica: scripts\preparar-pacote-deploy.ps1
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado.
    pause
    exit /b 1
)

where powershell >nul 2>&1
if errorlevel 1 (
    echo [ERRO] PowerShell nao encontrado.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\preparar-pacote-deploy.ps1"
if errorlevel 1 (
    echo [ERRO] preparar-pacote-deploy.ps1 falhou.
    pause
    exit /b 1
)

if exist "fix-data-permissoes.bat" (
    copy /Y "fix-data-permissoes.bat" "pacote-servidor\" >nul
)

echo.
echo [OK] Pacote pronto: %~dp0pacote-servidor\
echo      Copie para o servidor ou rode: deploy-producao.bat
echo.
pause
