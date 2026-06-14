const { test, expect } = require('@playwright/test');
const { loginAs } = require('./helpers');

test.describe('Mahasiswa Dashboard E2E Tests', () => {
  test('should render complaint reports table on laporan-kendala page', async ({ page, context }) => {
    // 1. Mock authentication cookie as mahasiswa
    await loginAs(context, 'mahasiswa');

    // 2. Mock client-side fetch endpoint for complaints
    await page.route('**/api/mahasiswa/laporan-kendala', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          laporan: [
            {
              laporanId: 501,
              tanggalLapor: '2026-06-01T00:00:00.000Z',
              deskripsi: 'Kendala upload KRS pada semester berjalan',
              status: 'diproses',
              beasiswa: {
                judul: 'Beasiswa Pendidikan Madani',
                pendonor: {
                  nama_organisasi: 'Lembaga Pendidikan Nasional'
                }
              }
            }
          ]
        }),
      });
    });

    // 3. Navigate to reports page
    await page.goto('/mahasiswa/laporan-kendala');

    // 4. Assert page headers and content loading
    await expect(page.locator('h1')).toContainText('Laporan Kendala');
    
    // 5. Assert table row contents are rendered properly
    await expect(page.locator('text=Beasiswa Pendidikan Madani')).toBeVisible();
    await expect(page.locator('text=Kendala upload KRS pada semester berjalan')).toBeVisible();
    await expect(page.locator('text=Diproses')).toBeVisible();
  });
});
