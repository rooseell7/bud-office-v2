@echo off
setlocal EnableExtensions
title BUD Office - run-dev (backend dev + frontend dev)
cd /d "%~dp0"

echo ===============================================
echo Bud Office - run-dev (backend dev + frontend dev)
echo ===============================================
echo.

set "BACKEND_DIR=%cd%"
set "FRONTEND_DIR=%FRONTEND_DIR%"

rem Resolve frontend dir
if not "%FRONTEND_DIR%"=="" goto fe_check
set "FRONTEND_DIR=%BACKEND_DIR%\..\BUD_OFFICE_frontend_v2.1"
:fe_check
if exist "%FRONTEND_DIR%\package.json" goto fe_ok
echo [frontend] FRONTEND_DIR not found. Frontend dev not started.
echo To set manually:
echo   set FRONTEND_DIR=F:\path\to\BUD_OFFICE_frontend_v2.1
echo.
goto start_backend

:fe_ok
echo [frontend] Starting dev server in new window: %FRONTEND_DIR%
start "BUD_OFFICE frontend dev" cmd /k "cd /d \"%FRONTEND_DIR%\" && npm run dev"
echo.

:start_backend
echo [backend] Starting dev server in new window: %BACKEND_DIR%
start "BUD_OFFICE backend dev" cmd /k "cd /d \"%BACKEND_DIR%\" && npm run start:dev"

echo.
echo Done. Two windows should be running (backend, and frontend if found).
pause
exit /b 0
