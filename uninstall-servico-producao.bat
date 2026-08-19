@echo off
chcp 65001 >nul
title ShareScreen - Remover servico NSSM
cd /d "%~dp0"

echo.
echo === Remover servico ShareScreenLAN ===
echo Execute como Administrador no cgrafsysvm.
echo.

net session >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Abra este arquivo como Administrador.
    pause
    exit /b 1
)

where nssm >nul 2>&1
if errorlevel 1 (
    echo [ERRO] nssm nao encontrado no PATH desta sessao.
    echo        Informe o PATH ou execute: nssm remove ShareScreenLAN confirm
    pause
    exit /b 1
)

echo Parando ShareScreenLAN...
nssm stop ShareScreenLAN
echo Removendo ShareScreenLAN...
nssm remove ShareScreenLAN confirm
set RC=%ERRORLEVEL%
if %RC% neq 0 (
    echo [ERRO] nssm remove falhou com codigo %RC%.
    pause
    exit /b %RC%
)

echo.
echo [OK] Servico removido. start-producao.bat volta a ser o fallback manual.
echo.
pause
exit /b 0
