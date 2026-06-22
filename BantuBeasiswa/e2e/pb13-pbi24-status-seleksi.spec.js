const { test, expect } = require('@playwright/test');
const { loginAs, createRealDbTestData, cleanRealDbTestData, gotoSeleksiPendaftar, supabase } = require('./helpers');

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

  // Data is kept after tests for user inspection; cleaned up automatically at the start of the next run
  // test.afterAll(async () => {
  //   await cleanRealDbTestData(testData);
  // });

  test.describe('Akses Terverifikasi Pendonor', () => {

    test.beforeEach(async ({ context }) => {
      // Reset statuses in live DB to prevent test cross-contamination
      await supabase
        .from('pendaftaran')
        .update({ status: 'TERDAFTAR' })
        .in('pendaftaranId', [testData.pendaftaran.pendaftaranId, testData.pendaftaran2.pendaftaranId]);

      await supabase
        .from('dokumen')
        .update({ statusDokumen: 'MENUNGGU', rejectionReason: null })
        .in('pendaftaranId', [testData.pendaftaran.pendaftaranId, testData.pendaftaran2.pendaftaranId]);

      await loginAs(context, 'pendonor', {
        userId: testData.pendonorId,
        accountId: testData.pendonorAccountId
      });
    });

    // TC-PB13-004: Menyetujui dokumen pendaftar secara mandiri
    test('TC-PB13-004: Menyetujui dokumen pendaftar secara mandiri', async ({ page }) => {
      await gotoSeleksiPendaftar(page, testData.beasiswa.beasiswaId);

      // Click applicant queue item to ensure detail is selected
      const queueItem = page.locator(`#queue-item-${testData.pendaftaran.pendaftaranId}`);
      await queueItem.waitFor({ state: 'visible' });
      await queueItem.click();

      const ktpDoc = testData.docs.find(d => d.jenis === 'ktp');
      const ktpApproveBtn = page.locator(`#approve-doc-btn-ktp-${ktpDoc.dokumenId}`);
      await ktpApproveBtn.waitFor({ state: 'visible' });
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
      await gotoSeleksiPendaftar(page, testData.beasiswa.beasiswaId);

      // Click applicant queue item
      const queueItem = page.locator(`#queue-item-${testData.pendaftaran.pendaftaranId}`);
      await queueItem.waitFor({ state: 'visible' });
      await queueItem.click();

      const transkripDoc = testData.docs.find(d => d.jenis === 'transkrip');
      const transkripFlagBtn = page.locator(`#flag-doc-btn-transkrip-${transkripDoc.dokumenId}`);
      await transkripFlagBtn.waitFor({ state: 'visible' });
      await expect(transkripFlagBtn).toBeVisible();
      
      // Click Flag Issue to open modal
      await transkripFlagBtn.click();
      
      // Check modal visible
      const modal = page.locator('text=Flag Masalah Dokumen');
      await modal.waitFor({ state: 'visible' });
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
      await gotoSeleksiPendaftar(page, testData.beasiswa.beasiswaId);

      // Click applicant queue item
      const queueItem = page.locator(`#queue-item-${testData.pendaftaran.pendaftaranId}`);
      await queueItem.waitFor({ state: 'visible' });
      await queueItem.click();

      const verifyBtn = page.locator('#verify-registration-btn');
      await verifyBtn.waitFor({ state: 'visible' });
      await expect(verifyBtn).toBeVisible();
      
      // Click Verify
      await verifyBtn.click();
      
      // SweetAlert confirmation should show
      const swalConfirm = page.locator('.swal2-popup');
      await swalConfirm.waitFor({ state: 'visible' });
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
      await gotoSeleksiPendaftar(page, testData.beasiswa.beasiswaId);

      // Click second applicant queue item (which is still TERDAFTAR)
      const queueItem2 = page.locator(`#queue-item-${testData.pendaftaran2.pendaftaranId}`);
      await queueItem2.waitFor({ state: 'visible' });
      await queueItem2.click();

      const rejectBtn = page.locator('#reject-registration-btn');
      await rejectBtn.waitFor({ state: 'visible' });
      await expect(rejectBtn).toBeVisible();
      
      // Click Reject
      await rejectBtn.click();
      
      // Confirm dialog
      await page.click('button:has-text("Ya")');
      await page.click('button:has-text("OK")');

      // Status should update to Ditolak
      await expect(page.locator('text=Status Pendaftaran saat ini: Ditolak')).toBeVisible();
    });

    // TC-PB13-011: Meminta revisi berkas pendaftaran dengan konfirmasi
    test('TC-PB13-011: Meminta revisi berkas pendaftaran dengan konfirmasi', async ({ page }) => {
      await gotoSeleksiPendaftar(page, testData.beasiswa.beasiswaId);

      const queueItem = page.locator(`#queue-item-${testData.pendaftaran.pendaftaranId}`);
      await queueItem.waitFor({ state: 'visible' });
      await queueItem.click();

      const revisionBtn = page.locator('#request-revision-btn');
      await revisionBtn.waitFor({ state: 'visible' });
      await expect(revisionBtn).toBeVisible();
      await revisionBtn.click();

      await page.click('button:has-text("Ya")');
      await page.click('button:has-text("OK")');

      await expect(page.locator('text=Status Pendaftaran saat ini: Review')).toBeVisible();
    });

    // TC-PB13-012: Batch Verify semua berkas dan meloloskan pendaftaran dengan konfirmasi
    test('TC-PB13-012: Batch Verify semua berkas dan meloloskan pendaftaran dengan konfirmasi', async ({ page }) => {
      await gotoSeleksiPendaftar(page, testData.beasiswa.beasiswaId);

      const queueItem2 = page.locator(`#queue-item-${testData.pendaftaran2.pendaftaranId}`);
      await queueItem2.waitFor({ state: 'visible' });
      await queueItem2.click();

      const batchVerifyBtn = page.locator('#batch-verify-registration-btn');
      await batchVerifyBtn.waitFor({ state: 'visible' });
      await expect(batchVerifyBtn).toBeVisible();
      await batchVerifyBtn.click();

      await page.click('button:has-text("Ya")');
      await page.click('button:has-text("OK")');

      await expect(page.locator('text=Status Pendaftaran saat ini: Lulus')).toBeVisible();
    });

    // TC-PB13-013: Membatalkan tindakan verify pendaftaran pada dialog konfirmasi
    test('TC-PB13-013: Membatalkan tindakan verify pendaftaran pada dialog konfirmasi', async ({ page }) => {
      await gotoSeleksiPendaftar(page, testData.beasiswa.beasiswaId);

      const queueItem = page.locator(`#queue-item-${testData.pendaftaran.pendaftaranId}`);
      await queueItem.waitFor({ state: 'visible' });
      await queueItem.click();

      const verifyBtn = page.locator('#verify-registration-btn');
      await verifyBtn.waitFor({ state: 'visible' });
      await expect(verifyBtn).toBeVisible();
      await verifyBtn.click();

      const swalConfirm = page.locator('.swal2-popup');
      await swalConfirm.waitFor({ state: 'visible' });
      await expect(swalConfirm).toBeVisible();
      await page.click('button:has-text("Batal")');

      await expect(swalConfirm).not.toBeVisible();
      await expect(page.locator('text=Status Pendaftaran saat ini: Lulus')).not.toBeVisible();
    });

    // TC-PB13-014: Membatalkan tindakan reject pendaftaran pada dialog konfirmasi
    test('TC-PB13-014: Membatalkan tindakan reject pendaftaran pada dialog konfirmasi', async ({ page }) => {
      await gotoSeleksiPendaftar(page, testData.beasiswa.beasiswaId);

      const queueItem = page.locator(`#queue-item-${testData.pendaftaran.pendaftaranId}`);
      await queueItem.waitFor({ state: 'visible' });
      await queueItem.click();

      const rejectBtn = page.locator('#reject-registration-btn');
      await rejectBtn.waitFor({ state: 'visible' });
      await expect(rejectBtn).toBeVisible();
      await rejectBtn.click();

      const swalConfirm = page.locator('.swal2-popup');
      await swalConfirm.waitFor({ state: 'visible' });
      await expect(swalConfirm).toBeVisible();
      await page.click('button:has-text("Batal")');

      await expect(swalConfirm).not.toBeVisible();
      await expect(page.locator('text=Status Pendaftaran saat ini: Ditolak')).not.toBeVisible();
    });

  });
});
