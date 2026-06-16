// Loader sederhana untuk .env.test (tanpa dependency tambahan).
// Dipakai playwright.config.js saat mode real-DB (DB_TEST=1) supaya dev server
// dan proses test mengarah ke database test (db_automated), bukan produksi.
const fs = require('fs');
const path = require('path');

function loadTestEnv() {
  const file = path.resolve(__dirname, '..', '.env.test');
  const env = {};
  if (!fs.existsSync(file)) return env;

  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // buang tanda kutip pembungkus bila ada
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) env[key] = val;
  }
  return env;
}

module.exports = { loadTestEnv };
