// Menjalankan Next.js dev server yang TERHUBUNG KE DATABASE TEST (db_automated),
// dengan memuat .env.test. Berguna untuk demo manual: mis. login pakai akun yang
// dibuat oleh test case (npm run test:e2e:db:ui:keep), atau melihat data di app.
//
// Pakai: npm run dev:test  -> buka http://localhost:3000
const path = require('path');
const { spawn } = require('child_process');
const { loadTestEnv } = require('../e2e/load-test-env');

const testEnv = loadTestEnv();
if (!testEnv.NEXT_PUBLIC_SUPABASE_URL || !testEnv.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n[dev:test] .env.test belum lengkap. Isi NEXT_PUBLIC_SUPABASE_* & SUPABASE_SERVICE_ROLE_KEY dulu.\n');
  process.exit(1);
}

// Set env DB test SEBELUM next dev start (Next mempertahankan nilai process.env yg sudah ada)
Object.assign(process.env, testEnv);

console.log('\n[dev:test] Menjalankan app ke DATABASE TEST:');
console.log('           ' + testEnv.NEXT_PUBLIC_SUPABASE_URL);
console.log('           Buka http://localhost:3000  (Ctrl+C untuk berhenti)\n');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(npm, ['run', 'dev'], { stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code ?? 0));
