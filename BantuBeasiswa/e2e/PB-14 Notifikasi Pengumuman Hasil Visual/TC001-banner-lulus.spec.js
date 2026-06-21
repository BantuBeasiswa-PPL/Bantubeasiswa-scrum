const { test, expect } = require('@playwright/test');
const { createTestDataPB14, cleanTestDataPB14, expectResultBanner, openStatusPage } = require('./pb14.helpers');
const { holdForVisualCheck, pauseForDebug, resetE2EDatabase } = require('../helpers');

test.describe('PB-14: Notifikasi Pengumuman Hasil Visual', () => {
  let testData;

  test.afterEach(async () => {
    await cleanTestDataPB14(testData);
    testData = null;
  });

  test('TC001: banner kelulusan tampil dengan tone biru untuk status LULUS', async ({ page, context }) => {
    await resetE2EDatabase();
    testData = await createTestDataPB14('LULUS');
    await openStatusPage(page, context, testData);
    await holdForVisualCheck(page);
    await pauseForDebug(page);

    await expectResultBanner(page, 'blue', 'LULUS');
    await expect(page.getByText('Candidate Verified')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Selamat/ })).toBeVisible();
    await expect(page.getByText('Anda Dinyatakan Lulus.')).toBeVisible();
    await expect(page.getByText('Beasiswa Visual Nusantara 2026').first()).toBeVisible();
    await expect(page.getByText('Rp 7.500.000')).toBeVisible();
    await expect(page.getByText('Lulus', { exact: true })).toBeVisible();
    await expect(page.getByText('Tahap 4: Keputusan Akhir')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unduh Surat Kelulusan' })).toBeVisible();
  });
});
