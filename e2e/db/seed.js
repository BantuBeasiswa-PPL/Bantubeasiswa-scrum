// Seeder untuk test real-DB: membuat data (DATA TETAP, bukan digenerate) via
// service_role lalu membersihkannya. Semua FK ON DELETE CASCADE, jadi cukup
// melacak akun (+ provinsi/wilayah) yang dibuat.
//
// - Semua akun memakai password "123456" (di-hash bcrypt) -> bisa dipakai login.
// - account() bersifat idempotent: menghapus email yang sama lebih dulu (cascade),
//   supaya data tetap aman di-run berulang tanpa bentrok unique email.
// - cleanup() dipakai SEMUA spec (tidak ada baris cleanup tambahan di test).
//   Set KEEP_DATA=1 untuk melewati cleanup (mode demo melihat data di DB).
const { admin } = require('./_db');
const bcrypt = require('bcryptjs');

const PASSWORD = '123456';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10);

function makeSeeder() {
  const accountIds = [];
  const trackedEmails = []; // akun yang dibuat APP (register) untuk dibersihkan
  const provinsiIds = [];
  const wilayahIds = [];

  async function insert(table, row, pk) {
    const { data, error } = await admin.from(table).insert([row]).select(pk).single();
    if (error) throw new Error(`seed ${table} gagal: ${error.message}`);
    return data[pk];
  }
  async function delByEmail(email) {
    if (email) await admin.from('account').delete().eq('email', email);
  }

  const seeder = {
    PASSWORD,

    async account({ role, email }) {
      await delByEmail(email); // idempotent: hapus sisa lama (cascade) lebih dulu
      const accountId = await insert('account', { email, kataKunci: PASSWORD_HASH, role }, 'accountId');
      accountIds.push(accountId);
      return accountId;
    },

    async mahasiswa({ email, nama = 'Budi Santoso' }) {
      const accountId = await seeder.account({ role: 'mahasiswa', email });
      const userId = await insert('user', { accountId, nama, email, kataSandi: PASSWORD_HASH }, 'userId');
      return { accountId, userId, email, nama };
    },

    async pendonor({ email, statusOrganisasi = 'Yayasan Bakti Pertiwi', kontak = '08123456789', alamat = 'Jl. Merdeka No. 1, Jakarta', statusVerifikasi = 'verified' }) {
      const accountId = await seeder.account({ role: 'pendonor', email });
      const pendonorId = await insert('pendonor', { accountId, statusOrganisasi, kontak, alamat, statusVerifikasi }, 'pendonorId');
      return { accountId, pendonorId, email, statusOrganisasi };
    },

    // Untuk test register: pastikan email bersih (hapus sisa) + tandai utk cleanup.
    async resetEmail(email) {
      await delByEmail(email);
      trackedEmails.push(email);
    },

    async beasiswa({ pendonorId, judul, status = 'aktif', nominal = 5000000, kuota = 10, jalur = 'Prestasi', deadline = '2026-12-31', deskripsi = 'Beasiswa untuk mahasiswa berprestasi.', syarat = 'IPK minimal 3.00', alasanPenolakan = null }) {
      return await insert('beasiswa', { pendonorId, judul, status, nominal, kuota, jalur, deadline, deskripsi, syarat, alasanPenolakan }, 'beasiswaId');
    },

    async tiket({ userId, beasiswaId, deskripsi = 'Link pendaftaran beasiswa rusak.', status = 'pending', tanggalLapor }) {
      const row = { userId, beasiswaId, deskripsi, status };
      if (tanggalLapor) row.tanggalLapor = tanggalLapor;
      return await insert('laporan_link_rusak', row, 'laporanId');
    },

    async pendaftaran({ userId, beasiswaId, status = 'LULUS' }) {
      return await insert('pendaftaran', { userId, beasiswaId, status }, 'pendaftaranId');
    },

    async penyaluran({ pendonorId, beasiswaId, pendaftaranId = null, jumlahDana = 5000000, status = 'pending' }) {
      return await insert('penyaluran_dana', { pendonorId, beasiswaId, pendaftaranId, jumlahDana, status }, 'penyaluranId');
    },

    async rekening({ userId, namaBank = 'Bank BCA', nomorRekening = '1234567890', namaPemilik = 'Budi Santoso', namRekening, status = 'aktif' }) {
      namRekening = namRekening || `${namaBank} - ${namaPemilik}`;
      return await insert('rekening', { userId, namRekening, nomorRekening, namaBank, namaPemilik, status }, 'rekeningId');
    },

    async favorit({ userId, beasiswaId }) {
      return await insert('favorit', { userId, beasiswaId }, 'favoritId');
    },

    async provinsi({ nama = 'DKI Jakarta', isAfirmasi = false } = {}) {
      const id = await insert('provinsi', { nama, isAfirmasi }, 'provinsiId');
      provinsiIds.push(id);
      return id;
    },

    async wilayah({ provinsiId, nama = 'Jakarta Pusat', tipe = 'kabupaten', is3T = false, isAfirmasi = false }) {
      const id = await insert('wilayah', { provinsiId, nama, tipe, is3T, isAfirmasi }, 'wilayahId');
      wilayahIds.push(id);
      return id;
    },

    // Satu-satunya pembersih data (dipanggil di afterEach SEMUA spec).
    // KEEP_DATA=1 -> dilewati supaya data tetap ada untuk diperlihatkan ke dosen.
    async cleanup() {
      if (process.env.KEEP_DATA === '1') return;
      for (const id of accountIds) await admin.from('account').delete().eq('accountId', id);
      for (const email of trackedEmails) await admin.from('account').delete().eq('email', email);
      for (const id of wilayahIds) await admin.from('wilayah').delete().eq('wilayahId', id);
      for (const id of provinsiIds) await admin.from('provinsi').delete().eq('provinsiId', id);
      accountIds.length = 0;
      trackedEmails.length = 0;
      wilayahIds.length = 0;
      provinsiIds.length = 0;
    },
  };

  return seeder;
}

module.exports = { makeSeeder, PASSWORD };
