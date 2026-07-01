@echo off
chcp 65001 >nul
title ShareScreen — deploy LAN + 4G (meet externo)
cd /d "%~dp0\.."

echo.
echo === Deploy completo: LAN + 4G ===
echo.

call preparar-deploy.bat
if errorlevel 1 exit /b 1

call deploy-producao.bat
if errorlevel 1 exit /b 1

call scripts\aplicar-nginx-internet-conf.bat
if errorlevel 1 exit /b 1

echo.
echo === Arquivos prontos — NAO reinicia servicos automaticamente ===
echo.
echo No cgrafsysvm (voce executa manualmente):
echo   1. Encerre start-producao.bat anterior (Ctrl+C)
echo   2. Rode start-producao.bat
echo   3. cd C:\nginx ^&^& nginx.exe -t -p C:\nginx -c conf\nginx.conf
echo   4. nginx.exe -s reload -p C:\nginx -c conf\nginx.conf
echo   5. scripts\validar-meet-externo.bat
echo.
pause
