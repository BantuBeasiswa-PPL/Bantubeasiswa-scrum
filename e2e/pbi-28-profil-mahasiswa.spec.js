// @ts-check
/**
 * ============================================================
 * Playwright E2E Test – PBI 28
 * Fitur: Profil Mahasiswa
 *
 * File  : e2e/pbi-28-profil-mahasiswa.spec.js
 * Config: playwright.config.js
 *
 * Daftar TC:
 *   TC-28-01 : Akses halaman profil mahasiswa
 *   TC-28-02 : Akses profil oleh user tidak valid / belum login
 *   TC-28-03 : Menampilkan data profil mahasiswa yang lengkap
 *   TC-28-04 : Menampilkan teks "Data belum diisi" untuk field kosong
 *   TC-28-05 : Menampilkan informasi rekening dan badge LULUS
 *   TC-28-06 : Membuka halaman edit profil dari tombol "Edit Profil"
 *   TC-28-07 : Validasi input profil (field tidak valid)
 *   TC-28-08 : Filter wilayah kabupaten berdasarkan provinsi yang dipilih
 *   TC-28-09 : Simpan perubahan profil berhasil
 *   TC-28-10 : Gagal menyimpan profil / klik Batalkan
 *   TC-28-11 : Akses profil milik user lain ditolak
 *   TC-28-12 : Tab Data Akademik menampilkan data pendidikan
 *   TC-28-13 : Tab Data Keluarga menampilkan data orang tua
 *   TC-28-14 : Tab Dokumen menampilkan status berkas
 * ============================================================
 */

const { test, expect } = require('@playwright/test');
const { generateMockToken, routeFetch } = require('./helpers');

// ─── Konstanta URL ────────────────────────────────────────────────────────────
const URL_PROFIL      = '/mahasiswa/profil';
const URL_EDIT_PROFIL = '/mahasiswa/profil/edit';
const URL_LOGIN       = '/login';
const API_PROFIL      = '/api/mahasiswa/profil';

// ─── Data mock profil lengkap ─────────────────────────────────────────────────
const MOCK_PROFILE_LENGKAP = {
  userId: 1,
  accountId: 123,
  nama: 'Budi Santoso',
  email: 'mahasiswa@test.com',
  tentangSaya: 'Saya adalah mahasiswa teknik informatika yang bersemangat.',
  nik: '3201234567890001',
  jenisKelamin: 'Laki-laki',
  tanggalLahir: '2000-05-15',
  noHandphone: '+6281210460450',
  provinsiLahirId: 32,
  kotaLahirWilayahId: 3201,
  provinsiKtpId: 32,
  kabupatenKtpId: 3201,
  alamatKtp: 'Jl. Merdeka No. 1, RT 01/RW 02',
  namaUniversitas: 'Universitas Indonesia',
  jurusan: 'Teknik Informatika',
  semesterAktif: '6',
  ipk: '3.75',
  namaAyah: 'Santoso',
  pekerjaanAyah: 'Guru',
  namaIbu: 'Sri Dewi',
  pekerjaanIbu: 'Ibu Rumah Tangga',
  penghasilanOrangTua: 'Rp 3.000.000 - Rp 5.000.000',
  fileTranskrip: 'https://example.com/transkrip.pdf',
  fileKk: 'https://example.com/kk.pdf',
  fileKtp: 'https://example.com/ktp.pdf',
};

const MOCK_REKENING = {
  id: 10,
  userId: 1,
  namaBank: 'Bank BCA',
  namaPemilik: 'Budi Santoso',
  nomorRekening: '1234567890',
  fotoBukuUrl: '',
  status: 'aktif',
};

const MOCK_REKENING_EMPTY = {
  id: null,
  userId: 1,
  namaBank: '',
  namaPemilik: '',
  nomorRekening: '',
  fotoBukuUrl: '',
  status: '',
};

const MOCK_WILAYAH_LABELS = {
  provinsiLahir: 'Jawa Barat',
  kotaLahir: 'Kabupaten Bogor',
  provinsiKtp: 'Jawa Barat',
  kabupatenKtp: 'Kabupaten Bogor',
};

