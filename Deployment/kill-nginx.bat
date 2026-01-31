@echo off
echo Stopping all Nginx processes...
taskkill /F /IM nginx.exe 2>nul
if errorlevel 1 (
  echo No nginx processes found.
) else (
  echo Nginx stopped.
)
pause
