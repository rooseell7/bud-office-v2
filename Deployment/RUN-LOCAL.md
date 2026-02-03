# BUD Office — запуск на локальному ПК (сервер = твій ПК)

## Передумови

- Node.js встановлений
- Nginx для Windows в `F:\BUD_office\nginx\` (nginx.exe)
- Frontend зібрано: `cd Frontend && npm run build`

---

## Покроково

### 0. Міграції БД (обов’язково перед першим запуском і після оновлення SQL)

Якщо є нові SQL-міграції, свіжа БД або у додатку з’являється **Internal server error** на сторінках Фінанси / Відділ реалізації / Кабінет виконроба / Аналітика — спочатку застосуй міграції:

```cmd
cd F:\BUD_office\Backend
npm run migrate
```

Детально: `Backend/sql/README-MIGRATIONS.md`. Усунення помилок: `Backend/TROUBLESHOOTING.md`.

---

### 1. Запусти Backend

```cmd
cd F:\BUD_office\Backend
npm run start
```

Має слухати `http://127.0.0.1:3000`. Залиш вікно відкритим.

**Якщо з’явилась помилка `EADDRINUSE: address already in use 0.0.0.0:3000`** — порт 3000 зайнятий (наприклад, другим екземпляром Backend). Звільнити порт:
- подвійний клік по `Deployment\kill-port-3000.bat`, або
- в `.env` у Backend вказати інший порт: `APP_PORT=3001` (тоді Nginx має проксувати на 3001, якщо використовуєш його).

---

### 2. Запусти Nginx

Подвійний клік або з терміналу:

```cmd
F:\BUD_office\Deployment\run-nginx.bat
```

Або вручну:
```cmd
cd /d F:\BUD_office\Deployment
run-nginx.bat
```

---

### 3. Відкрий у браузері

**http://localhost**

(не localhost:5173 і не localhost:3000 — саме порт 80 через Nginx)

---

### 4. Перевірка Sheet Collab (WebSocket)

- DevTools → Network → фільтр `socket.io`
- Має з’явитися **ws** з **101 Switching Protocols**
- Якщо тільки polling — перезапусти Nginx (`reload-nginx.bat`)

---

## Зупинка

- `stop-nginx.bat` — зупинити Nginx
- Ctrl+C у вікні Backend — зупинити Backend
- Якщо Nginx завис: `kill-nginx.bat`

---

## Якщо змінив Frontend

```cmd
cd F:\BUD_office\Frontend
npm run build
```

Після збірки перезавантаж сторінку в браузері (F5). Nginx перезапускати не потрібно.
