const { test, expect } = require('@playwright/test');
const { loginAs } = require('../helpers');
const { admin } = require('./_db');
const { makeSeeder } = require('./seed');

/**
 * REAL-DB · PB-18 (PBI-32 & PBI-33) — Penyaluran Dana Pendonor.
 *  • PBI-33: rekap laporan dari data DB (beasiswa+pendaftaran+penyaluran)
 *  • PBI-32: konfirmasi batch → status penyaluran_dana berubah jadi 'confirmed' di DB
 * Catatan: hanya upload file ke storage yang di-mock (bucket test). Data & status
 * tetap diverifikasi ke database asli. Jalankan: npm run test:e2e:db
 */
test.describe('REAL-DB · PB-18 · Penyaluran Dana Pendonor', () => {
  let seeder, pendonor, token;

  test.beforeEach(async ({ context }) => {
    seeder = makeSeeder();
    token = seeder.uniq('P');
    pendonor = await seeder.pendonor();
    await loginAs(context, 'pendonor', { userId: pendonor.pendonorId, accountId: pendonor.accountId });
  });

  test.afterEach(async () => {
    await seeder.cleanup();
  });

  // ── PBI-33: Laporan Rekapitulasi ────────────────────────────────────────────
  test('TC-33-01: rekap menampilkan jumlah lulus & total dana dari DB', async ({ page }) => {
    const beasiswaId = await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: `Beasiswa Rekap ${token}`, nominal: 5000000, status: 'aktif' });
    const m1 = await seeder.mahasiswa();
    const m2 = await seeder.mahasiswa();
    await seeder.pendaftaran({ userId: m1.userId, beasiswaId, status: 'LULUS' });
    await seeder.pendaftaran({ userId: m2.userId, beasiswaId, status: 'LULUS' });
    await seeder.penyaluran({ pendonorId: pendonor.pendonorId, beasiswaId, jumlahDana: 15000000, status: 'tersalurkan' });

    await page.goto('/pendonor/dashboard-laporan');

    await expect(page.getByRole('cell', { name: `Beasiswa Rekap ${token}` })).toBeVisible();
    await expect(page.locator('text=2 Mahasiswa').first()).toBeVisible();      // total penerima lulus
    await expect(page.locator('text=Rp 15.000.000').first()).toBeVisible();    // total dana tersalurkan
  });

  test('TC-33-02: filter status penyaluran pada rekap DB', async ({ page }) => {
    const bA = await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: `Beasiswa Tersalur ${token}`, nominal: 5000000, status: 'aktif' });
    const bB = await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: `Beasiswa Pending ${token}`, nominal: 5000000, status: 'aktif' });
    const m1 = await seeder.mahasiswa();
    const m2 = await seeder.mahasiswa();
    await seeder.pendaftaran({ userId: m1.userId, beasiswaId: bA, status: 'LULUS' });
    await seeder.penyaluran({ pendonorId: pendonor.pendonorId, beasiswaId: bA, jumlahDana: 5000000, status: 'tersalurkan' });
    await seeder.pendaftaran({ userId: m2.userId, beasiswaId: bB, status: 'LULUS' });

    await page.goto('/pendonor/dashboard-laporan');
    await expect(page.getByRole('cell', { name: `Beasiswa Tersalur ${token}` })).toBeVisible();

    await page.selectOption('#filter-status', 'tersalurkan');
    await expect(page.getByRole('cell', { name: `Beasiswa Tersalur ${token}` })).toBeVisible();
    await expect(page.getByRole('cell', { name: `Beasiswa Pending ${token}` })).not.toBeVisible();
  });

  test('TC-33-03: pencarian program pada rekap DB', async ({ page }) => {
    await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: `Beasiswa Alpha ${token}`, nominal: 5000000, status: 'aktif' });
    await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: `Beasiswa Beta ${token}`, nominal: 5000000, status: 'aktif' });

    await page.goto('/pendonor/dashboard-laporan');
    await page.fill('input[placeholder*="Cari program"]', `Alpha ${token}`);
    await expect(page.getByRole('cell', { name: `Beasiswa Alpha ${token}` })).toBeVisible();
    await expect(page.getByRole('cell', { name: `Beasiswa Beta ${token}` })).not.toBeVisible();
  });

  test('TC-33-04: tombol Download PDF memicu unduhan', async ({ page }) => {
    await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: `Beasiswa Unduh ${token}`, nominal: 5000000, status: 'aktif' });
    await page.goto('/pendonor/dashboard-laporan');
    await expect(page.getByRole('cell', { name: `Beasiswa Unduh ${token}` })).toBeVisible();

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
    const beasiswaId = await seeder.beasiswa({ pendonorId: pendonor.pendonorId, judul: `Beasiswa Bayar ${token}`, nominal: 5000000, status: 'aktif' });
    const mhs = await seeder.mahasiswa({ nama: `Penerima-${token}` });
    await seeder.rekening({ userId: mhs.userId, namaBank: 'BCA', nomorRekening: '1234567890', namaPemilik: `Penerima-${token}` });
    const pendaftaranId = await seeder.pendaftaran({ userId: mhs.userId, beasiswaId, status: 'LULUS' });
    const penyaluranId = await seeder.penyaluran({ pendonorId: pendonor.pendonorId, beasiswaId, pendaftaranId, jumlahDana: 5000000, status: 'pending' });

    // Hanya upload file ke storage yang di-mock
    await page.route('**/storage/v1/object/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'dokumen/bukti.png' }) })
    );

    await page.goto('/pendonor/dashboard-pembayaran');
    await expect(page.locator(`text=Penerima-${token}`)).toBeVisible();

    await page.setInputFiles('input[type="file"]', {
      name: 'bukti-transfer.png', mimeType: 'image/png', buffer: Buffer.from('fake-png'),
    });

    await expect(page.locator('.swal2-popup:has-text("Berhasil!")')).toBeVisible();

    // VERIFIKASI ke DB: status penyaluran berubah jadi confirmed
    await expect.poll(async () => {
      const { data } = await admin.from('penyaluran_dana').select('status').eq('penyaluranId', penyaluranId).single();
      return data?.status;
    }, { timeout: 6000 }).toBe('confirmed');
  });

  test('TC-32-03: format file tidak didukung → peringatan, tak ada perubahan DB', async ({ page }) => {
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
