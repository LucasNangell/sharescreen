@echo off
chcp 65001 >nul
REM LEGADO — coturn abandonado. Use eturnal (C:\eturnal). Ver docs\DEPLOY_MAP.md
title ShareScreen TURN (coturn — OBSOLETO)
echo.
echo [OBSOLETO] Este script era para coturn/turnserver.exe.
echo.
echo TURN em producao: eturnal em C:\eturnal
echo   Config: C:\eturnal\etc\eturnal.yml  (referencia: turn\eturnal.yml)
echo   Demux NGINX: nginx\sharescreen-turns-443-stream.inc
echo.
echo Reinicie o servico eturnal no servidor se alterar a config.
pause
exit /b 1
