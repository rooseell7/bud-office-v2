@echo off
chcp 65001 >nul
setlocal

set ROOT=%~dp0..
set FRONTEND=%ROOT%\Frontend
set DEPLOY=%ROOT%\Deployment
set DEPLOY_WWW=%DEPLOY%\deploy-package\www
set ZIP_FILE=%DEPLOY%\bud-office-frontend.zip

echo ========================================
echo   BUD Office - Build + Deploy Frontend
echo ========================================
echo.

:: 1. Build Frontend
echo [1/4] Building Frontend...
cd /d "%FRONTEND%"
call npm run build
if errorlevel 1 (
  echo [ERROR] Build failed
  pause
  exit /b 1
)
echo [OK] Build done.
echo.

:: 2. Clear old www
echo [2/4] Preparing deploy-package\www...
if exist "%DEPLOY_WWW%" rd /s /q "%DEPLOY_WWW%"
mkdir "%DEPLOY_WWW%"
echo [OK] www cleared.
echo.

:: 3. Copy dist to www
echo [3/4] Copying dist to deploy-package\www...
xcopy "%FRONTEND%\dist\*" "%DEPLOY_WWW%\" /E /I /Y /Q >nul
echo [OK] Files copied.
echo.

:: 4. Create zip for server upload
echo [4/4] Creating zip for server...
powershell -NoProfile -Command "Compress-Archive -Path '%DEPLOY_WWW%\*' -DestinationPath '%ZIP_FILE%' -Force"
if errorlevel 1 (
  echo [WARN] Zip failed - copy files manually
) else (
  echo [OK] Created: bud-office-frontend.zip
)
echo.

echo ========================================
echo   Done
echo ========================================
echo.
echo Local (localhost):
echo   Nginx already uses Frontend\dist - just refresh browser (Ctrl+F5)
echo   To reload nginx: run reload-nginx.bat
echo.
echo Server (95.47.196.98):
echo   1. Upload: Deployment\bud-office-frontend.zip
echo   2. On server: unzip -o bud-office-frontend.zip -d /var/www/bud-office/
echo   Or upload folder deploy-package\www\* to /var/www/bud-office/
echo.
pause
