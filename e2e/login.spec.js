const { test, expect } = require('@playwright/test');
const { generateMockToken } = require('./helpers');

test.describe('LoginPage E2E Tests', () => {
  test('should render form and role selectors', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h2')).toContainText('Masuk ke Akun');
    await expect(page.locator('button:has-text("Mahasiswa")')).toBeVisible();
    await expect(page.locator('button:has-text("Pendonor")')).toBeVisible();
    await expect(page.locator('button:has-text("Admin")')).toBeVisible();
  });

  test('should toggle active role registration links', async ({ page }) => {
    await page.goto('/login');
    
    // Switch to Pendonor and verify the register link changes
    await page.click('button:has-text("Pendonor")');
    await expect(page.locator('text=Daftar sebagai Pendonor')).toBeVisible();

    // Switch back to Mahasiswa
    await page.click('button:has-text("Mahasiswa")');
    await expect(page.locator('text=Daftar sebagai Mahasiswa')).toBeVisible();
  });

  test('should show error message on invalid credentials via mocked API', async ({ page }) => {
    // Intercept login API and return 401
    await page.route('**/api/auth/loginAPI', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Email atau password salah.' }),
      });
    });

    await page.goto('/login');
    await page.fill('#email', 'wrong@univ.ac.id');
    await page.fill('#password', 'wrongpass');
    await page.click('button[type="submit"]');

    // Asserts error alert display — using div[role="alert"] to avoid strict match collision with Next announcer
    const alert = page.locator('div[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Email atau password salah.');
  });

  test('should redirect on successful login via mocked API', async ({ page }) => {
    const token = generateMockToken('mahasiswa');

    // Intercept login API and return 200 redirect url with Set-Cookie header
    await page.route('**/api/auth/loginAPI', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Set-Cookie': `token=${token}; Path=/; HttpOnly; SameSite=Lax`
        },
        body: JSON.stringify({ redirect: '/mahasiswa/dashboard' }),
      });
    });

    await page.goto('/login');
    await page.fill('#email', 'mhs@univ.ac.id');
    await page.fill('#password', 'pass123');
    await page.click('button[type="submit"]');

    // Asserts successful URL redirect
    await expect(page).toHaveURL(/\/mahasiswa\/dashboard/);
  });
});
