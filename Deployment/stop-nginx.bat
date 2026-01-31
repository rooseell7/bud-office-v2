@echo off
set NGINX_DIR=%~dp0..\nginx
set CONFIG=%~dp0nginx.conf
if not exist "%NGINX_DIR%\nginx.exe" (
  echo [ERROR] nginx.exe not found in %NGINX_DIR%
  pause
  exit /b 1
)
"%NGINX_DIR%\nginx.exe" -p "%NGINX_DIR%" -c "%CONFIG%" -s stop
echo Nginx stopped.
pause
