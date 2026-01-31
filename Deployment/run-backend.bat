@echo off
cd /d F:\BUD_office\Backend
echo Building...
call npm run build
if errorlevel 1 (echo Build failed. & pause & exit /b 1)
echo.
echo Starting Backend on http://127.0.0.1:3000/api
echo Admin: GET/POST /api/admin/users, PATCH /api/admin/users/:id, GET /api/admin/permissions
echo.
npm run start
