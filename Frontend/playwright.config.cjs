const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    headless: true,
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
  },
  reporter: 'list',
});
