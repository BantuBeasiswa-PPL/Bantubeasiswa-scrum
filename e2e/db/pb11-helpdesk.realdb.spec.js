const { test, expect } = require('@playwright/test');
const { loginAs } = require('../helpers');
const { admin } = require('./_db');
const { makeSeeder } = require('./seed');

/**
 * REAL-DB · PB-11 (PBI-17 & PBI-18) — Helpdesk Laporan Kendala (Admin).
 * Data input TETAP. Tiket di tabel laporan_link_rusak, update status diverifikasi
 * ke DB. npm run test:e2e:db
 */
test.describe('REAL-DB · PB-11 · Helpdesk Laporan Kendala', () => {
  let seeder, beasiswaId, andi, siti;
  const JUDUL = 'Beasiswa Garuda Nusantara';

  test.beforeEach(async ({ context }) => {
    seeder = makeSeeder();
    const pendonor = await seeder.pendonor({ email: 'pendonor.pb11@bantubeasiswa.test' });
    beasiswaId = await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: JUDUL, status: 'aktif' });
    andi = await seeder.mahasiswa({ email: 'andi.pb11@bantubeasiswa.test', nama: 'Andi Pratama' });
    siti = await seeder.mahasiswa({ email: 'siti.pb11@bantubeasiswa.test', nama: 'Siti Aminah' });
    await loginAs(context, 'admin');
  });

  test.afterEach(async () => { await seeder.cleanup(); });

  test('TC-PB11-01: daftar tiket dari DB tampil', async ({ page }) => {
    await seeder.tiket({ userId: andi.userId, beasiswaId, deskripsi: 'Link pendaftaran rusak.', status: 'pending' });
    await seeder.tiket({ userId: siti.userId, beasiswaId, deskripsi: 'Data nominal salah.', status: 'selesai' });

    await page.goto('/admin/laporan');
    await expect(page.locator('h1')).toContainText('Laporan Kendala');
    await expect(page.locator('text=Andi Pratama')).toBeVisible();
    await expect(page.locator('text=Siti Aminah')).toBeVisible();
    await expect(page.locator(`text=${JUDUL}`).first()).toBeVisible();
  });

  test('TC-PB11-02: filter tiket berdasarkan status', async ({ page }) => {
    await seeder.tiket({ userId: andi.userId, beasiswaId, deskripsi: 'Link pendaftaran rusak.', status: 'pending' });
    await seeder.tiket({ userId: siti.userId, beasiswaId, deskripsi: 'Data nominal salah.', status: 'selesai' });
    await page.goto('/admin/laporan');
    await expect(page.locator('text=Andi Pratama')).toBeVisible();

    await page.click('button:has-text("Pending")');
    await expect(page.locator('text=Andi Pratama')).toBeVisible();
    await expect(page.locator('text=Siti Aminah')).not.toBeVisible();

    await page.click('button:has-text("Selesai")');
    await expect(page.locator('text=Siti Aminah')).toBeVisible();
    await expect(page.locator('text=Andi Pratama')).not.toBeVisible();
  });

  test('TC-PB11-03: cari tiket berdasarkan nama pelapor', async ({ page }) => {
    await seeder.tiket({ userId: andi.userId, beasiswaId, deskripsi: 'Link pendaftaran rusak.', status: 'pending' });
    await seeder.tiket({ userId: siti.userId, beasiswaId, deskripsi: 'Data nominal salah.', status: 'pending' });
    await page.goto('/admin/laporan');

    await page.fill('input[placeholder*="Cari tiket"]', 'Siti Aminah');
    await expect(page.locator('text=Siti Aminah')).toBeVisible();
    await expect(page.locator('text=Andi Pratama')).not.toBeVisible();
  });

  test('TC-PB11-04: buka panel detail tiket', async ({ page }) => {
    const laporanId = await seeder.tiket({ userId: andi.userId, beasiswaId, deskripsi: 'Link pendaftaran rusak.', status: 'pending' });
    await page.goto('/admin/laporan');

    await page.click(`#tiket-row-${laporanId}`);
    await expect(page.locator('text=Detail Laporan')).toBeVisible();
    await expect(page.locator('text=Profil Pelapor')).toBeVisible();
    await expect(page.locator('text=Message History')).toBeVisible();
  });

  test('TC-PB11-05: update status tiket → tersimpan di DB', async ({ page }) => {
    const laporanId = await seeder.tiket({ userId: andi.userId, beasiswaId, deskripsi: 'Link pendaftaran rusak.', status: 'pending' });
    await page.goto('/admin/laporan');

    await page.click(`#tiket-row-${laporanId}`);
    await expect(page.locator('text=Detail Laporan')).toBeVisible();
    await page.selectOption('#panel-status', 'diproses');
    await page.click('#btn-send-reply');
    await expect(page.locator('text=Detail Laporan')).not.toBeVisible();

    const { data } = await admin.from('laporan_link_rusak').select('status').eq('laporanId', laporanId).single();
    expect(data.status).toBe('diproses');
  });

  test('TC-PB11-06: update tanpa ubah status → validasi', async ({ page }) => {
    const laporanId = await seeder.tiket({ userId: andi.userId, beasiswaId, deskripsi: 'Link pendaftaran rusak.', status: 'pending' });
    await page.goto('/admin/laporan');

    await page.click(`#tiket-row-${laporanId}`);
    await expect(page.locator('text=Detail Laporan')).toBeVisible();
    await page.click('#btn-send-reply');
    await expect(page.locator('text=Pilih status baru terlebih dahulu')).toBeVisible();
  });
});
