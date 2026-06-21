const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const FALLBACK_JWT_SECRET = 'bantubeasiswa_secret_key_ppl_2026_ganti_ini';
function loadEnvTesting() {
  // __dirname = folder e2e/, jadi '..' artinya naik ke root project (BantuBeasiswa/)
  const envPath = path.resolve(__dirname, '..', '.env.testing');
  if (!fs.existsSync(envPath)) {
    console.warn('[helpers.js] .env.testing tidak ditemukan di:', envPath);
    return;
  }
  const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}
loadEnvTesting();
function loadJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  return FALLBACK_JWT_SECRET;
}
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
function generateMockToken(role, extra = {}) {
  const payload = {
    accountId: 123,
    role: role,
    email: `${role}@test.com`,
    nama: `${role.toUpperCase()} Test`,
    userId: 1,
    ...extra,
  };
  return jwt.sign(payload, loadJwtSecret(), { expiresIn: '7d' });
}

function uniqById(rows, idKey) {
  return Array.from(
    new Map((rows || []).filter(Boolean).map(row => [row[idKey], row])).values()
  );
}

async function fetchRows(builder) {
  const { data, error } = await builder;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function deleteByIds(table, column, ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (!uniqueIds.length) return;
  const { error } = await supabase.from(table).delete().in(column, uniqueIds);
  if (error) throw error;
}

async function pauseForDebug(page) {
  if (process.env.E2E_DEBUG_PAUSE === '1') {
    await page.pause();
  }
}

async function holdForVisualCheck(page) {
  const holdMs = Number(process.env.E2E_VISUAL_HOLD_MS || 0);
  if (holdMs > 0) {
    await page.waitForTimeout(holdMs);
  }
}

async function resetE2EDatabase() {
  const accounts = await fetchRows(
    supabase.from('account').select('accountId,email,role').ilike('email', 'test%')
  );
  const testAccounts = accounts.filter(account => {
    const email = account.email || '';
    return (
      email.startsWith('test_mhs_pb14_') ||
      email.startsWith('test_donor_pb14_') ||
      email.startsWith('test_mhs_pb21_') ||
      email === 'testpb07@example.com' ||
      email === 'testpb08@example.com'
    );
  });

  const accountIds = testAccounts.map(account => account.accountId);
  const users = await fetchRows(
    accountIds.length
      ? supabase.from('user').select('userId,accountId').in('accountId', accountIds)
      : Promise.resolve({ data: [] })
  );
  const pendonors = await fetchRows(
    accountIds.length
      ? supabase.from('pendonor').select('pendonorId,accountId').in('accountId', accountIds)
      : Promise.resolve({ data: [] })
  );

  const beasiswaVisual = await fetchRows(
    supabase.from('beasiswa').select('beasiswaId,pendonorId').ilike('judul', 'Beasiswa Visual Nusantara%')
  );
  const beasiswaPrestasi = await fetchRows(
    supabase.from('beasiswa').select('beasiswaId,pendonorId').ilike('judul', 'Beasiswa Prestasi Nusantara%')
  );
  const beasiswa = uniqById([...beasiswaVisual, ...beasiswaPrestasi], 'beasiswaId');
  const beasiswaIds = beasiswa.map(item => item.beasiswaId);
  const pendonorIds = [...new Set([
    ...pendonors.map(item => item.pendonorId),
    ...beasiswa.map(item => item.pendonorId),
  ].filter(Boolean))];

  const pendaftaranByUser = await fetchRows(
    users.length
      ? supabase.from('pendaftaran').select('pendaftaranId,userId,beasiswaId').in('userId', users.map(user => user.userId))
      : Promise.resolve({ data: [] })
  );
  const pendaftaranByBeasiswa = await fetchRows(
    beasiswaIds.length
      ? supabase.from('pendaftaran').select('pendaftaranId,userId,beasiswaId').in('beasiswaId', beasiswaIds)
      : Promise.resolve({ data: [] })
  );
  const pendaftaran = uniqById([...pendaftaranByUser, ...pendaftaranByBeasiswa], 'pendaftaranId');
  const pendaftaranIds = pendaftaran.map(item => item.pendaftaranId);

  const notifikasi = await fetchRows(
    users.length
      ? supabase.from('notifikasi').select('notifikasiId,userId').in('userId', users.map(user => user.userId))
      : Promise.resolve({ data: [] })
  );
  const dokumen = await fetchRows(
    pendaftaranIds.length
      ? supabase.from('dokumen').select('dokumenId,pendaftaranId').in('pendaftaranId', pendaftaranIds)
      : Promise.resolve({ data: [] })
  );
  const rekening = await fetchRows(
    users.length
      ? supabase.from('rekening').select('rekeningId,userId').in('userId', users.map(user => user.userId))
      : Promise.resolve({ data: [] })
  );
  const favorit = await fetchRows(
    users.length
      ? supabase.from('favorit').select('favoritId,userId').in('userId', users.map(user => user.userId))
      : Promise.resolve({ data: [] })
  );
  const laporan = await fetchRows(
    users.length
      ? supabase.from('laporan_link_rusak').select('laporanId,userId,beasiswaId').in('userId', users.map(user => user.userId))
      : Promise.resolve({ data: [] })
  );
  const penyaluran = await fetchRows(
    pendaftaranIds.length
      ? supabase.from('penyaluran_dana').select('penyaluranId,pendaftaranId,beasiswaId,pendonorId').in('pendaftaranId', pendaftaranIds)
      : Promise.resolve({ data: [] })
  );

  await deleteByIds('notifikasi', 'notifikasiId', notifikasi.map(item => item.notifikasiId));
  await deleteByIds('dokumen', 'dokumenId', dokumen.map(item => item.dokumenId));
  await deleteByIds('penyaluran_dana', 'penyaluranId', penyaluran.map(item => item.penyaluranId));
  await deleteByIds('laporan_link_rusak', 'laporanId', laporan.map(item => item.laporanId));
  await deleteByIds('favorit', 'favoritId', favorit.map(item => item.favoritId));
  await deleteByIds('rekening', 'rekeningId', rekening.map(item => item.rekeningId));
  await deleteByIds('pendaftaran', 'pendaftaranId', pendaftaranIds);
  await deleteByIds('beasiswa', 'beasiswaId', beasiswaIds);
  await deleteByIds('user', 'userId', users.map(item => item.userId));
  await deleteByIds('pendonor', 'pendonorId', pendonorIds);
  await deleteByIds('account', 'accountId', accountIds);
}

async function loginAs(context, role, extra = {}) {
  const token = generateMockToken(role, extra);
  await context.addCookies([
    {
      name: 'token',
      value: token,
      domain: 'localhost',
      path: '/',
    },
  ]);
}
module.exports = {
  generateMockToken,
  holdForVisualCheck,
  pauseForDebug,
  resetE2EDatabase,
  loginAs,
  supabase,
};
