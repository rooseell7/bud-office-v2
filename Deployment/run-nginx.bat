@echo off
set NGINX_DIR=%~dp0..\nginx
set CONFIG=%~dp0nginx.conf
if not exist "%NGINX_DIR%\nginx.exe" (
  echo [ERROR] nginx.exe not found in %NGINX_DIR%
  echo 1. Download Nginx for Windows from nginx.org
  echo 2. Extract to F:\BUD_office\nginx
  pause
  exit /b 1
)
"%NGINX_DIR%\nginx.exe" -p "%NGINX_DIR%" -c "%CONFIG%" -t
if errorlevel 1 (
  echo [ERROR] Config check failed
  pause
  exit /b 1
)
start "" "%NGINX_DIR%\nginx.exe" -p "%NGINX_DIR%" -c "%CONFIG%"
echo Nginx started.
pause
