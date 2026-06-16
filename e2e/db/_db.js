// Helper untuk test real-DB: koneksi admin (service_role) ke database test
// `db_automated`, dipakai untuk MEMVERIFIKASI data benar-benar tersimpan dan
// untuk MEMBERSIHKAN (cleanup) data yang dibuat test.
//
// Env diisi oleh playwright.config.js dari .env.test saat DB_TEST=1.
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey || serviceKey.startsWith('ISI_')) {
  throw new Error(
    'Test real-DB butuh NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY yang valid di .env.test.\n' +
    'Jalankan dengan: npm run test:e2e:db (yang menyetel DB_TEST=1).'
  );
}

// Client service_role -> bypass RLS, bisa baca/hapus semua tabel untuk verifikasi.
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Hapus akun (dan profil terkait) berdasarkan email.
// FK user_accountId_fkey ON DELETE CASCADE -> hapus account ikut menghapus baris user.
async function cleanupEmail(email) {
  if (!email) return;
  await admin.from('account').delete().eq('email', email);
}

module.exports = { admin, cleanupEmail };