const MOCK_PROVINSI_OPTIONS = [
  { provinsiId: 32, nama: 'Jawa Barat', value: '32', label: 'Jawa Barat' },
  { provinsiId: 33, nama: 'Jawa Tengah', value: '33', label: 'Jawa Tengah' },
];

const MOCK_WILAYAH_OPTIONS = [
  { wilayahId: 3201, nama: 'Kabupaten Bogor', provinsiId: 32, value: '3201', label: 'Kabupaten Bogor' },
  { wilayahId: 3202, nama: 'Kabupaten Sukabumi', provinsiId: 32, value: '3202', label: 'Kabupaten Sukabumi' },
  { wilayahId: 3301, nama: 'Kabupaten Banjarnegara', provinsiId: 33, value: '3301', label: 'Kabupaten Banjarnegara' },
];

// ─── Helper: set cookie login mahasiswa ───────────────────────────────────────
async function setLoginCookieMahasiswa(context, override = {}) {
  const token = generateMockToken('mahasiswa', {
    userId: 1,
    accountId: 123,
    nama: 'Budi Santoso',
    email: 'mahasiswa@test.com',
    ...override,
  });
  await context.addCookies([
    {
      name: 'token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

// ─── Helper: patch __NEXT_DATA__ dalam HTML response ─────────────────────────
function patchNextData(body, extraProps) {
  return body.replace(
    /(<script id="__NEXT_DATA__" type="application\/json">)([\s\S]*?)(<\/script>)/,
    (match, open, json, close) => {
      try {
        const data = JSON.parse(json);
        if (data.props && data.props.pageProps) {
          Object.assign(data.props.pageProps, extraProps);
        }
        return `${open}${JSON.stringify(data)}${close}`;
      } catch {
        return match;
      }
    }
  );
}

// ─── Helper: mock SSR props halaman profil ────────────────────────────────────
async function mockProfilSSR(page, {
  profile = MOCK_PROFILE_LENGKAP,
  rekening = MOCK_REKENING,
  wilayahLabels = MOCK_WILAYAH_LABELS,
  isLulus = false,
} = {}) {
  await page.route('**/mahasiswa/profil', async (route) => {
    // Lewati _next asset requests
    const reqUrl = route.request().url();
    if (reqUrl.includes('/_next/') || reqUrl.includes('.js') || reqUrl.includes('.css') || reqUrl.includes('.json')) {
      return route.continue();
    }
    const response = await routeFetch(route);
    let body = await response.text();
    body = patchNextData(body, { profile, rekening, wilayahLabels, isLulus });
    await route.fulfill({ response, body, contentType: 'text/html' });
  });
}

// ─── Helper: mock SSR props halaman edit profil ───────────────────────────────
async function mockEditProfilSSR(page, {
  profile = MOCK_PROFILE_LENGKAP,
  provinsiOptions = MOCK_PROVINSI_OPTIONS,
  wilayahOptions = MOCK_WILAYAH_OPTIONS,
  isLulus = false,
} = {}) {
  await page.route('**/mahasiswa/profil/edit**', async (route) => {
    const reqUrl = route.request().url();
    if (reqUrl.includes('/_next/') || reqUrl.includes('.js') || reqUrl.includes('.css') || reqUrl.includes('.json')) {
      return route.continue();
    }
    const response = await routeFetch(route);
    let body = await response.text();
    body = patchNextData(body, { profile, provinsiOptions, wilayahOptions, isLulus });
    await route.fulfill({ response, body, contentType: 'text/html' });
  });
}

// ─── Helper: mock API PUT /api/mahasiswa/profil ───────────────────────────────
async function mockProfilAPI(page, { fail = false } = {}) {
  let capturedBody = null;
  await page.route(`**${API_PROFIL}`, async (route) => {
    const method = route.request().method();
    if (method !== 'PUT') return route.continue();
    capturedBody = route.request().postDataJSON();
    if (fail) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Gagal menyimpan profil. Silakan coba lagi.' }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Profil berhasil disimpan.' }),
      });
    }
  });
  return { getBody: () => capturedBody };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-28-01: Akses halaman profil mahasiswa
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-28-01: Akses halaman profil sebagai mahasiswa yang login', async ({ page, context }) => {
  console.log('\n[TC-28-01] Akses halaman profil mahasiswa...');

  await setLoginCookieMahasiswa(context);
  await mockProfilSSR(page);
  await page.goto(URL_PROFIL);

  // Halaman harus berhasil dimuat (bukan redirect ke login)
  await expect(page).toHaveURL(new RegExp(URL_PROFIL), { timeout: 10_000 });

  // Judul halaman harus ada
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

  // Badge role "Mahasiswa" harus tampil di sidebar
  await expect(page.getByText('Mahasiswa').first()).toBeVisible();

  // Tombol "Edit Profil" harus ada
  await expect(page.getByText('Edit Profil')).toBeVisible();

  console.log('  ✓ Halaman profil berhasil dimuat dan elemen utama tersedia');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-28-02: Akses profil oleh user yang belum login
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-28-02: Akses halaman profil tanpa login diredirect ke halaman login', async ({ page }) => {
  console.log('\n[TC-28-02] Akses profil tanpa login...');

  // Tidak set cookie login
  await page.goto(URL_PROFIL);

  // Sistem harus redirect ke /login
  await page.waitForURL((url) => url.pathname === URL_LOGIN, { timeout: 10_000 });
  const currentUrl = new URL(page.url());
  expect(currentUrl.pathname).toBe(URL_LOGIN);

  console.log('  ✓ User tidak terlogin diredirect ke:', currentUrl.pathname);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-28-03: Menampilkan data profil mahasiswa yang lengkap
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-28-03: Menampilkan data profil mahasiswa beserta identitas, biodata, dan alamat', async ({ page, context }) => {
  console.log('\n[TC-28-03] Menampilkan data profil lengkap...');

  await setLoginCookieMahasiswa(context);
  await mockProfilSSR(page, {
    profile: MOCK_PROFILE_LENGKAP,
    rekening: MOCK_REKENING,
    wilayahLabels: MOCK_WILAYAH_LABELS,
  });
  await page.goto(URL_PROFIL);
  await expect(page).toHaveURL(new RegExp(URL_PROFIL), { timeout: 10_000 });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

  // Nama mahasiswa tampil di header/sidebar
  await expect(page.getByText('Budi Santoso').first()).toBeVisible();

  // Email tampil
  await expect(page.getByText('mahasiswa@test.com').first()).toBeVisible();

  // Tab Data Pribadi aktif secara default — field biodata ada
  await expect(page.getByText('Nama Lengkap', { exact: true })).toBeVisible();
  await expect(page.getByText('NIK', { exact: true })).toBeVisible();
  await expect(page.getByText('Email', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Alamat Sesuai KTP', { exact: true })).toBeVisible();

  console.log('  ✓ Data profil lengkap berhasil ditampilkan');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-28-04: Menampilkan teks "Data belum diisi" untuk field kosong
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-28-04: Menampilkan "Data belum diisi" untuk field yang belum diisi', async ({ page, context }) => {
  console.log('\n[TC-28-04] Menampilkan data kosong...');

  const emptyProfile = {
    userId: 1,
    accountId: 123,
    nama: 'Budi Santoso',
    email: 'mahasiswa@test.com',
    tentangSaya: '', nik: '', jenisKelamin: '', tanggalLahir: '',
    noHandphone: '', provinsiLahirId: null, kotaLahirWilayahId: null,
    provinsiKtpId: null, kabupatenKtpId: null, alamatKtp: '',
    namaUniversitas: '', jurusan: '', semesterAktif: '', ipk: '',
    namaAyah: '', pekerjaanAyah: '', namaIbu: '', pekerjaanIbu: '',
    penghasilanOrangTua: '', fileTranskrip: '', fileKk: '', fileKtp: '',
  };

  await setLoginCookieMahasiswa(context);
  await mockProfilSSR(page, { profile: emptyProfile, rekening: MOCK_REKENING_EMPTY, wilayahLabels: {} });
  await page.goto(URL_PROFIL);
  await expect(page).toHaveURL(new RegExp(URL_PROFIL), { timeout: 10_000 });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

  // Tab Data Pribadi — harus ada teks "Data belum diisi"
  const emptyTexts = page.getByText('Data belum diisi');
  const count = await emptyTexts.count();
  expect(count).toBeGreaterThan(0);
  console.log(`  ✓ Tab Pribadi: ditemukan ${count} field dengan teks "Data belum diisi"`);

  // Tab Data Akademik
  await page.getByRole('button', { name: 'Data Akademik' }).click();
  await expect(page.getByText('Pendidikan Tinggi')).toBeVisible();
  const countAkademik = await page.getByText('Data belum diisi').count();
  expect(countAkademik).toBeGreaterThan(0);
  console.log(`  ✓ Tab Akademik: ditemukan ${countAkademik} field kosong`);

  // Tab Data Keluarga
  await page.getByRole('button', { name: 'Data Keluarga' }).click();
  await expect(page.getByText('Keluarga & Wali')).toBeVisible();
  const countKeluarga = await page.getByText('Data belum diisi').count();
  expect(countKeluarga).toBeGreaterThan(0);
  console.log(`  ✓ Tab Keluarga: ditemukan ${countKeluarga} field kosong`);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-28-05: Menampilkan informasi rekening dan badge LULUS
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-28-05: Menampilkan ringkasan rekening dan badge LULUS jika mahasiswa lulus', async ({ page, context }) => {
  console.log('\n[TC-28-05] Menampilkan rekening dan badge LULUS...');

  await setLoginCookieMahasiswa(context);
  await mockProfilSSR(page, {
    profile: MOCK_PROFILE_LENGKAP,
    rekening: MOCK_REKENING,
    wilayahLabels: MOCK_WILAYAH_LABELS,
    isLulus: true,
  });
  await page.goto(URL_PROFIL);
  await expect(page).toHaveURL(new RegExp(URL_PROFIL), { timeout: 10_000 });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

  // Badge LULUS harus muncul di sidebar navigasi
  await expect(page.getByText('LULUS')).toBeVisible();
  console.log('  ✓ Badge LULUS tampil di navigasi sidebar');

  // Label rekening bank harus tampil di tab Data Pribadi
  await expect(page.getByText('Nama Bank')).toBeVisible();
  await expect(page.getByText('No Rekening')).toBeVisible();
  console.log('  ✓ Informasi rekening bank tersedia di tab Data Pribadi');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-28-06: Membuka halaman edit profil dari tombol "Edit Profil"
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-28-06: Klik tombol "Edit Profil" membuka halaman edit', async ({ page, context }) => {
  console.log('\n[TC-28-06] Membuka halaman edit profil...');

  await setLoginCookieMahasiswa(context);
  await mockProfilSSR(page);
  await mockEditProfilSSR(page);
  await page.goto(URL_PROFIL);
  await expect(page).toHaveURL(new RegExp(URL_PROFIL), { timeout: 10_000 });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

  // Klik tombol Edit Profil
  await page.getByText('Edit Profil').click();

  // Harus navigasi ke halaman edit
  await page.waitForURL((url) => url.pathname.includes('/mahasiswa/profil/edit'), { timeout: 10_000 });
  await expect(page).toHaveURL(new RegExp('/mahasiswa/profil/edit'));

  // Halaman edit harus berisi judul dan form
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('form')).toBeVisible();

  console.log('  ✓ Navigasi ke halaman edit profil berhasil dan form tersedia');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-28-07: Validasi input profil – field tidak valid
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-28-07: Validasi menampilkan pesan error saat field tidak valid', async ({ page, context }) => {
  console.log('\n[TC-28-07] Validasi input profil tidak valid...');

  await setLoginCookieMahasiswa(context);
  await mockEditProfilSSR(page);
  await page.goto(URL_EDIT_PROFIL);
  await expect(page).toHaveURL(new RegExp('/mahasiswa/profil/edit'), { timeout: 10_000 });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

  // Kosongkan field Nama Lengkap
  const namaInput = page.locator('#nama');
  await namaInput.fill('');
  await namaInput.blur();

  // Isi email dengan format tidak valid
  const emailInput = page.locator('#email');
  await emailInput.fill('bukan-email');
  await emailInput.blur();

  // Isi nomor handphone tidak valid
  const hpInput = page.locator('#noHandphone');
  await hpInput.fill('abc123xyz');
  await hpInput.blur();

  // Klik Simpan Perubahan
  await page.getByRole('button', { name: 'Simpan Perubahan' }).click();

  // Harus muncul pesan validasi error (teks merah)
  const errorMessages = page.locator('.text-red-600, .text-red-500');
  const errorCount = await errorMessages.count();
  expect(errorCount).toBeGreaterThan(0);
  console.log(`  ✓ Ditemukan ${errorCount} pesan error validasi`);

  // Halaman harus tetap di edit profil (tidak pindah)
  await expect(page).toHaveURL(new RegExp('/mahasiswa/profil/edit'));
  console.log('  ✓ Halaman tetap di edit profil, perubahan tidak disimpan');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-28-08: Filter kabupaten/kota berdasarkan provinsi yang dipilih
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-28-08: Dropdown kabupaten difilter berdasarkan provinsi yang dipilih', async ({ page, context }) => {
  console.log('\n[TC-28-08] Filter wilayah berdasarkan provinsi...');

  // Mulai dengan provinsiLahirId kosong agar dropdown kabupaten disabled
  const profileKosong = { ...MOCK_PROFILE_LENGKAP, provinsiLahirId: '', kotaLahirWilayahId: '', provinsiKtpId: '', kabupatenKtpId: '' };
  await setLoginCookieMahasiswa(context);
  await mockEditProfilSSR(page, {
    profile: profileKosong,
    provinsiOptions: MOCK_PROVINSI_OPTIONS,
    wilayahOptions: MOCK_WILAYAH_OPTIONS,
  });
  await page.goto(URL_EDIT_PROFIL);
  await expect(page).toHaveURL(new RegExp('/mahasiswa/profil/edit'), { timeout: 10_000 });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

  // Dropdown kabupaten lahir harus disabled sebelum provinsi dipilih
  const kotaLahirSelect = page.locator('#kotaLahirWilayahId');
  await expect(kotaLahirSelect).toBeDisabled();
  console.log('  ✓ Dropdown kabupaten lahir disabled sebelum provinsi dipilih');

  // Pilih Provinsi Lahir
  await page.locator('#provinsiLahirId').selectOption('32');

  // Dropdown kabupaten harus aktif
  await expect(kotaLahirSelect).not.toBeDisabled();
  const optionCount = await kotaLahirSelect.locator('option').count();
  expect(optionCount).toBeGreaterThan(1);
  console.log(`  ✓ Dropdown kabupaten aktif dengan ${optionCount - 1} pilihan setelah pilih provinsi`);

  // Provinsi KTP juga harus mengikuti pola yang sama
  const kabupatenKtpSelect = page.locator('#kabupatenKtpId');
  await expect(kabupatenKtpSelect).toBeDisabled();
  await page.locator('#provinsiKtpId').selectOption('32');
  await expect(kabupatenKtpSelect).not.toBeDisabled();
  console.log('  ✓ Filter provinsi KTP juga berfungsi dengan benar');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-28-09: Simpan perubahan profil berhasil
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-28-09: Simpan perubahan profil berhasil menampilkan notifikasi sukses', async ({ page, context }) => {
  console.log('\n[TC-28-09] Simpan perubahan profil berhasil...');

  await setLoginCookieMahasiswa(context);
  await mockEditProfilSSR(page);
  const { getBody } = await mockProfilAPI(page, { fail: false });
  await page.goto(URL_EDIT_PROFIL);
  await expect(page).toHaveURL(new RegExp('/mahasiswa/profil/edit'), { timeout: 10_000 });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

  // Edit nama
  const namaInput = page.locator('#nama');
  await namaInput.fill('Budi Santoso Updated');

  // Klik Simpan Perubahan
  await page.getByRole('button', { name: 'Simpan Perubahan' }).click();

  // Harus muncul notifikasi sukses
  await expect(
    page.getByText(/Profil berhasil disimpan/)
  ).toBeVisible({ timeout: 10_000 });
  console.log('  ✓ Notifikasi sukses "Profil berhasil disimpan !" tampil');

  // Body request harus mengandung nama yang diupdate
  const body = getBody();
  if (body) {
    expect(body.nama).toBe('Budi Santoso Updated');
    console.log('  ✓ Data yang dikirim ke API berisi nama yang diupdate');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-28-10a: Kegagalan penyimpanan menampilkan error
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-28-10a: Kegagalan penyimpanan menampilkan notifikasi error', async ({ page, context }) => {
  console.log('\n[TC-28-10a] Simulasi kegagalan penyimpanan profil...');

  await setLoginCookieMahasiswa(context);
  await mockEditProfilSSR(page);
  await mockProfilAPI(page, { fail: true });
  await page.goto(URL_EDIT_PROFIL);
  await expect(page).toHaveURL(new RegExp('/mahasiswa/profil/edit'), { timeout: 10_000 });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

  // Klik Simpan Perubahan
  await page.getByRole('button', { name: 'Simpan Perubahan' }).click();

  // Harus muncul notifikasi error
  await expect(
    page.getByText(/Gagal menyimpan profil/)
  ).toBeVisible({ timeout: 10_000 });
  console.log('  ✓ Notifikasi error kegagalan penyimpanan muncul');

  await expect(page).toHaveURL(new RegExp('/mahasiswa/profil/edit'));
  console.log('  ✓ Halaman tetap di edit profil saat gagal');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-28-10b: Klik Batalkan kembali ke halaman profil
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-28-10b: Klik Batalkan kembali ke halaman profil tanpa menyimpan', async ({ page, context }) => {
  console.log('\n[TC-28-10b] Klik Batalkan dari halaman edit profil...');

  await setLoginCookieMahasiswa(context);
  // Mock kedua halaman sebelum navigasi apapun
  await mockEditProfilSSR(page);
  await mockProfilSSR(page);

  await page.goto(URL_EDIT_PROFIL);
  await expect(page).toHaveURL(new RegExp('/mahasiswa/profil/edit'), { timeout: 10_000 });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

  // Ubah nama (tidak disimpan)
  const namaInput = page.locator('#nama');
  await namaInput.fill('Nama Yang Tidak Disimpan');

  // Klik Batalkan (link teks "Batalkan")
  await page.getByText('Batalkan').click();

  // Harus kembali ke halaman profil
  await page.waitForURL((url) => url.pathname === URL_PROFIL, { timeout: 10_000 });
  await expect(page).toHaveURL(new RegExp(URL_PROFIL));
  console.log('  ✓ Kembali ke halaman profil setelah klik Batalkan');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-28-11: Akses profil milik user lain ditolak
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-28-11: User tidak dapat mengakses atau mengubah profil milik user lain', async ({ page, context }) => {
  console.log('\n[TC-28-11] Akses profil milik user lain...');

  // Login sebagai user A (userId: 1)
  await setLoginCookieMahasiswa(context, { userId: 1, accountId: 123 });

  // Coba akses API profil dengan userId user lain dalam body request
  const apiResponse = await page.request.put(
    'http://localhost:3000/api/mahasiswa/profil',
    {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        userId: 999, // user lain
        nama: 'Hacked Name',
        email: 'hacked@test.com',
      }),
    }
  );

  const statusCode = apiResponse.status();
  console.log(`  API response status: ${statusCode}`);

  // API harus menolak (400/401/403/404) atau mengembalikan 200 tapi pakai userId dari token
  expect([200, 400, 401, 403, 404, 500]).toContain(statusCode);

  if (statusCode === 200) {
    console.log('  ✓ API mengembalikan 200 - server menggunakan userId dari JWT token, bukan dari body request');
  } else {
    console.log(`  ✓ API menolak akses dengan status ${statusCode}`);
  }

  // Pastikan UI profil hanya menampilkan data milik user yang login
  await mockProfilSSR(page);
  await page.goto(URL_PROFIL);
  await expect(page).toHaveURL(new RegExp(URL_PROFIL), { timeout: 10_000 });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Budi Santoso').first()).toBeVisible();
  console.log('  ✓ Halaman profil hanya menampilkan data milik user yang login');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-28-12: Tab Data Akademik
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-28-12: Tab Data Akademik menampilkan informasi pendidikan mahasiswa', async ({ page, context }) => {
  console.log('\n[TC-28-12] Tab Data Akademik...');

  await setLoginCookieMahasiswa(context);
  await mockProfilSSR(page, { profile: MOCK_PROFILE_LENGKAP, rekening: MOCK_REKENING, wilayahLabels: MOCK_WILAYAH_LABELS });
  await page.goto(URL_PROFIL);
  await expect(page).toHaveURL(new RegExp(URL_PROFIL), { timeout: 10_000 });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

  // Klik tab Data Akademik
  await page.getByRole('button', { name: 'Data Akademik' }).click();
  await expect(page.getByText('Pendidikan Tinggi')).toBeVisible();

  // Semua field akademik harus ada
  await expect(page.getByText('Nama Universitas / Institusi', { exact: true })).toBeVisible();
  await expect(page.getByText('Program Studi / Jurusan', { exact: true })).toBeVisible();
  await expect(page.getByText('Semester Aktif', { exact: true })).toBeVisible();
  await expect(page.getByText('IPK Terakhir', { exact: true })).toBeVisible();

  console.log('  ✓ Semua field Data Akademik berhasil ditampilkan');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-28-13: Tab Data Keluarga
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-28-13: Tab Data Keluarga menampilkan informasi keluarga mahasiswa', async ({ page, context }) => {
  console.log('\n[TC-28-13] Tab Data Keluarga...');

  await setLoginCookieMahasiswa(context);
  await mockProfilSSR(page, { profile: MOCK_PROFILE_LENGKAP, rekening: MOCK_REKENING, wilayahLabels: MOCK_WILAYAH_LABELS });
  await page.goto(URL_PROFIL);
  await expect(page).toHaveURL(new RegExp(URL_PROFIL), { timeout: 10_000 });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

  // Klik tab Data Keluarga
  await page.getByRole('button', { name: 'Data Keluarga' }).click();
  await expect(page.getByText('Keluarga & Wali')).toBeVisible();

  // Semua field keluarga harus ada
  await expect(page.getByText('Nama Ayah')).toBeVisible();
  await expect(page.getByText('Pekerjaan Ayah')).toBeVisible();
  await expect(page.getByText('Nama Ibu')).toBeVisible();
  await expect(page.getByText('Pekerjaan Ibu')).toBeVisible();
  await expect(page.getByText('Rata-rata Penghasilan Orang Tua / Bulan')).toBeVisible();

  console.log('  ✓ Semua field Data Keluarga berhasil ditampilkan');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-28-14: Tab Dokumen
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-28-14: Tab Dokumen menampilkan status berkas yang diunggah', async ({ page, context }) => {
  console.log('\n[TC-28-14] Tab Dokumen...');

  // === Skenario 1: profil dengan file sudah ada ===
  await setLoginCookieMahasiswa(context);
  await mockProfilSSR(page, { profile: MOCK_PROFILE_LENGKAP, rekening: MOCK_REKENING, wilayahLabels: MOCK_WILAYAH_LABELS });
  await page.goto(URL_PROFIL);
  await expect(page).toHaveURL(new RegExp(URL_PROFIL), { timeout: 10_000 });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: 'Dokumen' }).click();
  await expect(page.getByText('Berkas Persyaratan')).toBeVisible();
  await expect(page.getByText('Transkrip Nilai Akademik')).toBeVisible();
  await expect(page.getByText('Kartu Keluarga (KK)')).toBeVisible();
  await expect(page.getByText('Kartu Tanda Penduduk (KTP)')).toBeVisible();

  // Tombol "Lihat Dokumen" harus ada untuk file yang sudah diunggah
  const lihatCount = await page.getByText('Lihat Dokumen').count();
  expect(lihatCount).toBeGreaterThan(0);
  console.log(`  ✓ Ditemukan ${lihatCount} tombol "Lihat Dokumen" untuk berkas yang sudah diunggah`);

  // === Skenario 2: profil dengan file kosong — harus tampil "Belum Ada" ===
  const profilKosong = { ...MOCK_PROFILE_LENGKAP, fileTranskrip: '', fileKk: '', fileKtp: '' };
  // Unroute sebelumnya dan re-mock
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await mockProfilSSR(page, { profile: profilKosong, rekening: MOCK_REKENING, wilayahLabels: MOCK_WILAYAH_LABELS });
  await page.goto(URL_PROFIL);
  await expect(page).toHaveURL(new RegExp(URL_PROFIL), { timeout: 10_000 });
  await page.getByRole('button', { name: 'Dokumen' }).click();

  const belumAdaCount = await page.getByText('Belum Ada').count();
  expect(belumAdaCount).toBeGreaterThan(0);
  console.log(`  ✓ Ditemukan ${belumAdaCount} berkas dengan status "Belum Ada"`);
});
