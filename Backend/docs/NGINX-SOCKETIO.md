# Nginx: Socket.IO + multi-instance backend

For STEP 5 (scale & reliability), run several backend instances behind Nginx. Socket.IO uses the Redis adapter so room emits work across instances; sticky sessions (e.g. `ip_hash`) help keep the same client on the same server when possible.

## Upstream with ip_hash

```nginx
upstream backend {
    ip_hash;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    # server 127.0.0.1:3002;
}
```

## API and Socket.IO

```nginx
server {
    listen 80;
    server_name your-domain.example;

    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Notes

- **ip_hash** on the upstream: same client IP → same backend, reducing Socket.IO reconnects when refreshing or reconnecting.
- **Redis adapter**: with `REDIS_URL` / `REDIS_HOST` set, the backend uses the Socket.IO Redis adapter; `server.to(room).emit()` is published via Redis and received by clients on any instance.
- **Windows**: the same config applies; ensure Nginx is built with the required modules and that backend instances are reachable on 3000, 3001, etc.
