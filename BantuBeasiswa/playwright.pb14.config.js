const baseConfig = require('./playwright.config.js');

module.exports = {
  ...baseConfig,
  testDir: './e2e/PB-14 Notifikasi Pengumuman Hasil Visual',
  use: {
    ...baseConfig.use,
    launchOptions: {
      ...(baseConfig.use?.launchOptions || {}),
      slowMo: 3000,
    },
  },
};
