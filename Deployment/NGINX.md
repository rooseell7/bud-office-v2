# Nginx deployment

Minimal Nginx config for BUD Office: SPA, REST API, and Socket.IO (Sheet Collab).

## Requirements

- Frontend (SPA) served from nginx
- `/api` proxied to backend (e.g. 127.0.0.1:3000)
- `/socket.io/` proxied with WebSocket upgrade headers for Sheet Collab

Socket.IO uses `/socket.io/` path by default.

## Example config snippet

```nginx
# SPA fallback
location / {
  root /var/www/bud-office;
  try_files $uri $uri/ /index.html;
}

# REST API proxy
location /api/ {
  proxy_pass http://127.0.0.1:3000/api/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

# Socket.IO WebSocket proxy (Sheet Collab)
location /socket.io/ {
  proxy_pass http://127.0.0.1:3000/socket.io/;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Frontend env for nginx

Use relative URLs to avoid CORS:

```
VITE_API_URL=/api
VITE_WS_URL=/
```

Copy from `Frontend/.env.nginx.example`.
