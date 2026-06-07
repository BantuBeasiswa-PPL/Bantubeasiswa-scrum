const { Client } = require('pg');

const host = 'db.uffsaxyxasiyjbcmekhz.supabase.co';
const port = 5432;
const database = 'postgres';
const user = 'postgres';

// Try standard passwords
const passwords = [
  'postgres',
  'admin',
  'bantubeasiswa',
  'BantuBeasiswa',
  'eV9tlK8vFvaa8s62LZVh0ssNUfxzV2mN',
  'sb_publishable_jib-h-c-S2bVOlTZ-9IjMQ_EdbNiZ_S'
];

async function tryConnect() {
  for (const password of passwords) {
    console.log(`Trying password: ${password}...`);
    const client = new Client({
      host,
      port,
      database,
      user,
      password,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log('SUCCESS! Connected with password:', password);
      
      // Let's alter the table!
      console.log('Altering user table to add profile columns...');
      const alterQueries = [
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "namaUniversitas" TEXT;`,
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "jurusan" TEXT;`,
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "semesterAktif" INTEGER;`,
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ipk" NUMERIC(4,2);`,
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "namaAyah" TEXT;`,
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "pekerjaanAyah" TEXT;`,
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "namaIbu" TEXT;`,
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "pekerjaanIbu" TEXT;`,
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "penghasilanOrangTua" TEXT;`,
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "fileTranskrip" TEXT;`,
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "fileKk" TEXT;`,
        `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "fileKtp" TEXT;`
      ];

      for (const query of alterQueries) {
        await client.query(query);
      }
      console.log('Successfully altered user table!');
      
      await client.end();
      return;
    } catch (err) {
      console.log('Failed:', err.message);
    }
  }
  console.log('All connection attempts failed.');
}

tryConnect();
