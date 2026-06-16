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

  });
});
