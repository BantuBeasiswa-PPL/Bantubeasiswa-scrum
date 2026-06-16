const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Prefer environment variables (set via env-cmd) and fall back to .env.local if missing
const envPath = path.resolve(__dirname, '../.env.local');
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
      domain: 'localhost',
      path: '/',
    }
  ]);
}

// Penyiapan data tes Supabase untuk PB-13 (PBI-23 & PBI-24)
async function createRealDbTestData() {
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

module.exports = {
  generateMockToken,
  loginAs,
  createRealDbTestData,
  cleanRealDbTestData,
  createRealDbTestDataPB16,
  cleanRealDbTestDataPB16,
  supabase
};
