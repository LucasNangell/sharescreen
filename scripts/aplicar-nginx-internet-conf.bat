@echo off
chcp 65001 >nul
title ShareScreen — aplicar NGINX internet (meet + signal)
setlocal

set "ORIGEM=%~dp0..\nginx\cgrafsysvm-sharescreen-internet-locations.conf"
set "DESTINO=\\cgrafsysvm\nginx\conf\cgrafsysvm-sharescreen-internet-locations.conf"

echo.
echo === NGINX internet ShareScreen ===
echo Origem:  %ORIGEM%
echo Destino: %DESTINO%
echo.

if not exist "%ORIGEM%" (
    echo [ERRO] Arquivo origem ausente.
    pause
    exit /b 1
)

copy /Y "%ORIGEM%" "%DESTINO%"
if errorlevel 1 (
    echo [ERRO] Falha ao copiar. Verifique acesso a \\cgrafsysvm\nginx\conf\
    pause
    exit /b 1
)

echo [OK] Config copiada.
echo.
echo No cgrafsysvm (Administrador):
echo   cd C:\nginx
echo   nginx.exe -t -p C:\nginx -c conf\nginx.conf
echo   nginx.exe -s reload -p C:\nginx -c conf\nginx.conf
echo.
echo Confirme que start-producao.bat foi reiniciado apos o deploy ^(server\signaling-http.js^).
echo Teste: POST https://cgrafsysvm.camara.leg.br/api/signal/send nao deve retornar 404 nginx.
echo.
pause
