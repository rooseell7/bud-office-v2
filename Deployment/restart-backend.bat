@echo off
echo === BUD Office: Restart Backend ===
echo.
echo IMPORTANT: Stop the existing backend first (Ctrl+C in the backend window).
echo Then press any key to build and start...
pause >nul

REM Build and start
echo Building backend...
cd /d F:\BUD_office\Backend
call npm run build
if errorlevel 1 (
  echo [ERROR] Build failed
  pause
  exit /b 1
)

echo.
echo Starting backend on http://127.0.0.1:3000/api
echo (Admin routes: GET/POST /api/admin/users, PATCH /api/admin/users/:id, GET /api/admin/permissions)
echo.
start "BUD Backend" cmd /k "npm run start"
timeout /t 3 /nobreak >nul
echo Backend started. Check the new window.
pause
