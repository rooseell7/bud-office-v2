@echo off
setlocal EnableExtensions
title BUD Office - run-prod-one (frontend build + sync + backend prod)
cd /d "%~dp0"

echo ===============================================
echo Bud Office - run-prod-one (frontend build + sync + backend prod)
echo ===============================================
echo.

set "BACKEND_DIR=%cd%"
set "PUBLIC_DIR=%BACKEND_DIR%\public"
set "FRONTEND_DIR=%FRONTEND_DIR%"

rem Resolve frontend dir
if not "%FRONTEND_DIR%"=="" goto fe_check
set "FRONTEND_DIR=%BACKEND_DIR%\..\BUD_OFFICE_frontend_v2.1"
:fe_check
if exist "%FRONTEND_DIR%\package.json" goto fe_ok
echo [frontend] FRONTEND_DIR not found.
echo To set manually (example):
echo   set FRONTEND_DIR=F:\path\to\BUD_OFFICE_frontend_v2.1
echo   run-prod-one.bat
echo.
goto backend_only

:fe_ok
echo [frontend] Using: %FRONTEND_DIR%
echo [frontend] Building: npm run build
pushd "%FRONTEND_DIR%"
npm run build
if errorlevel 1 goto fail
popd

echo [frontend] Sync dist -> backend\public
if not exist "%PUBLIC_DIR%" mkdir "%PUBLIC_DIR%"
rem robocopy exit codes: 0-7 are success, >=8 is failure
robocopy "%FRONTEND_DIR%\dist" "%PUBLIC_DIR%" /MIR /NFL /NDL /NJH /NJS /NP
if errorlevel 8 goto fail
echo [frontend] Sync done.
echo.

:backend_only
echo [backend] Installing/building/starting prod...
if exist node_modules\ goto deps_ok
echo [backend] Installing deps: npm ci --legacy-peer-deps
npm ci --legacy-peer-deps
if errorlevel 1 goto fail
:deps_ok

echo [backend] Building: npm run build
npm run build
if errorlevel 1 goto fail

echo [backend] Starting prod: npm run start:prod
echo Press CTRL+C to stop.
npm run start:prod

echo.
echo [backend] Process exited.
pause
exit /b 0

:fail
echo.
echo [backend] FAILED (code=%errorlevel%).
pause
exit /b 1
