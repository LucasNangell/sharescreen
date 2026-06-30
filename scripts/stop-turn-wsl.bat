@echo off
chcp 65001 >nul
title ShareScreen TURN — parar WSL

where wsl >nul 2>&1
if errorlevel 1 (
    echo WSL nao encontrado.
    pause
    exit /b 1
)

wsl bash -lc "sudo pkill -f 'turnserver.*turnserver.wsl.conf' 2>/dev/null || true; sudo rm -f /var/run/sharescreen-turn.pid 2>/dev/null || true"
echo turnserver WSL encerrado.
pause
