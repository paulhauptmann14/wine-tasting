import { defineConfig, devices } from '@playwright/test'
import { E2E_CRON_SECRET } from './e2e/constants'

const PORT = 3100

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // Uses the installed Google Chrome – no browser download needed
    channel: 'chrome',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 834, height: 1194 }, hasTouch: true } },
    { name: 'laptop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
  ],
  webServer: {
    command: `npm run db:migrate && npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: { CRON_SECRET: E2E_CRON_SECRET },
    timeout: 240_000,
  },
})
