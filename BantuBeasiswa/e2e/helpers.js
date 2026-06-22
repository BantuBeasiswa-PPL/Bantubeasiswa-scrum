const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Prefer environment variables (set via env-cmd) and fall back to .env.test if missing
const envPath = path.resolve(__dirname, '../.env.test');
let env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
}

const JWT_SECRET = process.env.JWT_SECRET || env.JWT_SECRET || 'eV9tlK8vFvaa8s62LZVh0ssNUfxzV2mN';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Supabase URL or service role key not found in environment. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function generateMockToken(role, extra = {}) {
  const payload = {
    accountId: 123,
    role: role,
    email: `${role}@test.com`,
    nama: `${role.toUpperCase()} Test`,
    userId: 1,
    ...extra
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

async function loginAs(context, role, extra = {}) {
  const token = generateMockToken(role, extra);
  await context.addCookies([
    {
      name: 'token',
      value: token,
      domain: '127.0.0.1',
      path: '/',
    }
  ]);
}

async function cleanAllOldE2ETestData() {
  try {
    // 1. Get test users
    const [u1, u2, u3] = await Promise.all([
      supabase.from('user').select('userId').like('email', 'test_mhs%'),
      supabase.from('user').select('userId').like('email', 'test_mhs2%'),
      supabase.from('user').select('userId').like('email', 'test_mhs_pb16%')
    ]);
    const userIds = [
      ...(u1.data || []).map(u => u.userId),
      ...(u2.data || []).map(u => u.userId),
      ...(u3.data || []).map(u => u.userId)
    ];

    // 2. Get test beasiswa
    const [b1, b2, b3] = await Promise.all([
      supabase.from('beasiswa').select('beasiswaId').like('judul', 'Beasiswa E2E Test%'),
      supabase.from('beasiswa').select('beasiswaId').like('judul', 'Beasiswa Kosong E2E Test%'),
      supabase.from('beasiswa').select('beasiswaId').like('judul', 'Beasiswa E2E Test PB16%')
    ]);
    const beasiswaIds = [
      ...(b1.data || []).map(b => b.beasiswaId),
      ...(b2.data || []).map(b => b.beasiswaId),
      ...(b3.data || []).map(b => b.beasiswaId)
    ];

    // 3. Get test accounts
    const [a1, a2, a3, a4] = await Promise.all([
      supabase.from('account').select('accountId').like('email', 'test_mhs%'),
      supabase.from('account').select('accountId').like('email', 'test_mhs2%'),
      supabase.from('account').select('accountId').like('email', 'test_donor%'),
      supabase.from('account').select('accountId').like('email', 'test_mhs_pb16%')
    ]);
    const accountIds = [
      ...(a1.data || []).map(a => a.accountId),
      ...(a2.data || []).map(a => a.accountId),
      ...(a3.data || []).map(a => a.accountId),
      ...(a4.data || []).map(a => a.accountId)
    ];

    // 4. Perform deletes in order of foreign key dependencies
    if (beasiswaIds.length > 0 || userIds.length > 0) {
      let pQuery1 = [];
      let pQuery2 = [];
      if (beasiswaIds.length > 0) {
        const { data } = await supabase.from('pendaftaran').select('pendaftaranId').in('beasiswaId', beasiswaIds);
        pQuery1 = data || [];
      }
      if (userIds.length > 0) {
        const { data } = await supabase.from('pendaftaran').select('pendaftaranId').in('userId', userIds);
        pQuery2 = data || [];
      }
      const pendaftaranIds = [
        ...pQuery1.map(p => p.pendaftaranId),
        ...pQuery2.map(p => p.pendaftaranId)
      ];

      if (pendaftaranIds.length > 0) {
        await supabase.from('dokumen').delete().in('pendaftaranId', pendaftaranIds);
        await supabase.from('penyaluran_dana').delete().in('pendaftaranId', pendaftaranIds);
      }
    }

    if (beasiswaIds.length > 0) {
      await supabase.from('penyaluran_dana').delete().in('beasiswaId', beasiswaIds);
      await supabase.from('pendaftaran').delete().in('beasiswaId', beasiswaIds);
      await supabase.from('beasiswa').delete().in('beasiswaId', beasiswaIds);
    }

    if (userIds.length > 0) {
      await supabase.from('pendaftaran').delete().in('userId', userIds);
      await supabase.from('notifikasi').delete().in('userId', userIds);
      await supabase.from('rekening').delete().in('userId', userIds);
      await supabase.from('user').delete().in('userId', userIds);
    }

    if (accountIds.length > 0) {
      await supabase.from('pendonor').delete().in('accountId', accountIds);
      await supabase.from('account').delete().in('accountId', accountIds);
    }
  } catch (err) {
    console.error('Failed to clean old E2E test data:', err);
  }
}

// Penyiapan data tes Supabase untuk PB-13 (PBI-23 & PBI-24)
async function createRealDbTestData() {
  await cleanAllOldE2ETestData();
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const mhsEmail = `test_mhs_${randomSuffix}@mail.com`;

  // 1. Buat account mahasiswa
  const { data: mhsAccount, error: mhsAccError } = await supabase
    .from('account')
    .insert({
      email: mhsEmail,
      kataKunci: '$2b$10$YFtf5skKe5dUB1JjYRQBReGvazDUePJB.zdz7pitXaQ7MYYGECtzW', // dummy hash
      role: 'mahasiswa'
    })
    .select()
    .single();
    
  if (mhsAccError) throw mhsAccError;

  // 2. Buat profil user mahasiswa
  const { data: mhsUser, error: mhsUserError } = await supabase
    .from('user')
    .insert({
      accountId: mhsAccount.accountId,
      nama: `Nadhif Mhs ${randomSuffix}`,
      email: mhsEmail,
      kataSandi: '$2b$10$YFtf5skKe5dUB1JjYRQBReGvazDUePJB.zdz7pitXaQ7MYYGECtzW',
      ipk: 4
    })
    .select()
    .single();

  if (mhsUserError) throw mhsUserError;

  // 3. Resolusi pendonorId (mencari pendonor dengan status verified)
  const { data: existingPendonor, error: pendonorErr } = await supabase
    .from('pendonor')
    .select('pendonorId, accountId')
    .eq('statusVerifikasi', 'verified')
    .limit(1)
    .maybeSingle();

  let pendonorId = 1;
  let pendonorAccountId = 5;
  let cleanPendonor = false;

  if (existingPendonor) {
    pendonorId = existingPendonor.pendonorId;
    pendonorAccountId = existingPendonor.accountId;
  } else {
    // buat pendonor sementara jika tidak ada pendonor terverifikasi
    const donorEmail = `test_donor_${randomSuffix}@mail.com`;
    const { data: donorAcc } = await supabase.from('account').insert({ email: donorEmail, role: 'pendonor', kataKunci: 'dummy_hash' }).select().single();
    const { data: donor } = await supabase.from('pendonor').insert({ accountId: donorAcc.accountId, statusVerifikasi: 'verified' }).select().single();
    pendonorId = donor.pendonorId;
    pendonorAccountId = donorAcc.accountId;
    cleanPendonor = true;
  }

  // 4. Buat beasiswa program
  const { data: beasiswa, error: bError } = await supabase
    .from('beasiswa')
    .insert({
      pendonorId: pendonorId,
      judul: `Beasiswa E2E Test ${randomSuffix}`,
      status: 'aktif',
      nominal: 5000000,
      kuota: 10
    })
    .select()
    .single();

  if (bError) throw bError;

  // 4b. Buat beasiswa program kosong
  const { data: beasiswaEmpty, error: bEmptyError } = await supabase
    .from('beasiswa')
    .insert({
      pendonorId: pendonorId,
      judul: `Beasiswa Kosong E2E Test ${randomSuffix}`,
      status: 'aktif',
      nominal: 5000000,
      kuota: 10
    })
    .select()
    .single();

  if (bEmptyError) throw bEmptyError;

  // 5. Buat pendaftaran status TERDAFTAR
  const { data: pendaftaran, error: pError } = await supabase
    .from('pendaftaran')
    .insert({
      userId: mhsUser.userId,
      beasiswaId: beasiswa.beasiswaId,
      status: 'TERDAFTAR'
    })
    .select()
    .single();

  if (pError) throw pError;

  // 6. Buat berkas dokumen pendaftaran 1
  const { data: docs, error: dError } = await supabase
    .from('dokumen')
    .insert([
      {
        pendaftaranId: pendaftaran.pendaftaranId,
        jenis: 'ktp',
        error: 'dokumen/ktp_nadhif.pdf',
        statusDokumen: 'MENUNGGU'
      },
      {
        pendaftaranId: pendaftaran.pendaftaranId,
        jenis: 'transkrip',
        error: 'dokumen/transkrip_nadhif.pdf',
        statusDokumen: 'MENUNGGU'
      }
    ])
    .select();

  if (dError) throw dError;

  // 7. Buat account mahasiswa 2
  const mhsEmail2 = `test_mhs2_${randomSuffix}@mail.com`;
  const { data: mhsAccount2, error: mhsAccError2 } = await supabase
    .from('account')
    .insert({
      email: mhsEmail2,
      kataKunci: 'dummy_hash',
      role: 'mahasiswa'
    })
    .select()
    .single();
    
  if (mhsAccError2) throw mhsAccError2;

  // 8. Buat profil user mahasiswa 2
  const { data: mhsUser2, error: mhsUserError2 } = await supabase
    .from('user')
    .insert({
      accountId: mhsAccount2.accountId,
      nama: `Nadhif Mhs2 ${randomSuffix}`,
      email: mhsEmail2,
      kataSandi: '$2b$10$YFtf5skKe5dUB1JjYRQBReGvazDUePJB.zdz7pitXaQ7MYYGECtzW',
      ipk: 4
    })
    .select()
    .single();

  if (mhsUserError2) throw mhsUserError2;

  // 9. Buat pendaftaran 2 status TERDAFTAR
  const { data: pendaftaran2, error: pError2 } = await supabase
    .from('pendaftaran')
    .insert({
      userId: mhsUser2.userId,
      beasiswaId: beasiswa.beasiswaId,
      status: 'TERDAFTAR'
    })
    .select()
    .single();

  if (pError2) throw pError2;

  // 10. Buat berkas dokumen pendaftaran 2
  const { data: docs2, error: dError2 } = await supabase
    .from('dokumen')
    .insert([
      {
        pendaftaranId: pendaftaran2.pendaftaranId,
        jenis: 'ktp',
        error: 'dokumen/ktp_nadhif2.pdf',
        statusDokumen: 'MENUNGGU'
      }
    ])
    .select();

  if (dError2) throw dError2;

  return {
    mhsAccount,
    mhsUser,
    mhsAccount2,
    mhsUser2,
    beasiswa,
    beasiswaEmpty,
    pendaftaran,
    pendaftaran2,
    docs,
    docs2,
    pendonorId,
    pendonorAccountId,
    cleanPendonor
  };
}

// Pembersihan data tes Supabase untuk PB-13 (PBI-23 & PBI-24)
async function cleanRealDbTestData(data) {
  if (!data) return;
  // Clean pendaftaran 1
  await supabase.from('dokumen').delete().eq('pendaftaranId', data.pendaftaran.pendaftaranId);
  await supabase.from('notifikasi').delete().eq('userId', data.mhsUser.userId);
  await supabase.from('pendaftaran').delete().eq('pendaftaranId', data.pendaftaran.pendaftaranId);
  
  // Clean pendaftaran 2
  if (data.pendaftaran2) {
    await supabase.from('dokumen').delete().eq('pendaftaranId', data.pendaftaran2.pendaftaranId);
    await supabase.from('notifikasi').delete().eq('userId', data.mhsUser2.userId);
    await supabase.from('pendaftaran').delete().eq('pendaftaranId', data.pendaftaran2.pendaftaranId);
  }

  // Clean beasiswa
  await supabase.from('beasiswa').delete().eq('beasiswaId', data.beasiswa.beasiswaId);
  if (data.beasiswaEmpty) {
    await supabase.from('beasiswa').delete().eq('beasiswaId', data.beasiswaEmpty.beasiswaId);
  }

  // Clean users
  await supabase.from('user').delete().eq('userId', data.mhsUser.userId);
  await supabase.from('account').delete().eq('accountId', data.mhsAccount.accountId);
  if (data.mhsUser2) {
    await supabase.from('user').delete().eq('userId', data.mhsUser2.userId);
    await supabase.from('account').delete().eq('accountId', data.mhsAccount2.accountId);
  }
  
  if (data.cleanPendonor) {
    await supabase.from('pendonor').delete().eq('pendonorId', data.pendonorId);
    await supabase.from('account').delete().eq('accountId', data.pendonorAccountId);
  }
}

// Penyiapan data tes Supabase untuk PB-16 (PBI-28 & PBI-29)
async function createRealDbTestDataPB16() {
  await cleanAllOldE2ETestData();
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const mhsEmail = `test_mhs_pb16_${randomSuffix}@mail.com`;
  
  // 1. Buat account mahasiswa
  const { data: mhsAccount, error: mhsAccError } = await supabase
    .from('account')
    .insert({
      email: mhsEmail,
      kataKunci: 'dummy_hash',
      role: 'mahasiswa'
    })
    .select()
    .single();

  if (mhsAccError) throw mhsAccError;

  // 2. Buat profil user mahasiswa
  const { data: mhsUser, error: mhsUserError } = await supabase
    .from('user')
    .insert({
      accountId: mhsAccount.accountId,
      nama: `Andi Pratama Test ${randomSuffix}`,
      email: mhsEmail,
      kataSandi: '$2b$10$YFtf5skKe5dUB1JjYRQBReGvazDUePJB.zdz7pitXaQ7MYYGECtzW',
      ipk: 4
    })
    .select()
    .single();

  if (mhsUserError) throw mhsUserError;

  // 3. Buat rekening terverifikasi
  const randomRek = String(Math.floor(1000000000 + Math.random() * 9000000000));
  const { data: rekening, error: rekError } = await supabase
    .from('rekening')
    .insert({
      userId: mhsUser.userId,
      namRekening: `BCA - Andi Pratama Test ${randomSuffix}`,
      nomorRekening: randomRek,
      namaBank: 'BCA',
      namaPemilik: `Andi Pratama Test ${randomSuffix}`,
      status: 'aktif'
    })
    .select()
    .single();

  if (rekError) throw rekError;

  // 4. Resolusi pendonorId
  const { data: existingPendonor } = await supabase
    .from('pendonor')
    .select('pendonorId, accountId')
    .eq('statusVerifikasi', 'verified')
    .limit(1)
    .maybeSingle();

  let pendonorId = 1;
  let pendonorAccountId = 5;
  let cleanPendonor = false;

  if (existingPendonor) {
    pendonorId = existingPendonor.pendonorId;
    pendonorAccountId = existingPendonor.accountId;
  } else {
    const donorEmail = `test_donor_${randomSuffix}@mail.com`;
    const { data: donorAcc } = await supabase.from('account').insert({ email: donorEmail, role: 'pendonor', kataKunci: 'dummy_hash' }).select().single();
    const { data: donor } = await supabase.from('pendonor').insert({ accountId: donorAcc.accountId, statusVerifikasi: 'verified' }).select().single();
    pendonorId = donor.pendonorId;
    pendonorAccountId = donorAcc.accountId;
    cleanPendonor = true;
  }

  // 5. Buat program beasiswa
  const { data: beasiswa, error: bError } = await supabase
    .from('beasiswa')
    .insert({
      pendonorId: pendonorId,
      judul: `Beasiswa E2E Test PB16 ${randomSuffix}`,
      status: 'aktif',
      nominal: 5000000,
      kuota: 10
    })
    .select()
    .single();

  if (bError) throw bError;

  // 6. Buat pendaftaran status LULUS
  const { data: pendaftaran, error: pError } = await supabase
    .from('pendaftaran')
    .insert({
      userId: mhsUser.userId,
      beasiswaId: beasiswa.beasiswaId,
      status: 'LULUS'
    })
    .select()
    .single();

  if (pError) throw pError;

  // 7. Buat record penyaluran_dana
  const { data: penyaluran, error: penyaluranError } = await supabase
    .from('penyaluran_dana')
    .insert({
      pendonorId: pendonorId,
      beasiswaId: beasiswa.beasiswaId,
      pendaftaranId: pendaftaran.pendaftaranId,
      jumlahDana: beasiswa.nominal,
      jumlahPenerima: 1,
      status: 'pending'
    })
    .select()
    .single();

  if (penyaluranError) throw penyaluranError;

  return {
    mhsAccount,
    mhsUser,
    rekening,
    beasiswa,
    pendaftaran,
    penyaluran,
    pendonorId,
    pendonorAccountId,
    cleanPendonor
  };
}

// Pembersihan data tes Supabase untuk PB-16 (PBI-28 & PBI-29)
async function cleanRealDbTestDataPB16(data) {
  if (!data) return;
  await supabase.from('penyaluran_dana').delete().eq('pendaftaranId', data.pendaftaran.pendaftaranId);
  await supabase.from('pendaftaran').delete().eq('pendaftaranId', data.pendaftaran.pendaftaranId);
  await supabase.from('beasiswa').delete().eq('beasiswaId', data.beasiswa.beasiswaId);
  await supabase.from('rekening').delete().eq('userId', data.mhsUser.userId);
  await supabase.from('user').delete().eq('userId', data.mhsUser.userId);
  await supabase.from('account').delete().eq('accountId', data.mhsAccount.accountId);
  
  if (data.cleanPendonor) {
    await supabase.from('pendonor').delete().eq('pendonorId', data.pendonorId);
    await supabase.from('account').delete().eq('accountId', data.pendonorAccountId);
  }
}

async function gotoSeleksiPendaftar(page, beasiswaId) {
  await page.goto(`/pendonor/seleksi-pendaftar?beasiswaId=${beasiswaId}`);
  // Wait for loading skeleton to disappear to ensure DOM is fully rendered before query
  await page.waitForFunction(() => {
    return !document.querySelector('.animate-pulse');
  }, { timeout: 15000 }).catch(() => {});
  
  await page.waitForFunction(() => {
    const el = document.getElementById('scholarship-program-select');
    return !!(el && el.offsetHeight > 0);
  }, { timeout: 5000 }).catch(() => {});
}

module.exports = {
  generateMockToken,
  loginAs,
  createRealDbTestData,
  cleanRealDbTestData,
  createRealDbTestDataPB16,
  cleanRealDbTestDataPB16,
  gotoSeleksiPendaftar,
  supabase
};

