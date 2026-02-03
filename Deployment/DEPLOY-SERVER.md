# Покрокова інструкція: деплой на сервер 95.47.196.98

## Швидкий варіант (все готово)

Після виконання `pack-deploy` або вручну:

1. Файл **`Deployment/bud-office-deploy.zip`** готовий
2. Завантаж його на сервер
3. Розпакуй: `unzip bud-office-deploy.zip -d bud-deploy && cd bud-deploy`
4. Запусти: `chmod +x deploy.sh && ./deploy.sh`
5. Перевір (Крок 5 нижче)

---

## Передумови

- Доступ по SSH до сервера
- Node.js на сервері (для Backend)
- Nginx встановлений

---

## КРОК 1. Підготувати Frontend на локальній машині (вже зроблено)

1. Відкрити термінал у папці `F:\BUD_office\Frontend`
2. Перевірити `.env` — мають бути:
   ```
   VITE_API_URL=/api
   VITE_WS_URL=/
   ```
   (якщо немає — скопіювати з `.env.nginx.example`)
3. Зібрати:
   ```
   npm run build
   ```
4. Після збірки має з’явитися папка `dist` з `index.html`, `assets/`

---

## КРОК 2. Завантажити файли на сервер

### Варіант A: SCP / WinSCP / FileZilla

1. Скопіювати вміст `Frontend/dist/` на сервер у `/var/www/bud-office/`
2. Структура на сервері має бути:
   ```
   /var/www/bud-office/
   ├── index.html
   └── assets/
       ├── index-*.js
       └── index-*.css
   ```

### Варіант B: rsync (якщо встановлений)

```bash
rsync -avz --delete Frontend/dist/ user@95.47.196.98:/var/www/bud-office/
```

### Якщо папки /var/www/bud-office немає:

```bash
ssh user@95.47.196.98
sudo mkdir -p /var/www/bud-office
sudo chown $USER:$USER /var/www/bud-office
```

---

## КРОК 3. Налаштувати Nginx на сервері

1. Підключитися по SSH:
   ```bash
   ssh user@95.47.196.98
   ```

2. Створити конфіг (або відредагувати існуючий):
   ```bash
   sudo nano /etc/nginx/sites-available/bud-office
   ```

3. Вставити повний конфіг з `Deployment/nginx-server.conf` або такий зміст:

```nginx
server {
    listen 80;
    server_name 95.47.196.98 localhost;

    root /var/www/bud-office;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
        proxy_buffering off;
    }
}
```

4. Зберегти (Ctrl+O, Enter, Ctrl+X в nano)

5. Увімкнути сайт:
   ```bash
   sudo ln -sf /etc/nginx/sites-available/bud-office /etc/nginx/sites-enabled/
   ```

6. Перевірити конфіг:
   ```bash
   sudo nginx -t
   ```
   Має бути: `syntax is ok` та `test is successful`

7. Перезавантажити Nginx:
   ```bash
   sudo systemctl reload nginx
   ```

---

## КРОК 4. Запустити Backend на сервері

Backend має слухати порт 3000 на localhost.

1. На сервері перейти в папку Backend:
   ```bash
   cd /шлях/до/BUD_office/Backend
   ```

2. Встановити залежності (якщо ще не встановлені):
   ```bash
   npm install
   ```

3. Застосувати міграції БД (один раз або після оновлення):
   ```bash
   npm run migrate
   ```
   (потрібен налаштований `.env` з DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME)

4. Запустити:
   ```bash
   npm run start
   ```
   або через PM2 для постійної роботи:
   ```bash
   pm2 start npm --name "bud-backend" -- run start
   pm2 save
   pm2 startup
   ```

5. Перевірити, що Backend відповідає:
   ```bash
   curl http://127.0.0.1:3000/api/health
   ```

---

## КРОК 5. Перевірка (після запуску Backend)

1. Відкрити в браузері: http://95.47.196.98
2. Має з’явитися сторінка логіну BUD Office
3. DevTools → Network → фільтр `socket.io`
4. Очікується: запит з **Type = ws**, **Status 101 Switching Protocols**
5. Якщо бачиш лише `transport=polling` — блок `/socket.io/` у Nginx налаштований неправильно

---

## Якщо щось не працює

| Проблема | Що перевірити |
|----------|----------------|
| 502 Bad Gateway | Backend не запущений або не слухає 3000 |
| 404 на / | SPA не в /var/www/bud-office або порожня папка |
| Violations у консолі, текст зникає | Немає блоку `/socket.io/` з Upgrade/Connection або Nginx не перезавантажений |
| CORS / помилки API | VITE_API_URL=/api, VITE_WS_URL=/ у Frontend перед збіркою |

---

## Швидкий чекліст

- [ ] Frontend зібрано з VITE_API_URL=/api, VITE_WS_URL=/
- [ ] Файли з dist/ завантажені в /var/www/bud-office/
- [ ] Конфіг Nginx з блоком /socket.io/ (Upgrade, Connection)
- [ ] `sudo nginx -t` — ok
- [ ] `sudo systemctl reload nginx`
- [ ] У Backend виконано `npm run migrate` (міграції БД)
- [ ] Backend працює на 127.0.0.1:3000
- [ ] http://95.47.196.98 відкривається
- [ ] Network: є ws з 101
