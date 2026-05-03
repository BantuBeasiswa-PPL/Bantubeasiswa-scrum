/**
 * BantuBeasiswa – Auto Migration Runner (via direct PostgreSQL connection)
 * Menjalankan schema.sql → wilayah_3t_seed.sql → provinsi_afirmasi_seed.sql
 * ke Supabase secara otomatis.
 *
 * CARA PAKAI:
 *   1. Ambil DATABASE_URL dari:
 *      Supabase Dashboard → Settings → Database → Connection string → URI
 *      (pastikan pilih mode "Transaction" atau "Session")
 *
 *   2. Jalankan di terminal:
 *      set SUPABASE_DB_URL=postgresql://postgres.uffsaxyxasiyjbcmekhz:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
 *      node database/run_migrations.js
 *
 *   Atau langsung hardcode DATABASE_URL di bawah (jangan di-commit ke git!).
 */

const { Client } = require('pg');
const fs   = require('fs');
const path = require('path');

// ─── KONFIGURASI ─────────────────────────────────────────────────────────────
// Ambil dari env, atau isi manual sementara (jangan commit ke git!)
const DATABASE_URL = process.env.SUPABASE_DB_URL || null;
// ─────────────────────────────────────────────────────────────────────────────

// Urutan file SQL — JANGAN ubah urutannya
const SQL_FILES = [
  { label: 'Schema & seed dasar',    file: path.join(__dirname, 'schema.sql') },
  { label: 'Seed wilayah 3T',        file: path.join(__dirname, 'database', 'wilayah_3t_seed.sql') },
  { label: 'Seed provinsi afirmasi', file: path.join(__dirname, 'database', 'provinsi_afirmasi_seed.sql') },
];

async function runMigrations() {
  console.log('\n🚀  BantuBeasiswa – Migration Runner');
  console.log('=====================================\n');

  if (!DATABASE_URL) {
    console.error('❌  DATABASE_URL tidak ditemukan!');
    console.error('');
    console.error('   Cara mendapatkannya:');
    console.error('   1. Buka https://supabase.com/dashboard');
    console.error('   2. Pilih project → Settings → Database');
    console.error('   3. Salin "Connection string" (URI mode)');
    console.error('   4. Jalankan perintah berikut di terminal:\n');
    console.error('   set SUPABASE_DB_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@..../postgres');
    console.error('   node database/run_migrations.js\n');
    process.exit(1);
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },   // wajib untuk Supabase
  });

  try {
    await client.connect();
    console.log(`✅  Terhubung ke database\n`);

    for (const { label, file } of SQL_FILES) {
      const fileName = path.basename(file);
      process.stdout.write(`⏳  [${label}] ${fileName} ... `);

      let sql;
      try {
        sql = fs.readFileSync(file, 'utf8');
      } catch {
        console.error(`\n❌  File tidak ditemukan: ${file}`);
        process.exit(1);
      }

      try {
        await client.query(sql);
        console.log('✅  OK');
      } catch (err) {
        console.error(`\n❌  Gagal menjalankan ${fileName}:`);
        console.error(`    ${err.message}\n`);
        process.exit(1);
      }
    }

    console.log('\n🎉  Semua migration berhasil!');
    console.log('    Cek data di: Supabase Dashboard → Table Editor\n');

  } finally {
    await client.end();
  }
}

runMigrations();
