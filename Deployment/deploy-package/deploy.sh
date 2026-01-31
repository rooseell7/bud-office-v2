#!/bin/bash
# BUD Office — деплой на сервер (Крок 3+4)
# Запускати на сервері після завантаження deploy-package

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== BUD Office deploy ==="

# Крок 3: Frontend + Nginx
echo "1. Копіювання SPA в /var/www/bud-office..."
sudo mkdir -p /var/www/bud-office
sudo cp -r "$SCRIPT_DIR/www"/* /var/www/bud-office/
sudo chown -R www-data:www-data /var/www/bud-office 2>/dev/null || sudo chown -R nginx:nginx /var/www/bud-office 2>/dev/null || true

echo "2. Налаштування Nginx..."
sudo cp "$SCRIPT_DIR/nginx-server.conf" /etc/nginx/sites-available/bud-office
sudo ln -sf /etc/nginx/sites-available/bud-office /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
echo "   Nginx оновлено."

# Крок 4: Backend (з пакета deploy-package/backend)
echo "3. Backend..."
BACKEND_PKG="$SCRIPT_DIR/backend"
DEPLOY_DIR="/opt/bud-office"
if [ -d "$BACKEND_PKG" ] && [ -f "$BACKEND_PKG/package.json" ] && [ -d "$BACKEND_PKG/dist" ]; then
  echo "   Копіювання Backend в $DEPLOY_DIR/backend..."
  sudo mkdir -p "$DEPLOY_DIR"
  sudo cp -r "$BACKEND_PKG" "$DEPLOY_DIR/"
  sudo chown -R "$USER:$USER" "$DEPLOY_DIR" 2>/dev/null || true
  cd "$DEPLOY_DIR/backend"
  if [ ! -f .env ]; then
    cp .env.example .env 2>/dev/null
    echo "   УВАГА: Створено .env з .env.example. Відредагуй DB_* та JWT_SECRET!"
  fi
  npm install --production 2>/dev/null || npm install --omit=dev
  echo "   Запуск Backend..."
  if command -v pm2 >/dev/null 2>&1; then
    pm2 delete bud-backend 2>/dev/null || true
    pm2 start dist/main.js --name bud-backend
    pm2 save 2>/dev/null || true
    echo "   Backend запущено через PM2"
  else
    echo "   PM2 не встановлено. Запустіть вручну: cd $DEPLOY_DIR/backend && node dist/main.js"
    echo "   Або: npm install -g pm2 && pm2 start dist/main.js --name bud-backend"
  fi
else
  echo "   Backend не в пакеті або dist відсутній. Запустіть вручну на 127.0.0.1:3000"
fi

echo ""
echo "=== Готово ==="
echo "Відкрийте http://95.47.196.98 та перевірте (Крок 5)."
