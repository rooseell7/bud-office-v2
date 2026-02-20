@echo off
cd /d "%~dp0"
set ROOT=%~dp0..

echo ========================================
echo   BUD Office Gates
echo ========================================
echo.

:: 1. Backend tests
echo [1/3] Backend: npm test...
cd /d "%ROOT%\Backend"
call npm test
if errorlevel 1 (
  echo [FAIL] Backend tests failed.
  exit /b 1
)
echo [OK] Backend tests passed.
echo.

:: 2. Frontend build
echo [2/3] Frontend: npm run build...
cd /d "%ROOT%\Frontend"
call npm run build
if errorlevel 1 (
  echo [FAIL] Frontend build failed.
  exit /b 1
)
echo [OK] Frontend build passed.
echo.

:: 2.5 Optional typecheck (opt-in)
if "%ENABLE_TYPECHECK%"=="1" (
  echo [Typecheck] Frontend: npm run typecheck...
  cd /d "%ROOT%\Frontend"
  call npm run typecheck
  if errorlevel 1 (
    echo [FAIL] Frontend typecheck failed.
    exit /b 1
  )
  echo [OK] Frontend typecheck passed.
  echo.
) else (
  echo Typecheck skipped. Set ENABLE_TYPECHECK=1 to enable.
  echo.
)

:: 3. E2E smoke (nginx mode)
if "%E2E_EMAIL%"=="" (
  echo [SKIP] E2E: Set E2E_EMAIL and E2E_PASSWORD before running e2e.
  echo        Run run-online.bat first, then in another terminal:
  echo        set E2E_BASE_URL=http://localhost
  echo        set E2E_EMAIL=your@email
  echo        set E2E_PASSWORD=yourpass
  echo        cd Frontend ^&^& npm run e2e
  exit /b 1
)
if "%E2E_PASSWORD%"=="" (
  echo [SKIP] E2E: Set E2E_EMAIL and E2E_PASSWORD before running e2e.
  exit /b 1
)
if "%E2E_BASE_URL%"=="" set E2E_BASE_URL=http://localhost
echo [3/3] E2E smoke (ensure run-online.bat is running, http://localhost)...
cd /d "%ROOT%\Frontend"
call npm run e2e
if errorlevel 1 (
  echo [FAIL] E2E smoke failed.
  exit /b 1
)
echo [OK] E2E smoke passed.
echo.
echo ========================================
echo   All gates passed.
echo ========================================
