/**
 * Jalankan INSERT wilayah 3T dari database/database/wilayah_3t_seed.sql
 *
 *   npm run db:seed:wilayah3t
 *
 * Pastikan DATABASE_URL di .env.local (pooler 6543 atau direct 5432).
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

let conn = process.env.DATABASE_URL?.trim();
if (!conn) {
  console.error("DATABASE_URL kosong. Isi di .env.local (password dari Supabase → Database).");
  process.exit(1);
}
const sqlPath = join(__dirname, "..", "database", "database", "wilayah_3t_seed.sql");
const sql = readFileSync(sqlPath, "utf8");

/** Supabase TLS — hindari error "self-signed certificate in certificate chain" di Node/pg */
const client = new pg.Client({
  connectionString: conn,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("OK: wilayah 3T berhasil di-insert (62 kabupaten).");
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS n FROM wilayah WHERE "is3T" = TRUE`,
  );
  console.log(`Verifikasi: total baris dengan is3T=true sekarang = ${rows[0].n}`);
} catch (e) {
  console.error(e.message || e);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
