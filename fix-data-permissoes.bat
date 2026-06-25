@echo off
chcp 65001 >nul
title ShareScreen - Corrigir permissoes data/
cd /d "%~dp0"

echo.
echo === Corrigir permissoes SQLite (data/) ===
echo.

if not exist "data" mkdir "data"
if not exist "data\lower-thirds" mkdir "data\lower-thirds"

echo Removendo atributo somente-leitura...
attrib -R "data" /S /D >nul 2>&1

echo Concedendo escrita para usuarios autenticados...
icacls "data" /grant "Authenticated Users:(OI)(CI)M" /T >nul
icacls "data" /grant "Users:(OI)(CI)M" /T >nul

echo Testando escrita...
echo probe> "data\.write-probe"
if errorlevel 1 (
    echo [ERRO] Nao foi possivel escrever em data\
    echo        Execute este bat como Administrador no servidor cgrafsysvm.
    pause
    exit /b 1
)
del "data\.write-probe" >nul 2>&1

echo [OK] Pasta data/ com permissao de escrita.
echo Reinicie start-producao.bat
echo.
pause
