const { test, expect } = require('@playwright/test');
const { loginAs, pauseForDebug, resetE2EDatabase } = require('./helpers');

const DUMMY_PDF = Buffer.from('%PDF-1.4 dokumen pb08');
const DUMMY_IMAGE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);
const DUMMY_TEXT = Buffer.from('format tidak valid');
const DUMMY_LARGE = Buffer.alloc(6 * 1024 * 1024, 'a');

async function openForm(page) {
  await page.goto('/mahasiswa/daftar/1');
  await expect(page).toHaveURL(/\/mahasiswa\/daftar\/1/);
  await expect(page.getByRole('heading', { name: 'Formulir Pendaftaran Beasiswa' })).toBeVisible();
}

async function fillAcademicStep(page) {
  await page.locator('#nama_universitas').fill('Universitas PB08');
  await page.locator('#semester_aktif').selectOption('4');
  await page.locator('#ipk').fill('3.70');
}

async function goToDocuments(page) {
  await fillAcademicStep(page);
  await page.getByRole('button', { name: 'Selanjutnya' }).click();
  await expect(page.getByRole('heading', { name: 'Upload Dokumen' })).toBeVisible();
}

function fileInputByLabel(page, labelText) {
  return page.locator('div').filter({ hasText: new RegExp(`^${labelText}`) }).locator('input[type="file"]').first();
}

async function uploadRequiredTranskrip(page, fileName = 'transkrip-pb08.pdf') {
  await fileInputByLabel(page, 'Transkrip Nilai').setInputFiles({
    name: fileName,
    mimeType: 'application/pdf',
    buffer: DUMMY_PDF,
  });
  await expect(page.getByText(fileName)).toBeVisible();
}

async function mockCreatePendaftaran(page, pendaftaranId = 808) {
  await page.route('**/api/pendaftaran/create', async route => {
    await route.fulfill({
      status: 201,
      json: {
        message: 'Pendaftaran berhasil dibuat',
        pendaftaranId,
        status: 'TERDAFTAR',
        createdAt: '2026-06-14T00:00:00.000Z',
        beasiswaJudul: 'Beasiswa Prestasi Nusantara 2026',
        sisaKuota: null,
      },
    });
  });
}

