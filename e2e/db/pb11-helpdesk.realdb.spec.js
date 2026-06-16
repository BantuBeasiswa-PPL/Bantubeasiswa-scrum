const { test, expect } = require('@playwright/test');
const { loginAs } = require('../helpers');
const { admin } = require('./_db');
const { makeSeeder } = require('./seed');

/**
 * REAL-DB · PB-11 (PBI-17 & PBI-18) — Helpdesk Laporan Kendala (Admin).
 * Tiket di-seed ke tabel laporan_link_rusak, admin mengelola lewat UI,
 * perubahan status diverifikasi ke DB. Jalankan: npm run test:e2e:db
 */
test.describe('REAL-DB · PB-11 · Helpdesk Laporan Kendala', () => {
  let seeder, beasiswaId, andi, siti, token;

  test.beforeEach(async ({ context }) => {
    seeder = makeSeeder();
    token = seeder.uniq('T');
    const pendonor = await seeder.pendonor();
    beasiswaId = await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: `Beasiswa Tiket ${token}`, status: 'aktif' });
    andi = await seeder.mahasiswa({ nama: `Andi-${token}` });
    siti = await seeder.mahasiswa({ nama: `Siti-${token}` });
    await loginAs(context, 'admin');
  });

  test.afterEach(async () => {
    await seeder.cleanup();
  });

  test('TC-PB11-01: daftar tiket dari DB tampil', async ({ page }) => {
    await seeder.tiket({ userId: andi.userId, beasiswaId, deskripsi: `Kendala ${token}`, status: 'pending' });
    await seeder.tiket({ userId: siti.userId, beasiswaId, deskripsi: `Data salah ${token}`, status: 'selesai' });

    await page.goto('/admin/laporan');

    await expect(page.locator('h1')).toContainText('Laporan Kendala');
    await expect(page.locator(`text=Andi-${token}`)).toBeVisible();
    await expect(page.locator(`text=Siti-${token}`)).toBeVisible();
    await expect(page.locator(`text=Beasiswa Tiket ${token}`).first()).toBeVisible();
  });

  test('TC-PB11-02: filter tiket berdasarkan status', async ({ page }) => {
    await seeder.tiket({ userId: andi.userId, beasiswaId, deskripsi: `Kendala ${token}`, status: 'pending' });
    await seeder.tiket({ userId: siti.userId, beasiswaId, deskripsi: `Data salah ${token}`, status: 'selesai' });
    await page.goto('/admin/laporan');
    await expect(page.locator(`text=Andi-${token}`)).toBeVisible();

    await page.click('button:has-text("Pending")');
    await expect(page.locator(`text=Andi-${token}`)).toBeVisible();
    await expect(page.locator(`text=Siti-${token}`)).not.toBeVisible();

    await page.click('button:has-text("Selesai")');
    await expect(page.locator(`text=Siti-${token}`)).toBeVisible();
    await expect(page.locator(`text=Andi-${token}`)).not.toBeVisible();
  });

  test('TC-PB11-03: cari tiket berdasarkan nama pelapor', async ({ page }) => {
    await seeder.tiket({ userId: andi.userId, beasiswaId, deskripsi: `Kendala ${token}`, status: 'pending' });
    await seeder.tiket({ userId: siti.userId, beasiswaId, deskripsi: `Data salah ${token}`, status: 'pending' });
    await page.goto('/admin/laporan');

    await page.fill('input[placeholder*="Cari tiket"]', `Siti-${token}`);
    await expect(page.locator(`text=Siti-${token}`)).toBeVisible();
    await expect(page.locator(`text=Andi-${token}`)).not.toBeVisible();
  });

  test('TC-PB11-04: buka panel detail tiket', async ({ page }) => {
    const laporanId = await seeder.tiket({ userId: andi.userId, beasiswaId, deskripsi: `Kendala ${token}`, status: 'pending' });
    await page.goto('/admin/laporan');

    await page.click(`#tiket-row-${laporanId}`);
    await expect(page.locator('text=Detail Laporan')).toBeVisible();
    await expect(page.locator('text=Profil Pelapor')).toBeVisible();
    await expect(page.locator('text=Message History')).toBeVisible();
  });

  test('TC-PB11-05: update status tiket → tersimpan di DB', async ({ page }) => {
    const laporanId = await seeder.tiket({ userId: andi.userId, beasiswaId, deskripsi: `Kendala ${token}`, status: 'pending' });
    await page.goto('/admin/laporan');

    await page.click(`#tiket-row-${laporanId}`);
    await expect(page.locator('text=Detail Laporan')).toBeVisible();
    await page.selectOption('#panel-status', 'diproses');
    await page.click('#btn-send-reply');
    await expect(page.locator('text=Detail Laporan')).not.toBeVisible();

    // VERIFIKASI ke DB
    const { data } = await admin.from('laporan_link_rusak').select('status').eq('laporanId', laporanId).single();
    expect(data.status).toBe('diproses');
  });

  test('TC-PB11-06: update tanpa ubah status → validasi', async ({ page }) => {
    const laporanId = await seeder.tiket({ userId: andi.userId, beasiswaId, deskripsi: `Kendala ${token}`, status: 'pending' });
    await page.goto('/admin/laporan');

    await page.click(`#tiket-row-${laporanId}`);
    await expect(page.locator('text=Detail Laporan')).toBeVisible();
    await page.click('#btn-send-reply');
    await expect(page.locator('text=Pilih status baru terlebih dahulu')).toBeVisible();
  });
});
