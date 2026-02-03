# BUD Office — запуск через Nginx і доступ по IP з інших мереж

## Що зроблено в конфігах

- **Nginx** слухає на всіх інтерфейсах (`listen 80 default_server`), тобто приймає з’єднання і на `localhost`, і на IP-адресі комп’ютера.
- **server_name _** — будь-який Host (в т.ч. `http://192.168.1.100`) обслуговується цим сервером.

Тому після запуску Backend + Nginx зайти можна:
- **Локально:** http://localhost
- **З інших ПК у мережі:** http://\<IP_цього_ПК\>

---

## Windows (локальний ПК як сервер)

### 1. Дозволити вхід на порт 80 у брандмауері

Інакше з інших мереж з’єднання буде блокуватись.

**Запустити від імені адміністратора:** правою кнопкою по `Deployment\setup-firewall.bat` → **Запуск від імені адміністратора**.

Або вручну (PowerShell від адміна):

```powershell
New-NetFirewallRule -DisplayName "BUD Office HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
```

### 2. Зібрати Frontend (якщо ще не збирали)

```cmd
cd F:\BUD_office\Frontend
npm run build
```

У `Frontend/.env` мають бути: `VITE_API_URL=/api`, `VITE_WS_URL=/` (як у `.env.nginx.example`).

### 3. Запустити Backend

```cmd
cd F:\BUD_office\Backend
npm run start
```

Залишити вікно відкритим (має слухати `http://127.0.0.1:3000`).

### 4. Запустити Nginx

Подвійний клік по **`Deployment\run-nginx.bat`** або:

```cmd
cd /d F:\BUD_office\Deployment
run-nginx.bat
```

Або все одразу: **`Deployment\run-all-local.bat`** (Backend + Nginx).

### 5. Відкрити в браузері

- На цьому ПК: **http://localhost**
- З іншого ПК у тій самій мережі: **http://\<IP\>**, де \<IP\> — адреса ПК, на якому запущено Nginx.

Дізнатись IP (на ПК з Nginx):

```cmd
ipconfig
```

Шукати **IPv4-адреса** у потрібному адаптері (Wi‑Fi або Ethernet). Наприклад: `192.168.1.100` → на іншому ПК відкрити **http://192.168.1.100**.

---

## Linux (сервер у мережі)

1. Розгорнути за **DEPLOY-SERVER.md** (Frontend у `/var/www/bud-office/`, Backend на порту 3000, конфіг Nginx з `Deployment/nginx-server.conf`).
2. У конфігу вже є `listen 80 default_server` і `server_name _` — доступ по IP увімкнено.
3. Якщо є файрвол, відкрити порт 80, наприклад:

   ```bash
   sudo ufw allow 80/tcp
   sudo ufw reload
   ```

4. Зайти з інших мереж: **http://\<IP_сервера\>**.

---

## Перевірка

| Що перевірити | Як |
|---------------|-----|
| Локально відкривається | http://localhost → сторінка логіну BUD Office |
| По IP відкривається | На іншому ПК: http://\<IP\> → та сама сторінка |
| API працює | Увійти, перейти по розділах — без 502 |
| WebSocket | DevTools → Network → `socket.io` → є **ws** з **101** |

---

## Якщо з інших мереж не заходить

1. **Брандмауер:** переконатись, що порт 80 дозволено вхід (Windows: `setup-firewall.bat` від адміна; Linux: `ufw allow 80`).
2. **Роутер:** якщо доступ з іншої підмережі/інтернету — потрібен проброс порту 80 на IP ПК/сервера (Port Forwarding).
3. **Nginx запущений:** перезапустити `run-nginx.bat` або `sudo systemctl reload nginx` на Linux.
4. **Backend запущений:** перевірити `http://127.0.0.1:3000/api/health` на машині з Backend.
