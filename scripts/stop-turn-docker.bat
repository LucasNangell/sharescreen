@echo off
chcp 65001 >nul
title ShareScreen TURN — parar Docker
set "CONTAINER=sharescreen-turn"

where docker >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Docker nao encontrado.
    pause
    exit /b 1
)

docker stop %CONTAINER% >nul 2>&1
docker rm %CONTAINER% >nul 2>&1
echo Container %CONTAINER% encerrado e removido.
pause
