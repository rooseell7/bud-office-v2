import { test, expect } from '@playwright/test';

function isLoginRequest(req: { method: () => string; url: () => string }) {
  if (req.method() !== 'POST') return false;
  const url = req.url();
  return (
    url.includes('/api/auth/login') || url.includes('/auth/login')
  );
}

test('smoke: login and /invoices renders', async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error('Set E2E_EMAIL and E2E_PASSWORD environment variables');
  }

  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

  await page.goto(`${baseURL}/login`);

  await page.getByRole('textbox', { name: /email/i }).fill(email);
  await page.getByLabel(/пароль/i).fill(password);

  const btn = page.getByRole('button', { name: /увійти|login/i });
  await expect(btn).toBeEnabled();

  const [loginReq] = await Promise.all([
    page.waitForRequest(isLoginRequest, { timeout: 20_000 }),
    btn.click(),
  ]);

  const loginResp = await loginReq.response();
  if (loginResp == null) {
    const failure = loginReq.failure();
    throw new Error(
      `Login request failed: ${failure?.errorText ?? 'no response'}. URL=${loginReq.url()}`
    );
  }

  if (!loginResp.ok()) {
    const body = await loginResp.text().catch(() => '');
    throw new Error(
      `Login failed: ${loginResp.status()} ${body.slice(0, 500)} URL=${loginReq.url()}`
    );
  }

  await page.waitForFunction(
    () =>
      Boolean(
        localStorage.getItem('accessToken') || localStorage.getItem('token')
      ),
    { timeout: 20_000 }
  );

  await page.goto(`${baseURL}/invoices`);

  await expect(page).toHaveURL(/\/invoices/);
  await expect(page).not.toHaveURL(/\/login/);
  await expect(
    page.getByRole('heading', { name: /накладні/i })
  ).toBeVisible();
});
