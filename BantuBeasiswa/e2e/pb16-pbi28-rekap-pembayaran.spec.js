const { test, expect } = require('@playwright/test');
const { loginAs, createRealDbTestDataPB16, cleanRealDbTestDataPB16 } = require('./helpers');

/**
 * PB-16 — Rekap Pembayaran Beasiswa (PBI-28)
 *
 * Skenario Pengujian:
 * - TC-PB16-001: Menampilkan rekap antrean pembayaran mahasiswa lulus + rekening
 * - TC-PB16-002: Menampilkan jumlah total penerima dalam antrean transfer ("Queue Total")
 * - TC-PB16-003: Menampilkan jumlah akumulasi nominal dana pending ("Total Amount Pending")
 * - TC-PB16-004: Menyembunyikan penerima yang belum melengkapi data rekening
 * - TC-PB16-006: Ekspor data ke format CSV
 * - TC-PB16-007: Memverifikasi format uang Rupiah di file ekspor ("Rp 5.000.000")
 * - TC-PB16-008: Ekspor data ke format Excel
 * - TC-PB16-009: Proteksi akses tanpa login pada halaman rekap pembayaran
 */
test.describe('PBI-28: Rekap Antrean & Ekspor Pembayaran E2E Tests (Real Database)', () => {

  let testData;

  test.beforeAll(async () => {
    testData = await createRealDbTestDataPB16();
  });

  // Data is kept after tests for user inspection; cleaned up automatically at the start of the next run
  // test.afterAll(async () => {
  //   await cleanRealDbTestDataPB16(testData);
  // });

  // TC-PB16-009: Proteksi akses tanpa login pada halaman rekap pembayaran
  test('TC-PB16-009: Proteksi akses tanpa login pada halaman rekap pembayaran', async ({ page }) => {
    await page.goto('/pendonor/dashboard-pembayaran');
    await expect(page).toHaveURL(/.*\/login/);
  });

  // TC-PB16-010: Proteksi hak akses oleh mahasiswa pada halaman rekap pembayaran
  test('TC-PB16-010: Proteksi hak akses oleh mahasiswa pada halaman rekap pembayaran', async ({ page, context }) => {
    await loginAs(context, 'mahasiswa');
    await page.goto('/pendonor/dashboard-pembayaran');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test.describe('Akses Terverifikasi Pendonor', () => {

    test.beforeEach(async ({ context }) => {
      await loginAs(context, 'pendonor', {
        userId: testData.pendonorId,
        accountId: testData.pendonorAccountId
      });
    });

    // TC-PB16-001: Menampilkan rekap antrean pembayaran mahasiswa lulus + rekening
    // TC-PB16-002: Menampilkan jumlah total penerima dalam antrean transfer
    // TC-PB16-003: Menampilkan jumlah akumulasi nominal dana pending
    // TC-PB16-004: Menyembunyikan penerima yang belum melengkapi data rekening
    test('TC-PB16-001 hingga 004: Verifikasi Tampilan Dashboard & Rekap Tabel', async ({ page }) => {
      await page.goto('/pendonor/dashboard-pembayaran');
      await page.locator('h1').waitFor({ state: 'visible' });

      const h1 = page.locator('h1');
      await h1.waitFor({ state: 'visible' });
      await expect(h1).toContainText('Instruksi Pembayaran');

      // TC-PB16-002: Queue Total should display 1 (since only 1 valid applicant was seeded for this donor)
      const queueCard = page.locator('p', { hasText: 'Queue Total' }).locator('..');
      await queueCard.waitFor({ state: 'visible' });
      await expect(queueCard.locator('text=1 Penerima')).toBeVisible();

      // TC-PB16-003: Total Amount Pending = Rp 5.000.000
      const pendingCard = page.locator('p', { hasText: 'Total Amount Pending' }).locator('..');
      await pendingCard.waitFor({ state: 'visible' });
      await expect(pendingCard.locator('text=Rp 5.000.000')).toBeVisible();

      // TC-PB16-001: Check table rows
      const mhsNameText = page.locator(`text=${testData.mhsUser.nama}`);
      await mhsNameText.waitFor({ state: 'visible' });
      await expect(mhsNameText).toBeVisible();

      // Bank info verified
      await expect(page.locator('text=BCA')).toBeVisible();
      await expect(page.locator(`text=${testData.rekening.nomorRekening}`)).toBeVisible();
    });

    // TC-PB16-006 & TC-PB16-007: Ekspor CSV dan Verifikasi format Rupiah
    test('TC-PB16-006 & TC-PB16-007: Ekspor CSV dan Verifikasi format Rupiah', async ({ page }) => {
      await page.goto('/pendonor/dashboard-pembayaran');
      await page.locator('h1').waitFor({ state: 'visible' });

      const exportCsvBtn = page.locator('#export-csv-btn');
      await exportCsvBtn.waitFor({ state: 'visible' });
      await expect(exportCsvBtn).toBeVisible();

      // Capture download event
      const downloadPromise = page.waitForEvent('download');
      await exportCsvBtn.click();
      const download = await downloadPromise;

      // TC-PB16-006: Expected CSV filename format
      expect(download.suggestedFilename()).toMatch(/data-penerima-\d{4}-\d{2}-\d{2}\.csv/);

      // TC-PB16-007: Read download contents and verify Rupiah formatting is in the file
      const path = await download.path();
      const fs = require('fs');
      const csvContents = fs.readFileSync(path, 'utf8');
      
      // The formatting expected is "Rp 5.000.000"
      expect(csvContents).toContain('Rp 5.000.000');
    });

    // TC-PB16-008: Ekspor data ke format Excel
    test('TC-PB16-008: Ekspor data ke format Excel', async ({ page }) => {
      await page.goto('/pendonor/dashboard-pembayaran');
      await page.locator('h1').waitFor({ state: 'visible' });

      const exportExcelBtn = page.locator('#export-excel-btn');
      await exportExcelBtn.waitFor({ state: 'visible' });
      await expect(exportExcelBtn).toBeVisible();

      // Capture download event
      const downloadPromise = page.waitForEvent('download');
      await exportExcelBtn.click();
      const download = await downloadPromise;

      // TC-PB16-008: Expected XLSX filename format
      expect(download.suggestedFilename()).toMatch(/data-penerima-\d{4}-\d{2}-\d{2}\.xlsx/);
    });

    // TC-PB16-011: Memfilter dan mencari penerima beasiswa pada tabel rekap pembayaran
    test('TC-PB16-011: Memfilter dan mencari penerima beasiswa pada tabel rekap pembayaran', async ({ page }) => {
      await page.goto('/pendonor/dashboard-pembayaran');
      await page.locator('h1').waitFor({ state: 'visible' });

      const searchInput = page.locator('input[placeholder="Cari nama mahasiswa / program..."]');
      await searchInput.waitFor({ state: 'visible' });
      await searchInput.fill(testData.mhsUser.nama);
      await expect(page.locator(`text=${testData.mhsUser.nama}`)).toBeVisible();

      await searchInput.fill('Nama Yang Tidak Mungkin Ada');
      await expect(page.locator('text=Antrean Kosong')).toBeVisible();

      await searchInput.fill('');

      await page.click('button:has-text("Verified")');
      await expect(page.locator('text=Antrean Kosong')).toBeVisible();

      await page.click('button:has-text("Pending")');
      await expect(page.locator(`text=${testData.mhsUser.nama}`)).toBeVisible();
    });

  });
});
