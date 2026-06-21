const { test, expect } = require('@playwright/test');
const { loginAs, pauseForDebug, resetE2EDatabase } = require('./helpers');

const DUMMY_PDF = Buffer.from('%PDF-1.4 dummy pdf content');
const DUMMY_TEXT = Buffer.from('plain text file');
const DUMMY_LARGE = Buffer.alloc(6 * 1024 * 1024, 'a');

async function openForm(page) {
  await page.goto('/mahasiswa/daftar/1');
  await expect(page).toHaveURL(/\/mahasiswa\/daftar\/1/);
  await expect(page.getByRole('heading', { name: 'Formulir Pendaftaran Beasiswa' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Data dari Profil Anda' })).toBeVisible();
}

function profileCard(page) {
  return page.locator('div.bg-gradient-to-br').filter({
    has: page.getByRole('heading', { name: 'Data dari Profil Anda' }),
  });
}

async function fillAcademicStep(page, {
  namaUniversitas = 'Universitas Testing PB07',
  semester = '3',
  ipk = '3.80',
} = {}) {
  await page.locator('#nama_universitas').fill(namaUniversitas);
  await page.locator('#semester_aktif').selectOption(semester);
  await page.locator('#ipk').fill(ipk);
}

function fileInputByLabel(page, labelText) {
  return page.locator('div').filter({ hasText: new RegExp(`^${labelText}`) }).locator('input[type="file"]').first();
}

async function goToDocuments(page, academicData) {
  await fillAcademicStep(page, academicData);
  await page.getByRole('button', { name: 'Selanjutnya' }).click();
  await expect(page.getByRole('heading', { name: 'Upload Dokumen' })).toBeVisible();
}

test.describe('PBI-07 - Formulir Pendaftaran Data Diri Internal', () => {
  test.beforeEach(async ({ context }) => {
    await loginAs(context, 'mahasiswa', {
      accountId: 123,
      userId: 1,
      nama: 'Testing Mahasiswa PB07',
      email: 'testpb07@example.com',
      alamatKtp: 'Jl. Testing Playwright',
      noHandphone: '08123456789',
      tanggalLahir: '2000-01-01',
      provinsiKtpId: 1,
      kabupatenKtpId: 1,
    });
  });

  test('TC-PB07-001 & TC-PB07-002: membuka form dan data profil terisi otomatis', async ({ page }) => {
    await resetE2EDatabase();
    await openForm(page);
    await pauseForDebug(page);

    const card = profileCard(page);

    await expect(card.getByText('Nama Lengkap', { exact: true })).toBeVisible();
    await expect(card.getByText('Email', { exact: true })).toBeVisible();
    await expect(card.getByText('Alamat', { exact: true })).toBeVisible();
    await expect(card.getByText('No. Handphone', { exact: true })).toBeVisible();
    await expect(card.getByText('mahasiswa1@email.com')).toBeVisible();
    await expect(card.getByText('Jl. Testing')).toBeVisible();
    await expect(card.getByText('08123456789')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Informasi Akademik' })).toBeVisible();
  });

  test('TC-PB07-003 & TC-PB07-004: validasi field akademik wajib diisi', async ({ page }) => {
    await openForm(page);

    await page.getByRole('button', { name: 'Selanjutnya' }).click();

    await expect(page.getByText('Nama universitas wajib diisi')).toBeVisible();
    await expect(page.getByText('Semester aktif wajib dipilih')).toBeVisible();
    await expect(page.getByText('IPK wajib diisi')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Upload Dokumen' })).toHaveCount(0);
  });

  test('TC-PB07-005 sampai TC-PB07-011: upload dokumen, review, dan kembali ke step sebelumnya', async ({ page }) => {
    await openForm(page);
    await goToDocuments(page);

    const transkrip = fileInputByLabel(page, 'Transkrip Nilai');
    const motivation = fileInputByLabel(page, 'Motivation Letter');

    await transkrip.setInputFiles({ name: 'transkrip.pdf', mimeType: 'application/pdf', buffer: DUMMY_PDF });
    await expect(page.getByText('transkrip.pdf')).toBeVisible();

    await motivation.setInputFiles({ name: 'motivasi.pdf', mimeType: 'application/pdf', buffer: DUMMY_PDF });
    await expect(page.getByText('motivasi.pdf')).toBeVisible();

    await page.getByRole('button', { name: 'Selanjutnya' }).click();

    await expect(page.getByRole('heading', { name: 'Review Pendaftaran' })).toBeVisible();
    await expect(page.getByText('Universitas Testing PB07')).toBeVisible();
    await expect(page.getByText('Semester 3')).toBeVisible();
    await expect(page.getByText('transkrip.pdf')).toBeVisible();
    await expect(page.getByText('motivasi.pdf')).toBeVisible();

    await page.getByRole('button', { name: 'Sebelumnya' }).click();
    await expect(page.getByRole('heading', { name: 'Upload Dokumen' })).toBeVisible();
    await expect(page.getByText('transkrip.pdf')).toBeVisible();
    await expect(page.getByText('motivasi.pdf')).toBeVisible();
  });

  test('TC-PB07-012: pendaftaran duplikat ditolak', async ({ page }) => {
    await page.route('**/api/pendaftaran/create', async route => {
      await route.fulfill({
        status: 409,
        json: {
          code: 'DUPLICATE',
          message: 'Kamu sudah mendaftar program ini sebelumnya',
          pendaftaranId: 100,
        },
      });
    });

    await openForm(page);
    await goToDocuments(page);

    await fileInputByLabel(page, 'Transkrip Nilai').setInputFiles({
      name: 'transkrip.pdf',
      mimeType: 'application/pdf',
      buffer: DUMMY_PDF,
    });
    await page.getByRole('button', { name: 'Selanjutnya' }).click();
    await expect(page.getByRole('heading', { name: 'Review Pendaftaran' })).toBeVisible();

    await page.getByRole('button', { name: 'Submit Pendaftaran' }).click();

    await expect(page.getByText('Kamu sudah mendaftar program ini sebelumnya')).toBeVisible();
    await expect(page).toHaveURL(/\/mahasiswa\/daftar\/1/);
  });

  test('TC-PB07-013 sampai TC-PB07-021: submit berhasil dan redirect ke status pendaftaran', async ({ page }) => {
    await page.route('**/api/pendaftaran/create', async route => {
      await route.fulfill({
        status: 201,
        json: {
          message: 'Pendaftaran berhasil dibuat',
          pendaftaranId: 999,
          status: 'TERDAFTAR',
          createdAt: '2026-06-14T00:00:00.000Z',
          beasiswaJudul: 'Beasiswa Prestasi Nusantara 2026',
          sisaKuota: null,
        },
      });
    });

    await page.route('**/api/dokumen/upload', async route => {
      await route.fulfill({
        status: 200,
        json: {
          publicUrl: 'https://storage.example.com/dokumen/transkrip.pdf',
        },
      });
    });

    await openForm(page);
    await goToDocuments(page, {
      namaUniversitas: 'Universitas Simulasi Sukses',
      semester: '8',
      ipk: '4.00',
    });

    await fileInputByLabel(page, 'Transkrip Nilai').setInputFiles({
      name: 'transkrip.pdf',
      mimeType: 'application/pdf',
      buffer: DUMMY_PDF,
    });
    await fileInputByLabel(page, 'Motivation Letter').setInputFiles({
      name: 'motivasi.pdf',
      mimeType: 'application/pdf',
      buffer: DUMMY_PDF,
    });

    await page.getByRole('button', { name: 'Selanjutnya' }).click();
    await expect(page.getByRole('heading', { name: 'Review Pendaftaran' })).toBeVisible();

    await page.getByRole('button', { name: 'Submit Pendaftaran' }).click();

    await expect(page).toHaveURL(/\/mahasiswa\/status-pendaftaran\?id=999/);
  });

  test('TC-PB07-022: upload gagal menampilkan error dan tidak redirect', async ({ page }) => {
    await page.route('**/api/pendaftaran/create', async route => {
      await route.fulfill({
        status: 201,
        json: {
          message: 'Pendaftaran berhasil dibuat',
          pendaftaranId: 888,
          status: 'TERDAFTAR',
          createdAt: '2026-06-14T00:00:00.000Z',
          beasiswaJudul: 'Beasiswa Prestasi Nusantara 2026',
          sisaKuota: null,
        },
      });
    });

    await page.route('**/api/dokumen/upload', async route => {
      await route.fulfill({
        status: 500,
        json: { message: 'Bucket storage penuh atau tidak tersedia' },
      });
    });

    await openForm(page);
    await goToDocuments(page);

    await fileInputByLabel(page, 'Transkrip Nilai').setInputFiles({
      name: 'transkrip.pdf',
      mimeType: 'application/pdf',
      buffer: DUMMY_PDF,
    });

    await page.getByRole('button', { name: 'Selanjutnya' }).click();
    await expect(page.getByRole('heading', { name: 'Review Pendaftaran' })).toBeVisible();

    await page.getByRole('button', { name: 'Submit Pendaftaran' }).click();

    await expect(page.getByText(/Bucket storage penuh atau tidak tersedia|gagal mengunggah dokumen/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Retry Upload yang Gagal' })).toBeVisible();
    await expect(page).toHaveURL(/\/mahasiswa\/daftar\/1/);
  });

  test('validasi file transkrip menolak format dan ukuran yang tidak valid', async ({ page }) => {
    await openForm(page);
    await goToDocuments(page);

    const transkrip = fileInputByLabel(page, 'Transkrip Nilai');

    await transkrip.setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: DUMMY_TEXT,
    });
    await expect(page.getByText('Tipe file tidak didukung. Gunakan PDF, JPG, JPEG, atau PNG.')).toBeVisible();

    await transkrip.setInputFiles({
      name: 'large.pdf',
      mimeType: 'application/pdf',
      buffer: DUMMY_LARGE,
    });
    await expect(page.getByText('File terlalu besar, maks 5MB')).toBeVisible();
  });
});
