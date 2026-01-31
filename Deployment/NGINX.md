# Nginx deployment

Minimal Nginx config for BUD Office: SPA, REST API, and Socket.IO (Sheet Collab).

## Як запускати Nginx (Linux)

### 1. Зберегти конфіг

Вставити блоки з Example config (нижче) у свій server block. Типово:
- `/etc/nginx/sites-available/bud-office` — створити або відредагувати
- Або додати в `server { ... }` у `/etc/nginx/nginx.conf`

### 2. Активувати (якщо sites-available)
```bash
sudo ln -sf /etc/nginx/sites-available/bud-office /etc/nginx/sites-enabled/
```

### 3. Перевірити конфіг
```bash
sudo nginx -t
```
Має показати `syntax is ok` та `test is successful`.

### 4. Застосувати зміни
```bash
# Якщо nginx вже працює — reload (без downtime)
sudo systemctl reload nginx

# Якщо nginx не запущений — start
sudo systemctl start nginx

# Перезапуск (повний)
sudo systemctl restart nginx
```

### 5. Статус
```bash
sudo systemctl status nginx
```

**Що має бути запущено до nginx:**
- Backend на `127.0.0.1:3000` (наприклад `npm run start` у Backend)
- SPA-файли в `root` (наприклад `/var/www/bud-office`) — результат `npm run build` у Frontend + скопіювати `dist/*`

---

## Як запускати Nginx (Windows)

**Рекомендовано:** перемістити Nginx у папку проєкту:

1. Скачати [Nginx for Windows](https://nginx.org/en/download.html)
2. Розпакувати в `f:\BUD_office\nginx\` (має з’явитися `nginx.exe`, папки `conf\`, `html\`, `logs\`)

Конфіг зберігається в `Deployment\nginx.conf` — його можу редагувати і я. Батники використовують саме його.

### 1. Конфіг

`Deployment\nginx.conf` — готовий для SPA + API + Socket.IO. Шлях `root` — відносний `../Frontend/dist`. Якщо SPA в іншому місці — змінити.

Для `root` вказати шлях до зібраного Frontend:
```nginx
root F:/BUD_office/Frontend/dist;
```

### 2. Скрипти для запуску

- `run-nginx.bat` — запустити
- `reload-nginx.bat` — перезавантажити конфіг  
- `stop-nginx.bat` — зупинити (graceful)
- `kill-nginx.bat` — **примусово вбити всі nginx** (якщо показує "Welcome to nginx" замість SPA — спочатку kill, потім run)

### 3. Ручний запуск

```cmd
cd /d F:\BUD_office\nginx
nginx -t
start nginx
nginx -s reload
nginx -s stop
```

### 4. Перевірити

- Відкрити http://localhost — має з’явитися SPA
- Backend на 127.0.0.1:3000

---

## Requirements

- Frontend (SPA) served from nginx
- `/api` proxied to backend (e.g. 127.0.0.1:3000)
- `/socket.io/` proxied with WebSocket upgrade headers (critical for Sheet Collab)

Socket.IO uses `/socket.io/` by default. Without correct Upgrade/Connection headers, it stays on long-polling → UI lag, "message handler took ...ms" violations, text disappearing during edit.

## Example config snippet

```nginx
# Обов'язково всередині http {} — для WebSocket upgrade
map $http_upgrade $connection_upgrade {
  default upgrade;
  '' close;
}

# SPA fallback
location / {
  root /var/www/bud-office;
  try_files $uri $uri/ /index.html;
}

# REST API proxy
location /api/ {
  proxy_pass http://127.0.0.1:3000/api/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

# Socket.IO WebSocket — CRITICAL: upgrade для WS 101, без polling violations
location /socket.io/ {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection $connection_upgrade;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_read_timeout 3600;
  proxy_send_timeout 3600;
  proxy_buffering off;
  proxy_redirect off;
}
```

## СЕРВЕР 95.47.196.98 — покрокова інструкція

**Детальна інструкція:** див. `Deployment/DEPLOY-SERVER.md`

Коротко:
1. Зібрати Frontend (`VITE_API_URL=/api`, `VITE_WS_URL=/`) → `npm run build`
2. Завантажити `Frontend/dist/*` на сервер у `/var/www/bud-office/`
3. Скопіювати конфіг з `Deployment/nginx-server.conf` на сервер → `/etc/nginx/sites-available/bud-office`
4. `sudo ln -sf .../bud-office .../sites-enabled/`
5. `sudo nginx -t` → `sudo systemctl reload nginx`
6. Запустити Backend на 127.0.0.1:3000

## Verification

1. DevTools → Network, filter `socket.io`
2. After load, expect: request with **Type = ws**, Status **101 Switching Protocols**
3. If you only see `/socket.io/?EIO=4&transport=polling` repeatedly → nginx is not proxying upgrade correctly

## Diagnostics

In browser console: `localStorage.setItem('DEBUG_COLLAB','1')` then reload. Enables transport/upgrade/OP logs. Remove with `localStorage.removeItem('DEBUG_COLLAB')`.

## Frontend env for nginx

Use relative URLs to avoid CORS:

```
VITE_API_URL=/api
VITE_WS_URL=/
```

Copy from `Frontend/.env.nginx.example`.
