const { expect } = require('@playwright/test');
const { loginAs, supabase } = require('../helpers');

async function createTestDataPB14(status) {
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const mhsEmail = `test_mhs_pb14_${randomSuffix}@mail.com`;

  console.log('========================================');
  console.log('[PB14] Mulai setup data test, suffix:', randomSuffix);
  console.log('[PB14] Supabase URL terpakai:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  async function upsertAccount(payload, label) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const { data, error } = await supabase
        .from('account')
        .upsert(payload, { onConflict: 'email' })
        .select()
        .single();

      if (!error && data) return data;

      if (attempt === 2) {
        console.error(`[PB14] GAGAL upsert ${label}:`, error?.message);
        throw new Error(`Gagal upsert ${label}: ${error?.message || 'unknown error'}`);
      }

      await new Promise(resolve => setTimeout(resolve, 750));
    }
  }

  const mhsAccount = await upsertAccount({
    email: mhsEmail,
    kataKunci: '$2b$10$YFtf5skKe5dUB1JjYRQBReGvazDUePJB.zdz7pitXaQ7MYYGECtzW',
    role: 'mahasiswa',
  }, 'account mahasiswa');
  console.log('[PB14] Account dibuat -> accountId:', mhsAccount.accountId, '| email:', mhsAccount.email);

  const { data: mhsUser, error: mhsUserError } = await supabase
    .from('user')
    .insert({
      accountId: mhsAccount.accountId,
      nama: `Testing Mahasiswa PB14 ${randomSuffix}`,
      email: mhsEmail,
      kataSandi: '$2b$10$YFtf5skKe5dUB1JjYRQBReGvazDUePJB.zdz7pitXaQ7MYYGECtzW',
      ipk: 3.5,
    })
    .select()
    .single();
  if (mhsUserError) {
    console.error('[PB14] GAGAL insert user:', mhsUserError.message);
    throw new Error('Gagal insert user: ' + mhsUserError.message);
  }
  console.log('[PB14] User dibuat -> userId:', mhsUser.userId, '| nama:', mhsUser.nama);

  const { data: existingPendonor } = await supabase
    .from('pendonor')
    .select('pendonorId, accountId')
    .eq('statusVerifikasi', 'verified')
    .limit(1)
    .maybeSingle();

  let pendonorId;
  let pendonorAccountId;
  let cleanPendonor = false;

  if (existingPendonor) {
    pendonorId = existingPendonor.pendonorId;
    pendonorAccountId = existingPendonor.accountId;
    console.log('[PB14] Pakai pendonor existing -> pendonorId:', pendonorId);
  } else {
    const donorEmail = `test_donor_pb14_${randomSuffix}@mail.com`;
    const donorAcc = await upsertAccount(
      { email: donorEmail, role: 'pendonor', kataKunci: 'dummy_hash' },
      'account pendonor'
    );
    const { data: donor } = await supabase
      .from('pendonor')
      .insert({ accountId: donorAcc.accountId, statusVerifikasi: 'verified' })
      .select()
      .single();
    pendonorId = donor.pendonorId;
    pendonorAccountId = donorAcc.accountId;
    cleanPendonor = true;
    console.log('[PB14] Pendonor baru dibuat -> pendonorId:', pendonorId);
  }

  const { data: beasiswa, error: bError } = await supabase
    .from('beasiswa')
    .insert({
      pendonorId,
      judul: 'Beasiswa Visual Nusantara 2026',
      status: 'aktif',
      nominal: 7500000,
      kuota: 10,
    })
    .select()
    .single();
  if (bError) {
    console.error('[PB14] GAGAL insert beasiswa:', bError.message);
    throw new Error('Gagal insert beasiswa: ' + bError.message);
  }
  console.log('[PB14] Beasiswa dibuat -> beasiswaId:', beasiswa.beasiswaId, '| judul:', beasiswa.judul);

  const { data: pendaftaran, error: pError } = await supabase
    .from('pendaftaran')
    .insert({
      userId: mhsUser.userId,
      beasiswaId: beasiswa.beasiswaId,
      status,
    })
    .select()
    .single();
  if (pError) {
    console.error('[PB14] GAGAL insert pendaftaran:', pError.message);
    throw new Error('Gagal insert pendaftaran: ' + pError.message);
  }
  console.log('[PB14] Pendaftaran dibuat -> pendaftaranId:', pendaftaran.pendaftaranId, '| status:', pendaftaran.status);
  console.log('[PB14] SETUP SELESAI - semua data berhasil masuk DB');
  console.log('========================================');

  return {
    mhsAccount,
    mhsUser,
    beasiswa,
    pendaftaran,
    pendonorId,
    pendonorAccountId,
    cleanPendonor,
  };
}

async function cleanTestDataPB14(data) {
  if (!data) return;
  console.log('[PB14] Cleanup data -> userId:', data.mhsUser.userId, '| beasiswaId:', data.beasiswa.beasiswaId);
  await supabase.from('notifikasi').delete().eq('userId', data.mhsUser.userId);
  await supabase.from('pendaftaran').delete().eq('pendaftaranId', data.pendaftaran.pendaftaranId);
  await supabase.from('beasiswa').delete().eq('beasiswaId', data.beasiswa.beasiswaId);
  await supabase.from('user').delete().eq('userId', data.mhsUser.userId);
  await supabase.from('account').delete().eq('accountId', data.mhsAccount.accountId);
  if (data.cleanPendonor) {
    await supabase.from('pendonor').delete().eq('pendonorId', data.pendonorId);
    await supabase.from('account').delete().eq('accountId', data.pendonorAccountId);
  }
}

async function openStatusPage(page, context, data) {
  await loginAs(context, 'mahasiswa', {
    accountId: data.mhsAccount.accountId,
    userId: data.mhsUser.userId,
    nama: data.mhsUser.nama,
    email: data.mhsUser.email,
  });

  await page.goto(`/mahasiswa/status-pendaftaran?id=${data.pendaftaran.pendaftaranId}`);
  await expect(page.getByRole('heading', { name: 'Beasiswa Visual Nusantara 2026' })).toBeVisible();
}

async function expectResultBanner(page, tone, status) {
  const banner = page.getByTestId('result-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toHaveAttribute('data-result-tone', tone);
  await expect(banner).toHaveAttribute('data-result-status', status);
}

module.exports = {
  cleanTestDataPB14,
  createTestDataPB14,
  expectResultBanner,
  openStatusPage,
};
