const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Running sequentially to avoid local port/state conflicts
  reporter: 'list',
  use: {
    // Browser navigasi pakai 'localhost' agar cookie domain: 'localhost' terbaca
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Tampilkan browser GUI saat test berjalan
    headless: false,
    launchOptions: {
      // Perlambat sedikit agar GUI terlihat; set 0 di CI
      slowMo: process.env.CI ? 0 : 150,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    // Health-check pakai 127.0.0.1 (IPv4) agar Playwright tidak
    // tersandung resolusi IPv6 (::1) di Windows
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
