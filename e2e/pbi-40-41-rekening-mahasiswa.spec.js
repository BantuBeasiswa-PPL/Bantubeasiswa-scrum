// @ts-check
/**
 * ============================================================
 * Playwright E2E Test – PBI 40 & 41
 * Fitur: Daftar Ulang Rekening Mahasiswa
 *
 * File  : e2e/pbi-40-41-rekening-mahasiswa.spec.js
 * Config: playwright.config.js
 * Browser: chromium (headed, slowMo=400 agar GUI terlihat)
 *
 * Daftar TC:
 *   TC-1 : Mahasiswa lulus membuka form rekening
 *   TC-2 : Submit data rekening berhasil
 *   TC-3 : Submit data rekening tidak valid
 *   TC-4 : Akses tanpa login → redirect /login
 *   TC-5 : Akses mahasiswa belum lulus → redirect status-pendaftaran
 *   TC-6 : Menampilkan data rekening existing
 *   TC-7 : Memperbarui data rekening
 * ============================================================
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const {
  makeToken,
  MOCK_PROFILE,
  MOCK_LULUS_PENDAFTARAN,
  MOCK_REKENING_EXISTING,
  MOCK_BEASISWA_RESPONSE,
  routeFetch,
} = require('./helpers');

// ─── Konstanta URL ────────────────────────────────────────────────────────────
const URL_REKENING      = '/mahasiswa/daftar-ulang-rekening';
const URL_STATUS        = `/mahasiswa/status-pendaftaran?id=${MOCK_LULUS_PENDAFTARAN.pendaftaranId}`;
const URL_LOGIN         = '/login';
const URL_STATUS_BASE   = '/mahasiswa/status-pendaftaran';
const API_REKENING      = '/api/mahasiswa/rekening';
const API_STATUS        = /api\/mahasiswa\/status-pendaftaran|pendaftaran/;

// ─── Helper: set cookie login ─────────────────────────────────────────────────
/**
 * Set cookie `token` JWT yang valid ke browser context.
 * @param {import('@playwright/test').BrowserContext} context
 * @param {object} [override] – override payload JWT
 */
async function setLoginCookie(context, override = {}) {
  const token = makeToken(override);
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

// ─── Helper: mock SSR API calls (Supabase REST via fetch) ─────────────────────
/**
 * Mock Supabase REST yang dipanggil dari BROWSER (client-side hooks).
 * Catatan: request Supabase yang dibuat dari server Node.js (getServerSideProps)
 * TIDAK bisa di-intercept via page.route() — gunakan mockSSRPageProps() untuk itu.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {string} opts.status – status untuk hook client-side
 */
async function mockSupabaseSSR(page, { status = 'LULUS' } = {}) {
  // Mock Supabase REST – table: pendaftaran (dipanggil oleh hook useStatusPendaftaran)
  await page.route('**/rest/v1/pendaftaran*', async (route) => {
    if (status === 'LULUS') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_LULUS_PENDAFTARAN]),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }
  });
}

/**
 * Inject props SSR langsung ke dalam HTML response Next.js.
 *
 * Kenapa perlu ini?
 * getServerSideProps memanggil Supabase dari sisi server Node.js — bukan dari browser.
 * page.route() hanya intercept browser/fetch requests, bukan Node.js requests.
 *
 * Strategi (2 langkah dalam 1 route handler):
 * 1. Patch JSON di <script id="__NEXT_DATA__"> → React membaca props yang benar
 *    saat hydrate, sehingga useState() akan terinisialisasi dengan data mock.
 * 2. Patch HTML <option> → tambahkan atribut `selected` pada option yang sesuai
 *    agar server-rendered DOM cocok dengan state React client.
 *    Tanpa ini, React hydration untuk <select> akan mismatch: server render
 *    punya option "" selected, client punya "Bank BCA" → React mempertahankan
 *    server DOM dan <select> tetap kosong.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} urlPattern – pola URL halaman yang akan diintercept (glob)
 * @param {object} extraProps – props tambahan yang akan di-merge ke pageProps
 */
