import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test('smoke: login and /invoices renders', async ({ page }) => {
  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
  await login(page, baseURL);

  await page.goto(`${baseURL}/invoices`);

  await expect(page).toHaveURL(/\/invoices/);
  await expect(page).not.toHaveURL(/\/login/);
  await expect(
    page.getByRole('heading', { name: /накладні/i })
  ).toBeVisible();
});
