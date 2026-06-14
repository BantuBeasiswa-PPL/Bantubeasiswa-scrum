const { test, expect } = require('@playwright/test');
const { loginAs } = require('./helpers');

test.describe('Admin Wilayah E2E Tests', () => {
  test('should render region list and perform delete action via SweetAlert2 confirm', async ({ page, context }) => {
    // 1. Mock authentication cookie for SSR guard
    await loginAs(context, 'admin');

    // 2. Mock region and province client-side API fetches
    await page.route('**/api/admin/wilayah', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            wilayahId: 1001,
            nama: 'Kab. Yahukimo',
            is3T: true,
            isAfirmasi: false,
            jenis_3t: 'Terluar',
            tipe: 'kabupaten',
            provinsi: { nama: 'Papua' }
          }
        ]),
      });
    });

    await page.route('**/api/provinsi', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { provinsiId: 1, nama: 'Papua' }
        ]),
      });
    });

    // Mock the DELETE call
    await page.route('**/api/admin/wilayah/1001', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Wilayah berhasil dihapus.' }),
      });
    });

    // 3. Navigate to Wilayah Admin page
    await page.goto('/admin/wilayah');

    // 4. Assert that region list renders from mocked data
    await expect(page.locator('text=Kab. Yahukimo')).toBeVisible();

    // 5. Trigger deletion
    await page.click('button[title="Hapus"]');

    // 6. Verify SweetAlert2 pop-up modal renders correctly
    const swalPopup = page.locator('.swal2-popup');
    await expect(swalPopup).toBeVisible();
    await expect(swalPopup.locator('.swal2-title')).toContainText('Hapus Wilayah?');

    // 7. Click confirm button
    await swalPopup.locator('button:has-text("Ya, Hapus")').click();

    // 8. Confirm row is deleted from DOM
    await expect(page.locator('text=Kab. Yahukimo')).not.toBeVisible();
  });
});
