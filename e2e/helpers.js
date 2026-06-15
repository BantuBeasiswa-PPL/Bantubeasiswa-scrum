const jwt = require('jsonwebtoken');

// ─── JWT Secret ──────────────────────────────────────────────────────────────
// Coba baca dari env (dotenv sudah di-load oleh Playwright via env file),
// fallback ke nilai yang sama dengan .env.local agar token lolos withAuth.
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_bantubeasiswa_12345';

// ─── Mock Data ────────────────────────────────────────────────────────────────

/** Profil mahasiswa mock untuk SSR props */
const MOCK_PROFILE = {
  userId: 999,
  accountId: 123,
  nama: 'Budi Santoso',
  email: 'mahasiswa@test.com',
  tentangSaya: '',
  nik: '3201234567890001',
  jenisKelamin: 'Laki-laki',
  tanggalLahir: '2000-05-15',
  noHandphone: '+6281210460450',
  provinsiLahirId: 32,
  kotaLahirWilayahId: 3201,
  provinsiKtpId: 32,
  kabupatenKtpId: 3201,
  alamatKtp: 'Jl. Merdeka No. 1',
  namaUniversitas: 'Universitas Indonesia',
  jurusan: 'Teknik Informatika',
  semesterAktif: '6',
  ipk: '3.75',
  namaAyah: 'Santoso',
  pekerjaanAyah: 'Guru',
  namaIbu: 'Sri Dewi',
  pekerjaanIbu: 'Ibu Rumah Tangga',
  penghasilanOrangTua: 'Rp 3.000.000 - Rp 5.000.000',
  fileTranskrip: '',
  fileKk: '',
  fileKtp: '',
};

/** Data pendaftaran lulus mock untuk TC rekening */
const MOCK_LULUS_PENDAFTARAN = {
  pendaftaranId: 15,
  userId: 999,
  beasiswaId: 5,
  status: 'LULUS',
  createdAt: '2024-01-01T00:00:00Z',
  beasiswa: {
    beasiswaId: 5,
    nama: 'Beasiswa Test UI',
    deskripsi: 'Beasiswa untuk mahasiswa berprestasi',
    pendonorId: 1,
    pendonor: { nama: 'Pendonor Test', email: 'pendonor@test.com' },
  },
};

/** Data rekening existing mock */
const MOCK_REKENING_EXISTING = {
  rekeningId: 10,
  userId: 999,
  namaBank: 'Bank BCA',
  namaPemilik: 'Budi Santoso',
  nomorRekening: '1234567890',
  namRekening: 'Bank BCA - Budi Santoso',
  fotoBukuUrl: null,
  status: 'aktif',
};

/** Response beasiswa mock untuk hook useStatusPendaftaran */
const MOCK_BEASISWA_RESPONSE = {
  pendaftaranId: 15,
  userId: 999,
  beasiswaId: 5,
  status: 'LULUS',
  beasiswa: {
    beasiswaId: 5,
    nama: 'Beasiswa Test UI',
    pendonor: { nama: 'Pendonor Test' },
  },
};

// ─── Token Functions ──────────────────────────────────────────────────────────

/**
 * Buat JWT token mock untuk login.
 * Alias: makeToken (dipakai oleh pbi-40-41), generateMockToken (dipakai pbi-28)
 */
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

/**
 * makeToken: alias untuk generateMockToken dengan default role 'mahasiswa'.
 * Dipakai oleh pbi-40-41-rekening-mahasiswa.spec.js
 */
function makeToken(override = {}) {
  const payload = {
    accountId: 123,
    role: 'mahasiswa',
    email: 'mahasiswa@test.com',
    nama: 'Budi Santoso',
    userId: 999,
    ...override,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * loginAs: set cookie JWT ke browser context untuk simulasi login.
 */
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

/**
 * routeFetch: wrapper route.fetch() yang mengganti localhost → 127.0.0.1.
 *
 * Mengapa perlu ini?
 * - Browser (Chromium) navigasi ke http://localhost:3000 → cookie domain 'localhost' terbaca ✓
 * - route.fetch() dipanggil dari Node.js (Playwright process), bukan browser.
 * - Di Windows, Node.js meresolve 'localhost' ke ::1 (IPv6), tapi Next.js hanya
 *   mendengarkan di 127.0.0.1 (IPv4) → ECONNREFUSED ::1:3000
 * - Solusi: ganti URL ke 127.0.0.1 agar Node.js fetch ke IPv4 secara langsung.
 *
 * @param {import('@playwright/test').Route} route
 * @param {object} [options] - opsi tambahan untuk route.fetch()
 */
async function routeFetch(route, options = {}) {
  const originalUrl = route.request().url();
  const fixedUrl = originalUrl.replace('//localhost:', '//127.0.0.1:');
  return route.fetch({ url: fixedUrl, ...options });
}

module.exports = {
  // Functions
  generateMockToken,
  makeToken,
  loginAs,
  routeFetch,
  // Mock data constants
  MOCK_PROFILE,
  MOCK_LULUS_PENDAFTARAN,
  MOCK_REKENING_EXISTING,
  MOCK_BEASISWA_RESPONSE,
};

