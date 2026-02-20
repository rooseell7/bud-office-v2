# E2E Smoke (Playwright)

## Recommended mode (online / nginx)

1. Run `run-online.bat` (build + backend:3000 + nginx on http://localhost).
2. Run E2E:

**CMD:**

```cmd
cd /d F:\BUD_office\Frontend
set E2E_BASE_URL=http://localhost
set E2E_EMAIL=your_test_user@example.local
set E2E_PASSWORD=<your_password>
npm run e2e
```

Expected: `1 passed`.

## Notes

- Using `E2E_BASE_URL=http://localhost` avoids CORS issues because nginx proxies `/api` to backend.
- Do not commit real passwords to repo (use env vars locally).
