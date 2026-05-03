/** One-off stats — npm exec / node --env-file=.env.local scripts/wilayah-afirmasi-stats.mjs */
import pg from "pg";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL kosong.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const { rows } = await client.query(`
  SELECT
    COUNT(*)::int AS total_baris,
    COUNT(*) FILTER (WHERE "isAfirmasi" IS TRUE)::int AS afirmasi_true,
    COUNT(*) FILTER (WHERE "isAfirmasi" IS FALSE)::int AS afirmasi_false
  FROM wilayah
`);
console.log(rows[0]);
await client.end();