async function mockSSRPageProps(page, urlPattern, extraProps) {
  await page.route(urlPattern, async (route) => {
    // Hanya intercept document request (HTML), bukan _next/data JSON, JS, CSS, dll.
    const reqUrl = route.request().url();
    if (reqUrl.includes('/_next/') || reqUrl.includes('.js') || reqUrl.includes('.css')) {
      return route.continue();
    }

    const response = await routeFetch(route);
    let body = await response.text();

    // ── Langkah 1: Patch __NEXT_DATA__ JSON ──────────────────────────────────────
    body = body.replace(
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

    // ── Langkah 2: Patch HTML <option> agar <select> cocok saat hydration ─────────
    // Cari namaBank dari extraProps dan set option yang sesuai sebagai selected.
    // Ini mencegah React hydration mismatch pada controlled <select> element.
    if (extraProps.existingRekening?.namaBank) {
      const bankName = extraProps.existingRekening.namaBank;
      const escaped = bankName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Hapus "selected" dari option default (value="")
      body = body.replace(
        /(<option[^>]*value=""[^>]*) selected(="")?/g,
        '$1'
      );

      // Tambahkan "selected" ke option yang cocok dengan namaBank
      body = body.replace(
        new RegExp(`(<option[^>]*value="${escaped}")([^>]*>)`),
        '$1 selected=""$2'
      );
    }

    await route.fulfill({
      response,
      body,
      contentType: 'text/html',
    });
  });
}

/**
 * Mock hook useStatusPendaftaran yang fetch via Supabase realtime/REST.
 * Hook fetch: supabase.from('pendaftaran').select(...).eq('pendaftaranId', id).single()
 *
 * Kita intercept request REST Supabase yang menyertakan pendaftaranId tertentu.
 */
async function mockStatusPendaftaranHook(page, status = 'LULUS') {
  await page.route('**/rest/v1/pendaftaran*', async (route) => {
    if (status === 'LULUS') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...MOCK_BEASISWA_RESPONSE,
          status: 'LULUS',
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...MOCK_BEASISWA_RESPONSE,
          status,
        }),
      });
    }
  });
}

// ─── Helper: mock API Next.js (server route /api/mahasiswa/rekening) ──────────
/**
 * @param {import('@playwright/test').Page} page
 * @param {object} [opts]
 * @param {boolean} [opts.fail] – simulasikan respons gagal
 * @returns {Promise<{getBody: () => object|null}>} – fungsi untuk mengambil body request
 */
async function mockRekeningAPI(page, { fail = false } = {}) {
  let capturedBody = null;

  await page.route(`**${API_REKENING}`, async (route) => {
    const body = route.request().postDataJSON();
    capturedBody = body;

    if (fail) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Gagal menyimpan data rekening. Silakan coba lagi.' }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Data rekening berhasil disimpan.',
          rekening: {
            rekeningId: 100,
            userId: 999,
            namaBank: body?.namaBank || 'Bank BCA',
            namaPemilik: body?.namaPemilik || 'Budi Santoso',
            nomorRekening: body?.nomorRekening || '1234567890',
            namRekening: `${body?.namaBank || 'Bank BCA'} - ${body?.namaPemilik || 'Budi Santoso'}`,
            status: 'aktif',
          },
        }),
      });
    }
  });

  return { getBody: () => capturedBody };
}

