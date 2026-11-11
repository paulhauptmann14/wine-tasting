import { defineConfig, devices } from '@playwright/test'

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
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome', viewport: { width: 390, height: 844 } } },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 834, height: 1194 }, hasTouch: true },
    },
    {
      name: 'laptop',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1366, height: 768 } },
    },
  ],
  webServer: {
    command: `npm run db:migrate && npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
})
