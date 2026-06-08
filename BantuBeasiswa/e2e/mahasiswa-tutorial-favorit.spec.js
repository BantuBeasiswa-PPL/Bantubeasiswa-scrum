const { test, expect } = require('@playwright/test');
const { loginAs } = require('./helpers');

test.describe('PBI-30 & PBI-31: Mahasiswa Tutorial & Favorit E2E Tests', () => {
  const mockBeasiswaList = [
    {
      beasiswaId: 101,
      judul: 'Beasiswa Indonesia Pintar',
      deskripsi: 'Program bantuan biaya pendidikan penuh bagi putra-putri terbaik bangsa.',
      deadline: '2026-12-31T23:59:59Z',
      status: 'aktif',
      pendonor: { pendonorId: 1, statusOrganisasi: 'Lembaga Pendidikan Nasional' },
      beasiswa_wilayah: []
    }
  ];

  test.beforeEach(async ({ page }) => {
    // Mock Supabase REST calls untuk beasiswa, provinsi, wilayah
    await page.route('**/rest/v1/beasiswa?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBeasiswaList)
      });
    });

    await page.route('**/rest/v1/provinsi?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ provinsiId: 1, nama: 'DKI Jakarta' }])
      });
    });

    await page.route('**/rest/v1/wilayah?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
  });

  test('TC-01: Navigasi Perjalanan Admin/Mahasiswa (Stepper 4 Stepper)', async ({ page, context }) => {
    // Login terlebih dahulu agar tidak diredirect ke /login oleh SSR guard
    await loginAs(context, 'mahasiswa');

    // 1. Masuk ke halaman tutorial
    await page.goto('/tutorial-administrasi');

    // 2. Pastikan komponen Administrative Journey dan 4 langkah Stepper tampil
    await expect(page.locator('text=Administrative Journey')).toBeVisible();
    await expect(page.locator('text=Preparation').first()).toBeVisible();
    await expect(page.locator('text=Application').first()).toBeVisible();
    await expect(page.locator('text=Verification').first()).toBeVisible();
    await expect(page.locator('text=Disbursement').first()).toBeVisible();

    // 3. Klik salah satu step (Application) dan pastikan kontennya berubah
    await page.click('button:has-text("Application")');
    await expect(page.locator('text=Application — Pengisian & Upload')).toBeVisible();
  });

  test('TC-02: Unduh Template Dokumen', async ({ page, context }) => {
    // Login terlebih dahulu agar tidak diredirect ke /login oleh SSR guard
    await loginAs(context, 'mahasiswa');

    // 1. Masuk ke halaman tutorial
    await page.goto('/tutorial-administrasi');

    // 2. Pastikan card template dokumen tampil
    await expect(page.locator('text=Library Template Dokumen')).toBeVisible();
    await expect(page.locator('text=Template SKTM (Surat Keterangan Tidak Mampu)')).toBeVisible();

    // 3. Pastikan link unduh PDF dan DOCX mengarah ke URL public Supabase storage
    const pdfLink = page.locator('a:has-text("PDF")').first();
    const docxLink = page.locator('a:has-text("DOCX")').first();
    
    await expect(pdfLink).toHaveAttribute('href', /.*supabase.*sktm-template.pdf.*/);
    await expect(docxLink).toHaveAttribute('href', /.*supabase.*sktm-template.docx.*/);
  });

  test('TC-03: Bookmark Tanpa Login (Redirect ke Login)', async ({ page }) => {
    // 1. Pastikan status Guest (tidak login / tidak ada session cookie)
    // 2. Mock Supabase query check bookmark
    await page.route('**/rest/v1/favorit*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // 3. Buka Landing Page (index page '/')
    await page.goto('/');

    // 4. Klik ikon bookmark pada kartu beasiswa
    const bookmarkButton = page.locator('button[title="Simpan Ke Favorit"]').first();
    await bookmarkButton.click();

    // 5. User harus dialihkan ke halaman /login
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('TC-04 & TC-06: Optimistic Toggle Bookmark & Unique Bookmark', async ({ page, context }) => {
    // 1. Login sebagai mahasiswa
    await loginAs(context, 'mahasiswa');

    let isBookmarked = false;
    let postCount = 0;
    let deleteCount = 0;

    // Mock REST API untuk favorit
    await page.route('**/rest/v1/favorit*', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(isBookmarked ? [{ id: 1, user_id: 1, beasiswa_id: 101 }] : [])
        });
      } else if (method === 'POST') {
        postCount++;
        isBookmarked = true;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 1, user_id: 1, beasiswa_id: 101 }])
        });
      } else if (method === 'DELETE') {
        deleteCount++;
        isBookmarked = false;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({})
        });
      }
    });

    // 2. Buka Halaman Cari Beasiswa Mahasiswa (di mana userId diset dari SSR)
    await page.goto('/mahasiswa/cari');

    // 3. Pastikan tombol tampil sebagai outline "Simpan Ke Favorit"
    const bookmarkButton = page.locator('button[title="Simpan Ke Favorit"]').first();
    await expect(bookmarkButton).toBeVisible();

    // 4. Klik bookmark. Optimistic update langsung merubah visual menjadi solid "Hapus dari Favorit"
    await bookmarkButton.click();
    await expect(page.locator('button[title="Hapus dari Favorit"]').first()).toBeVisible();

    // Pastikan API POST dipanggil sekali
    expect(postCount).toBe(1);

    // 5. Klik sekali lagi (untuk unbookmark)
    await page.locator('button[title="Hapus dari Favorit"]').first().click();
    await expect(page.locator('button[title="Simpan Ke Favorit"]').first()).toBeVisible();
    
    // Pastikan API DELETE dipanggil sekali
    expect(deleteCount).toBe(1);
  });

  test('TC-05: Hapus dari Daftar Favorit di Halaman Favorit', async ({ page, context }) => {
    // 1. Login sebagai mahasiswa
    await loginAs(context, 'mahasiswa');

    // Mock Next.js data transfer untuk transisi client-side (agar data beasiswa terisi di halaman beasiswa-favorit)
    const pageDataPayload = {
      pageProps: {
        user: { userId: 1, role: 'mahasiswa', nama: 'MAHASISWA Test', accountId: 123 },
        initialBeasiswas: [
          {
            beasiswaId: 101,
            judul: 'Beasiswa Indonesia Pintar',
            deskripsi: 'Program bantuan biaya pendidikan penuh bagi putra-putri terbaik bangsa.',
            deadline: '2026-12-31T23:59:59Z',
            status: 'aktif',
            pendonor: { statusOrganisasi: 'Lembaga Pendidikan Nasional' },
            beasiswa_wilayah: []
          }
        ]
      },
      __N_SSP: true
    };

    await page.route('**/_next/data/**/mahasiswa/favorit.json*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pageDataPayload)
      });
    });

    await page.route('**/_next/data/**/mahasiswa/beasiswa-favorit.json*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pageDataPayload)
      });
    });

    // Mock DELETE REST call
    await page.route('**/rest/v1/favorit*', async (route) => {
      const method = route.request().method();
      if (method === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({})
        });
      }
    });

    // 2. Masuk ke halaman Cari Beasiswa terlebih dahulu (agar bisa transisi client-side ke Favorit)
    await page.goto('/mahasiswa/cari');

    // 3. Klik menu Beasiswa Favorit di sidebar
    await page.click('a:has-text("Beasiswa Favorit")');

    // 4. Pastikan kartu beasiswa favorit ter-render
    await expect(page.locator('text=Beasiswa Indonesia Pintar')).toBeVisible();

    // 5. Klik tombol Hapus dari Favorit (Solid Icon)
    const removeButton = page.locator('button[title="Hapus dari Favorit"]').first();
    await removeButton.click();

    // Konfirmasi SweetAlert2 popup
    const swalPopup = page.locator('.swal2-popup');
    await expect(swalPopup).toBeVisible();
    await expect(swalPopup.locator('.swal2-title')).toContainText('Hapus dari Favorit?');

    // Click confirm button
    await swalPopup.locator('button:has-text("Ya, Hapus")').click();

    // Tunggu success SweetAlert2 popup dan klik OK
    const successSwal = page.locator('.swal2-popup:has-text("Berhasil!")');
    await expect(successSwal).toBeVisible();
    await successSwal.locator('button:has-text("OK")').click();

    // 6. Kartu beasiswa hilang dari daftar favorit
    await expect(page.locator('text=Beasiswa Indonesia Pintar')).not.toBeVisible();
  });
});
