const { test, expect } = require('@playwright/test');
const { createTestDataPB14, cleanTestDataPB14, openStatusPage } = require('./pb14.helpers');

test.describe('PB-14: Notifikasi Pengumuman Hasil Visual', () => {
  let testData;

  test.afterEach(async () => {
    await cleanTestDataPB14(testData);
    testData = null;
  });

  test('TC005: status REVIEW tidak menampilkan banner hasil akhir', async ({ page, context }) => {
    testData = await createTestDataPB14('REVIEW');
    await openStatusPage(page, context, testData);

    await expect(page.getByTestId('result-banner')).toHaveCount(0);
    await expect(page.getByText('Candidate Verified')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Terima Kasih Atas Partisipasi Anda' })).toHaveCount(0);
    await expect(page.getByText('Sedang Diverifikasi')).toBeVisible();
    await expect(page.getByText('Tahap 2: Verifikasi Dokumen')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lihat Feedback Seleksi' })).toHaveCount(0);
  });
});
