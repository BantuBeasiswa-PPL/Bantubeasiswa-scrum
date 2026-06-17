const { test, expect } = require('@playwright/test');
const { loginAs } = require('../helpers');
const { admin } = require('./_db');
const { makeSeeder } = require('./seed');

/**
 * REAL-DB · PB-23 (PBI-40 & PBI-41) — Kelola Program Beasiswa oleh Admin.
 * Data input TETAP. Aksi via UI, hasil diverifikasi ke DB. npm run test:e2e:db
 */
test.describe('REAL-DB · PB-23 · Kelola Program Beasiswa oleh Admin', () => {
  let seeder, pendonor;
  const PENDONOR_EMAIL = 'pendonor.pb23@bantubeasiswa.test';
  const ORG = 'Yayasan Bakti Pertiwi';
  const JUDUL_PENDING = 'Beasiswa Unggulan Prestasi';
  const JUDUL_AKTIF = 'Beasiswa Ekonomi Harapan';
  const JUDUL_HAPUS = 'Beasiswa Teknologi Masa Depan';

  test.beforeEach(async ({ context }) => {
    seeder = makeSeeder();
    pendonor = await seeder.pendonor({ email: PENDONOR_EMAIL, statusOrganisasi: ORG });
    await loginAs(context, 'admin');
  });

  test.afterEach(async () => { await seeder.cleanup(); });

  test('TC-40-01: daftar beasiswa dari DB tampil di tabel admin', async ({ page }) => {
    await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: JUDUL_PENDING, status: 'pending' });
    await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: JUDUL_AKTIF, status: 'aktif' });

    await page.goto('/admin/beasiswa');
    await expect(page.locator(`text=${JUDUL_PENDING}`)).toBeVisible();
    await expect(page.locator(`text=${JUDUL_AKTIF}`)).toBeVisible();
    await expect(page.locator(`text=${ORG}`).first()).toBeVisible();
  });

  test('TC-40-02 & TC-40-03: pencarian & filter status pada data DB', async ({ page }) => {
    await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: JUDUL_PENDING, status: 'pending' });
    await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: JUDUL_AKTIF, status: 'aktif' });
    await page.goto('/admin/beasiswa');
    await expect(page.locator(`text=${JUDUL_PENDING}`)).toBeVisible();

    const search = page.locator('input[placeholder="Cari beasiswa atau pendonor..."]');
    await search.fill('Unggulan Prestasi');
    await expect(page.locator(`text=${JUDUL_PENDING}`)).toBeVisible();
    await expect(page.locator(`text=${JUDUL_AKTIF}`)).not.toBeVisible();

    await search.fill('');
    await page.click('button:has-text("Aktif")');
    await expect(page.locator(`text=${JUDUL_AKTIF}`)).toBeVisible();
    await expect(page.locator(`text=${JUDUL_PENDING}`)).not.toBeVisible();
  });

  test('TC-41-01: menyetujui beasiswa → status di DB berubah jadi aktif', async ({ page }) => {
    const beasiswaId = await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: JUDUL_PENDING, status: 'pending' });
    await page.goto('/admin/beasiswa');

    const row = page.locator(`tr:has-text("${JUDUL_PENDING}")`);
    await row.locator('button[title="Setujui Program"]').click();
    const swal = page.locator('.swal2-popup');
    await expect(swal).toBeVisible();
    await swal.locator('button:has-text("Ya, Setujui")').click();
    await expect(page.locator('.swal2-popup:has-text("Berhasil!")')).toBeVisible();

    const { data } = await admin.from('beasiswa').select('status').eq('beasiswaId', beasiswaId).single();
    expect(data.status).toBe('aktif');
  });

  test('TC-41-02: menolak beasiswa dengan alasan → status draft + alasan tersimpan di DB', async ({ page }) => {
    const beasiswaId = await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: JUDUL_PENDING, status: 'pending' });
    await page.goto('/admin/beasiswa');

    const row = page.locator(`tr:has-text("${JUDUL_PENDING}")`);
    await row.locator('button[title="Tolak Program"]').click();

    const alasan = 'Syarat IPK terlalu rendah, mohon dinaikkan.';
    const modal = page.locator('text=Tolak Pengajuan Beasiswa').locator('xpath=../..');
    await modal.locator('textarea#reason-reject').fill(alasan);
    await modal.locator('button[type="submit"]').click();
    await expect(page.locator('.swal2-popup:has-text("Berhasil!")')).toBeVisible();

    const { data } = await admin.from('beasiswa').select('status, alasanPenolakan').eq('beasiswaId', beasiswaId).single();
    expect(data.status).toBe('draft');
    expect(data.alasanPenolakan).toBe(alasan);
  });

  test('TC-41-03: menghapus beasiswa dengan alasan → baris hilang dari DB', async ({ page }) => {
    const beasiswaId = await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: JUDUL_HAPUS, status: 'aktif' });
    await page.goto('/admin/beasiswa');

    const row = page.locator(`tr:has-text("${JUDUL_HAPUS}")`);
    await row.locator('button[title="Hapus Program"]').click();

    const modal = page.locator('text=Hapus Program Beasiswa').locator('xpath=../..');
    await modal.locator('textarea#reason-delete').fill('Pendonor membatalkan program.');
    await modal.locator('button[type="submit"]').click();
    await expect(page.locator('.swal2-popup:has-text("Berhasil!")')).toBeVisible();

    const { data } = await admin.from('beasiswa').select('beasiswaId').eq('beasiswaId', beasiswaId).maybeSingle();
    expect(data).toBeNull();
  });
});
