# BUD_OFFICE v2.1 — ZERO TS VERIFIED

**Status:** ZERO TS VERIFIED: YES  
**Date:** 2026-02-19  
**Baseline commit:** aba13f6 (A34-sheet final)

## Як відтворити перевірку

### 1. Frontend typecheck
```bash
cd Frontend && npm run typecheck
```
Очікування: exit 0, 0 errors.

### 2. Backend tests
```bash
cd Backend && npm test
```
Очікування: 2 suites, 5 tests passed.

### 3. Frontend build
```bash
cd Frontend && npm run build
```
Очікування: успішна збірка.

### 4. Nginx/prod smoke
Запустити середовище:
```bash
Deployment/run-online.bat
```
Дочекатися старту nginx + backend, потім перевірити:
- http://localhost → 200
- http://localhost/login → 200

### 5. E2E smoke (PowerShell)
```powershell
$env:E2E_BASE_URL="http://localhost"
$env:E2E_EMAIL="admin@buduy.local"
$env:E2E_PASSWORD="admin123"
cd Frontend
npm run e2e
```
Очікування: 2 passed (smoke-invoices, smoke-sales-quotes).

---

Детальний лог прогонів Z1/Z2: `docs/zero-ts-verify-Z1.txt`.
