const { test, expect } = require('@playwright/test');

/**
 * PB-19 — Registrasi Akun Mandiri (PBI-34: UI Registrasi, PBI-35: API Registrasi)
 *
 * User story: "Sebagai calon pengguna BantuBeasiswa, saya ingin bisa membuat akun
 * sendiri melalui halaman registrasi sehingga dapat langsung menggunakan fitur
 * platform sesuai peran saya tanpa perlu bantuan admin."
 *
 * Halaman /register/mahasiswa dan /register/pendonor bersifat publik (tanpa SSR
 * auth guard), sehingga test cukup memock endpoint API registrasi via page.route.
 */
test.describe('PB-19 (PBI-34 & PBI-35): Registrasi Akun Mandiri E2E Tests', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // Registrasi Mahasiswa
  // ─────────────────────────────────────────────────────────────────────────
  test.describe('Registrasi Mahasiswa', () => {
    test('TC-PB19-01: Registrasi mahasiswa valid → POST payload benar & redirect ke login', async ({ page }) => {
      let postBody = null;
      await page.route('**/api/auth/register-mahasiswa', async (route) => {
        postBody = JSON.parse(route.request().postData());
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Registrasi berhasil' }),
        });
      });

      await page.goto('/register/mahasiswa');
      await page.fill('#nama', 'Budi Santoso');
      await page.fill('#email', 'budi@univ.ac.id');
      await page.fill('#password', 'rahasia123');
      await page.fill('#confirmPassword', 'rahasia123');
      await page.click('button[type="submit"]');

      // Berhasil → router.push('/login?registered=true')
      await expect(page).toHaveURL(/\/login\?registered=true/);
      expect(postBody).toEqual({
        nama: 'Budi Santoso',
        email: 'budi@univ.ac.id',
        password: 'rahasia123',
      });
    });

    test('TC-PB19-02: Password ≠ konfirmasi → error klien, API tidak dipanggil', async ({ page }) => {
      let apiCalled = false;
      await page.route('**/api/auth/register-mahasiswa', async (route) => {
        apiCalled = true;
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      });

      await page.goto('/register/mahasiswa');
      await page.fill('#nama', 'Budi Santoso');
      await page.fill('#email', 'budi@univ.ac.id');
      await page.fill('#password', 'rahasia123');
      await page.fill('#confirmPassword', 'tidaksama456');
      await page.click('button[type="submit"]');

      await expect(page.locator('div[role="alert"]')).toContainText('Password dan Konfirmasi Password tidak cocok');
      expect(apiCalled).toBe(false);
      await expect(page).toHaveURL(/\/register\/mahasiswa/);
    });

    test('TC-PB19-03: Email sudah terdaftar → pesan error dari server ditampilkan', async ({ page }) => {
      await page.route('**/api/auth/register-mahasiswa', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Email sudah terdaftar.' }),
        });
      });

      await page.goto('/register/mahasiswa');
      await page.fill('#nama', 'Budi Santoso');
      await page.fill('#email', 'budi@univ.ac.id');
      await page.fill('#password', 'rahasia123');
      await page.fill('#confirmPassword', 'rahasia123');
      await page.click('button[type="submit"]');

      await expect(page.locator('div[role="alert"]')).toContainText('Email sudah terdaftar.');
      await expect(page).toHaveURL(/\/register\/mahasiswa/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Registrasi Pendonor
  // ─────────────────────────────────────────────────────────────────────────
  test.describe('Registrasi Pendonor', () => {
    async function fillPendonor(page, { password = 'passw0rd8', confirm = 'passw0rd8' } = {}) {
      await page.fill('#namaOrganisasi', 'Yayasan Bakti Pertiwi');
      await page.fill('#email', 'kontak@bakti.org');
      await page.fill('#kontak', '08123456789');
      await page.fill('#alamat', 'Jl. Merdeka No. 1, Jakarta');
      await page.fill('#password', password);
      await page.fill('#confirmPassword', confirm);
    }

    test('TC-PB19-04: Registrasi pendonor valid → POST payload benar & redirect ke login', async ({ page }) => {
      let postBody = null;
      await page.route('**/api/auth/register-pendonor', async (route) => {
        postBody = JSON.parse(route.request().postData());
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Registrasi pendonor berhasil' }),
        });
      });

      await page.goto('/register/pendonor');
      await fillPendonor(page);
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/login\?registered=true/);
      expect(postBody).toEqual({
        namaOrganisasi: 'Yayasan Bakti Pertiwi',
        email: 'kontak@bakti.org',
        kontak: '08123456789',
        alamat: 'Jl. Merdeka No. 1, Jakarta',
        password: 'passw0rd8',
      });
    });

    test('TC-PB19-05: Password < 8 karakter → ditolak validasi klien', async ({ page }) => {
      let apiCalled = false;
      await page.route('**/api/auth/register-pendonor', async (route) => {
        apiCalled = true;
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      });

      await page.goto('/register/pendonor');
      await fillPendonor(page, { password: 'short', confirm: 'short' });
      await page.click('button[type="submit"]');

      await expect(page.locator('div[role="alert"]')).toContainText('Password harus minimal 8 karakter');
      expect(apiCalled).toBe(false);
    });

    test('TC-PB19-06: Konfirmasi password berbeda → ditolak validasi klien', async ({ page }) => {
      await page.goto('/register/pendonor');
      await fillPendonor(page, { password: 'passw0rd8', confirm: 'passw0rd9' });
      await page.click('button[type="submit"]');

      await expect(page.locator('div[role="alert"]')).toContainText('Password dan konfirmasi password tidak cocok');
    });
  });
});
