@echo off
chcp 65001 >nul
title ShareScreen — aplicar Fase 1 WSS (manual no cgrafsysvm)
REM Execute ESTE arquivo no cgrafsysvm como Administrador, apos copiar arquivos do deploy.

echo.
echo === Fase 1: WSS externo ===
echo.
echo 1. Copiar do PC de dev para o servidor:
echo    - deploy-producao.bat  (ou robocopy pacote-servidor -^> Screen Share)
echo    - nginx\nginx.conf.cgrafsysvm-producao.conf -^> C:\nginx\conf\nginx.conf
echo    - nginx\cgrafsysvm-sharescreen-internet-locations.conf -^> C:\nginx\conf\
echo.
echo 2. NGINX (como Admin):
echo    cd C:\nginx
echo    nginx.exe -t -p C:\nginx -c conf\nginx.conf
echo    nginx.exe -s reload -p C:\nginx -c conf\nginx.conf
echo.
echo 3. Reiniciar ShareScreen:
echo    start-producao.bat
echo.
echo 4. Validar:
echo    scripts\verificar-wss-externo.bat
echo    Se OK no servidor mas falha em 4G: scripts\chamado-infra-wss.txt
echo.
pause
