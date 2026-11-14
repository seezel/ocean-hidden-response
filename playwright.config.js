import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'artifacts/browser-results/results.json' }]],
  outputDir: 'artifacts/browser-results/failures',
  use: {
    baseURL: 'http://127.0.0.1:8000',
    viewport: { width: 1366, height: 900 },
    launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
    headless: true,
    screenshot: 'only-on-failure',
  },
});
