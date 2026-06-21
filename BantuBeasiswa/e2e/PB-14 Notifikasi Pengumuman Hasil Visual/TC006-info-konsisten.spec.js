const { test, expect } = require('@playwright/test');
const { createTestDataPB14, cleanTestDataPB14, openStatusPage } = require('./pb14.helpers');

test.describe('PB-14: Notifikasi Pengumuman Hasil Visual', () => {
  let testData;

  test.afterEach(async () => {
    await cleanTestDataPB14(testData);
    testData = null;
  });

  test('TC006: informasi beasiswa, pendonor, dan tanggal pendaftaran tampil konsisten', async ({ page, context }) => {
    testData = await createTestDataPB14('LULUS');
    await openStatusPage(page, context, testData);

    await expect(page.getByRole('heading', { name: 'Beasiswa Visual Nusantara 2026' })).toBeVisible();
    await expect(page.getByTestId('result-banner').getByText('Beasiswa Visual Nusantara 2026', { exact: true })).toBeVisible();
    await expect(page.getByText('Rp 7.500.000')).toBeVisible();
    await expect(page.getByText('Pendonor', { exact: true })).toBeVisible();
    await expect(page.getByText('Daftar:')).toBeVisible();
    await expect(page.getByText('ID:')).toBeVisible();
  });
});
