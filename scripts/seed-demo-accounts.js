// Membuat AKUN DEMO yang benar-benar bisa login di database test (db_automated),
// beserta sedikit data contoh, supaya dosen bisa verifikasi langkah "login" secara
// manual. Idempotent (hapus email yang sama dulu, lalu buat ulang).
//
// Pakai: npm run seed:demo   (lalu `npm run dev:test` untuk login di http://localhost:3000)
// Semua password: 123456
const { loadTestEnv } = require('../e2e/load-test-env');
Object.assign(process.env, loadTestEnv());

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.startsWith('ISI_')) {
  console.error('\n[seed:demo] .env.test belum lengkap (NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY).\n');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const HASH = bcrypt.hashSync('123456', 10);

const ADMIN_EMAIL = 'admin@bantubeasiswa.test';
const PENDONOR_EMAIL = 'pendonor@bantubeasiswa.test';
const MHS_EMAIL = 'mahasiswa@bantubeasiswa.test';

async function account(email, role) {
  await db.from('account').delete().eq('email', email); // idempotent (cascade)
  const { data, error } = await db.from('account').insert([{ email, kataKunci: HASH, role }]).select('accountId').single();
  if (error) throw new Error(`account ${email}: ${error.message}`);
  return data.accountId;
}
async function insert(table, row, pk) {
  const { data, error } = await db.from(table).insert([row]).select(pk).single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data[pk];
}

async function main() {
  // 1. Admin
  const adminAcc = await account(ADMIN_EMAIL, 'admin');
  await insert('admin', { accountId: adminAcc, nama: 'Admin BantuBeasiswa', email: ADMIN_EMAIL, kataSandi: HASH }, 'adminId');

  // 2. Pendonor (verified) + 1 beasiswa pending (untuk demo approve/helpdesk)
  const pendonorAcc = await account(PENDONOR_EMAIL, 'pendonor');
  const pendonorId = await insert('pendonor', { accountId: pendonorAcc, statusOrganisasi: 'Yayasan Bakti Pertiwi', kontak: '08123456789', alamat: 'Jl. Merdeka No. 1, Jakarta', statusVerifikasi: 'verified' }, 'pendonorId');
  const beasiswaId = await insert('beasiswa', { pendonorId, judul: 'Beasiswa Unggulan Prestasi', jalur: 'Prestasi', deadline: '2026-12-31', deskripsi: 'Beasiswa untuk mahasiswa berprestasi.', syarat: 'IPK minimal 3.50', status: 'pending', nominal: 12000000, kuota: 15 }, 'beasiswaId');

  // 3. Mahasiswa + 1 tiket laporan (untuk demo helpdesk)
  const mhsAcc = await account(MHS_EMAIL, 'mahasiswa');
  const userId = await insert('user', { accountId: mhsAcc, nama: 'Budi Santoso', email: MHS_EMAIL, kataSandi: HASH }, 'userId');
  await insert('laporan_link_rusak', { userId, beasiswaId, deskripsi: 'Link pendaftaran beasiswa tidak bisa diakses.', status: 'pending' }, 'laporanId');

  console.log('\n[seed:demo] Akun demo siap di db_automated (password semua: 123456):');
  console.log('  ADMIN     -> ' + ADMIN_EMAIL);
  console.log('  PENDONOR  -> ' + PENDONOR_EMAIL + '  (verified)');
  console.log('  MAHASISWA -> ' + MHS_EMAIL);
  console.log('  + 1 beasiswa pending & 1 tiket laporan untuk contoh data.\n');
}

main().then(() => process.exit(0)).catch((e) => { console.error('[seed:demo] gagal:', e.message); process.exit(1); });
