const { test, expect } = require('@playwright/test');
const { createTestDataPB14, cleanTestDataPB14, expectResultBanner, openStatusPage } = require('./pb14.helpers');

test.describe('PB-14: Notifikasi Pengumuman Hasil Visual', () => {
  let testData;

  test.afterEach(async () => {
    await cleanTestDataPB14(testData);
    testData = null;
  });

  test('TC003: banner tidak lolos tampil dengan tone merah untuk status DITOLAK', async ({ page, context }) => {
    testData = await createTestDataPB14('DITOLAK');
    await openStatusPage(page, context, testData);

    await expectResultBanner(page, 'red', 'DITOLAK');
    await expect(page.getByRole('heading', { name: 'Terima Kasih Atas Partisipasi Anda' })).toBeVisible();
    await expect(page.getByText(/Meskipun kali ini belum berhasil/)).toBeVisible();
    await expect(page.getByText('Tidak Lolos')).toBeVisible();
    await expect(page.getByText('Tahap 4: Keputusan Akhir')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lihat Feedback Seleksi' })).toBeVisible();
  });
});
