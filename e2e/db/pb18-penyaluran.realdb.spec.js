const { test, expect } = require('@playwright/test');
const { loginAs } = require('../helpers');
const { admin } = require('./_db');
const { makeSeeder } = require('./seed');

/**
 * REAL-DB · PB-18 (PBI-32 & PBI-33) — Penyaluran Dana Pendonor.
 * Data input TETAP. Rekap dibaca dari DB; konfirmasi batch mengubah status
 * penyaluran_dana jadi 'confirmed' (diverifikasi ke DB). Hanya upload file ke
 * storage yang di-mock. npm run test:e2e:db
 */
test.describe('REAL-DB · PB-18 · Penyaluran Dana Pendonor', () => {
  let seeder, pendonor;

  test.beforeEach(async ({ context }) => {
    seeder = makeSeeder();
    pendonor = await seeder.pendonor({ email: 'pendonor.pb18@bantubeasiswa.test' });
    await loginAs(context, 'pendonor', { userId: pendonor.pendonorId, accountId: pendonor.accountId });
  });

  test.afterEach(async () => { await seeder.cleanup(); });

  // ── PBI-33: Laporan Rekapitulasi ────────────────────────────────────────────
  test('TC-33-01: rekap menampilkan jumlah lulus & total dana dari DB', async ({ page }) => {
    const beasiswaId = await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: 'Beasiswa Garuda Nusantara', nominal: 5000000, status: 'aktif' });
    const m1 = await seeder.mahasiswa({ email: 'mhs1.pb18@bantubeasiswa.test', nama: 'Budi Santoso' });
    const m2 = await seeder.mahasiswa({ email: 'mhs2.pb18@bantubeasiswa.test', nama: 'Siti Aminah' });
    await seeder.pendaftaran({ userId: m1.userId, beasiswaId, status: 'LULUS' });
    await seeder.pendaftaran({ userId: m2.userId, beasiswaId, status: 'LULUS' });
    await seeder.penyaluran({ pendonorId: pendonor.pendonorId, beasiswaId, jumlahDana: 15000000, status: 'tersalurkan' });

    await page.goto('/pendonor/dashboard-laporan');
    await expect(page.getByRole('cell', { name: 'Beasiswa Garuda Nusantara' })).toBeVisible();
    await expect(page.locator('text=2 Mahasiswa').first()).toBeVisible();
    await expect(page.locator('text=Rp 15.000.000').first()).toBeVisible();
  });

  test('TC-33-02: filter status penyaluran pada rekap DB', async ({ page }) => {
    const bA = await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: 'Beasiswa Tersalurkan Penuh', nominal: 5000000, status: 'aktif' });
    const bB = await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: 'Beasiswa Belum Tersalur', nominal: 5000000, status: 'aktif' });
    const m1 = await seeder.mahasiswa({ email: 'mhs1.pb18@bantubeasiswa.test', nama: 'Budi Santoso' });
    const m2 = await seeder.mahasiswa({ email: 'mhs2.pb18@bantubeasiswa.test', nama: 'Siti Aminah' });
    await seeder.pendaftaran({ userId: m1.userId, beasiswaId: bA, status: 'LULUS' });
    await seeder.penyaluran({ pendonorId: pendonor.pendonorId, beasiswaId: bA, jumlahDana: 5000000, status: 'tersalurkan' });
    await seeder.pendaftaran({ userId: m2.userId, beasiswaId: bB, status: 'LULUS' });

    await page.goto('/pendonor/dashboard-laporan');
    await expect(page.getByRole('cell', { name: 'Beasiswa Tersalurkan Penuh' })).toBeVisible();

    await page.selectOption('#filter-status', 'tersalurkan');
    await expect(page.getByRole('cell', { name: 'Beasiswa Tersalurkan Penuh' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Beasiswa Belum Tersalur' })).not.toBeVisible();
  });

  test('TC-33-03: pencarian program pada rekap DB', async ({ page }) => {
    await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: 'Beasiswa Pendidikan Madani', nominal: 5000000, status: 'aktif' });
    await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: 'Beasiswa Riset Teknologi', nominal: 5000000, status: 'aktif' });

    await page.goto('/pendonor/dashboard-laporan');
    await page.fill('input[placeholder*="Cari program"]', 'Pendidikan Madani');
    await expect(page.getByRole('cell', { name: 'Beasiswa Pendidikan Madani' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Beasiswa Riset Teknologi' })).not.toBeVisible();
  });

  test('TC-33-04: tombol Download PDF memicu unduhan', async ({ page }) => {
    await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: 'Beasiswa Garuda Nusantara', nominal: 5000000, status: 'aktif' });
    await page.goto('/pendonor/dashboard-laporan');
    await expect(page.getByRole('cell', { name: 'Beasiswa Garuda Nusantara' })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download PDF")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/laporan-rekap-program-\d{4}-\d{2}-\d{2}\.pdf/);
  });

  test('TC-33-05: pendonor tanpa program → empty state & tombol unduh nonaktif', async ({ page }) => {
    await page.goto('/pendonor/dashboard-laporan');
    await expect(page.locator('text=Tidak Ada Data Program')).toBeVisible();
    await expect(page.locator('button:has-text("Download PDF")')).toBeDisabled();
  });

  // ── PBI-32: Konfirmasi Penyaluran (unggah bukti transfer) ───────────────────
  test('TC-32-01 & TC-32-02: konfirmasi batch → status penyaluran jadi confirmed di DB', async ({ page }) => {
    const beasiswaId = await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: 'Beasiswa Garuda Nusantara', nominal: 5000000, status: 'aktif' });
    const mhs = await seeder.mahasiswa({ email: 'penerima.pb18@bantubeasiswa.test', nama: 'Budi Santoso' });
    await seeder.rekening({ userId: mhs.userId, namaBank: 'Bank BCA', nomorRekening: '1234567890', namaPemilik: 'Budi Santoso' });
    const pendaftaranId = await seeder.pendaftaran({ userId: mhs.userId, beasiswaId, status: 'LULUS' });
    const penyaluranId = await seeder.penyaluran({ pendonorId: pendonor.pendonorId, beasiswaId, pendaftaranId, jumlahDana: 5000000, status: 'pending' });

    await page.route('**/storage/v1/object/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'dokumen/bukti.png' }) })
    );

    await page.goto('/pendonor/dashboard-pembayaran');
    await expect(page.locator('text=Budi Santoso')).toBeVisible();

    await page.setInputFiles('input[type="file"]', {
      name: 'bukti-transfer.png', mimeType: 'image/png', buffer: Buffer.from('fake-png'),
    });

    await expect(page.locator('.swal2-popup:has-text("Berhasil!")')).toBeVisible();
    await expect.poll(async () => {
      const { data } = await admin.from('penyaluran_dana').select('status').eq('penyaluranId', penyaluranId).single();
      return data?.status;
    }, { timeout: 6000 }).toBe('confirmed');
  });

  test('TC-32-03: format file tidak didukung → peringatan', async ({ page }) => {
    await page.goto('/pendonor/dashboard-pembayaran');
    await page.setInputFiles('input[type="file"]', {
      name: 'catatan.txt', mimeType: 'text/plain', buffer: Buffer.from('bukan gambar'),
    });
    const swal = page.locator('.swal2-popup');
    await expect(swal).toBeVisible();
    await expect(swal).toContainText('Format file tidak didukung');
  });

  test('TC-32-04: ukuran file melebihi 5MB → peringatan', async ({ page }) => {
    await page.goto('/pendonor/dashboard-pembayaran');
    const big = Buffer.alloc(5 * 1024 * 1024 + 1024, 0);
    await page.setInputFiles('input[type="file"]', {
      name: 'bukti-besar.png', mimeType: 'image/png', buffer: big,
    });
    const swal = page.locator('.swal2-popup');
    await expect(swal).toBeVisible();
    await expect(swal).toContainText('Ukuran file melebihi 5MB');
  });
});