test.describe('PBI-08 - Sistem Unggah Dokumen Persyaratan Digital', () => {
  test.beforeEach(async ({ context }) => {
    await loginAs(context, 'mahasiswa', {
      accountId: 123,
      userId: 1,
      nama: 'Testing Mahasiswa PB08',
      email: 'testpb08@example.com',
      alamatKtp: 'Jl. Testing Playwright',
      noHandphone: '08123456789',
      tanggalLahir: '2000-01-01',
      provinsiKtpId: 1,
      kabupatenKtpId: 1,
    });
  });

  test('TC-PB08-001: halaman upload menampilkan slot dokumen wajib dan opsional', async ({ page }) => {
    await resetE2EDatabase();
    await openForm(page);
    await goToDocuments(page);
    await pauseForDebug(page);

    const transkripSlot = page.locator('div').filter({ hasText: /^Transkrip Nilai/ }).first();
    const motivationSlot = page.locator('div').filter({ hasText: /^Motivation Letter/ }).first();

    await expect(transkripSlot.getByText('* Wajib')).toBeVisible();
    await expect(motivationSlot.getByText('Opsional')).toBeVisible();
    await expect(page.getByText('PDF, JPG, PNG')).toHaveCount(2);
    await expect(fileInputByLabel(page, 'Transkrip Nilai')).toHaveAttribute('accept', '.pdf,.jpg,.jpeg,.png');
  });

  test('TC-PB08-002: dokumen wajib harus dipilih sebelum lanjut ke review', async ({ page }) => {
    await openForm(page);
    await goToDocuments(page);

    await expect(page.getByRole('button', { name: 'Selanjutnya' })).toBeDisabled();

    await uploadRequiredTranskrip(page);

    await expect(page.getByRole('button', { name: 'Selanjutnya' })).toBeEnabled();
    await page.getByRole('button', { name: 'Selanjutnya' }).click();
    await expect(page.getByRole('heading', { name: 'Review Pendaftaran' })).toBeVisible();
  });

  test('TC-PB08-003: validasi tipe file dan ukuran maksimum', async ({ page }) => {
    await openForm(page);
    await goToDocuments(page);

    const transkrip = fileInputByLabel(page, 'Transkrip Nilai');

    await transkrip.setInputFiles({
      name: 'dokumen.txt',
      mimeType: 'text/plain',
      buffer: DUMMY_TEXT,
    });
    await expect(page.getByText('Tipe file tidak didukung. Gunakan PDF, JPG, JPEG, atau PNG.')).toBeVisible();

    await transkrip.setInputFiles({
      name: 'terlalu-besar.pdf',
      mimeType: 'application/pdf',
      buffer: DUMMY_LARGE,
    });
    await expect(page.getByText('File terlalu besar, maks 5MB')).toBeVisible();
  });

  test('TC-PB08-004: file PDF dan gambar valid tampil sebagai file terpilih', async ({ page }) => {
    await openForm(page);
    await goToDocuments(page);

    await fileInputByLabel(page, 'Transkrip Nilai').setInputFiles({
      name: 'transkrip-valid.pdf',
      mimeType: 'application/pdf',
      buffer: DUMMY_PDF,
    });
    await expect(page.getByText(/PDF.*transkrip-valid\.pdf/)).toBeVisible();

    await fileInputByLabel(page, 'Motivation Letter').setInputFiles({
      name: 'motivasi-valid.png',
      mimeType: 'image/png',
      buffer: DUMMY_IMAGE,
    });
    await expect(page.getByText(/Gambar.*motivasi-valid\.png/)).toBeVisible();
  });

  test('TC-PB08-005: submit mengirim metadata dokumen ke API upload', async ({ page }) => {
    const uploadPayloads = [];

    await mockCreatePendaftaran(page, 8085);
    await page.route('**/api/dokumen/upload', async route => {
      uploadPayloads.push(route.request().postDataJSON());
      await route.fulfill({
        status: 201,
        json: {
          dokumenId: 9000 + uploadPayloads.length,
          statusDokumen: 'MENUNGGU',
          publicUrl: `https://storage.example.com/dokumen/${uploadPayloads.length}.pdf`,
        },
      });
    });

    await openForm(page);
    await goToDocuments(page);

    await uploadRequiredTranskrip(page, 'transkrip-submit.pdf');
    await fileInputByLabel(page, 'Motivation Letter').setInputFiles({
      name: 'motivasi-submit.pdf',
      mimeType: 'application/pdf',
      buffer: DUMMY_PDF,
    });

    await page.getByRole('button', { name: 'Selanjutnya' }).click();
    await expect(page.getByRole('heading', { name: 'Review Pendaftaran' })).toBeVisible();
    await page.getByRole('button', { name: 'Submit Pendaftaran' }).click();

    await expect(page).toHaveURL(/\/mahasiswa\/status-pendaftaran\?id=8085/);
    expect(uploadPayloads).toHaveLength(2);
    expect(uploadPayloads.map(payload => payload.jenis)).toEqual(['transkrip', 'motivation_letter']);
    expect(uploadPayloads.every(payload => payload.pendaftaranId === 8085)).toBeTruthy();
    expect(uploadPayloads[0].fileName).toBe('transkrip-submit.pdf');
    expect(uploadPayloads[1].fileName).toBe('motivasi-submit.pdf');
    expect(uploadPayloads.every(payload => payload.mimeType === 'application/pdf')).toBeTruthy();
    expect(uploadPayloads.every(payload => typeof payload.fileBase64 === 'string' && payload.fileBase64.length > 0)).toBeTruthy();
  });

  test('TC-PB08-006: upload storage gagal menampilkan pesan dan tombol retry', async ({ page }) => {
    await mockCreatePendaftaran(page, 8086);
    await page.route('**/api/dokumen/upload', async route => {
      await route.fulfill({
        status: 500,
        json: { message: 'Upload gagal: bucket tidak tersedia' },
      });
    });

    await openForm(page);
    await goToDocuments(page);
    await uploadRequiredTranskrip(page, 'transkrip-error.pdf');

    await page.getByRole('button', { name: 'Selanjutnya' }).click();
    await expect(page.getByRole('heading', { name: 'Review Pendaftaran' })).toBeVisible();
    await page.getByRole('button', { name: 'Submit Pendaftaran' }).click();

    await expect(page.getByText('Upload gagal: bucket tidak tersedia')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry Upload yang Gagal' })).toBeVisible();
    await expect(page).toHaveURL(/\/mahasiswa\/daftar\/1/);
  });

  test('TC-PB08-007: retry upload berhasil melanjutkan redirect status pendaftaran', async ({ page }) => {
    let uploadAttempt = 0;

    await mockCreatePendaftaran(page, 8087);
    await page.route('**/api/dokumen/upload', async route => {
      uploadAttempt += 1;
      if (uploadAttempt === 1) {
        await route.fulfill({
          status: 500,
          json: { message: 'Upload gagal sementara' },
        });
        return;
      }

      await route.fulfill({
        status: 201,
        json: {
          dokumenId: 9007,
          statusDokumen: 'MENUNGGU',
          publicUrl: 'https://storage.example.com/dokumen/retry.pdf',
        },
      });
    });

    await openForm(page);
    await goToDocuments(page);
    await uploadRequiredTranskrip(page, 'transkrip-retry.pdf');

    await page.getByRole('button', { name: 'Selanjutnya' }).click();
    await expect(page.getByRole('heading', { name: 'Review Pendaftaran' })).toBeVisible();
    await page.getByRole('button', { name: 'Submit Pendaftaran' }).click();

    await expect(page.getByText('Upload gagal sementara')).toBeVisible();
    await page.getByRole('button', { name: 'Retry Upload yang Gagal' }).click();

    await expect(page).toHaveURL(/\/mahasiswa\/status-pendaftaran\?id=8087/);
    expect(uploadAttempt).toBe(2);
  });
});
