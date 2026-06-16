const { test, expect } = require('@playwright/test');
const { loginAs, createRealDbTestData, cleanRealDbTestData } = require('./helpers');

/**
 * PB-13 — Kelola Proses Seleksi & Verifikasi Berkas (PBI-23)
 *
 * Skenario Pengujian:
 * - TC-PB13-001: Menampilkan daftar pendaftar di sidebar kanan secara otomatis
 * - TC-PB13-002: Menampilkan detail pendaftar terpilih di panel tengah tanpa reload
 * - TC-PB13-003: Membuka berkas dokumen di tab baru
 * - TC-PB13-008: Menampilkan informasi jika beasiswa tidak memiliki pendaftar
 * - TC-PB13-009: Proteksi hak akses tanpa login
 * - TC-PB13-010: Proteksi hak akses oleh mahasiswa (bukan role pendonor)
 */
test.describe('PBI-23: Dashboard Verifikasi Berkas Pendaftar E2E Tests (Real Database)', () => {

  let testData;

  test.beforeAll(async () => {
    testData = await createRealDbTestData();
  });

  test.afterAll(async () => {
    await cleanRealDbTestData(testData);
  });

  // TC-PB13-009: Proteksi hak akses tanpa login
  test('TC-PB13-009: Proteksi hak akses tanpa login', async ({ page }) => {
    await page.goto('/pendonor/seleksi-pendaftar');
    await expect(page).toHaveURL(/.*\/login/);
  });

  // TC-PB13-010: Proteksi hak akses oleh mahasiswa (bukan role pendonor)
  test('TC-PB13-010: Proteksi hak akses oleh mahasiswa', async ({ page, context }) => {
    await loginAs(context, 'mahasiswa');
    await page.goto('/pendonor/seleksi-pendaftar');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test.describe('Akses Terverifikasi Pendonor', () => {

    test.beforeEach(async ({ context }) => {
      await loginAs(context, 'pendonor', {
        userId: testData.pendonorId,
        accountId: testData.pendonorAccountId
      });
    });

    // TC-PB13-001: Menampilkan daftar pendaftar di sidebar kanan secara otomatis
    test('TC-PB13-001: Menampilkan daftar pendaftar di sidebar kanan secara otomatis', async ({ page }) => {
      await page.goto(`/pendonor/seleksi-pendaftar?beasiswaId=${testData.beasiswa.beasiswaId}`);

      await expect(page.locator('h1')).toContainText('Verifikasi Berkas Pendaftar');
      
      // Sidebar should display applicant info
      const queueItem = page.locator(`#queue-item-${testData.pendaftaran.pendaftaranId}`);
      await expect(queueItem).toBeVisible();
      await expect(queueItem.locator(`text=${testData.mhsUser.nama}`)).toBeVisible();
      await expect(queueItem.locator('text=Terdaftar')).toBeVisible();
    });

    // TC-PB13-002: Menampilkan detail pendaftar terpilih di panel tengah tanpa reload
    test('TC-PB13-002: Menampilkan detail pendaftar terpilih di panel tengah tanpa reload', async ({ page }) => {
      await page.goto(`/pendonor/seleksi-pendaftar?beasiswaId=${testData.beasiswa.beasiswaId}`);

      // First applicant should be auto-selected
      await expect(page.locator('h2', { hasText: testData.mhsUser.nama })).toBeVisible();
      await expect(page.locator(`text=ID Pendaftaran: #${testData.pendaftaran.pendaftaranId}`)).toBeVisible();
      await expect(page.locator(`text=${testData.mhsUser.email}`)).toBeVisible();

      // Check document rows in verification desk
      await expect(page.locator('text="KTP"')).toBeVisible();
      await expect(page.locator('text=Transkrip Nilai')).toBeVisible();
    });

    // TC-PB13-003: Membuka berkas dokumen di tab baru
    test('TC-PB13-003: Membuka berkas dokumen di tab baru', async ({ page }) => {
      await page.goto(`/pendonor/seleksi-pendaftar?beasiswaId=${testData.beasiswa.beasiswaId}`);

      const ktpDoc = testData.docs.find(d => d.jenis === 'ktp');
      const ktpViewBtn = page.locator(`#view-doc-btn-ktp-${ktpDoc.dokumenId}`);
      await expect(ktpViewBtn).toBeVisible();
      await expect(ktpViewBtn).toHaveAttribute('target', '_blank');
      await expect(ktpViewBtn).toHaveAttribute('href', /.*dokumen\/ktp_nadhif\.pdf/);
    });

    // TC-PB13-008: Menampilkan informasi jika beasiswa tidak memiliki pendaftar
    test('TC-PB13-008: Menampilkan informasi jika beasiswa tidak memiliki pendaftar', async ({ page }) => {
      await page.goto(`/pendonor/seleksi-pendaftar?beasiswaId=${testData.beasiswa.beasiswaId}`);

      // Switch to empty program
      await page.selectOption('#scholarship-program-select', String(testData.beasiswaEmpty.beasiswaId));
      
      // Wait and expect empty state message
      await expect(page.locator('text=Belum Ada Pendaftar')).toBeVisible();
    });

    // TC-PB13-015: Memilih program beasiswa lain dari dropdown memperbarui daftar pendaftar
    test('TC-PB13-015: Memilih program beasiswa lain dari dropdown memperbarui daftar pendaftar', async ({ page }) => {
      await page.goto(`/pendonor/seleksi-pendaftar?beasiswaId=${testData.beasiswaEmpty.beasiswaId}`);

      // Expect empty state first
      await expect(page.locator('text=Belum Ada Pendaftar')).toBeVisible();

      // Switch to non-empty program
      await page.selectOption('#scholarship-program-select', String(testData.beasiswa.beasiswaId));
      
      // Expect applicant info is now loaded and visible
      const queueItem = page.locator(`#queue-item-${testData.pendaftaran.pendaftaranId}`);
      await expect(queueItem).toBeVisible();
    });

  });
});
