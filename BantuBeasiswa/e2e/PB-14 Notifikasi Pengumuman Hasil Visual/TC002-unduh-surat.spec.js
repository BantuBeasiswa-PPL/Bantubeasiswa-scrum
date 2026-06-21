const { test, expect } = require('@playwright/test');
const { createTestDataPB14, cleanTestDataPB14, openStatusPage } = require('./pb14.helpers');

test.describe('PB-14: Notifikasi Pengumuman Hasil Visual', () => {
  let testData;

  test.afterEach(async () => {
    await cleanTestDataPB14(testData);
    testData = null;
  });

  test('TC002: tombol unduh surat kelulusan menampilkan notifikasi simulasi', async ({ page, context }) => {
    testData = await createTestDataPB14('LULUS');
    await openStatusPage(page, context, testData);

    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Mengunduh Surat Keputusan Kelulusan Beasiswa');
      await dialog.accept();
    });

    await page.getByRole('button', { name: 'Unduh Surat Kelulusan' }).click();
  });
});
