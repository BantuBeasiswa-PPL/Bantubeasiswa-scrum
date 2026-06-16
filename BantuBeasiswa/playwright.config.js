const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // Satu retry lokal untuk menyerap flakiness kompilasi on-demand `next dev`
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Running sequentially to avoid local port/state conflicts
  reporter: 'list',
  // Timeout per-test dinaikkan: navigasi pertama ke sebuah route memicu kompilasi
  // on-demand Next.js dev yang bisa melebihi 30 dtk pada mesin yang lebih lambat.
  timeout: 60 * 1000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 45 * 1000,
    actionTimeout: 15 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx env-cmd -f .env.test npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000, // Wait up to 2 mins for the dev server to boot
  },
});
