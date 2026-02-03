@echo off
echo Freeing port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
  echo Killing process PID %%a
  taskkill /F /PID %%a 2>nul
)
echo Done. You can start the Backend again.
pause
