@echo off
cd /d "%~dp0"
echo BUD Office run-online.bat - start
echo.

set ROOT=%~dp0..
set FRONTEND=%ROOT%\Frontend
set BACKEND=%ROOT%\Backend
set DEPLOY=%~dp0
set NGINX_DIR=%ROOT%\nginx
set NGINX_CONFIG=%DEPLOY%nginx.conf

if not exist "%FRONTEND%\package.json" (
  echo [ERROR] Frontend not found: %FRONTEND%
  pause
  exit /b 1
)
if not exist "%BACKEND%\package.json" (
  echo [ERROR] Backend not found: %BACKEND%
  pause
  exit /b 1
)

echo ========================================
echo   BUD Office - online mode
echo ========================================
echo.

:: 1. Збірка Frontend (остання актуальна, для /api та /)
echo [1/5] Збірка Frontend...
cd /d "%FRONTEND%"
if not exist ".env.production" (
  if exist ".env.nginx.example" copy /Y ".env.nginx.example" ".env.production" >nul
)
call npm run build
if errorlevel 1 (
  echo [ПОМИЛКА] Збірка Frontend не вдалась.
  pause
  exit /b 1
)
echo [OK] Frontend зібрано → Frontend\dist
echo.

:: 2. Збірка Backend
echo [2/5] Збірка Backend...
cd /d "%BACKEND%"
call npm run build
if errorlevel 1 (
  echo [ПОМИЛКА] Збірка Backend не вдалась.
  pause
  exit /b 1
)
echo [OK] Backend зібрано → Backend\dist
echo.

:: 3. Зупинити старі процеси (порт 3000 + nginx)
echo [3/5] Зупинка попередніх Backend та Nginx...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
  taskkill /F /PID %%a 2>nul
)
taskkill /F /IM nginx.exe 2>nul
timeout /t 2 /nobreak >nul
echo [OK] Готово.
echo.

:: 4. Запуск Backend (CORS для nginx: localhost + 127.0.0.1; для remote додати IP у Backend\.env)
set CORS_ORIGINS=http://localhost,http://127.0.0.1
echo [4/5] Запуск Backend на http://127.0.0.1:3000 ...
start "BUD Backend" cmd /k "cd /d ""%BACKEND%"" && npm run start:prod"
timeout /t 4 /nobreak >nul
echo [OK] Backend запущено (вікно відкрито).
echo.

:: 5. Запуск Nginx (віддає Frontend\dist + проксує /api та /socket.io)
echo [5/5] Запуск Nginx...
if not exist "%NGINX_DIR%\nginx.exe" (
  echo [ПОМИЛКА] nginx.exe не знайдено в %NGINX_DIR%
  echo Завантаж Nginx для Windows з nginx.org та розпакуй у папку nginx.
  pause
  exit /b 1
)
"%NGINX_DIR%\nginx.exe" -p "%NGINX_DIR%" -c "%NGINX_CONFIG%" -t >nul 2>&1
if errorlevel 1 (
  echo [ПОМИЛКА] Перевірка nginx.conf не пройшла.
  pause
  exit /b 1
)
start "" "%NGINX_DIR%\nginx.exe" -p "%NGINX_DIR%" -c "%NGINX_CONFIG%"
echo [OK] Nginx запущено.
echo.

echo ========================================
echo   Готово. Онлайн режим увімкнено.
echo ========================================
echo.
echo   Локально:     http://localhost
echo   По IP:       http://ВАШ_IP   (з інших ПК у мережі)
echo.
echo   Не закривай вікно Backend. Щоб зупинити Nginx: stop-nginx.bat
echo.
pause
