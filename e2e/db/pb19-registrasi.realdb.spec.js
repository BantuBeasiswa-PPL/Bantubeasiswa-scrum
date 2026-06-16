const { test, expect } = require('@playwright/test');
const { admin } = require('./_db');
const { makeSeeder, uniqEmail } = require('./seed');

/**
 * REAL-DB · PB-19 (PBI-34 & PBI-35) — Registrasi Akun Mandiri.
 * Form di-submit sungguhan → API menulis ke DB. Diverifikasi langsung ke tabel
 * account/user/pendonor. Jalankan: npm run test:e2e:db
 */
test.describe('REAL-DB · PB-19 · Registrasi Akun Mandiri', () => {
  let seeder;
  const createdEmails = []; // akun yang dibuat lewat app → dibersihkan manual

  test.beforeEach(() => {
    seeder = makeSeeder();
  });

  test.afterEach(async () => {
    for (const email of createdEmails) {
      await admin.from('account').delete().eq('email', email); // cascade ke user/pendonor
    }
    createdEmails.length = 0;
    await seeder.cleanup();
  });

  // ── Registrasi Mahasiswa ────────────────────────────────────────────────────
  test('TC-19-01: register mahasiswa valid → tersimpan di tabel account & user', async ({ page }) => {
    const email = uniqEmail('mhs');
    createdEmails.push(email);

    await page.goto('/register/mahasiswa');
    await page.fill('#nama', 'Budi Santoso');
    await page.fill('#email', email);
    await page.fill('#password', 'rahasia123');
    await page.fill('#confirmPassword', 'rahasia123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login\?registered=true/);

    const { data: acc } = await admin.from('account').select('accountId, role').eq('email', email).single();
    expect(acc.role).toBe('mahasiswa');
    const { data: usr } = await admin.from('user').select('nama').eq('accountId', acc.accountId).single();
    expect(usr.nama).toBe('Budi Santoso');
  });

  test('TC-19-02: password ≠ konfirmasi → validasi klien, tak ada baris di DB', async ({ page }) => {
    const email = uniqEmail('mhs');

    await page.goto('/register/mahasiswa');
    await page.fill('#nama', 'Budi');
    await page.fill('#email', email);
    await page.fill('#password', 'rahasia123');
    await page.fill('#confirmPassword', 'beda456');
    await page.click('button[type="submit"]');

    await expect(page.locator('div[role="alert"]')).toContainText('Password dan Konfirmasi Password tidak cocok');
    const { data } = await admin.from('account').select('accountId').eq('email', email).maybeSingle();
    expect(data).toBeNull();
  });

  test('TC-19-03: email sudah ada di DB → ditolak, tidak ada duplikat', async ({ page }) => {
    const email = uniqEmail('mhs');
    await seeder.account({ role: 'mahasiswa', email }); // sudah ada di DB

    await page.goto('/register/mahasiswa');
    await page.fill('#nama', 'Budi');
    await page.fill('#email', email);
    await page.fill('#password', 'rahasia123');
    await page.fill('#confirmPassword', 'rahasia123');
    await page.click('button[type="submit"]');

    await expect(page.locator('div[role="alert"]')).toContainText('Email sudah terdaftar');
    const { count } = await admin.from('account').select('accountId', { count: 'exact', head: true }).eq('email', email);
    expect(count).toBe(1);
  });

  // ── Registrasi Pendonor ─────────────────────────────────────────────────────
  test('TC-19-04: register pendonor valid → tersimpan di account & pendonor', async ({ page }) => {
    const email = uniqEmail('pendonor');
    createdEmails.push(email);

    await page.goto('/register/pendonor');
    await page.fill('#namaOrganisasi', 'Yayasan Bakti Pertiwi');
    await page.fill('#email', email);
    await page.fill('#kontak', '08123456789');
    await page.fill('#alamat', 'Jl. Merdeka No. 1, Jakarta');
    await page.fill('#password', 'passw0rd8');
    await page.fill('#confirmPassword', 'passw0rd8');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login\?registered=true/);

    const { data: acc } = await admin.from('account').select('accountId, role').eq('email', email).single();
    expect(acc.role).toBe('pendonor');
    const { data: pd } = await admin.from('pendonor').select('statusOrganisasi, statusVerifikasi').eq('accountId', acc.accountId).single();
    expect(pd.statusOrganisasi).toBe('Yayasan Bakti Pertiwi');
    expect(pd.statusVerifikasi).toBe('pending');
  });

  test('TC-19-05: password pendonor < 8 karakter → validasi klien', async ({ page }) => {
    const email = uniqEmail('pendonor');

    await page.goto('/register/pendonor');
    await page.fill('#namaOrganisasi', 'Yayasan Bakti Pertiwi');
    await page.fill('#email', email);
    await page.fill('#kontak', '08123456789');
    await page.fill('#alamat', 'Jakarta');
    await page.fill('#password', 'short');
    await page.fill('#confirmPassword', 'short');
    await page.click('button[type="submit"]');

    await expect(page.locator('div[role="alert"]')).toContainText('Password harus minimal 8 karakter');
    const { data } = await admin.from('account').select('accountId').eq('email', email).maybeSingle();
    expect(data).toBeNull();
  });

  test('TC-19-06: konfirmasi password pendonor berbeda → validasi klien', async ({ page }) => {
    const email = uniqEmail('pendonor');

    await page.goto('/register/pendonor');
    await page.fill('#namaOrganisasi', 'Yayasan Bakti Pertiwi');
    await page.fill('#email', email);
    await page.fill('#kontak', '08123456789');
    await page.fill('#alamat', 'Jakarta');
    await page.fill('#password', 'passw0rd8');
    await page.fill('#confirmPassword', 'passw0rd9');
    await page.click('button[type="submit"]');

    await expect(page.locator('div[role="alert"]')).toContainText('Password dan konfirmasi password tidak cocok');
    const { data } = await admin.from('account').select('accountId').eq('email', email).maybeSingle();
    expect(data).toBeNull();
  });
});
