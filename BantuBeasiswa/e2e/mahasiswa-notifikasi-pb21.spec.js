const { test, expect } = require('@playwright/test');
const { loginAs, pauseForDebug, supabase, resetE2EDatabase } = require('./helpers');

// ============================================================
// Helper: setup data test di DB untuk PB21
// ============================================================
async function createTestDataPB21(notifikasi = []) {
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const mhsEmail = `test_mhs_pb21_${randomSuffix}@mail.com`;

  // 1. Buat account mahasiswa
  const { data: mhsAccount, error: mhsAccError } = await supabase
    .from('account')
    .insert({
      email: mhsEmail,
      kataKunci: '$2b$10$YFtf5skKe5dUB1JjYRQBReGvazDUePJB.zdz7pitXaQ7MYYGECtzW',
      role: 'mahasiswa',
    })
    .select()
    .single();
  if (mhsAccError) throw new Error('Gagal insert account: ' + mhsAccError.message);

  // 2. Buat profil user mahasiswa
  const { data: mhsUser, error: mhsUserError } = await supabase
    .from('user')
    .insert({
      accountId: mhsAccount.accountId,
      nama: `Testing Mahasiswa PB21 ${randomSuffix}`,
      email: mhsEmail,
      kataSandi: '$2b$10$YFtf5skKe5dUB1JjYRQBReGvazDUePJB.zdz7pitXaQ7MYYGECtzW',
      ipk: 3.5,
    })
    .select()
    .single();
  if (mhsUserError) throw new Error('Gagal insert user: ' + mhsUserError.message);

  // 3. Insert notifikasi kalau ada
  let insertedNotifs = [];
  if (notifikasi.length > 0) {
    const rows = notifikasi.map(n => ({ ...n, userId: mhsUser.userId }));
    const { data: inserted, error: notifError } = await supabase
      .from('notifikasi')
      .insert(rows)
      .select();
    if (notifError) throw new Error('Gagal insert notifikasi: ' + notifError.message);
    insertedNotifs = inserted;
  }

  return { mhsAccount, mhsUser, notifikasi: insertedNotifs };
}

// ============================================================
// Helper: cleanup data test dari DB
// ============================================================
async function cleanTestDataPB21(data) {
  if (!data) return;
  await supabase.from('notifikasi').delete().eq('userId', data.mhsUser.userId);
  await supabase.from('user').delete().eq('userId', data.mhsUser.userId);
  await supabase.from('account').delete().eq('accountId', data.mhsAccount.accountId);
}

// ============================================================
// Helper: login dan buka halaman notifikasi
// ============================================================
async function openInbox(page, context, data) {
  await loginAs(context, 'mahasiswa', {
    accountId: data.mhsAccount.accountId,
    userId: data.mhsUser.userId,
    nama: data.mhsUser.nama,
    email: data.mhsUser.email,
  });

  await page.goto('/mahasiswa/notifikasi');
  await expect(page.getByRole('heading', { name: 'Notifikasi' })).toBeVisible();
}

// ============================================================
// Data notifikasi default
// ============================================================
const notifikasiDefault = [
  {
    pesan: 'Pengumuman hasil seleksi beasiswa Anda sudah tersedia.',
    isRead: false,
    createdAt: '2026-06-14T08:00:00.000Z',
  },
  {
    pesan: 'Dokumen transkrip Anda sudah diverifikasi.',
    isRead: true,
    createdAt: '2026-06-13T08:00:00.000Z',
  },
];

