const { test, expect } = require('@playwright/test');
const { loginAs } = require('./helpers');

test.describe('PBI-40 & PBI-41: Admin Kelola Beasiswa E2E Tests', () => {
  // Mock data beasiswa yang akan digunakan untuk pengujian
  const mockBeasiswaList = [
    {
      beasiswaId: 201,
      judul: 'Beasiswa Unggulan Prestasi',
      jalur: 'Prestasi',
      deskripsi: 'Program beasiswa penuh untuk mahasiswa berprestasi akademik luar biasa.',
      syarat: 'IPK minimal 3.8\nSertifikat prestasi nasional',
      nominal: 12000000,
      kuota: 15,
      deadline: '2026-12-31T23:59:59Z',
      status: 'pending',
      alasanPenolakan: null,
      createdAt: '2026-06-01T08:00:00Z',
      pendonor: {
        pendonorId: 10,
        statusOrganisasi: 'Yayasan Bakti Nusantara',
        kontak: '08123456789',
        alamat: 'Jakarta'
      },
      beasiswa_wilayah: [
        {
          keterangan: 'Afirmasi Wilayah',
          wilayah: {
            wilayahId: 1,
            nama: 'Kab. Yahukimo',
            tipe: 'kabupaten',
            isAfirmasi: true,
            is3T: true,
            provinsi: { provinsiId: 99, nama: 'Papua' }
          }
        }
      ]
    },
    {
      beasiswaId: 202,
      judul: 'Beasiswa Ekonomi Harapan',
      jalur: 'Kemitraan',
      deskripsi: 'Bantuan biaya pendidikan untuk mahasiswa kurang mampu.',
      syarat: 'SKTM dari kelurahan\nKeluarga pemegang KIP',
      nominal: 6000000,
      kuota: 50,
      deadline: '2026-07-15T23:59:59Z',
      status: 'aktif',
      alasanPenolakan: null,
      createdAt: '2026-06-02T09:00:00Z',
      pendonor: {
        pendonorId: 11,
        statusOrganisasi: 'PT Sinar Sejahtera',
        kontak: '08987654321',
        alamat: 'Surabaya'
      },
      beasiswa_wilayah: []
    },
    {
      beasiswaId: 203,
      judul: 'Beasiswa Teknologi Masa Depan',
      jalur: 'Riset',
      deskripsi: 'Beasiswa khusus jurusan ilmu komputer dan teknologi informasi.',
      syarat: 'Proposal riset AI / Machine Learning',
      nominal: 15000000,
      kuota: 5,
      deadline: '2026-08-30T23:59:59Z',
      status: 'draft',
      alasanPenolakan: 'Format dokumen persyaratan kurang lengkap',
      createdAt: '2026-06-03T10:00:00Z',
      pendonor: {
        pendonorId: 10,
        statusOrganisasi: 'Yayasan Bakti Nusantara',
        kontak: '08123456789',
        alamat: 'Jakarta'
      },
      beasiswa_wilayah: []
    }
  ];

  test.beforeEach(async ({ page, context }) => {
    // 1. Login Mock sebagai admin
    await loginAs(context, 'admin');

    // 2. Mock GET API untuk daftar beasiswa admin
    await page.route('**/api/admin/beasiswa', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Daftar program beasiswa berhasil diambil',
          count: mockBeasiswaList.length,
          data: mockBeasiswaList
        })
      });
    });
  });

  test('TC-UI-01 & TC-UI-02: Harus merender list beasiswa dan stat cards secara akurat', async ({ page }) => {
    // Navigasi ke halaman kelola beasiswa admin
    await page.goto('/admin/beasiswa');

    // Pastikan Stat Cards menampilkan data yang sesuai (gunakan tag paragraph untuk menghindari ambiguitas pill filter status)
    await expect(page.locator('p:has-text("Menunggu Persetujuan")')).toBeVisible();
    await expect(page.locator('p:has-text("Beasiswa Aktif")')).toBeVisible();
    await expect(page.locator('p:has-text("Total Program Beasiswa")')).toBeVisible();

    // Verifikasi beasiswa di tabel dirender sesuai mock data
    await expect(page.locator('text=Beasiswa Unggulan Prestasi')).toBeVisible();
    await expect(page.locator('text=Beasiswa Ekonomi Harapan')).toBeVisible();
    await expect(page.locator('text=Yayasan Bakti Nusantara').first()).toBeVisible();
    await expect(page.locator('text=PT Sinar Sejahtera')).toBeVisible();
  });

  test('TC-UI-03 & TC-UI-04: Harus dapat mencari dan memfilter beasiswa berdasarkan status', async ({ page }) => {
    await page.goto('/admin/beasiswa');

    // Cari berdasarkan judul beasiswa
    const searchInput = page.locator('input[placeholder="Cari beasiswa atau pendonor..."]');
    await searchInput.fill('Unggulan');
    await expect(page.locator('text=Beasiswa Unggulan Prestasi')).toBeVisible();
    await expect(page.locator('text=Beasiswa Ekonomi Harapan')).not.toBeVisible();

    // Reset pencarian
    await searchInput.fill('');

    // Filter berdasarkan status 'aktif'
    await page.click('button:has-text("Aktif")');
    await expect(page.locator('text=Beasiswa Ekonomi Harapan')).toBeVisible();
    await expect(page.locator('text=Beasiswa Unggulan Prestasi')).not.toBeVisible();
  });

  test('TC-UI-05 & TC-API-04: Harus dapat menyetujui (approve) beasiswa status pending', async ({ page }) => {
    let patchPayload = null;

    // Mock PATCH API untuk approve beasiswa
    await page.route('**/api/admin/beasiswa/201', async (route) => {
      expect(route.request().method()).toBe('PATCH');
      patchPayload = JSON.parse(route.request().postData());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          beasiswaId: 201,
          status: 'aktif',
          message: 'Program beasiswa berhasil disetujui'
        })
      });
    });

    await page.goto('/admin/beasiswa');

    // Cari item yang berstatus pending dan klik setujui (tombol ✅)
    const pendingRow = page.locator('tr:has-text("Beasiswa Unggulan Prestasi")');
    const approveButton = pendingRow.locator('button[title="Setujui Program"]');
    await approveButton.click();

    // Konfirmasi SweetAlert2 popup
    const swalPopup = page.locator('.swal2-popup');
    await expect(swalPopup).toBeVisible();
    await expect(swalPopup.locator('.swal2-title')).toContainText('Setujui Beasiswa?');

    // Click confirm button
    await swalPopup.locator('button:has-text("Ya, Setujui")').click();

    // Tunggu success SweetAlert2 popup dan klik OK
    const successSwal = page.locator('.swal2-popup:has-text("Berhasil!")');
    await expect(successSwal).toBeVisible();
    await successSwal.locator('button:has-text("OK")').click();
    await expect(successSwal).not.toBeVisible();

    expect(patchPayload).toEqual({ action: 'approve' });
  });

  test('TC-UI-06 & TC-API-05: Harus dapat menolak (reject) beasiswa dengan menyertakan alasan', async ({ page }) => {
    let rejectPayload = null;

    // Mock PATCH API untuk reject beasiswa
    await page.route('**/api/admin/beasiswa/201', async (route) => {
      expect(route.request().method()).toBe('PATCH');
      rejectPayload = JSON.parse(route.request().postData());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          beasiswaId: 201,
          status: 'draft',
          message: 'Program beasiswa berhasil ditolak'
        })
      });
    });

    await page.goto('/admin/beasiswa');

    // Cari item pending dan klik tolak (tombol ❌)
    const pendingRow = page.locator('tr:has-text("Beasiswa Unggulan Prestasi")');
    const rejectButton = pendingRow.locator('button[title="Tolak Program"]');
    await rejectButton.click();

    // Pastikan modal penolakan muncul
    const rejectModal = page.locator('text=Tolak Pengajuan Beasiswa').locator('xpath=../..');
    await expect(rejectModal).toBeVisible();

    // Isi alasan penolakan dan submit
    const reasonTextarea = rejectModal.locator('textarea#reason-reject');
    await reasonTextarea.fill('Syarat IPK minimal terlalu rendah, harap dinaikkan.');
    await rejectModal.locator('button[type="submit"]').click();

    // Tunggu success SweetAlert2 popup dan klik OK
    const successSwal = page.locator('.swal2-popup:has-text("Berhasil!")');
    await expect(successSwal).toBeVisible();
    await successSwal.locator('button:has-text("OK")').click();
    await expect(successSwal).not.toBeVisible();

    // Verifikasi modal tertutup dan API terpanggil dengan payload tepat
    await expect(rejectModal).not.toBeVisible();
    expect(rejectPayload).toEqual({
      action: 'reject',
      alasan: 'Syarat IPK minimal terlalu rendah, harap dinaikkan.'
    });
  });

  test('TC-UI-08 & TC-API-08: Harus dapat menghapus beasiswa secara permanen dengan menyertakan alasan', async ({ page }) => {
    let deletePayload = null;

    // Mock DELETE API beasiswa
    await page.route('**/api/admin/beasiswa/202', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      deletePayload = JSON.parse(route.request().postData());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Program beasiswa "Beasiswa Ekonomi Harapan" berhasil dihapus'
        })
      });
    });

    await page.goto('/admin/beasiswa');

    // Klik tombol hapus (tombol 🗑️) pada baris beasiswa kedua
    const targetRow = page.locator('tr:has-text("Beasiswa Ekonomi Harapan")');
    const deleteButton = targetRow.locator('button[title="Hapus Program"]');
    await deleteButton.click();

    // Verifikasi modal hapus muncul
    const deleteModal = page.locator('text=Hapus Program Beasiswa').locator('xpath=../..');
    await expect(deleteModal).toBeVisible();

    // Isi alasan dan submit
    const reasonTextarea = deleteModal.locator('textarea#reason-delete');
    await reasonTextarea.fill('Mitra pendonor meminta pembatalan program secara tertulis.');
    await deleteModal.locator('button[type="submit"]').click();

    // Tunggu success SweetAlert2 popup dan klik OK
    const successSwal = page.locator('.swal2-popup:has-text("Berhasil!")');
    await expect(successSwal).toBeVisible();
    await successSwal.locator('button:has-text("OK")').click();
    await expect(successSwal).not.toBeVisible();

    // Verifikasi modal tertutup dan payload API terkirim
    await expect(deleteModal).not.toBeVisible();
    expect(deletePayload).toEqual({
      alasan: 'Mitra pendonor meminta pembatalan program secara tertulis.'
    });
  });
});
