@echo off
chcp 65001 >nul
title ShareScreen — verificar WSS externo
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0verificar-wss-externo.ps1" %*
set RC=%ERRORLEVEL%
pause
exit /b %RC%
