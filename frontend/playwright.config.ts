import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run against their own stack: Django on a throwaway
// database (seeded with the sample listings) behind a Vite dev server.
// Nothing here touches the development database. See README "End-to-end tests".
const isCI = !!process.env.CI
const backendPort = Number(process.env.E2E_BACKEND_PORT ?? 8100)
const frontendPort = Number(process.env.E2E_FRONTEND_PORT ?? 5174)
const backendURL = `http://127.0.0.1:${backendPort}`
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${frontendPort}`

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? '50%' : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['html', { open: 'on-failure' }]],
  use: {
    baseURL,
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Phone width: the filter sidebar collapses behind a button and the navbar uses the mobile menu.
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: 'sh e2e/support/start-backend.sh',
          url: `${backendURL}/api/health/`,
          env: { E2E_BACKEND_PORT: String(backendPort) },
          // Always start fresh in CI; locally, reuse a running E2E backend (the tests never change data).
          reuseExistingServer: !isCI,
          timeout: 180_000,
          stdout: 'ignore',
          stderr: 'pipe',
        },
        {
          command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort} --strictPort`,
          url: baseURL,
          env: { API_PROXY_TARGET: backendURL },
          reuseExistingServer: !isCI,
          timeout: 120_000,
        },
      ],
})
