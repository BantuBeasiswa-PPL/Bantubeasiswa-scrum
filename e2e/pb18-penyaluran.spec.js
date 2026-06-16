const { test, expect } = require('@playwright/test');
const { loginAs } = require('./helpers');

/**
 * PB-18 — Transparansi Penyaluran Dana oleh Pendonor (PBI-32 & PBI-33)
 *
 *  • FR-22 (PBI-33) — Generate Laporan Penyaluran: halaman /pendonor/dashboard-laporan
 *    memakai withAuth('pendonor') + GET /api/pendonor/laporan, lalu mengekspor PDF
 *    rekapitulasi di sisi klien (jsPDF).
 *  • FR-21 (PBI-32) — Konfirmasi Penyaluran Dana: halaman /pendonor/dashboard-pembayaran
 *    memuat antrean dari SSR (initialQueueList). Pendonor mengunggah 1 bukti transfer
 *    untuk batch, lalu sistem memanggil /api/pendonor/pembayaran/confirm-batch.
 *    Karena data berasal dari SSR-DB, antrean diinjeksi via mock _next/data dan
 *    diakses lewat transisi client-side dari halaman pendonor lain.
 */
test.describe('PB-18 (PBI-32 & PBI-33): Penyaluran Dana Pendonor E2E Tests', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // FR-22 — Laporan Rekapitulasi (PDF)
  // ─────────────────────────────────────────────────────────────────────────
  test.describe('FR-22: Laporan Rekapitulasi Penyaluran', () => {
    const mockLaporan = {
      data: [
        {
          judul: 'Beasiswa Garuda Nusantara',
          jumlahLulus: 3,
          nominal: 5000000,
          totalTersalurkan: 15000000,
          tanggal_penyaluran: '2026-06-05T00:00:00.000Z',
          status: 'tersalurkan',
        },
        {
          judul: 'Beasiswa Ekonomi Harapan',
          jumlahLulus: 2,
          nominal: 4000000,
          totalTersalurkan: 0,
          tanggal_penyaluran: null,
          status: 'pending',
        },
      ],
      metaInfo: { namaPendonor: 'Yayasan Bakti Pertiwi', tanggalGenerate: '10 Juni 2026' },
    };

    async function mockLaporanApi(page, payload = mockLaporan) {
      await page.route('**/api/pendonor/laporan', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(payload),
        });
      });
    }

    test('TC-PB18-01: Merender ringkasan stat & tabel rekap dari API', async ({ page, context }) => {
      await loginAs(context, 'pendonor');
      await mockLaporanApi(page);

      await page.goto('/pendonor/dashboard-laporan');

      await expect(page.locator('h1')).toContainText('Rekapitulasi Program Beasiswa');
      // Total penerima = 3 + 2 = 5
      await expect(page.locator('text=5 Mahasiswa').first()).toBeVisible();
      // Total dana tersalurkan = Rp 15.000.000
      await expect(page.locator('text=Rp 15.000.000').first()).toBeVisible();

      // Scope ke sel tabel (nama program juga muncul di <option> dropdown filter)
      await expect(page.getByRole('cell', { name: 'Beasiswa Garuda Nusantara' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Beasiswa Ekonomi Harapan' })).toBeVisible();
    });

    test('TC-PB18-02: Memfilter rekap berdasarkan status penyaluran', async ({ page, context }) => {
      await loginAs(context, 'pendonor');
      await mockLaporanApi(page);
      await page.goto('/pendonor/dashboard-laporan');
      await expect(page.getByRole('cell', { name: 'Beasiswa Garuda Nusantara' })).toBeVisible();

      await page.selectOption('#filter-status', 'tersalurkan');
      await expect(page.getByRole('cell', { name: 'Beasiswa Garuda Nusantara' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Beasiswa Ekonomi Harapan' })).not.toBeVisible();
    });

    test('TC-PB18-03: Mencari rekap berdasarkan nama program', async ({ page, context }) => {
      await loginAs(context, 'pendonor');
      await mockLaporanApi(page);
      await page.goto('/pendonor/dashboard-laporan');

      await page.fill('input[placeholder*="Cari program"]', 'Ekonomi');
      await expect(page.getByRole('cell', { name: 'Beasiswa Ekonomi Harapan' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Beasiswa Garuda Nusantara' })).not.toBeVisible();
    });

    test('TC-PB18-04: Tombol "Download PDF" memicu unduhan file rekap', async ({ page, context }) => {
      await loginAs(context, 'pendonor');
      await mockLaporanApi(page);
      await page.goto('/pendonor/dashboard-laporan');
      await expect(page.getByRole('cell', { name: 'Beasiswa Garuda Nusantara' })).toBeVisible();

      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Download PDF")');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/laporan-rekap-program-\d{4}-\d{2}-\d{2}\.pdf/);
    });

    test('TC-PB18-05: Tanpa data → empty state & tombol unduh nonaktif', async ({ page, context }) => {
      await loginAs(context, 'pendonor');
      await mockLaporanApi(page, { data: [], metaInfo: { namaPendonor: 'Yayasan Bakti Pertiwi', tanggalGenerate: '10 Juni 2026' } });
      await page.goto('/pendonor/dashboard-laporan');

      await expect(page.locator('text=Tidak Ada Data Program')).toBeVisible();
      await expect(page.locator('button:has-text("Download PDF")')).toBeDisabled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FR-21 — Konfirmasi Penyaluran Dana (unggah bukti transfer batch)
  // ─────────────────────────────────────────────────────────────────────────
  test.describe('FR-21: Konfirmasi Batch Penyaluran', () => {
    // Antrean penerima LULUS dengan rekening + penyaluran berstatus pending.
    const injectedPageData = {
      pageProps: {
        user: { accountId: 123, userId: 5, email: 'pendonor@test.com', role: 'pendonor', nama: 'Yayasan Bakti Pertiwi' },
        pendonorId: 5,
        initialQueueList: [
          {
            pendaftaranId: 900,
            status: 'LULUS',
            createdAt: '2026-05-01T00:00:00.000Z',
            user: {
              userId: 20,
              nama: 'Andi Pratama',
              email: 'andi@univ.ac.id',
              rekening: [
                { rekeningId: 1, namaBank: 'BCA', nomorRekening: '1234567890', namaPemilik: 'Andi Pratama', status: 'verified' },
              ],
            },
            beasiswa: { beasiswaId: 50, judul: 'Beasiswa Garuda Nusantara', nominal: 5000000 },
            penyaluran_dana: [
              { penyaluranId: 100, status: 'pending', jumlahDana: 5000000, buktiTransferUrl: null, idTransaksi: null, tanggalPenyaluran: null, updatedAt: null },
            ],
          },
        ],
      },
      __N_SSP: true,
    };

    test('TC-PB18-06: Unggah bukti transfer batch memanggil API confirm-batch & menampilkan sukses', async ({ page, context }) => {
      await loginAs(context, 'pendonor');

      // Halaman singgahan (dashboard-laporan) → kosongkan API laporan
      await page.route('**/api/pendonor/laporan', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], metaInfo: {} }) })
      );

      // Injeksi data SSR halaman pembayaran lewat _next/data (transisi client-side)
      await page.route('**/_next/data/**/pendonor/dashboard-pembayaran.json*', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(injectedPageData) })
      );

      // Mock upload Supabase Storage (bukti transfer)
      await page.route('**/storage/v1/object/**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'dokumen/transfer/batch.png' }) })
      );

      // Mock API konfirmasi batch
      let confirmBody = null;
      await page.route('**/api/pendonor/pembayaran/confirm-batch', (route) => {
        confirmBody = JSON.parse(route.request().postData());
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Batch pembayaran berhasil dikonfirmasi.' }),
        });
      });

      // 1. Mendarat di halaman pendonor yang bersih (withAuth, tanpa SSR-DB)
      await page.goto('/pendonor/dashboard-laporan');
      // 2. Transisi client-side ke halaman Pembayaran (memakai _next/data yang diinjeksi)
      await page.click('a:has-text("Pembayaran Beasiswa")');

      await expect(page.locator('h1:has-text("Instruksi Pembayaran")')).toBeVisible();
      await expect(page.locator('text=Andi Pratama')).toBeVisible();

      // 3. Unggah bukti transfer langsung ke file input (memicu handleBatchFileChange)
      await page.setInputFiles('input[type="file"]', {
        name: 'bukti-transfer.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-png-content'),
      });

      // 4. SweetAlert sukses + API confirm-batch terpanggil dengan id penyaluran benar
      await expect(page.locator('.swal2-popup:has-text("Berhasil!")')).toBeVisible();
      expect(confirmBody.penyaluranIds).toEqual([100]);
      expect(typeof confirmBody.buktiTransferUrl).toBe('string');
    });

    // Helper: buka halaman pembayaran (data antrean diinjeksi via _next/data),
    // lalu lacak apakah API confirm-batch sempat terpanggil.
    async function bukaPembayaran(page, context) {
      await loginAs(context, 'pendonor');
      await page.route('**/api/pendonor/laporan', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], metaInfo: {} }) })
      );
      await page.route('**/_next/data/**/pendonor/dashboard-pembayaran.json*', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(injectedPageData) })
      );
      const state = { confirmCalled: false };
      await page.route('**/api/pendonor/pembayaran/confirm-batch', (route) => {
        state.confirmCalled = true;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
      });
      await page.goto('/pendonor/dashboard-laporan');
      await page.click('a:has-text("Pembayaran Beasiswa")');
      await expect(page.locator('h1:has-text("Instruksi Pembayaran")')).toBeVisible();
      return state;
    }

    test('TC-32-03: Format file tidak didukung → peringatan & batal unggah (validasi sisi klien)', async ({ page, context }) => {
      const state = await bukaPembayaran(page, context);

      // Unggah berkas bertipe tidak didukung (.txt). Validasi klien menolak SEBELUM upload.
      await page.setInputFiles('input[type="file"]', {
        name: 'catatan.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('ini bukan gambar atau pdf'),
      });

      const swal = page.locator('.swal2-popup');
      await expect(swal).toBeVisible();
      await expect(swal).toContainText('Format file tidak didukung');
      // Karena divalidasi di klien, API confirm-batch tidak boleh terpanggil
      expect(state.confirmCalled).toBe(false);
    });

    test('TC-32-04: Ukuran file melebihi 5MB → peringatan & batal unggah (validasi sisi klien)', async ({ page, context }) => {
      const state = await bukaPembayaran(page, context);

      // Berkas PNG > 5MB. Batas ini hanya dijaga di klien (bucket Supabase tanpa file_size_limit).
      const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, 0);
      await page.setInputFiles('input[type="file"]', {
        name: 'bukti-besar.png',
        mimeType: 'image/png',
        buffer: bigBuffer,
      });

      const swal = page.locator('.swal2-popup');
      await expect(swal).toBeVisible();
      await expect(swal).toContainText('Ukuran file melebihi 5MB');
      expect(state.confirmCalled).toBe(false);
    });
  });
});
