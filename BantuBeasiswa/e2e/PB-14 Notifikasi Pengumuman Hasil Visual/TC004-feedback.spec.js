const { test, expect } = require('@playwright/test');
const { createTestDataPB14, cleanTestDataPB14, openStatusPage } = require('./pb14.helpers');

test.describe('PB-14: Notifikasi Pengumuman Hasil Visual', () => {
  let testData;

  test.afterEach(async () => {
    await cleanTestDataPB14(testData);
    testData = null;
  });

  test('TC004: feedback seleksi dapat dibuka dan ditutup', async ({ page, context }) => {
    testData = await createTestDataPB14('DITOLAK');
    await openStatusPage(page, context, testData);

    await page.getByRole('button', { name: 'Lihat Feedback Seleksi' }).click();
    await expect(page.getByText('Review Tim Panitia')).toBeVisible();

    await page.getByRole('button', { name: 'Tutup Feedback' }).click();
    await expect(page.getByText('Review Tim Panitia')).toHaveCount(0);
  });
});
