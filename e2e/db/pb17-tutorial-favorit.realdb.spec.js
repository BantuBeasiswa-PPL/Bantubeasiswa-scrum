const { test, expect } = require('@playwright/test');
const { loginAs } = require('../helpers');
const { admin } = require('./_db');
const { makeSeeder } = require('./seed');

/**
 * REAL-DB · PB-17 (PBI-30 & PBI-31) — Tutorial Administrasi & Bookmark.
 * Bookmark benar-benar menulis/menghapus baris di tabel favorit.
 * Jalankan: npm run test:e2e:db
 */
test.describe('REAL-DB · PB-17 · Tutorial Administrasi & Bookmark', () => {
  let seeder, pendonor, token;

  test.beforeEach(async () => {
    seeder = makeSeeder();
    token = seeder.uniq('F');
    pendonor = await seeder.pendonor();
  });

  test.afterEach(async () => {
    await seeder.cleanup();
  });

  // ── PBI-30: Tutorial Administrasi (butuh login, konten statis) ──────────────
  test('TC-30-01: Navigasi Administrative Journey (Stepper 4 langkah)', async ({ page, context }) => {
    const mhs = await seeder.mahasiswa();
    await loginAs(context, 'mahasiswa', { userId: mhs.userId, accountId: mhs.accountId });

    await page.goto('/tutorial-administrasi');
    await expect(page.locator('text=Administrative Journey')).toBeVisible();
    await expect(page.locator('text=Preparation').first()).toBeVisible();
    await page.click('button:has-text("Application")');
    await expect(page.locator('text=Application — Pengisian & Upload')).toBeVisible();
    await page.click('button:has-text("Verification")');
    await expect(page.locator('text=Verification — Verifikasi & Ujian')).toBeVisible();
  });

  test('TC-30-02: Library template dokumen & filter kategori', async ({ page, context }) => {
    const mhs = await seeder.mahasiswa();
    await loginAs(context, 'mahasiswa', { userId: mhs.userId, accountId: mhs.accountId });

    await page.goto('/tutorial-administrasi');
    await expect(page.locator('text=Library Template Dokumen')).toBeVisible();
    const lib = page.locator('section:has-text("Library Template Dokumen")');
    await lib.locator('button:has-text("Personal")').click();
    await expect(page.locator('text=Template CV Profesional ATS-Friendly')).toBeVisible();
    await lib.locator('button:has-text("Beasiswa")').click();
    await expect(page.locator('text=Template SKTM (Surat Keterangan Tidak Mampu)')).toBeVisible();
  });

  // ── PBI-31: Bookmark Beasiswa ───────────────────────────────────────────────
  test('TC-31-01: Bookmark tanpa login → redirect ke /login', async ({ page }) => {
    await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: `Beasiswa Publik ${token}`, status: 'aktif' });

    await page.goto('/');
    const bookmark = page.locator('button[title="Simpan Ke Favorit"]').first();
    await bookmark.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-31-02: Toggle bookmark → baris favorit dibuat & dihapus di DB', async ({ page, context }) => {
    const mhs = await seeder.mahasiswa();
    const beasiswaId = await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: `Beasiswa Fav ${token}`, status: 'aktif' });
    await loginAs(context, 'mahasiswa', { userId: mhs.userId, accountId: mhs.accountId });

    await page.goto('/mahasiswa/cari');
    await page.fill('#search-beasiswa', `Fav ${token}`);

    // Tunggu hasil pencarian menyettle ke 1 kartu (hindari banyak tombol saat debounce)
    await expect(page.locator('button[title="Simpan Ke Favorit"]')).toHaveCount(1);

    // Tambah ke favorit
    const add = page.locator('button[title="Simpan Ke Favorit"]');
    await add.click();
    await expect(page.locator('button[title="Hapus dari Favorit"]')).toBeVisible();

    // Verifikasi baris favorit benar-benar ada di DB
    await expect.poll(async () => {
      const { data } = await admin.from('favorit').select('favoritId').eq('userId', mhs.userId).eq('beasiswaId', beasiswaId).maybeSingle();
      return !!data;
    }, { timeout: 5000 }).toBe(true);

    // Hapus dari favorit
    await page.locator('button[title="Hapus dari Favorit"]').click();
    await expect(page.locator('button[title="Simpan Ke Favorit"]')).toBeVisible();

    await expect.poll(async () => {
      const { data } = await admin.from('favorit').select('favoritId').eq('userId', mhs.userId).eq('beasiswaId', beasiswaId).maybeSingle();
      return data === null;
    }, { timeout: 5000 }).toBe(true);
  });

  test('TC-31-03: Hapus dari halaman favorit → baris favorit hilang dari DB', async ({ page, context }) => {
    const mhs = await seeder.mahasiswa();
    const beasiswaId = await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: `Beasiswa Tersimpan ${token}`, status: 'aktif' });
    await seeder.favorit({ userId: mhs.userId, beasiswaId });
    await loginAs(context, 'mahasiswa', { userId: mhs.userId, accountId: mhs.accountId });

    await page.goto('/mahasiswa/favorit');
    await expect(page.locator(`text=Beasiswa Tersimpan ${token}`)).toBeVisible();

    await page.locator('button[title="Hapus dari Favorit"]').click();
    const swal = page.locator('.swal2-popup');
    await expect(swal).toBeVisible();
    await swal.locator('button:has-text("Ya, Hapus")').click();
    await expect(page.locator('.swal2-popup:has-text("Berhasil!")')).toBeVisible();

    // Verifikasi DB
    const { data } = await admin.from('favorit').select('favoritId').eq('userId', mhs.userId).eq('beasiswaId', beasiswaId).maybeSingle();
    expect(data).toBeNull();
  });

  test('TC-31-04: Beasiswa yang sudah difavoritkan terdeteksi tersimpan (state dari DB)', async ({ page, context }) => {
    const mhs = await seeder.mahasiswa();
    const beasiswaId = await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: `Beasiswa Sudah Fav ${token}`, status: 'aktif' });
    await seeder.favorit({ userId: mhs.userId, beasiswaId }); // sudah difavoritkan di DB
    await loginAs(context, 'mahasiswa', { userId: mhs.userId, accountId: mhs.accountId });

    await page.goto('/mahasiswa/cari');
    await page.fill('#search-beasiswa', `Sudah Fav ${token}`);

    // Tombol harus tampil sebagai "Hapus dari Favorit" (terdeteksi sudah tersimpan dari DB)
    await expect(page.locator('button[title="Hapus dari Favorit"]')).toBeVisible();
  });
});
