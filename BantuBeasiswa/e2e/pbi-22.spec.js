const { test, expect } = require('@playwright/test');
const { loginAs } = require('./helpers');

test.describe('PBI 22: Manajemen Program Beasiswa (Pendonor)', () => {
  let mockBeasiswaList = [];

  test.beforeEach(async ({ page, context }) => {
    // Verified pendonor credentials
    await loginAs(context, 'pendonor', { accountId: 38, userId: 11, email: 'yayasanpersija@gmail.com' });

    // Mock API list
    mockBeasiswaList = [
      {
        beasiswaId: 101,
        judul: 'Beasiswa Berprestasi Unggul 2026',
        jalur: 'Prestasi',
        deskripsi: 'Beasiswa untuk mahasiswa berprestasi akademik tinggi dari daerah afirmasi.',
        syarat: 'IPK >= 3.5, Sertifikat lomba',
        nominal: 5000000,
        kuota: 10,
        linkPendaftaran: 'https://contoh.com/daftar',
        deadline: '2026-12-31T12:00:00Z', // 12:00:00Z to ensure it stays 31 Dec 2026 across timezones (e.g. GMT to GMT+11)
        status: 'draft',
        alasanPenolakan: null,
        createdAt: '2026-06-01T08:00:00Z',
        pendaftaran: [{ count: 0 }]
      },
      {
        beasiswaId: 102,
        judul: 'Beasiswa Teknologi Masa Depan',
        jalur: 'Riset',
        deskripsi: 'Beasiswa riset untuk program studi ilmu komputer di wilayah 3T.',
        syarat: 'Proposal riset AI',
        nominal: 12000000,
        kuota: 5,
        linkPendaftaran: 'https://contoh.com/tech',
        deadline: '2026-08-30T12:00:00Z',
        status: 'aktif',
        alasanPenolakan: null,
        createdAt: '2026-06-02T09:00:00Z',
        pendaftaran: [{ count: 2 }]
      }
    ];

    // Intercept GET beasiswa
    await page.route('**/api/pendonor/beasiswa', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Daftar program beasiswa berhasil diambil',
          count: mockBeasiswaList.length,
          data: mockBeasiswaList
        })
      });
    });

    // Intercept GET provinsi
    await page.route('**/api/provinsi', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { provinsiId: 1, nama: 'Jawa Barat', isAfirmasi: false },
          { provinsiId: 2, nama: 'Papua', isAfirmasi: true }
        ])
      });
    });
  });

  test('TC-22-01: Buka Modal Form Pembuatan Beasiswa', async ({ page }) => {
    await page.goto('/pendonor/program');

    // Click "+ Buat Program Baru"
    await page.click('button:has-text("Buat Program Baru")');

    // Assert modal form title is visible
    await expect(page.locator('h3:has-text("Buat Program Beasiswa Baru")')).toBeVisible();

    // Assert all fields are empty
    await expect(page.locator('input[placeholder*="Contoh: Beasiswa Prestasi"]')).toHaveValue('');
    await expect(page.locator('textarea[placeholder*="Jelaskan program"]')).toHaveValue('');
    await expect(page.locator('textarea[placeholder*="Syarat-syarat"]')).toHaveValue('');
    await expect(page.locator('input[placeholder="5.000.000"]')).toHaveValue('');
    await expect(page.locator('input[placeholder="50"]')).toHaveValue('');
    await expect(page.locator('input[type="datetime-local"]')).toHaveValue('');
  });

  test('TC-22-02: Submit Pembuatan Program Baru dengan Status draft (Simpan Draft)', async ({ page }) => {
    let createdPayload = null;

    // Intercept POST create
    await page.route('**/api/pendonor/beasiswa/create', async (route) => {
      expect(route.request().method()).toBe('POST');
      createdPayload = JSON.parse(route.request().postData());
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ beasiswaId: 103, message: 'Program beasiswa berhasil dibuat' })
      });
    });

    await page.goto('/pendonor/program');

    await page.click('button:has-text("Buat Program Baru")');

    // Fill form
    await page.fill('input[placeholder*="Contoh: Beasiswa Prestasi"]', 'Beasiswa Berprestasi Unggul 2026');
    await page.fill('textarea[placeholder*="Jelaskan program"]', 'Beasiswa ini ditujukan untuk mahasiswa berprestasi akademik tinggi dengan IPK di atas 3.5 secara konsisten.'); // >= 50 chars
    await page.fill('textarea[placeholder*="Syarat-syarat"]', 'IPK >= 3.5, Sertifikat lomba');
    await page.fill('input[placeholder="5.000.000"]', '5.000.000');
    await page.fill('input[placeholder="50"]', '10');
    await page.fill('input[type="datetime-local"]', '2026-12-31T23:59');

    // Select province target checkbox
    await page.check('input[type="checkbox"] >> nth=0');

    // Submit form (Buat Program) - specifically target the form submit button to avoid duplicate matches
    await page.locator('button[type="submit"]').filter({ hasText: /^Buat Program$/ }).click();

    // Assert API body values
    expect(createdPayload).toEqual({
      judul: 'Beasiswa Berprestasi Unggul 2026',
      deskripsi: 'Beasiswa ini ditujukan untuk mahasiswa berprestasi akademik tinggi dengan IPK di atas 3.5 secara konsisten.',
      syarat: 'IPK >= 3.5, Sertifikat lomba',
      nominal: 5000000,
      kuota: 10,
      deadline: '2026-12-31T23:59',
      provinsiIds: [1]
    });

    // Assert modal is closed
    await expect(page.locator('h3:has-text("Buat Program Beasiswa Baru")')).not.toBeVisible();
  });

  test('TC-22-03: Validasi Form - Nominal & Kuota Harus Positif', async ({ page }) => {
    await page.goto('/pendonor/program');
    await page.click('button:has-text("Buat Program Baru")');

    // Fill invalid kuota and nominal (non-positive)
    await page.fill('input[placeholder*="Contoh: Beasiswa Prestasi"]', 'Beasiswa Cacat Angka');
    await page.fill('textarea[placeholder*="Jelaskan program"]', 'Deskripsi ini dibuat sepanjang 50 karakter agar memenuhi syarat client-side validation.');
    await page.fill('input[placeholder="5.000.000"]', '0'); // Invalid
    await page.fill('input[placeholder="50"]', '-5'); // Invalid
    await page.fill('input[type="datetime-local"]', '2026-12-31T23:59');
    await page.check('input[type="checkbox"] >> nth=0');

    // Remove native browser validations to test client-side React validator
    await page.$eval('input[placeholder="5.000.000"]', el => el.removeAttribute('required'));
    await page.$eval('input[placeholder="50"]', el => {
      el.removeAttribute('required');
      el.removeAttribute('min');
    });

    await page.locator('button[type="submit"]').filter({ hasText: /^Buat Program$/ }).click();

    // Expect error alert is visible
    const errorMsg = page.getByText('Nominal harus lebih dari 0', { exact: true });
    await expect(errorMsg).toBeVisible();
  });

  test('TC-22-04: Verifikasi Kolom dan Format Tabel', async ({ page }) => {
    await page.goto('/pendonor/program');

    // Verify headers only if table is rendered (table layout vs card layout)
    const hasTable = await page.locator('table').count() > 0;
    if (hasTable) {
      await expect(page.locator('th:has-text("Judul Beasiswa")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible();
      await expect(page.locator('th:has-text("Kuota")')).toBeVisible();
      await expect(page.locator('th:has-text("Batas Waktu")')).toBeVisible();
      await expect(page.locator('th:has-text("Pendaftar")')).toBeVisible();
      await expect(page.locator('th:has-text("Aksi")')).toBeVisible();
    }

    // Verify Rupiah formatted text in draft row/card
    const draftItem = page.locator('tr, div.rounded-xl.border, div.rounded-xl').filter({ hasText: 'Beasiswa Berprestasi Unggul 2026' }).first();
    await expect(draftItem).toContainText('Rp 5.000.000');

    // Verify deadline format (should format to date Indonesian)
    await expect(draftItem).toContainText('31 Des 2026');
  });

  test('TC-22-05: Statistik Ringkasan Program (Stats Cards)', async ({ page }) => {
    await page.goto('/pendonor/program');

    // Cards total checks (scoping specifically by locating via span text and navigating to the card's value)
    await expect(page.locator('span:text-is("Total Program")').locator('xpath=../../p')).toHaveText('2');
    await expect(page.locator('span:text-is("Aktif")').locator('xpath=../../p')).toHaveText('1');
    await expect(page.locator('span:text-is("Draft")').locator('xpath=../../p')).toHaveText('1');
    await expect(page.locator('span:text-is("Total Pendaftar")').locator('xpath=../../p')).toHaveText('2');
  });

  test('TC-22-06: Mempublikasikan Program Beasiswa dari Draft (Publish Action)', async ({ page }) => {
    let patchCalled = false;

    // Intercept PATCH submit
    await page.route('**/api/pendonor/beasiswa/101', async (route) => {
      expect(route.request().method()).toBe('PATCH');
      patchCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ beasiswaId: 101, status: 'pending', message: 'Status updated' })
      });
    });

    await page.goto('/pendonor/program');

    const draftItem = page.locator('tr, div.rounded-xl.border, div.rounded-xl').filter({ hasText: 'Beasiswa Berprestasi Unggul 2026' }).first();
    await expect(draftItem).toContainText('Draft');

    // Hover to reveal action buttons if layout is card-based
    await draftItem.hover();

    // Click Ajukan button
    const ajukanButton = draftItem.locator('button[title*="Ajukan"], button:has-text("Ajukan"), button:has-text("🚀")');
    await ajukanButton.click();

    // Wait and confirm SweetAlert
    const swal = page.locator('.swal2-popup:has-text("Ajukan Persetujuan?")');
    await expect(swal).toBeVisible();
    await swal.locator('button:has-text("Ya, Ajukan")').click();

    // Success Swal confirmation
    const successSwal = page.locator('.swal2-popup:has-text("Berhasil!")');
    await expect(successSwal).toBeVisible();
    await successSwal.locator('button:has-text("OK")').click();

    expect(patchCalled).toBe(true);
  });

  test('TC-22-07: Mengedit Program Beasiswa', async ({ page }) => {
    let putPayload = null;

    // Intercept PUT update
    await page.route('**/api/pendonor/beasiswa/101', async (route) => {
      expect(route.request().method()).toBe('PUT');
      putPayload = JSON.parse(route.request().postData());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ beasiswaId: 101, message: 'Beasiswa updated' })
      });
    });

    await page.goto('/pendonor/program');

    const draftItem = page.locator('tr, div.rounded-xl.border, div.rounded-xl').filter({ hasText: 'Beasiswa Berprestasi Unggul 2026' }).first();
    await draftItem.hover();

    const editButton = draftItem.locator('button[title*="Edit"], button:has-text("Edit"), button:has-text("✏️")');
    await editButton.click();

    // Verify modal and edit fields
    const editModal = page.locator('h3:has-text("Edit Program Beasiswa")').locator('xpath=../..');
    await expect(editModal).toBeVisible();

    // Change kuota and submit
    await editModal.locator('input[placeholder="50"]').fill('15');
    await editModal.locator('button[type="submit"]').click();

    expect(putPayload.kuota).toBe(15);
    await expect(editModal).not.toBeVisible();
  });

  test('TC-22-08: Menghapus Program Beasiswa Berstatus Draft', async ({ page }) => {
    let deleteCalled = false;

    // Intercept DELETE
    await page.route('**/api/pendonor/beasiswa/101', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      deleteCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Deleted' })
      });
    });

    await page.goto('/pendonor/program');

    const draftItem = page.locator('tr, div.rounded-xl.border, div.rounded-xl').filter({ hasText: 'Beasiswa Berprestasi Unggul 2026' }).first();
    await draftItem.hover();

    const deleteButton = draftItem.locator('button[title*="Hapus"], button:has-text("Hapus"), button:has-text("🗑️")');
    await deleteButton.click();

    // Confirm SweetAlert
    const swal = page.locator('.swal2-popup:has-text("Hapus Program?")');
    await expect(swal).toBeVisible();
    await swal.locator('button:has-text("Ya, Hapus")').click();

    // Confirm success Swal
    const successSwal = page.locator('.swal2-popup:has-text("Berhasil!")');
    await expect(successSwal).toBeVisible();
    await successSwal.locator('button:has-text("OK")').click();

    expect(deleteCalled).toBe(true);
  });

  test('TC-22-09: Proteksi Penghapusan - Program Berstatus Aktif', async ({ page }) => {
    await page.goto('/pendonor/program');

    const activeItem = page.locator('tr, div.rounded-xl.border, div.rounded-xl').filter({ hasText: 'Beasiswa Teknologi Masa Depan' }).first();
    await activeItem.hover();

    const deleteButton = activeItem.locator('button[title*="Hapus"], button:has-text("Hapus"), button:has-text("🗑️")');
    
    // In card layout, the delete button is not even rendered for active programs.
    // In table layout, it is rendered but blocked on click.
    if (await deleteButton.count() > 0 && await deleteButton.isVisible()) {
      await deleteButton.click();

      // Verify SweetAlert error pops up indicating active deletion is blocked
      const swal = page.locator('.swal2-popup:has-text("Gagal")');
      await expect(swal).toBeVisible();
      await expect(swal.locator('.swal2-html-container')).toContainText('Program yang sedang aktif tidak dapat dihapus');
      await swal.locator('button:has-text("OK")').click();
    } else {
      console.log('Delete button is not visible or rendered for active program (Card layout protection).');
    }
  });
});
