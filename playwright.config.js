// Playwright smoke-test config.
//
// Setup (one-time):
//   npx playwright install chromium
//
// Run against local dev:
//   npm run dev            (terminal 1)
//   npm run test:e2e       (terminal 2)
//
// Run against a deployed environment:
//   E2E_BASE_URL=https://app.danielsdiaries.com.au npm run test:e2e
//
// Tests that need a real account read E2E_TEST_EMAIL / E2E_TEST_PASSWORD
// (use a dedicated staging family, never a real customer). Tests without
// their required env vars skip themselves rather than fail.

import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:3000/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe'
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    browserName: 'chromium'
  }
})
