@echo off
cd /d "%~dp0"
set ROOT=%~dp0..

if "%1"=="" (
  set "E2E_BASE_URL=http://95.47.196.98"
) else (
  set "E2E_BASE_URL=%~1"
)
set "E2E_EMAIL=admin@buduy.local"
set "E2E_PASSWORD=admin123"

echo ========================================
echo   BUD Office E2E (remote)
echo ========================================
echo   E2E_BASE_URL=%E2E_BASE_URL%
echo.

cd /d "%ROOT%\Frontend"
call npm run e2e
exit /b %errorlevel%
