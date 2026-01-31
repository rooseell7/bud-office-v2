@echo off
:: BUD Office - дозволити вхід на порт 80 (тільки для адміністратора)
:: Запустити від імені адміністратора: правою кнопкою -> Запуск від імені адміністратора

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Потрібні права адміністратора.
  echo Запустіть: правою кнопкою -> Запуск від імені адміністратора
  pause
  exit /b 1
)

netsh advfirewall firewall add rule name="BUD Office HTTP" dir=in action=allow protocol=tcp localport=80
if errorlevel 1 (
  echo [ERROR] Не вдалося додати правило
  pause
  exit /b 1
)
echo [OK] Правило "BUD Office HTTP" додано. Порт 80 дозволено для вхідних з'єднань.
pause
