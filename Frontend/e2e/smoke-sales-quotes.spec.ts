import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test('smoke: login and /sales/quotes renders', async ({ page }) => {
  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
  await login(page, baseURL);

  await page.goto(`${baseURL}/sales/quotes`);

  await expect(page).toHaveURL(/\/sales\/quotes/);
  await expect(
    page.getByRole('heading', { name: /продажі\s*[•·]\s*кп/i })
  ).toBeVisible();
});