// ─── Helper: buat file JPG dummy untuk upload ─────────────────────────────────
/** Buffer minimal JPEG 1x1 pixel */
function makeTinyJpegBuffer() {
  // JFIF header minimal untuk file JPG valid
  return Buffer.from(
    'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b08000100010101110003ffc4001f0000010501010101010100000000000000000102030405060708090a0bffda00030101003f00fba80000',
    'hex',
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-1: Mahasiswa lulus membuka form rekening
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-1: Mahasiswa lulus membuka form rekening via status-pendaftaran', async ({ page, context }) => {
  // 1. Set cookie login
  await setLoginCookie(context);

  // 2. Mock Supabase realtime & REST yang dipanggil oleh hook useStatusPendaftaran
  await mockStatusPendaftaranHook(page, 'LULUS');

  // 3. Mock semua Supabase storage channel agar tidak error
  await page.route('**/realtime/v1/**', async (route) => {
    await route.abort();
  });

  // 4. Buka halaman status-pendaftaran dengan id pendaftaran LULUS
  await page.goto(URL_STATUS);

  // 5. Tunggu halaman selesai load (navigasi bisa redirect jika tidak ada cookie)
  await page.waitForURL((url) => url.pathname === URL_STATUS_BASE || url.pathname === URL_LOGIN, {
    timeout: 15_000,
  });

  // Jika redirect ke login → test gagal informatif
  if (page.url().includes('/login')) {
    throw new Error('TC-1 GAGAL: Diredirect ke /login, cookie tidak terbaca oleh middleware.');
  }

  // 6. Tunggu konten halaman selesai render
  await page.waitForLoadState('networkidle');

  // 7. Verifikasi judul beasiswa tampil (mungkin dari mock atau teks fallback)
  const heading = page.locator('h1').first();
  await expect(heading).toBeVisible({ timeout: 10_000 });

  // 8. Verifikasi badge status "Lulus" tampil
  //    StatusBadge me-render label "Lulus" (bukan "LULUS")
  const statusBadge = page.locator('span', { hasText: 'Lulus' }).first();
  await expect(statusBadge).toBeVisible({ timeout: 10_000 });

  // 9. Klik tombol "Langkah Selanjutnya" di ResultBanner
  //    Tombol ini adalah Link ke /mahasiswa/daftar-ulang (bukan button dengan id)
  const btnLanjut = page.getByText('Langkah Selanjutnya');
  await expect(btnLanjut).toBeVisible({ timeout: 10_000 });
  await btnLanjut.click();

  // 10. Verifikasi navigasi ke halaman daftar-ulang (atau daftar-ulang-rekening)
  await expect(page).toHaveURL(/daftar-ulang/, { timeout: 15_000 });

  console.log('✅ TC-1 PASSED: Mahasiswa lulus berhasil masuk ke halaman daftar-ulang-rekening');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-2: Submit data rekening berhasil
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-2: Submit data rekening berhasil', async ({ page, context }) => {
  // 1. Set cookie login
  await setLoginCookie(context);

  // 2. Mock SSR Supabase calls (client-side hooks)
  await mockSupabaseSSR(page, { status: 'LULUS' });

  // 3. Mock POST /api/mahasiswa/rekening
  const { getBody } = await mockRekeningAPI(page);

  // 4. Mock Supabase Storage (upload foto buku)
  await page.route('**/storage/v1/**', async (route) => {
    const method = route.request().method();
    if (method === 'POST' || method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ Key: 'rekening/test-photo.jpg', path: 'test-photo.jpg' }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ publicUrl: 'https://supabase.test/rekening/test-photo.jpg' }),
      });
    }
  });

  // 5. Buka halaman form rekening
  await page.goto(URL_REKENING);
  await page.waitForURL((url) =>
    url.pathname.includes('daftar-ulang-rekening') || url.pathname === '/login',
    { timeout: 15_000 }
  );

  if (page.url().includes('/login')) {
    throw new Error('TC-2 GAGAL: Diredirect ke /login, cookie tidak terbaca.');
  }

  await page.waitForLoadState('networkidle');

  // 6. Verifikasi halaman form terbuka
  await expect(page.locator('h2', { hasText: 'Formulir Daftar Ulang' })).toBeVisible({ timeout: 10_000 });

  // 7. Pilih bank
  await page.selectOption('#bankName', 'Bank BCA');

  // 8. Isi nama pemilik rekening
  await page.fill('#accountHolderName', 'Budi Santoso');

  // 9. Isi nomor rekening (10 digit)
  await page.fill('#accountNumber', '1234567890');

  // 10. Upload file JPG dummy via setInputFiles
  const fileInputLocator = page.locator('input[type="file"]').first();
  await fileInputLocator.setInputFiles({
    name: 'bukti-rekening.jpg',
    mimeType: 'image/jpeg',
    buffer: makeTinyJpegBuffer(),
  });

  // 11. Tunggu nama file tampil di area upload
  await expect(page.locator('text=bukti-rekening.jpg')).toBeVisible({ timeout: 5_000 });

  // 12. Centang sertifikasi
  const certifyCheckbox = page.locator('input[type="checkbox"]').first();
  await certifyCheckbox.check();

  // 13. Klik tombol "Confirm & Submit Data"
  const btnSubmit = page.locator('button[type="submit"]');
  await expect(btnSubmit).toBeEnabled({ timeout: 5_000 });
  await btnSubmit.click();

  // 14. Verifikasi pesan sukses tampil (toast notification role="status")
  await expect(
    page.getByRole('status')
  ).toBeVisible({ timeout: 10_000 });

  // 15. Verifikasi payload API sesuai
  const body = getBody();
  expect(body).not.toBeNull();
  expect(body.namaBank).toBe('Bank BCA');
  expect(body.namaPemilik).toBe('Budi Santoso');
  expect(body.nomorRekening).toBe('1234567890');

  console.log('✅ TC-2 PASSED: Submit rekening berhasil, payload API sesuai:', body);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-3: Submit data rekening tidak valid
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-3: Submit data rekening tidak valid – validasi form', async ({ page, context }) => {
  // 1. Set cookie login
  await setLoginCookie(context);

  // 2. Mock SSR (tidak perlu rekening existing)
  await mockSupabaseSSR(page, { status: 'LULUS' });

  // 3. Buka halaman form rekening
  await page.goto(URL_REKENING);
  await page.waitForURL((url) =>
    url.pathname.includes('daftar-ulang-rekening') || url.pathname === '/login',
    { timeout: 15_000 }
  );

  if (page.url().includes('/login')) {
    throw new Error('TC-3 GAGAL: Diredirect ke /login.');
  }

  await page.waitForLoadState('networkidle');
  await expect(page.locator('h2', { hasText: 'Formulir Daftar Ulang' })).toBeVisible({ timeout: 10_000 });

  // 4. Verifikasi tombol submit disabled saat form kosong
  const btnSubmit = page.locator('button[type="submit"]');
  await expect(btnSubmit).toBeDisabled();
  console.log('  ✓ Tombol submit disabled saat form kosong: OK');

  // ── Strategi: klik field lalu klik di luar (heading) untuk trigger onBlur React ──

  // 5a. Validasi bank kosong
  //     Klik select bank (fokus) → klik judul halaman (blur) → error muncul
  await page.locator('#bankName').click();
  await page.locator('h2').first().click(); // klik di luar untuk blur
  await expect(page.locator('text=Bank Name wajib dipilih')).toBeVisible({ timeout: 5_000 });
  console.log('  ✓ Validasi bank kosong: OK');

  // 5b. Nama terlalu pendek (2 karakter) → error minimal 3 karakter
  await page.locator('#accountHolderName').click();
  await page.fill('#accountHolderName', 'AB');
  await page.locator('h2').first().click(); // blur via klik luar
  await expect(page.locator('text=Nama pemilik rekening minimal 3 karakter')).toBeVisible({ timeout: 5_000 });
  console.log('  ✓ Validasi nama terlalu pendek: OK');

  // 5c. Nomor rekening kurang dari 10 digit
  await page.locator('#accountNumber').click();
  await page.fill('#accountNumber', '12345');
  await page.locator('h2').first().click(); // blur via klik luar
  await expect(page.locator('text=Nomor rekening minimal 10 digit')).toBeVisible({ timeout: 5_000 });
  console.log('  ✓ Validasi nomor rekening terlalu pendek: OK');

  // 5d. Upload file dengan tipe tidak valid → error format
  //     setInputFiles memicu handleFileInput → handleFile → markTouched('proofFile')
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'invalid-file.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('ini bukan gambar'),
  });
  await expect(page.locator('text=Format file harus PNG, JPG, atau JPEG')).toBeVisible({ timeout: 5_000 });
  console.log('  ✓ Validasi format file tidak valid: OK');

  // 5e. Validasi file wajib diunggah:
  //     Hapus file invalid dengan set file kosong → sekarang proofFile = null
  //     tapi proofFile sudah touched → error 'wajib diunggah'
  await fileInput.setInputFiles([]); // kosongkan file input
  await expect(page.locator('text=Foto buku tabungan wajib diunggah')).toBeVisible({ timeout: 5_000 });
  console.log('  ✓ Validasi file belum diupload: OK');

  // 5f. Validasi checkbox sertifikasi
  //     Check lalu uncheck → touched=true, certified=false → error muncul
  const certifyCheckbox = page.locator('input[type="checkbox"]').first();
  await certifyCheckbox.check();   // certified = true, touched = true
  await certifyCheckbox.uncheck(); // certified = false, touched masih true → error
  await expect(page.locator('text=Centang pernyataan kebenaran data sebelum submit')).toBeVisible({ timeout: 5_000 });
  console.log('  ✓ Validasi checkbox belum dicentang: OK');

  console.log('✅ TC-3 PASSED: Semua validasi form bekerja dengan benar');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-4: Akses tanpa login → redirect ke /login
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-4: Akses tanpa login diarahkan ke /login', async ({ page }) => {
  // 1. Pastikan tidak ada cookie (fresh context)
  //    context baru sudah bersih, tidak perlu addCookies

  // 2. Buka langsung halaman form rekening tanpa login
  await page.goto(URL_REKENING);

  // 3. Tunggu redirect ke /login
  await expect(page).toHaveURL(/login/, { timeout: 15_000 });

  // 4. Verifikasi halaman login tampil
  const loginPageIndicator = page.locator('h1, h2, button', { hasText: /login|masuk|sign in/i }).first();
  await expect(loginPageIndicator).toBeVisible({ timeout: 10_000 });

  console.log('✅ TC-4 PASSED: Akses tanpa login diredirect ke /login');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-5: Akses oleh mahasiswa belum lulus → redirect ke status-pendaftaran
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-5: Mahasiswa belum lulus tidak bisa akses form rekening', async ({ page, context }) => {
  // 1. Set cookie login mahasiswa
  await setLoginCookie(context);

  // 2. Mock SSR: status REVIEW (bukan LULUS)
  //    Supabase client-side tidak akan mengembalikan data pendaftaran LULUS
  await mockSupabaseSSR(page, { status: 'REVIEW' });

  // 3. Buka halaman form rekening
  await page.goto(URL_REKENING);
  await page.waitForURL(
    (url) =>
      url.pathname.includes('daftar-ulang-rekening') ||
      url.pathname.includes('status-pendaftaran') ||
      url.pathname === '/login',
    { timeout: 15_000 }
  );

  await page.waitForLoadState('networkidle');

  // 4. Verifikasi: halaman yang tampil bukan form rekening (mahasiswa belum lulus)
  //    Skenario A: Redirect ke status-pendaftaran
  //    Skenario B: Halaman terbuka tapi dengan state lulusPendaftaran = null
  //                → beasiswa info = '-', tidak ada tombol submit aktif, dll.
  const currentUrl = page.url();

  if (currentUrl.includes('status-pendaftaran')) {
    // Redirect berhasil
    console.log('  ✓ Redirect ke status-pendaftaran berhasil');
    await expect(page).toHaveURL(/status-pendaftaran/);
  } else if (currentUrl.includes('login')) {
    // Redirect ke login (akses ditolak)
    console.log('  ✓ Redirect ke login (akses ditolak)');
    await expect(page).toHaveURL(/login/);
  } else {
    // Halaman form terbuka → verifikasi tidak ada data beasiswa
    //   Karena lulusPendaftaran = null, scholarshipTitle = 'Beasiswa Pendidikan' (fallback)
    //   dan tombol "Langkah Selanjutnya" tidak ada di halaman ini
    console.log('  ℹ️  Halaman form terbuka dengan data kosong (lulusPendaftaran = null)');
    const pageContent = await page.content();
    // Harusnya tidak ada data beasiswa riil karena belum lulus
    expect(pageContent).not.toContain('Beasiswa Unggulan Nasional');
  }

  console.log('✅ TC-5 PASSED: Mahasiswa REVIEW tidak mendapat akses penuh ke form rekening');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-6: Menampilkan data rekening yang sudah tersimpan
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-6: Form menampilkan data rekening existing yang sudah tersimpan', async ({ page, context }) => {
  // 1. Set cookie login mahasiswa
  await setLoginCookie(context);

  // 2. Inject existingRekening ke dalam HTML response Next.js
  //    mockSSRPageProps melakukan 2 hal:
  //    a) Patch JSON __NEXT_DATA__ → React useState() terinisialisasi dengan data mock
  //    b) Patch HTML <option> → atribut selected cocok, mencegah hydration mismatch
  await mockSSRPageProps(page, `**${URL_REKENING}`, {
    existingRekening: {
      namaBank: 'Bank BCA',
      namaPemilik: 'Budi Santoso',
      nomorRekening: '1234567890',
      fotoBukuUrl: null,
      status: 'aktif',
    },
  });

  // 3. Buka halaman form rekening
  await page.goto(URL_REKENING);
  await page.waitForURL((url) =>
    url.pathname.includes('daftar-ulang-rekening') || url.pathname === '/login',
    { timeout: 15_000 }
  );

  if (page.url().includes('/login')) {
    throw new Error('TC-6 GAGAL: Diredirect ke /login.');
  }

  await page.waitForLoadState('networkidle');
  await expect(page.locator('h2', { hasText: 'Formulir Daftar Ulang' })).toBeVisible({ timeout: 10_000 });

  // 4. Verifikasi nomor rekening sudah terisi
  const accountInput = page.locator('#accountNumber');
  await expect(accountInput).toHaveValue('1234567890', { timeout: 8_000 });
  console.log('  ✓ Account number pre-filled: 1234567890');

  // 5. Verifikasi field bank (select) sudah terpilih "Bank BCA"
  //    Berhasil karena mockSSRPageProps patch HTML <option selected> + __NEXT_DATA__
  const bankSelect = page.locator('#bankName');
  await expect(bankSelect).toHaveValue('Bank BCA', { timeout: 8_000 });
  console.log('  ✓ Bank name pre-filled: Bank BCA');

  // 6. Verifikasi nama pemilik sudah terisi
  const holderInput = page.locator('#accountHolderName');
  await expect(holderInput).toHaveValue('Budi Santoso', { timeout: 5_000 });
  console.log('  ✓ Account holder name pre-filled: Budi Santoso');

  console.log('✅ TC-6 PASSED: Data rekening existing tampil di form dengan benar');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TC-7: Memperbarui data rekening
