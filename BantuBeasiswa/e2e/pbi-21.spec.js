const { test, expect } = require('@playwright/test');
const { loginAs, generateMockToken } = require('./helpers');

test.describe('PBI 21: Registrasi & Otentikasi Akun Pendonor', () => {

  // ==========================================
  // 1. REGISTRASI
  // ==========================================

  test('TC-21-01: Registrasi Berhasil (Valid Inputs)', async ({ page }) => {
    // Intercept register API and return success
    await page.route('**/api/auth/register-pendonor', async (route) => {
      expect(route.request().method()).toBe('POST');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Registrasi pendonor berhasil.' }),
      });
    });

    await page.goto('/register/pendonor');

    // Fill registration form
    await page.fill('#namaOrganisasi', 'Yayasan Peduli Pendidikan');
    await page.fill('#email', 'yayasan.peduli@gmail.com');
    await page.fill('#kontak', '081234567890');
    await page.fill('#alamat', 'Jl. Merdeka No. 45, Jakarta');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');

    // Click register button
    await page.click('button[type="submit"]');

    // Assert redirection to login with query param registered=true
    await expect(page).toHaveURL(/\/login\?registered=true/);
  });

  test('TC-21-02: Registrasi Gagal - Password Kurang dari 8 Karakter', async ({ page }) => {
    await page.goto('/register/pendonor');

    await page.fill('#namaOrganisasi', 'Yayasan Peduli Pendidikan');
    await page.fill('#email', 'yayasan.peduli@gmail.com');
    await page.fill('#kontak', '081234567890');
    await page.fill('#alamat', 'Jl. Merdeka No. 45, Jakarta');
    await page.fill('#password', 'pass123'); // 7 chars
    await page.fill('#confirmPassword', 'pass123');

    await page.click('button[type="submit"]');

    // Assert validation message on screen
    const alert = page.locator('div[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Password harus minimal 8 karakter.');
  });

  test('TC-21-03: Registrasi Gagal - Password & Konfirmasi Password Tidak Cocok', async ({ page }) => {
    await page.goto('/register/pendonor');

    await page.fill('#namaOrganisasi', 'Yayasan Peduli Pendidikan');
    await page.fill('#email', 'yayasan.peduli@gmail.com');
    await page.fill('#kontak', '081234567890');
    await page.fill('#alamat', 'Jl. Merdeka No. 45, Jakarta');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password321'); // Mismatch

    await page.click('button[type="submit"]');

    // Assert validation message
    const alert = page.locator('div[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Password dan konfirmasi password tidak cocok.');
  });

  test('TC-21-04: Registrasi Gagal - Email Sudah Terdaftar', async ({ page }) => {
    // Intercept register API and return 400 Bad Request
    await page.route('**/api/auth/register-pendonor', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Email sudah terdaftar.' }),
      });
    });

    await page.goto('/register/pendonor');

    await page.fill('#namaOrganisasi', 'Yayasan Peduli Pendidikan');
    await page.fill('#email', 'yayasan.peduli@gmail.com');
    await page.fill('#kontak', '081234567890');
    await page.fill('#alamat', 'Jl. Merdeka No. 45, Jakarta');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');

    await page.click('button[type="submit"]');

    // Assert API error message is displayed
    const alert = page.locator('div[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Email sudah terdaftar.');
  });


  // ==========================================
  // 2. OTENTIKASI & LOGIN
  // ==========================================

  test('TC-21-05: Login Berhasil - Akun Status Verified', async ({ page, context }) => {
    const token = generateMockToken('pendonor', { accountId: 38, userId: 11, email: 'yayasanpersija@gmail.com' });

    // Set cookie beforehand to prevent race conditions during immediate redirect
    await loginAs(context, 'pendonor', { accountId: 38, userId: 11, email: 'yayasanpersija@gmail.com' });

    // Mock successful login response
    await page.route('**/api/auth/loginAPI', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Set-Cookie': `token=${token}; Path=/; HttpOnly; SameSite=Lax`
        },
        body: JSON.stringify({ redirect: '/pendonor/dashboard' }),
      });
    });

    // Mock follow-up APIs to prevent page breaking on load
    await page.route('**/api/pendonor/profil', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          pendonorId: 11,
          statusOrganisasi: 'Yayasan Persija',
          kontak: '081311006341',
          alamat: 'jl. telekomunikasi',
          email: 'yayasanpersija@gmail.com'
        }),
      });
    });

    await page.route('**/api/pendonor/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stats: { totalDana: 0, totalPendaftar: 0, programAktif: 0, kuotaTersisa: 0 },
          programs: [],
          pendingActions: []
        }),
      });
    });

    await page.route('**/api/pendonor/beasiswa', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('/login');

    // Click roles selector to 'Pendonor'
    await page.click('button:has-text("Pendonor")');

    // Fill credentials
    await page.fill('#email', 'yayasanpersija@gmail.com');
    await page.fill('#password', 'persija123');

    await page.click('button[type="submit"]');

    // Redirection to pendonor dashboard
    await expect(page).toHaveURL(/\/pendonor\/dashboard/);
  });

  test('TC-21-06: Login - Akun Status Pending (Menunggu Verifikasi)', async ({ page }) => {
    const token = generateMockToken('pendonor', { accountId: 26, userId: 9, email: 'yayasankalcer@gmail.com' });

    // Mock pending login response
    await page.route('**/api/auth/loginAPI', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Set-Cookie': `token=${token}; Path=/; HttpOnly; SameSite=Lax`
        },
        body: JSON.stringify({
          status: 'pending',
          redirect: '/pendonor/dokumen-verifikasi',
          notice: 'Akun Anda belum diverifikasi admin. Lengkapi profil dan unggah dokumen pendukung untuk proses verifikasi.'
        }),
      });
    });

    // Mock dokumen check API
    await page.route('**/api/pendonor/dokumen-verifikasi', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], uploadedWajib: 0, totalWajib: 2 }),
      });
    });

    await page.goto('/login');

    await page.click('button:has-text("Pendonor")');
    await page.fill('#email', 'yayasankalcer@gmail.com');
    await page.fill('#password', 'kalcer');

    await page.click('button[type="submit"]');

    // Notice alert displayed
    const notice = page.locator('div[role="alert"]:has-text("Akun Anda belum diverifikasi admin")');
    await expect(notice).toBeVisible();

    // Redirection to dokumen-verifikasi
    await expect(page).toHaveURL(/\/pendonor\/dokumen-verifikasi/, { timeout: 5000 });
  });

  test('TC-21-07: Login Gagal - Akun Status Rejected (Ditolak)', async ({ page }) => {
    // Mock rejected login response
    await page.route('**/api/auth/loginAPI', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Akun Anda ditolak. Hubungi admin untuk informasi lebih lanjut.',
          status: 'rejected'
        }),
      });
    });

    await page.goto('/login');

    await page.click('button:has-text("Pendonor")');
    await page.fill('#email', 'yayasanpersib@gmail.com');
    await page.fill('#password', 'persib');

    await page.click('button[type="submit"]');

    // Error alert displayed
    const errorAlert = page.locator('div[role="alert"]:has-text("Akun Anda ditolak")');
    await expect(errorAlert).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });


  // ==========================================
  // 3. OTORISASI & PROTEKSI HALAMAN (GUARD)
  // ==========================================

  test('TC-21-08: Bypass Halaman Utama Pendonor tanpa Login', async ({ page }) => {
    // Navigate directly without setting cookie
    await page.goto('/pendonor/program');

    // Expect redirect back to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-21-09: Bypass Halaman Utama Pendonor dengan Akun Pending', async ({ page, context }) => {
    // Login with accountId 26 (yayasankalcer@gmail.com) which has status 'pending' in the real DB
    await loginAs(context, 'pendonor', { accountId: 26, userId: 9, email: 'yayasankalcer@gmail.com' });

    // Mock document page response to prevent failure
    await page.route('**/api/pendonor/dokumen-verifikasi', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], uploadedWajib: 0, totalWajib: 2 }),
      });
    });

    // Navigate to program page
    await page.goto('/pendonor/program');

    // Expect to be redirected to dokumen-verifikasi page since status is pending
    await expect(page).toHaveURL(/\/pendonor\/dokumen-verifikasi/);
  });


  // ==========================================
  // 4. ADMIN KELOLA VERIFIKASI PENDONOR
  // ==========================================

  test('TC-21-10: Admin Menyetujui Pendaftaran Pendonor (Verify)', async ({ page, context }) => {
    await loginAs(context, 'admin');

    let putBody = null;
    // Combine GET and PUT into a single route intercept to avoid overriding
    await page.route('**/api/admin/pendonor', async (route) => {
      if (route.request().method() === 'PUT') {
        putBody = JSON.parse(route.request().postData());
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Verified successfully' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                pendonorId: 999,
                statusOrganisasi: 'Yayasan Kalcer Test',
                kontak: '0812345678',
                createdAt: '2026-06-01T08:00:00Z',
                statusVerifikasi: 'pending',
                account: { email: 'yayasankalcer.test@gmail.com' }
              }
            ]
          }),
        });
      }
    });

    await page.goto('/admin/pendonor');

    // Expect row to be visible
    await expect(page.locator('text=Yayasan Kalcer Test')).toBeVisible();

    // Click verify button
    await page.click('button[title="Verifikasi pendonor ini"]');

    // Wait and confirm SweetAlert
    const swal = page.locator('.swal2-popup:has-text("Berhasil!")');
    await expect(swal).toBeVisible();
    await swal.locator('button:has-text("OK")').click();

    // Verify correct PUT payload was sent
    expect(putBody).toEqual({ pendonorId: 999, action: 'verify' });
  });

  test('TC-21-11: Admin Menolak Pendaftaran Pendonor (Reject)', async ({ page, context }) => {
    await loginAs(context, 'admin');

    let putBody = null;
    // Combine GET and PUT into a single route intercept to avoid overriding
    await page.route('**/api/admin/pendonor', async (route) => {
      if (route.request().method() === 'PUT') {
        putBody = JSON.parse(route.request().postData());
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Rejected successfully' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                pendonorId: 999,
                statusOrganisasi: 'Yayasan Persib Test',
                kontak: '0812345678',
                createdAt: '2026-06-01T08:00:00Z',
                statusVerifikasi: 'pending',
                account: { email: 'yayasanpersib.test@gmail.com' }
              }
            ]
          }),
        });
      }
    });

    await page.goto('/admin/pendonor');

    // Click reject button
    await page.click('button[title="Tolak pendonor ini"]');

    // Expect Reject Modal
    const rejectModal = page.locator('text=Tolak Pendonor').locator('xpath=../..');
    await expect(rejectModal).toBeVisible();

    // Type reject reason (minimum 10 characters)
    await rejectModal.locator('textarea').fill('Dokumen legalitas tidak valid atau buram.');

    // Click reject submit
    await rejectModal.locator('button:has-text("Tolak")').click();

    // Wait and confirm SweetAlert success
    const swal = page.locator('.swal2-popup:has-text("Berhasil!")');
    await expect(swal).toBeVisible();
    await swal.locator('button:has-text("OK")').click();

    // Verify correct PUT payload was sent
    expect(putBody).toEqual({
      pendonorId: 999,
      action: 'reject',
      alasanPenolakan: 'Dokumen legalitas tidak valid atau buram.'
    });
  });

});
