const { test, expect } = require('@playwright/test');
const { admin } = require('./_db');
const { makeSeeder } = require('./seed');

/**
 * REAL-DB · PB-19 (PBI-34 & PBI-35) — Registrasi Akun Mandiri.
 * Data input TETAP. Password akun = "123456" (kecuali register pendonor yang
 * formnya wajib >= 8 karakter -> pakai "12345678"). Jalankan: npm run test:e2e:db
 */
test.describe('REAL-DB · PB-19 · Registrasi Akun Mandiri', () => {
  let seeder;
  const PASS = '123456';
  const PASS_PENDONOR = '12345678'; // form pendonor wajib >= 8 karakter

  test.beforeEach(() => { seeder = makeSeeder(); });
  test.afterEach(async () => { await seeder.cleanup(); });

  // ── Registrasi Mahasiswa ────────────────────────────────────────────────────
  test('TC-19-01: register mahasiswa valid → tersimpan di tabel account & user', async ({ page }) => {
    const email = 'budi.mahasiswa@bantubeasiswa.test';
    await seeder.resetEmail(email);

    await page.goto('/register/mahasiswa');
    await page.fill('#nama', 'Budi Santoso');
    await page.fill('#email', email);
    await page.fill('#password', PASS);
    await page.fill('#confirmPassword', PASS);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login\?registered=true/);

    const { data: acc } = await admin.from('account').select('accountId, role').eq('email', email).single();
    expect(acc.role).toBe('mahasiswa');
    const { data: usr } = await admin.from('user').select('nama').eq('accountId', acc.accountId).single();
    expect(usr.nama).toBe('Budi Santoso');
  });

  test('TC-19-02: password ≠ konfirmasi → validasi klien, tak ada baris di DB', async ({ page }) => {
    const email = 'andi.mahasiswa@bantubeasiswa.test';
    await seeder.resetEmail(email);

    await page.goto('/register/mahasiswa');
    await page.fill('#nama', 'Andi Pratama');
    await page.fill('#email', email);
    await page.fill('#password', PASS);
    await page.fill('#confirmPassword', '654321');
    await page.click('button[type="submit"]');

    await expect(page.locator('div[role="alert"]')).toContainText('Password dan Konfirmasi Password tidak cocok');
    const { data } = await admin.from('account').select('accountId').eq('email', email).maybeSingle();
    expect(data).toBeNull();
  });

  test('TC-19-03: email sudah ada di DB → ditolak, tidak ada duplikat', async ({ page }) => {
    const email = 'terdaftar@bantubeasiswa.test';
    await seeder.account({ role: 'mahasiswa', email }); // sudah ada di DB

    await page.goto('/register/mahasiswa');
    await page.fill('#nama', 'Budi Santoso');
    await page.fill('#email', email);
    await page.fill('#password', PASS);
    await page.fill('#confirmPassword', PASS);
    await page.click('button[type="submit"]');

    await expect(page.locator('div[role="alert"]')).toContainText('Email sudah terdaftar');
    const { count } = await admin.from('account').select('accountId', { count: 'exact', head: true }).eq('email', email);
    expect(count).toBe(1);
  });

  // ── Registrasi Pendonor ─────────────────────────────────────────────────────
  test('TC-19-04: register pendonor valid → tersimpan di account & pendonor', async ({ page }) => {
    const email = 'yayasan.bakti@bantubeasiswa.test';
    await seeder.resetEmail(email);

    await page.goto('/register/pendonor');
    await page.fill('#namaOrganisasi', 'Yayasan Bakti Pertiwi');
    await page.fill('#email', email);
    await page.fill('#kontak', '08123456789');
    await page.fill('#alamat', 'Jl. Merdeka No. 1, Jakarta');
    await page.fill('#password', PASS_PENDONOR);
    await page.fill('#confirmPassword', PASS_PENDONOR);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login\?registered=true/);

    const { data: acc } = await admin.from('account').select('accountId, role').eq('email', email).single();
    expect(acc.role).toBe('pendonor');
    const { data: pd } = await admin.from('pendonor').select('statusOrganisasi, statusVerifikasi').eq('accountId', acc.accountId).single();
    expect(pd.statusOrganisasi).toBe('Yayasan Bakti Pertiwi');
    expect(pd.statusVerifikasi).toBe('pending');
  });

  test('TC-19-05: password pendonor < 8 karakter → validasi klien', async ({ page }) => {
    const email = 'pendonor.pendek@bantubeasiswa.test';
    await seeder.resetEmail(email);

    await page.goto('/register/pendonor');
    await page.fill('#namaOrganisasi', 'Yayasan Bakti Pertiwi');
    await page.fill('#email', email);
    await page.fill('#kontak', '08123456789');
    await page.fill('#alamat', 'Jl. Merdeka No. 1, Jakarta');
    await page.fill('#password', PASS); // 123456 = 6 karakter (< 8)
    await page.fill('#confirmPassword', PASS);
    await page.click('button[type="submit"]');

    await expect(page.locator('div[role="alert"]')).toContainText('Password harus minimal 8 karakter');
    const { data } = await admin.from('account').select('accountId').eq('email', email).maybeSingle();
    expect(data).toBeNull();
  });

  test('TC-19-06: konfirmasi password pendonor berbeda → validasi klien', async ({ page }) => {
    const email = 'pendonor.beda@bantubeasiswa.test';
    await seeder.resetEmail(email);

    await page.goto('/register/pendonor');
    await page.fill('#namaOrganisasi', 'Yayasan Bakti Pertiwi');
    await page.fill('#email', email);
    await page.fill('#kontak', '08123456789');
    await page.fill('#alamat', 'Jl. Merdeka No. 1, Jakarta');
    await page.fill('#password', PASS_PENDONOR);
    await page.fill('#confirmPassword', '87654321');
    await page.click('button[type="submit"]');

    await expect(page.locator('div[role="alert"]')).toContainText('Password dan konfirmasi password tidak cocok');
    const { data } = await admin.from('account').select('accountId').eq('email', email).maybeSingle();
    expect(data).toBeNull();
  });
});
