const { test, expect } = require('@playwright/test');
const { loginAs } = require('./helpers');

/**
 * PB-16 — Rekap Pembayaran Beasiswa (PBI-28 & PBI-29)
 *
 * Skenario Pengujian:
 * - TC-PB16-001: Menampilkan rekap antrean pembayaran mahasiswa lulus + rekening
 * - TC-PB16-002: Menampilkan jumlah total penerima dalam antrean transfer ("Queue Total")
 * - TC-PB16-003: Menampilkan jumlah akumulasi nominal dana pending ("Total Amount Pending")
 * - TC-PB16-004: Menyembunyikan penerima yang belum melengkapi data rekening
 * - TC-PB16-005: Membuka modal konfirmasi transfer individu
 * - TC-PB16-006: Ekspor data ke format CSV
 * - TC-PB16-007: Memverifikasi format uang Rupiah di file ekspor ("Rp 5.000.000")
 * - TC-PB16-008: Ekspor data ke format Excel
 * - TC-PB16-009: Proteksi akses tanpa login pada halaman rekap pembayaran
 */
test.describe('PB-16: Rekap Pembayaran Beasiswa E2E Tests', () => {

  const mockQueueList = [
    {
      pendaftaranId: 301,
      status: 'LULUS',
      createdAt: '2026-06-10T10:00:00.000Z',
      user: {
        userId: 21,
        nama: 'Andi Pratama',
        email: 'andi@univ.ac.id',
        rekening: [
          {
            rekeningId: 10,
            namRekening: 'BCA - Andi Pratama',
            nomorRekening: '1234567890',
            namaBank: 'BCA',
            namaPemilik: 'Andi Pratama',
            status: 'verified'
          }
        ]
      },
      beasiswa: { beasiswaId: 51, judul: 'Beasiswa Garuda', nominal: 5000000 },
      penyaluran_dana: [
        { penyaluranId: 701, status: 'pending', jumlahDana: 5000000, buktiTransferUrl: null }
      ]
    },
    {
      pendaftaranId: 302,
      status: 'LULUS',
      createdAt: '2026-06-10T11:00:00.000Z',
      user: {
        userId: 22,
        nama: 'Siti Aminah',
        email: 'siti@univ.ac.id',
        rekening: [
          {
            rekeningId: 11,
            namRekening: 'Mandiri - Siti Aminah',
            nomorRekening: '0987654321',
            namaBank: 'Mandiri',
            namaPemilik: 'Siti Aminah',
            status: 'verified'
          }
        ]
      },
      beasiswa: { beasiswaId: 52, judul: 'Beasiswa Kemitraan', nominal: 10000000 },
      penyaluran_dana: [
        { penyaluranId: 702, status: 'pending', jumlahDana: 10000000, buktiTransferUrl: null }
      ]
    },
    // Mahasiswa tanpa rekening (harusnya disembunyikan - TC-PB16-004)
    {
      pendaftaranId: 303,
      status: 'LULUS',
      createdAt: '2026-06-10T12:00:00.000Z',
      user: {
        userId: 23,
        nama: 'Budi Raharjo',
        email: 'budi@univ.ac.id',
        rekening: [] // Tanpa rekening
      },
      beasiswa: { beasiswaId: 51, judul: 'Beasiswa Garuda', nominal: 5000000 },
      penyaluran_dana: []
    }
  ];

  const pageDataPayload = {
    pageProps: {
      user: { userId: 1, role: 'pendonor', nama: 'Yayasan Bakti Pertiwi', accountId: 123 },
      pendonorId: 1,
      initialQueueList: mockQueueList
    },
    __N_SSP: true
  };

  async function setupMockApi(page) {
    // Intercept Next.js page props loading for client-side navigation data injection
    await page.route('**/_next/data/**/pendonor/dashboard-pembayaran.json*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pageDataPayload)
      });
    });

    // Mock API confirm-transfer
    await page.route('**/api/pendonor/pembayaran/confirm-transfer', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Pembayaran transfer berhasil dikonfirmasi.' })
      });
    });
  }

  // TC-PB16-009: Proteksi akses tanpa login pada halaman rekap pembayaran
  test('TC-PB16-009: Proteksi akses tanpa login pada halaman rekap pembayaran', async ({ page }) => {
    await page.goto('/pendonor/dashboard-pembayaran');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test.describe('Akses Terverifikasi Pendonor', () => {

    test.beforeEach(async ({ page, context }) => {
      await loginAs(context, 'pendonor');
      await setupMockApi(page);
    });

    // TC-PB16-001: Menampilkan rekap antrean pembayaran mahasiswa lulus + rekening
    // TC-PB16-002: Menampilkan jumlah total penerima dalam antrean transfer
    // TC-PB16-003: Menampilkan jumlah akumulasi nominal dana pending
    // TC-PB16-004: Menyembunyikan penerima yang belum melengkapi data rekening
    test('TC-PB16-001 hingga 004: Verifikasi Tampilan Dashboard & Rekap Tabel', async ({ page }) => {
      // Buka halaman login dulu (tanpa database SSR)
      await page.goto('/pendonor/login');
      
      // Lakukan transisi client-side ke dashboard-pembayaran agar page.route intercept _next/data terpicu
      await page.evaluate(() => window.next.router.push('/pendonor/dashboard-pembayaran'));

      await expect(page.locator('h1')).toContainText('Instruksi Pembayaran');

      // TC-PB16-002: Queue Total should display 2 (since 303 has no rekening)
      await expect(page.locator('text=Queue Total')).toBeVisible();
      await expect(page.locator('text=2 Penerima')).toBeVisible();

      // TC-PB16-003: Total Amount Pending = Rp 5.000.000 + Rp 10.000.000 = Rp 15.000.000
      await expect(page.locator('text=Rp 15.000.000')).toBeVisible();

      // TC-PB16-001 & TC-PB16-004: Check table rows
      await expect(page.locator('text=Andi Pratama')).toBeVisible();
      await expect(page.locator('text=Siti Aminah')).toBeVisible();
      
      // Budi Raharjo should be hidden (TC-PB16-004)
      await expect(page.locator('text=Budi Raharjo')).not.toBeVisible();

      // Bank info verified
      await expect(page.locator('text=BCA')).toBeVisible();
      await expect(page.locator('text=1234567890')).toBeVisible();
      await expect(page.locator('text=Mandiri')).toBeVisible();
      await expect(page.locator('text=0987654321')).toBeVisible();
    });

    // TC-PB16-005: Membuka modal konfirmasi transfer individu
    test('TC-PB16-005: Membuka modal konfirmasi transfer individu', async ({ page }) => {
      await page.goto('/pendonor/login');
      await page.evaluate(() => window.next.router.push('/pendonor/dashboard-pembayaran'));

      const initiateBtn = page.locator('#initiate-btn-301');
      await expect(initiateBtn).toBeVisible();

      // Click Initiate
      await initiateBtn.click();

      // Check modal open
      await expect(page.locator('text=Konfirmasi Transfer Dana')).toBeVisible();
      await expect(page.locator('text=Nama Bank: BCA')).toBeVisible();
      await expect(page.locator('text=Nomor Rekening: 1234567890')).toBeVisible();
      await expect(page.locator('text=Nama Pemilik: Andi Pratama')).toBeVisible();

      // Cancel modal
      await page.click('button:has-text("Batal")');
      await expect(page.locator('text=Konfirmasi Transfer Dana')).not.toBeVisible();
    });

    // TC-PB16-006 & TC-PB16-007: Ekspor CSV dan Verifikasi format Rupiah
    test('TC-PB16-006 & TC-PB16-007: Ekspor CSV dan Verifikasi format Rupiah', async ({ page }) => {
      await page.goto('/pendonor/login');
      await page.evaluate(() => window.next.router.push('/pendonor/dashboard-pembayaran'));

      const exportCsvBtn = page.locator('#export-csv-btn');
      await expect(exportCsvBtn).toBeVisible();

      // Capture download event
      const downloadPromise = page.waitForEvent('download');
      await exportCsvBtn.click();
      const download = await downloadPromise;

      // TC-PB16-006: Expected CSV filename format
      expect(download.suggestedFilename()).toMatch(/data-penerima-\d{4}-\d{2}-\d{2}\.csv/);

      // TC-PB16-007: Read download contents and verify Rupiah formatting is in the file
      const path = await download.path();
      const fs = require('fs');
      const csvContents = fs.readFileSync(path, 'utf8');
      
      // The formatting expected is "Rp 5.000.000" and "Rp 10.000.000"
      expect(csvContents).toContain('Rp 5.000.000');
      expect(csvContents).toContain('Rp 10.000.000');
    });

    // TC-PB16-008: Ekspor data ke format Excel
    test('TC-PB16-008: Ekspor data ke format Excel', async ({ page }) => {
      await page.goto('/pendonor/login');
      await page.evaluate(() => window.next.router.push('/pendonor/dashboard-pembayaran'));

      const exportExcelBtn = page.locator('#export-excel-btn');
      await expect(exportExcelBtn).toBeVisible();

      // Capture download event
      const downloadPromise = page.waitForEvent('download');
      await exportExcelBtn.click();
      const download = await downloadPromise;

      // TC-PB16-008: Expected XLSX filename format
      expect(download.suggestedFilename()).toMatch(/data-penerima-\d{4}-\d{2}-\d{2}\.xlsx/);
    });

  });
});
