import { defineConfig, devices } from '@playwright/test';

const basePath = process.env.E2E_BASE_PATH ?? '/';
const baseURL = `http://127.0.0.1:4201${basePath}`;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: 'npm run build && node scripts/serve-dist.mjs',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
