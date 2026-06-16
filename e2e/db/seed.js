// Seeder untuk test real-DB: membuat data via service_role lalu membersihkannya.
// Semua FK memakai ON DELETE CASCADE, jadi cukup melacak akun (+ provinsi/wilayah)
// yang dibuat; menghapusnya akan ikut menghapus user/pendonor/beasiswa/dst.
const { admin } = require('./_db');

let counter = 0;
function uniq(prefix = 'seed') {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}_${Math.random().toString(36).slice(2, 6)}`;
}
function uniqEmail(prefix = 'seed') {
  return `${uniq(prefix)}@seed.test`;
}

function makeSeeder() {
  const accountIds = [];
  const provinsiIds = [];
  const wilayahIds = [];

  async function insert(table, row, pk) {
    const { data, error } = await admin.from(table).insert([row]).select(pk).single();
    if (error) throw new Error(`seed ${table} gagal: ${error.message}`);
    return data[pk];
  }

  const seeder = {
    uniq,
    uniqEmail,

    async account({ role, email }) {
      const accountId = await insert('account', { email, kataKunci: 'seed-hash', role }, 'accountId');
      accountIds.push(accountId);
      return accountId;
    },

    // Mahasiswa lengkap (account role=mahasiswa + profil user). JWT pakai userId+accountId ini.
    async mahasiswa({ nama = 'Seed Mahasiswa', email } = {}) {
      email = email || uniqEmail('mhs');
      const accountId = await seeder.account({ role: 'mahasiswa', email });
      const userId = await insert('user', { accountId, nama, email, kataSandi: 'seed-hash' }, 'userId');
      return { accountId, userId, email, nama };
    },

    // Pendonor terverifikasi (default) supaya lolos withPendonorAuth.
    async pendonor({ statusOrganisasi, kontak = '08123456789', alamat = 'Jakarta', statusVerifikasi = 'verified', email } = {}) {
      email = email || uniqEmail('pendonor');
      statusOrganisasi = statusOrganisasi || `Yayasan ${uniq('Org')}`;
      const accountId = await seeder.account({ role: 'pendonor', email });
      const pendonorId = await insert('pendonor', { accountId, statusOrganisasi, kontak, alamat, statusVerifikasi }, 'pendonorId');
      return { accountId, pendonorId, email, statusOrganisasi };
    },

    async beasiswa({ pendonorId, judul = 'Beasiswa Seed', status = 'aktif', nominal = 5000000, kuota = 10, jalur = 'Prestasi', deadline = '2026-12-31', deskripsi = 'Deskripsi beasiswa seed', syarat = 'IPK minimal 3.0', alasanPenolakan = null } = {}) {
      return await insert('beasiswa', { pendonorId, judul, status, nominal, kuota, jalur, deadline, deskripsi, syarat, alasanPenolakan }, 'beasiswaId');
    },

    async tiket({ userId, beasiswaId, deskripsi = 'Link pendaftaran rusak', status = 'pending', tanggalLapor } = {}) {
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

    async rekening({ userId, namaBank = 'Bank BCA', nomorRekening = '1234567890', namaPemilik = 'Seed Mahasiswa', namRekening, status = 'aktif' }) {
      namRekening = namRekening || `${namaBank} - ${namaPemilik}`;
      return await insert('rekening', { userId, namRekening, nomorRekening, namaBank, namaPemilik, status }, 'rekeningId');
    },

    async favorit({ userId, beasiswaId }) {
      return await insert('favorit', { userId, beasiswaId }, 'favoritId');
    },

    async provinsi({ nama, isAfirmasi = false } = {}) {
      nama = nama || `Provinsi ${uniq('Prov')}`;
      const id = await insert('provinsi', { nama, isAfirmasi }, 'provinsiId');
      provinsiIds.push(id);
      return id;
    },

    async wilayah({ provinsiId, nama, tipe = 'kabupaten', is3T = false, isAfirmasi = false } = {}) {
      nama = nama || `Kabupaten ${uniq('Kab')}`;
      const id = await insert('wilayah', { provinsiId, nama, tipe, is3T, isAfirmasi }, 'wilayahId');
      wilayahIds.push(id);
      return id;
    },

    // Hapus semua data yang dibuat seeder ini (panggil di afterEach).
    async cleanup() {
      for (const id of accountIds) await admin.from('account').delete().eq('accountId', id);
      for (const id of wilayahIds) await admin.from('wilayah').delete().eq('wilayahId', id);
      for (const id of provinsiIds) await admin.from('provinsi').delete().eq('provinsiId', id);
      accountIds.length = 0;
      wilayahIds.length = 0;
      provinsiIds.length = 0;
    },
  };

  return seeder;
}

module.exports = { makeSeeder, uniq, uniqEmail };
