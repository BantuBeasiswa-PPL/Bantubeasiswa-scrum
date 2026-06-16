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

  test('TC-30-01: Navigasi Administrative Journey (Stepper 4 langkah)', async ({ page, context }) => {
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

    // 3. Pastikan konten default (Preparation) dan checklist-nya tampil
    await expect(page.locator('text=Preparation — Persiapan Dokumen')).toBeVisible();
    await expect(page.locator('text=Periksa masa aktif KTP & keabsahan KK')).toBeVisible();

    // 4. Klik step Application dan pastikan kontennya berubah
    await page.click('button:has-text("Application")');
    await expect(page.locator('text=Application — Pengisian & Upload')).toBeVisible();
    await expect(page.locator('text=Upload dokumen persyaratan di slot yang disediakan')).toBeVisible();

    // 5. Klik step Verification dan pastikan kontennya berubah
    await page.click('button:has-text("Verification")');
    await expect(page.locator('text=Verification — Verifikasi & Ujian')).toBeVisible();
    await expect(page.locator('text=Pantau status verifikasi berkas secara berkala')).toBeVisible();

    // 6. Klik step Disbursement dan pastikan kontennya berubah
    await page.click('button:has-text("Disbursement")');
    await expect(page.locator('text=Disbursement — Pencairan Dana')).toBeVisible();
    await expect(page.locator('text=Daftarkan nomor rekening aktif atas nama sendiri')).toBeVisible();

    // 7. Klik step Preparation kembali dan pastikan kontennya berubah
    await page.click('button:has-text("Preparation")');
    await expect(page.locator('text=Preparation — Persiapan Dokumen')).toBeVisible();
  });

  test('TC-30-02: Unduh Template Dokumen & Filter Kategori', async ({ page, context }) => {
    // Login terlebih dahulu agar tidak diredirect ke /login oleh SSR guard
    await loginAs(context, 'mahasiswa');

    // 1. Masuk ke halaman tutorial
    await page.goto('/tutorial-administrasi');

    // 2. Pastikan card template dokumen tampil secara umum
    await expect(page.locator('text=Library Template Dokumen')).toBeVisible();
    await expect(page.locator('text=Template SKTM (Surat Keterangan Tidak Mampu)')).toBeVisible();

    // 3. Cari kontainer template library
    const templateLibrary = page.locator('section:has-text("Library Template Dokumen")');

    // 4. Test filter tab "Personal"
    await templateLibrary.locator('button:has-text("Personal")').click();
    await expect(page.locator('text=Template CV Profesional ATS-Friendly')).toBeVisible();
    await expect(page.locator('text=Template SKTM (Surat Keterangan Tidak Mampu)')).not.toBeVisible();

    // 5. Test filter tab "Beasiswa"
    await templateLibrary.locator('button:has-text("Beasiswa")').click();
    await expect(page.locator('text=Template SKTM (Surat Keterangan Tidak Mampu)')).toBeVisible();
    await expect(page.locator('text=Template CV Profesional ATS-Friendly')).not.toBeVisible();

    // 6. Test filter tab "Semua"
    await templateLibrary.locator('button:has-text("Semua")').click();
    await expect(page.locator('text=Template SKTM (Surat Keterangan Tidak Mampu)')).toBeVisible();
    await expect(page.locator('text=Template CV Profesional ATS-Friendly')).toBeVisible();

    // 7. Pastikan link unduh PDF dan DOCX mengarah ke URL public Supabase storage
    const pdfLink = page.locator('a:has-text("PDF")').first();
    const docxLink = page.locator('a:has-text("DOCX")').first();
    
    await expect(pdfLink).toHaveAttribute('href', /.*supabase.*sktm-template.pdf.*/);
    await expect(docxLink).toHaveAttribute('href', /.*supabase.*sktm-template.docx.*/);
  });

  test('TC-31-01: Bookmark Tanpa Login (Redirect ke Login)', async ({ page }) => {
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

  test('TC-31-02: Optimistic Toggle Bookmark', async ({ page, context }) => {
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

    // 2. Buka Halaman Cari Beasiswa Mahasiswa
    await page.goto('/mahasiswa/cari');

    // 3. Pastikan tombol tampil sebagai outline "Simpan Ke Favorit"
    const bookmarkButton = page.locator('button[title="Simpan Ke Favorit"]').first();
    await expect(bookmarkButton).toBeVisible();

    // 4. Klik bookmark. Optimistic update langsung merubah visual menjadi solid "Hapus dari Favorit"
    await bookmarkButton.click();
    await expect(page.locator('button[title="Hapus dari Favorit"]').first()).toBeVisible();

    // Pastikan API POST dipanggil sekali (poll: panggilan jaringan async setelah optimistic update)
    await expect.poll(() => postCount).toBe(1);

    // 5. Klik sekali lagi (untuk unbookmark)
    await page.locator('button[title="Hapus dari Favorit"]').first().click();
    await expect(page.locator('button[title="Simpan Ke Favorit"]').first()).toBeVisible();

    // Pastikan API DELETE dipanggil sekali (poll untuk menunggu request DELETE tiba)
    await expect.poll(() => deleteCount).toBe(1);
  });

  test('TC-31-03: Hapus dari Daftar Favorit di Halaman Favorit', async ({ page, context }) => {
    // 1. Login sebagai mahasiswa
    await loginAs(context, 'mahasiswa');

    // Mock Next.js data transfer untuk transisi client-side
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
    let swalPopup = page.locator('.swal2-popup');
    await expect(swalPopup).toBeVisible();
    await expect(swalPopup.locator('.swal2-title')).toContainText('Hapus dari Favorit?');

    // Test Cancel Flow: klik Batal
    await swalPopup.locator('button:has-text("Batal")').click();
    await expect(swalPopup).not.toBeVisible();
    await expect(page.locator('text=Beasiswa Indonesia Pintar')).toBeVisible();

    // Klik tombol Hapus dari Favorit lagi untuk benar-benar menghapus
    await removeButton.click();
    swalPopup = page.locator('.swal2-popup');
    await expect(swalPopup).toBeVisible();

    // Click confirm button
    await swalPopup.locator('button:has-text("Ya, Hapus")').click();

    // Tunggu success SweetAlert2 popup dan klik OK
    const successSwal = page.locator('.swal2-popup:has-text("Berhasil!")');
    await expect(successSwal).toBeVisible();
    await successSwal.locator('button:has-text("OK")').click();

    // 6. Kartu beasiswa hilang dari daftar favorit
    await expect(page.locator('text=Beasiswa Indonesia Pintar')).not.toBeVisible();
  });

  test('TC-31-04: Validasi Unique Bookmark (Constraint Handling)', async ({ page, context }) => {
    // 1. Login sebagai mahasiswa
    await loginAs(context, 'mahasiswa');

    let postAttempts = 0;

    // Mock REST API favorit: GET returns empty, POST returns 409 Conflict/Error (constraint violation)
    await page.route('**/rest/v1/favorit*', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      } else if (method === 'POST') {
        postAttempts++;
        // Mengembalikan error kode 23505 (unique_violation)
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            code: '23505',
            message: 'duplicate key value violates unique constraint "favorit_user_id_beasiswa_id_key"'
          })
        });
      }
    });

    // 2. Buka Halaman Cari Beasiswa Mahasiswa
    await page.goto('/mahasiswa/cari');

    // 3. Pastikan tombol tampil sebagai outline "Simpan Ke Favorit"
    const bookmarkButton = page.locator('button[title="Simpan Ke Favorit"]').first();
    await expect(bookmarkButton).toBeVisible();

    // 4. Klik bookmark. UI akan melakukan optimistic update ke status solid ("Hapus dari Favorit")
    await bookmarkButton.click();

    // 5. Karena API POST mengembalikan error status 409, UI harus menangkap error dan mengembalikan (revert) tombol ke status outline ("Simpan Ke Favorit")
    await expect(page.locator('button[title="Simpan Ke Favorit"]').first()).toBeVisible();

    // Pastikan request POST telah terkirim sekali
    expect(postAttempts).toBe(1);
  });
});