// ============================================================
// Test Suite
// ============================================================
test.describe('PB-21 - Manajemen Notifikasi Mahasiswa (Real DB)', () => {
  let testData;

  test.afterEach(async () => {
    await cleanTestDataPB21(testData);
    testData = null;
  });

  test('TC-PB21-001: inbox menampilkan notifikasi masuk dan status baca/belum dibaca', async ({ page, context }) => {
    await resetE2EDatabase();
    testData = await createTestDataPB21(notifikasiDefault);
    await openInbox(page, context, testData);
    await pauseForDebug(page);

    await expect(page.getByText('Pengumuman hasil seleksi beasiswa Anda sudah tersedia.')).toBeVisible();
    await expect(page.getByText('Dokumen transkrip Anda sudah diverifikasi.')).toBeVisible();
    await expect(page.getByText('Baru', { exact: true })).toBeVisible();
    await expect(page.getByText('Terbaca', { exact: true })).toBeVisible();
    await expect(page.getByText('2 total notifikasi')).toBeVisible();
    await expect(page.getByText('1 belum dibaca')).toBeVisible();
  });

  test('TC-PB21-002: label status notifikasi baru dan terbaca tampil sesuai kondisi', async ({ page, context }) => {
    testData = await createTestDataPB21(notifikasiDefault);
    await openInbox(page, context, testData);

    await expect(page.getByText('Baru', { exact: true })).toBeVisible();
    await expect(page.getByText('Terbaca', { exact: true })).toBeVisible();
  });

  test('TC-PB21-003: jumlah total notifikasi tampil', async ({ page, context }) => {
    testData = await createTestDataPB21(notifikasiDefault);
    await openInbox(page, context, testData);

    await expect(page.getByText('2 total notifikasi')).toBeVisible();
  });

  test('TC-PB21-004: jumlah notifikasi belum dibaca tampil', async ({ page, context }) => {
    testData = await createTestDataPB21(notifikasiDefault);
    await openInbox(page, context, testData);

    await expect(page.getByText('1 belum dibaca')).toBeVisible();
  });

  test('TC-PB21-005: tombol tandai semua dibaca mengubah status di DB', async ({ page, context }) => {
    testData = await createTestDataPB21(notifikasiDefault);
    await openInbox(page, context, testData);

    await page.getByRole('button', { name: 'Tandai Semua Dibaca' }).click();

    await expect(page.getByText('0 belum dibaca')).toBeVisible();
    await expect(page.getByText('Baru', { exact: true })).toHaveCount(0);

    // Verifikasi langsung ke DB
    const { data } = await supabase
      .from('notifikasi')
      .select('isRead')
      .eq('userId', testData.mhsUser.userId);
    const adaYangBelumDibaca = data.some(n => n.isRead === false);
    expect(adaYangBelumDibaca).toBe(false);
  });

  test('TC-PB21-006: klik satu notifikasi menandainya sebagai dibaca di DB', async ({ page, context }) => {
    testData = await createTestDataPB21(notifikasiDefault);
    await openInbox(page, context, testData);

    const notifId = testData.notifikasi[0].notifikasiId;
    await page.locator(`#notif-${notifId}`).click();

    await expect(page.getByText('0 belum dibaca')).toBeVisible();
    await expect(page.getByText('Baru', { exact: true })).toHaveCount(0);

    // Verifikasi langsung ke DB
    const { data } = await supabase
      .from('notifikasi')
      .select('isRead')
      .eq('notifikasiId', notifId)
      .single();
    expect(data.isRead).toBe(true);
  });

  test('TC-PB21-007: panel notifikasi terbuka dari ikon header', async ({ page, context }) => {
    testData = await createTestDataPB21(notifikasiDefault);
    await openInbox(page, context, testData);
    await page.goto('/mahasiswa/dashboard');

    await page.getByRole('button', { name: 'Notifikasi' }).click();
    await expect(page.getByRole('dialog', { name: 'Panel notifikasi' })).toBeVisible();
  });

  test('TC-PB21-008: preview notifikasi terbaru tampil pada panel header', async ({ page, context }) => {
    testData = await createTestDataPB21(notifikasiDefault);
    await openInbox(page, context, testData);
    await page.goto('/mahasiswa/dashboard');

    await page.getByRole('button', { name: 'Notifikasi' }).click();
    await expect(
      page.getByText('Pengumuman hasil seleksi beasiswa Anda sudah tersedia.')
    ).toBeVisible();
  });

  test('TC-PB21-009: link lihat semua notifikasi tampil di panel header', async ({ page, context }) => {
    testData = await createTestDataPB21(notifikasiDefault);
    await openInbox(page, context, testData);
    await page.goto('/mahasiswa/dashboard');

    await page.getByRole('button', { name: 'Notifikasi' }).click();
    await expect(
      page.getByRole('link', { name: /lihat semua notifikasi/i })
    ).toBeVisible();
  });

  test('TC-PB21-010: empty state tampil saat tidak ada notifikasi', async ({ page, context }) => {
    testData = await createTestDataPB21([]);
    await openInbox(page, context, testData);

    await expect(page.getByRole('heading', { name: 'Belum ada notifikasi' })).toBeVisible();
  });

  test('TC-PB21-011: pesan bantuan tampil saat tidak ada notifikasi', async ({ page, context }) => {
    testData = await createTestDataPB21([]);
    await openInbox(page, context, testData);

    await expect(
      page.getByText('Kami akan memberitahumu di sini saat ada kabar terbaru mengenai pendaftaran beasiswamu.')
    ).toBeVisible();
  });
});
