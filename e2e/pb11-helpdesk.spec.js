const { test, expect } = require('@playwright/test');
const { loginAs } = require('./helpers');

/**
 * PB-11 — Pusat Bantuan / Helpdesk Admin (PBI-17 & PBI-18, FR-05)
 *
 * User story: "Sebagai admin, saya ingin menyediakan pusat bantuan (helpdesk)
 * sehingga kendala teknis pengguna dapat tertangani."
 *
 * Halaman /admin/laporan memakai withAuth('admin') (hanya decode JWT, tanpa DB)
 * lalu mengambil tiket lewat GET /api/admin/laporan-kendala, dan memperbarui
 * status tiket lewat PATCH endpoint yang sama (via TiketDetailPanel).
 */
test.describe('PB-11 (PBI-17 & PBI-18): Admin Helpdesk Laporan Kendala E2E Tests', () => {
  const mockTiket = [
    {
      laporanId: 1,
      userId: 10,
      user: { nama: 'Andi Pratama', email: 'andi@univ.ac.id' },
      deskripsi: 'Link pendaftaran beasiswa rusak, tidak bisa diakses sama sekali.',
      beasiswa: { judul: 'Beasiswa Garuda Nusantara' },
      status: 'pending',
      tanggalLapor: '2026-06-01T08:00:00.000Z',
    },
    {
      laporanId: 2,
      userId: 11,
      user: { nama: 'Siti Aminah', email: 'siti@univ.ac.id' },
      deskripsi: 'Data nominal beasiswa pada katalog tampak tidak valid.',
      beasiswa: { judul: 'Beasiswa Ekonomi Harapan' },
      status: 'selesai',
      tanggalLapor: '2026-05-20T08:00:00.000Z',
    },
  ];
  const mockStats = { totalAktif: 1, avgJam: 12, totalUrgent: 0 };

  // Pasang handler GET (daftar tiket) + PATCH (update status) pada satu URL.
  async function mockApi(page, { onPatch } = {}) {
    await page.route('**/api/admin/laporan-kendala', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tiket: mockTiket, stats: mockStats }),
        });
      } else if (method === 'PATCH') {
        if (onPatch) onPatch(JSON.parse(route.request().postData()));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Status tiket berhasil diperbarui' }),
        });
      } else {
        await route.continue();
      }
    });
  }

  test('TC-PB11-01: Merender stat cards dan daftar tiket dari API', async ({ page, context }) => {
    await loginAs(context, 'admin');
    await mockApi(page);

    await page.goto('/admin/laporan');

    await expect(page.locator('h1')).toContainText('Laporan Kendala');
    await expect(page.locator('text=Total Tiket Aktif')).toBeVisible();

    // Baris tiket dari mock data
    await expect(page.locator('text=Andi Pratama')).toBeVisible();
    await expect(page.locator('text=Beasiswa Garuda Nusantara')).toBeVisible();
    await expect(page.locator('text=Siti Aminah')).toBeVisible();
  });

  test('TC-PB11-02: Memfilter tiket berdasarkan status', async ({ page, context }) => {
    await loginAs(context, 'admin');
    await mockApi(page);
    await page.goto('/admin/laporan');
    await expect(page.locator('text=Andi Pratama')).toBeVisible();

    // Filter "Pending" → hanya tiket Andi (pending)
    await page.click('button:has-text("Pending")');
    await expect(page.locator('text=Andi Pratama')).toBeVisible();
    await expect(page.locator('text=Siti Aminah')).not.toBeVisible();

    // Filter "Selesai" → hanya tiket Siti (selesai)
    await page.click('button:has-text("Selesai")');
    await expect(page.locator('text=Siti Aminah')).toBeVisible();
    await expect(page.locator('text=Andi Pratama')).not.toBeVisible();
  });

  test('TC-PB11-03: Mencari tiket berdasarkan nama pelapor', async ({ page, context }) => {
    await loginAs(context, 'admin');
    await mockApi(page);
    await page.goto('/admin/laporan');

    await page.fill('input[placeholder*="Cari tiket"]', 'Siti');
    await expect(page.locator('text=Siti Aminah')).toBeVisible();
    await expect(page.locator('text=Andi Pratama')).not.toBeVisible();
  });

  test('TC-PB11-04: Membuka panel detail tiket menampilkan profil pelapor & isi laporan', async ({ page, context }) => {
    await loginAs(context, 'admin');
    await mockApi(page);
    await page.goto('/admin/laporan');

    await page.click('#tiket-row-1');

    // Label & isi yang hanya ada di panel detail (menghindari duplikasi dengan baris tabel)
    await expect(page.locator('text=Detail Laporan')).toBeVisible();
    await expect(page.locator('text=Profil Pelapor')).toBeVisible();
    await expect(page.locator('text=Message History')).toBeVisible();
    await expect(page.locator('text=ID Akun: 10')).toBeVisible();
  });

  test('TC-PB11-05: Memperbarui status tiket mengirim PATCH dengan payload benar & menutup panel', async ({ page, context }) => {
    await loginAs(context, 'admin');
    let patchPayload = null;
    await mockApi(page, { onPatch: (p) => { patchPayload = p; } });
    await page.goto('/admin/laporan');

    await page.click('#tiket-row-1');
    await expect(page.locator('text=Detail Laporan')).toBeVisible();

    // Ubah status pending → diproses lalu simpan
    await page.selectOption('#panel-status', 'diproses');
    await page.click('#btn-send-reply');

    // Panel tertutup (konten unmount saat tiket = null)
    await expect(page.locator('text=Detail Laporan')).not.toBeVisible();
    expect(patchPayload).toEqual({ id: 1, status: 'diproses' });
  });

  test('TC-PB11-06: Update tanpa mengubah status menampilkan validasi', async ({ page, context }) => {
    await loginAs(context, 'admin');
    await mockApi(page);
    await page.goto('/admin/laporan');

    await page.click('#tiket-row-1');
    await expect(page.locator('text=Detail Laporan')).toBeVisible();

    // Langsung simpan tanpa mengubah dropdown (tetap 'pending')
    await page.click('#btn-send-reply');

    await expect(page.locator('text=Pilih status baru terlebih dahulu')).toBeVisible();
    // Panel tetap terbuka
    await expect(page.locator('text=Detail Laporan')).toBeVisible();
  });
});