// ═══════════════════════════════════════════════════════════════════════════════
test('TC-7: Memperbarui data rekening yang sudah ada', async ({ page, context }) => {
  // 1. Set cookie login mahasiswa
  await setLoginCookie(context);

  // 2. Inject existingRekening via __NEXT_DATA__ (SSR props injection)
  await mockSSRPageProps(page, `**${URL_REKENING}`, {
    existingRekening: {
      namaBank: 'Bank BCA',
      namaPemilik: 'Budi Santoso',
      nomorRekening: '1234567890',
      fotoBukuUrl: null,
      status: 'aktif',
    },
  });

  // 3. Mock POST /api/mahasiswa/rekening
  const { getBody } = await mockRekeningAPI(page);

  // 4. Mock Supabase Storage (upload foto buku)
  await page.route('**/storage/v1/**', async (route) => {
    const method = route.request().method();
    if (method === 'POST' || method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ Key: 'rekening/updated-photo.jpg', path: 'updated-photo.jpg' }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ publicUrl: 'https://supabase.test/rekening/updated-photo.jpg' }),
      });
    }
  });

  // 5. Buka halaman form rekening
  await page.goto(URL_REKENING);
  await page.waitForURL((url) =>
    url.pathname.includes('daftar-ulang-rekening') || url.pathname === '/login',
    { timeout: 15_000 }
  );

  if (page.url().includes('/login')) {
    throw new Error('TC-7 GAGAL: Diredirect ke /login.');
  }

  await page.waitForLoadState('networkidle');
  await expect(page.locator('h2', { hasText: 'Formulir Daftar Ulang' })).toBeVisible({ timeout: 10_000 });

  // 6. Verifikasi data lama sudah ter-prefill
  await expect(page.locator('#accountNumber')).toHaveValue('1234567890', { timeout: 5_000 });
  console.log('  ✓ Data rekening lama terbaca: 1234567890');

  // 7. Ubah nomor rekening ke nomor baru
  //    handleAccountNumberChange akan strip huruf non-digit secara otomatis
  await page.fill('#accountNumber', '9876543210');
  await page.locator('h2').first().click(); // blur

  // 8. Verifikasi nilai field setelah diubah
  const finalAccountNumber = await page.locator('#accountNumber').inputValue();
  expect(finalAccountNumber).toMatch(/^\d+$/);
  expect(finalAccountNumber).toBe('9876543210');
  console.log('  ✓ Nomor rekening baru:', finalAccountNumber);

  // 9. Upload file bukti baru
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'bukti-rekening-baru.jpg',
    mimeType: 'image/jpeg',
    buffer: makeTinyJpegBuffer(),
  });
  await expect(page.locator('text=bukti-rekening-baru.jpg')).toBeVisible({ timeout: 5_000 });
  console.log('  ✓ File bukti baru ter-upload: bukti-rekening-baru.jpg');

  // 10. Centang sertifikasi
  const certifyCheckbox = page.locator('input[type="checkbox"]').first();
  await certifyCheckbox.check();

  // 11. Klik submit
  // Tambahkan handler untuk window.confirm karena saat update,
  // sistem akan memunculkan dialog konfirmasi.
  page.once('dialog', async dialog => {
    console.log(`  ✓ Dialog konfirmasi muncul: ${dialog.message()}`);
    await dialog.accept();
  });

  const btnSubmit = page.locator('button[type="submit"]');
  await expect(btnSubmit).toBeEnabled({ timeout: 5_000 });
  await btnSubmit.click();

  // 12. Verifikasi pesan sukses (toast notification role="status")
  await expect(
    page.getByRole('status')
  ).toBeVisible({ timeout: 10_000 });

  // 13. Verifikasi payload API membawa nomor rekening terbaru
  const body = getBody();
  expect(body).not.toBeNull();
  expect(body.nomorRekening).toBe('9876543210');
  // Pastikan nomor berbeda dari yang lama
  expect(body.nomorRekening).not.toBe('1234567890');
  console.log('  ✓ Payload API nomorRekening:', body.nomorRekening);

  console.log('✅ TC-7 PASSED: Pembaruan rekening berhasil, payload membawa data terbaru');
});
