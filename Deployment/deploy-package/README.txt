BUD Office — Deploy Package
===========================

На сервері (Linux):

1. Завантаж bud-office-deploy.zip на сервер
2. unzip bud-office-deploy.zip -d bud-deploy
3. cd bud-deploy
4. chmod +x deploy.sh
5. ./deploy.sh

Якщо Backend вже налаштований окремо — скрипт оновить лише Frontend і Nginx.
Перший раз: переконайся, що є Node.js, npm, nginx, (опційно) pm2.
