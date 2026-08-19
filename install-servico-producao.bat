@echo off
chcp 65001 >nul
title ShareScreen - Instalar servico NSSM
cd /d "%~dp0"

echo.
echo === Instalar servico ShareScreenLAN (NSSM ja instalado no servidor) ===
echo Execute como Administrador no cgrafsysvm.
echo Este script NAO fala com outras maquinas.
echo.

net session >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Abra este arquivo como Administrador.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-servico-producao.ps1"
if errorlevel 1 (
    echo.
    echo [ERRO] Instalacao do servico falhou.
    pause
    exit /b 1
)

echo.
pause
exit /b 0
