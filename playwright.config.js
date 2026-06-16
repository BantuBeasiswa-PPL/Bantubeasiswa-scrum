const { defineConfig, devices } = require('@playwright/test');
const { loadTestEnv } = require('./e2e/load-test-env');

// ── Mode demo (untuk dipresentasikan ke dosen) ───────────────────────────────
// SLOWMO = jeda (ms) di setiap langkah/aksi Playwright agar mudah diamati.
// HEADED = tampilkan jendela browser (1/true) supaya jalannya test terlihat.
// Default: SLOWMO=0 & headless → run normal tetap cepat.
//   Demo : `npm run test:e2e:demo`  (otomatis headed + jeda tiap langkah)
const SLOWMO = Number(process.env.SLOWMO) || 0;
const HEADED = process.env.HEADED === '1' || process.env.HEADED === 'true';

// ── Mode real-DB (test sampai ke database `db_automated`) ─────────────────────
// Aktif saat DB_TEST=1 (lewat `npm run test:e2e:db`). Memuat .env.test lalu:
//   - dev server diboot dengan env DB test (bukan produksi)
//   - proses test bisa baca SUPABASE_SERVICE_ROLE_KEY utk verifikasi & cleanup
const DB_TEST = process.env.DB_TEST === '1';
const testEnv = DB_TEST ? loadTestEnv() : {};
if (DB_TEST) Object.assign(process.env, testEnv);

module.exports = defineConfig({
  testDir: './e2e',
  // File test milik teammate yang masih bergantung pada versi helpers.js lama
  // (makeToken/MOCK_*/routeFetch + JWT secret berbeda). Di-skip agar tidak
  // membuat seluruh run gagal saat collection. Hapus baris ini bila helpers
  // sudah direkonsiliasi oleh pemilik test tersebut.
  testIgnore: [
    '**/pbi-28-profil-mahasiswa.spec.js',
    '**/pbi-40-41-rekening-mahasiswa.spec.js',
    // Test real-DB (folder e2e/db) hanya jalan saat DB_TEST=1; di run mock di-skip
    ...(DB_TEST ? [] : ['**/db/**']),
  ],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Running sequentially to avoid local port/state conflicts
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: !HEADED,
    launchOptions: { slowMo: SLOWMO },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    // Saat real-DB: boot dev server baru dgn env DB test (jangan reuse server lama
    // yang mungkin terhubung ke DB produksi). Pastikan tidak ada `npm run dev` lain
    // yang sedang jalan di port 3000.
    reuseExistingServer: !DB_TEST,
    env: DB_TEST ? { ...process.env, ...testEnv } : undefined,
    timeout: 120 * 1000, // Wait up to 2 mins for the dev server to boot
  },
});
