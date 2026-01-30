@echo off
setlocal EnableExtensions
title BUD Office - run-prod (backend)
cd /d "%~dp0"

echo ===============================================
echo Bud Office - run-prod (backend)
echo ===============================================
echo Press CTRL+C to stop.
echo.

rem Ensure deps
if exist node_modules\ goto deps_ok
echo [backend] Installing deps: npm ci --legacy-peer-deps
npm ci --legacy-peer-deps
if errorlevel 1 goto fail
:deps_ok

rem Build if needed
if exist dist\main.js goto build_ok
echo [backend] Building: npm run build
npm run build
if errorlevel 1 goto fail
:build_ok

echo [backend] Starting prod: npm run start:prod
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
