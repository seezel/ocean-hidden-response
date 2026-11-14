import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../../tests/browser',
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${process.env.V4_TEST_PORT || 8767}`,
    launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
    headless: true,
  },
});
