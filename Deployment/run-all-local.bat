@echo off
cd /d F:\BUD_office\Deployment
echo 1. Starting Backend...
start "BUD Backend" cmd /k "cd /d F:\BUD_office\Backend && npm run start"
timeout /t 3 /nobreak >nul
echo 2. Starting Nginx...
call run-nginx.bat
echo.
echo Done.
echo   Local:    http://localhost
echo   By IP:    http://YOUR_IP  (run ipconfig to see IP; allow port 80: setup-firewall.bat as Admin)
pause
