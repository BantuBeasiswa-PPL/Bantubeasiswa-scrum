const { test, expect } = require('@playwright/test');
const { loginAs, createRealDbTestDataPB16, cleanRealDbTestDataPB16 } = require('./helpers');

/**
 * PB-16 — Rekap Pembayaran Beasiswa (PBI-29)
 *
 * Skenario Pengujian:
 * - TC-PB16-005: Membuka modal konfirmasi transfer individu
 */
test.describe('PBI-29: Konfirmasi Transfer Dana E2E Tests (Real Database)', () => {

  let testData;

  test.beforeAll(async () => {
    testData = await createRealDbTestDataPB16();
  });

  test.afterAll(async () => {
    await cleanRealDbTestDataPB16(testData);
  });

  test.describe('Akses Terverifikasi Pendonor', () => {

    test.beforeEach(async ({ context }) => {
      await loginAs(context, 'pendonor', {
        userId: testData.pendonorId,
        accountId: testData.pendonorAccountId
      });
    });

    // TC-PB16-005: Membuka modal konfirmasi transfer individu
    test('TC-PB16-005: Membuka modal konfirmasi transfer individu', async ({ page }) => {
      await page.goto('/pendonor/dashboard-pembayaran');

      const initiateBtn = page.locator(`#initiate-btn-${testData.pendaftaran.pendaftaranId}`);
      await expect(initiateBtn).toBeVisible();

      // Click Initiate
      await initiateBtn.click();

      // Check modal open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal.locator('text=BCA')).toBeVisible();
      await expect(modal.locator(`text=${testData.rekening.nomorRekening}`)).toBeVisible();
      await expect(modal.locator(`text=${testData.mhsUser.nama}`)).toBeVisible();

      // Cancel modal
      await page.click('button:has-text("Batal")');
      await expect(modal).not.toBeVisible();
    });

    // TC-PB16-011: Mengonfirmasi transfer dengan mengunggah bukti dan mengisi data transaksi secara lengkap
    test('TC-PB16-011: Mengonfirmasi transfer dengan mengunggah bukti dan mengisi data transaksi secara lengkap', async ({ page }) => {
      await page.goto('/pendonor/dashboard-pembayaran');

      const initiateBtn = page.locator(`#initiate-btn-${testData.pendaftaran.pendaftaranId}`);
      await expect(initiateBtn).toBeVisible();
      await initiateBtn.click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Isi ID Transaksi
      await page.fill('#id-transaksi', 'TRX9988776655');

      // Isi Tanggal Transfer
      await page.fill('#tanggal-transfer', '2026-06-16');

      // Upload file bukti transfer (dummy content)
      const fileInput = modal.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'bukti_transfer.png',
        mimeType: 'image/png',
        buffer: Buffer.from('dummy-image-content'),
      });

      // Centang checkbox verifikasi
      await page.check('input[type="checkbox"]');

      // Submit form
      const submitBtn = page.locator('button:has-text("Konfirmasi & Simpan")');
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();

      // Wait for server response to the confirm endpoint (gives tolerance for slow network)
      await page.waitForResponse(response =>
        response.url().includes('/api/pendonor/pembayaran/confirm') && response.status() === 200,
        { timeout: 15000 }
      ).catch(() => {});

      // Periksa visual sukses dengan timeout lebih besar agar tidak flakey pada koneksi lambat
      await page.waitForSelector('text=Konfirmasi Berhasil!', { timeout: 15000 });
      await expect(page.locator('text=Konfirmasi Berhasil!')).toBeVisible({ timeout: 15000 });
    });

  });
});
