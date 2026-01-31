@echo off
cd /d F:\BUD_office\Deployment
echo 1. Starting Backend...
start "BUD Backend" cmd /k "cd /d F:\BUD_office\Backend && npm run start"
timeout /t 3 /nobreak >nul
echo 2. Starting Nginx...
call run-nginx.bat
echo.
echo Done. Open http://localhost in browser.
pause
