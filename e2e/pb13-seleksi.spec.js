const { test, expect } = require('@playwright/test');
const { loginAs } = require('./helpers');

/**
 * PB-13 — Kelola Proses Seleksi & Verifikasi Berkas (PBI-23 & PBI-24)
 *
 * Skenario Pengujian:
 * - TC-PB13-001: Menampilkan daftar pendaftar di sidebar kanan secara otomatis
 * - TC-PB13-002: Menampilkan detail pendaftar terpilih di panel tengah tanpa reload
 * - TC-PB13-003: Membuka berkas dokumen di tab baru
 * - TC-PB13-004: Menyetujui dokumen pendaftar secara mandiri
 * - TC-PB13-005: Menandai dokumen bermasalah dengan alasan penolakan
 * - TC-PB13-006: Meloloskan pendaftar menjadi LULUS dengan konfirmasi
 * - TC-PB13-007: Menolak pendaftaran mahasiswa dengan konfirmasi
 * - TC-PB13-008: Menampilkan informasi jika beasiswa tidak memiliki pendaftar
 * - TC-PB13-009: Proteksi hak akses tanpa login
 * - TC-PB13-010: Proteksi hak akses oleh mahasiswa (bukan role pendonor)
 */
test.describe('PB-13: Kelola Proses Seleksi & Verifikasi Berkas E2E Tests', () => {

  const mockPrograms = [
    { beasiswaId: 101, judul: 'Beasiswa Unggulan Prestasi' },
    { beasiswaId: 102, judul: 'Beasiswa Kemitraan Kosong' }
  ];

  const mockApplicants = [
    {
      pendaftaranId: 201,
      createdAt: '2026-06-10T09:00:00.000Z',
      status: 'TERDAFTAR',
      user: {
        nama: 'Nadhif Mahasiswa',
        email: 'nadhif@mail.com',
        rekening: []
      },
      dokumen: [
        {
          dokumenId: 501,
          jenis: 'ktp',
          statusDokumen: 'MENUNGGU',
          rejectionReason: null,
          error: 'dokumen/ktp_nadhif.pdf'
        },
        {
          dokumenId: 502,
          jenis: 'transkrip',
          statusDokumen: 'MENUNGGU',
          rejectionReason: null,
          error: 'dokumen/transkrip_nadhif.pdf'
        }
      ]
    }
  ];

  async function setupMockApi(page, { applicants = mockApplicants, programs = mockPrograms } = {}) {
    // Mock /api/pendonor/beasiswa
    await page.route('**/api/pendonor/beasiswa', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: programs }),
      });
    });

    // Mock /api/pendonor/seleksi/list?beasiswaId=*
    await page.route('**/api/pendonor/seleksi/list?beasiswaId=*', async (route) => {
      const url = new URL(route.request().url());
      const bId = url.searchParams.get('beasiswaId');
      if (bId === '102') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: applicants }),
        });
      }
    });

    // Mock /api/pendonor/seleksi/document
    await page.route('**/api/pendonor/seleksi/document', async (route) => {
      const body = JSON.parse(route.request().postData());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Dokumen updated', data: body }),
      });
    });

    // Mock /api/pendonor/seleksi/registration
    await page.route('**/api/pendonor/seleksi/registration', async (route) => {
      const body = JSON.parse(route.request().postData());
      const newStatus = body.action === 'verify' || body.action === 'batch_verify' ? 'LULUS' : 'DITOLAK';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Pendaftaran updated', data: { status: newStatus } }),
      });
    });
  }

  // TC-PB13-009: Proteksi hak akses tanpa login
  test('TC-PB13-009: Proteksi hak akses tanpa login', async ({ page }) => {
    await page.goto('/pendonor/seleksi-pendaftar');
    await expect(page).toHaveURL(/.*\/login/);
  });

  // TC-PB13-010: Proteksi hak akses oleh mahasiswa (bukan role pendonor)
  test('TC-PB13-010: Proteksi hak akses oleh mahasiswa', async ({ page, context }) => {
    await loginAs(context, 'mahasiswa');
    await page.goto('/pendonor/seleksi-pendaftar');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test.describe('Akses Terverifikasi Pendonor', () => {

    test.beforeEach(async ({ context }) => {
      await loginAs(context, 'pendonor');
    });

    // TC-PB13-001: Menampilkan daftar pendaftar di sidebar kanan secara otomatis
    test('TC-PB13-001: Menampilkan daftar pendaftar di sidebar kanan secara otomatis', async ({ page }) => {
      await setupMockApi(page);
      await page.goto('/pendonor/seleksi-pendaftar');

      await expect(page.locator('h1')).toContainText('Verifikasi Berkas Pendaftar');
      
      // Sidebar should display applicant info
      const queueItem = page.locator('#queue-item-201');
      await expect(queueItem).toBeVisible();
      await expect(queueItem.locator('text=Nadhif Mahasiswa')).toBeVisible();
      await expect(queueItem.locator('text=Terdaftar')).toBeVisible();
    });

    // TC-PB13-002: Menampilkan detail pendaftar terpilih di panel tengah tanpa reload
    test('TC-PB13-002: Menampilkan detail pendaftar terpilih di panel tengah tanpa reload', async ({ page }) => {
      await setupMockApi(page);
      await page.goto('/pendonor/seleksi-pendaftar');

      // First applicant should be auto-selected
      await expect(page.locator('h2', { hasText: 'Nadhif Mahasiswa' })).toBeVisible();
      await expect(page.locator('text=ID Pendaftaran: #201')).toBeVisible();
      await expect(page.locator('text=nadhif@mail.com')).toBeVisible();

      // Check document rows in verification desk
      await expect(page.locator('text=KTP')).toBeVisible();
      await expect(page.locator('text=Transkrip Nilai')).toBeVisible();
    });

    // TC-PB13-003: Membuka berkas dokumen di tab baru
    test('TC-PB13-003: Membuka berkas dokumen di tab baru', async ({ page }) => {
      await setupMockApi(page);
      await page.goto('/pendonor/seleksi-pendaftar');

      const ktpViewBtn = page.locator('#view-doc-btn-ktp-501');
      await expect(ktpViewBtn).toBeVisible();
      await expect(ktpViewBtn).toHaveAttribute('target', '_blank');
      await expect(ktpViewBtn).toHaveAttribute('href', /.*dokumen\/ktp_nadhif\.pdf/);
    });

    // TC-PB13-004: Menyetujui dokumen pendaftar secara mandiri
    test('TC-PB13-004: Menyetujui dokumen pendaftar secara mandiri', async ({ page }) => {
      await setupMockApi(page);
      await page.goto('/pendonor/seleksi-pendaftar');

      const ktpApproveBtn = page.locator('#approve-doc-btn-ktp-501');
      await expect(ktpApproveBtn).toBeVisible();
      await expect(ktpApproveBtn).toContainText('Approve');
      
      // Click Approve
      await ktpApproveBtn.click();
      
      // Visual feedback: badge should change to Disetujui and button should become green & disabled
      await expect(ktpApproveBtn).toBeDisabled();
      await expect(ktpApproveBtn).toHaveClass(/bg-green-600/);
    });

    // TC-PB13-005: Menandai dokumen bermasalah dengan alasan penolakan
    test('TC-PB13-005: Menandai dokumen bermasalah dengan alasan penolakan', async ({ page }) => {
      await setupMockApi(page);
      await page.goto('/pendonor/seleksi-pendaftar');

      const transkripFlagBtn = page.locator('#flag-doc-btn-transkrip-502');
      await expect(transkripFlagBtn).toBeVisible();
      
      // Click Flag Issue to open modal
      await transkripFlagBtn.click();
      
      // Check modal visible
      const modal = page.locator('text=Flag Masalah Dokumen');
      await expect(modal).toBeVisible();
      
      // Fill rejection reason
      const textarea = page.locator('#rejection-reason-textarea');
      await textarea.fill('Format KTP tidak jelas/blur');
      
      // Submit
      await page.click('#submit-flag-modal-btn');
      
      // Modal should be closed, and warning should display locally in the table
      await expect(modal).not.toBeVisible();
      await expect(page.locator('text=Masalah: "Format KTP tidak jelas/blur"')).toBeVisible();
    });

    // TC-PB13-006: Meloloskan pendaftar menjadi LULUS dengan konfirmasi
    test('TC-PB13-006: Meloloskan pendaftar menjadi LULUS dengan konfirmasi', async ({ page }) => {
      await setupMockApi(page);
      await page.goto('/pendonor/seleksi-pendaftar');

      const verifyBtn = page.locator('#verify-registration-btn');
      await expect(verifyBtn).toBeVisible();
      
      // Click Verify
      await verifyBtn.click();
      
      // SweetAlert confirmation should show
      const swalConfirm = page.locator('.swal2-popup');
      await expect(swalConfirm).toBeVisible();
      await expect(swalConfirm).toContainText('Apakah Anda yakin ingin meloloskan pendaftaran ini (LULUS)?');

      // Click Confirm "Ya"
      await page.click('button:has-text("Ya")');
      
      // Should show success popup
      await expect(page.locator('.swal2-popup:has-text("Berhasil!")')).toBeVisible();
      await page.click('button:has-text("OK")');

      // Status should update to LULUS
      await expect(page.locator('text=Status Pendaftaran saat ini: Lulus')).toBeVisible();
    });

    // TC-PB13-007: Menolak pendaftaran mahasiswa dengan konfirmasi
    test('TC-PB13-007: Menolak pendaftaran mahasiswa dengan konfirmasi', async ({ page }) => {
      await setupMockApi(page);
      await page.goto('/pendonor/seleksi-pendaftar');

      const rejectBtn = page.locator('#reject-registration-btn');
      await expect(rejectBtn).toBeVisible();
      
      // Click Reject
      await rejectBtn.click();
      
      // Confirm dialog
      await page.click('button:has-text("Ya")');
      await page.click('button:has-text("OK")');

      // Status should update to Ditolak
      await expect(page.locator('text=Status Pendaftaran saat ini: Ditolak')).toBeVisible();
    });

    // TC-PB13-008: Menampilkan informasi jika beasiswa tidak memiliki pendaftar
    test('TC-PB13-008: Menampilkan informasi jika beasiswa tidak memiliki pendaftar', async ({ page }) => {
      await setupMockApi(page);
      await page.goto('/pendonor/seleksi-pendaftar');

      // Switch to empty program
      await page.selectOption('#scholarship-program-select', '102');
      
      // Wait and expect empty state message
      await expect(page.locator('text=Belum Ada Pendaftar')).toBeVisible();
    });

  });
});
