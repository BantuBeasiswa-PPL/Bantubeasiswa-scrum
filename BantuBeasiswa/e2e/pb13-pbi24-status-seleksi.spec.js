const { test, expect } = require('@playwright/test');
const { loginAs, createRealDbTestData, cleanRealDbTestData } = require('./helpers');

/**
 * PB-13 — Kelola Proses Seleksi & Verifikasi Berkas (PBI-24)
 *
 * Skenario Pengujian:
 * - TC-PB13-004: Menyetujui dokumen pendaftar secara mandiri
 * - TC-PB13-005: Menandai dokumen bermasalah dengan alasan penolakan
 * - TC-PB13-006: Meloloskan pendaftar menjadi LULUS dengan konfirmasi
 * - TC-PB13-007: Menolak pendaftaran mahasiswa dengan konfirmasi
 */
test.describe('PBI-24: Update Status & Seleksi Berkas E2E Tests (Real Database)', () => {

  let testData;

  test.beforeAll(async () => {
    testData = await createRealDbTestData();
  });

  test.afterAll(async () => {
    await cleanRealDbTestData(testData);
  });

  test.describe('Akses Terverifikasi Pendonor', () => {

    test.beforeEach(async ({ context }) => {
      await loginAs(context, 'pendonor', {
        userId: testData.pendonorId,
        accountId: testData.pendonorAccountId
      });
    });

    // TC-PB13-004: Menyetujui dokumen pendaftar secara mandiri
    test('TC-PB13-004: Menyetujui dokumen pendaftar secara mandiri', async ({ page }) => {
      await page.goto(`/pendonor/seleksi-pendaftar?beasiswaId=${testData.beasiswa.beasiswaId}`);

      // Click applicant queue item to ensure detail is selected
      const queueItem = page.locator(`#queue-item-${testData.pendaftaran.pendaftaranId}`);
      await queueItem.click();

      const ktpDoc = testData.docs.find(d => d.jenis === 'ktp');
      const ktpApproveBtn = page.locator(`#approve-doc-btn-ktp-${ktpDoc.dokumenId}`);
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
      await page.goto(`/pendonor/seleksi-pendaftar?beasiswaId=${testData.beasiswa.beasiswaId}`);

      // Click applicant queue item
      const queueItem = page.locator(`#queue-item-${testData.pendaftaran.pendaftaranId}`);
      await queueItem.click();

      const transkripDoc = testData.docs.find(d => d.jenis === 'transkrip');
      const transkripFlagBtn = page.locator(`#flag-doc-btn-transkrip-${transkripDoc.dokumenId}`);
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
      await page.goto(`/pendonor/seleksi-pendaftar?beasiswaId=${testData.beasiswa.beasiswaId}`);

      // Click applicant queue item
      const queueItem = page.locator(`#queue-item-${testData.pendaftaran.pendaftaranId}`);
      await queueItem.click();

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
      await page.goto(`/pendonor/seleksi-pendaftar?beasiswaId=${testData.beasiswa.beasiswaId}`);

      // Click second applicant queue item (which is still TERDAFTAR)
      const queueItem2 = page.locator(`#queue-item-${testData.pendaftaran2.pendaftaranId}`);
      await queueItem2.click();

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

  });
});
