import { supabase } from './db';

export function normalizeMahasiswaProfile(row, fallback = {}) {
  const source = row || {};

  return {
    userId:
      source.userId ??
      source.user_id ??
      source.id ??
      fallback.userId ??
      null,
    accountId:
      source.accountId ??
      source.account_id ??
      fallback.accountId ??
      null,
    nama:
      source.nama ??
      source.namaLengkap ??
      source.nama_lengkap ??
      fallback.nama ??
      '',
    email: source.email ?? fallback.email ?? '',
    tentangSaya: source.tentangSaya ?? source.tentang_saya ?? '',
    nik: source.nik ?? '',
    jenisKelamin: source.jenisKelamin ?? source.jenis_kelamin ?? '',
    provinsiLahirId: source.provinsiLahirId ?? source.provinsi_lahir_id ?? null,
    kotaLahirWilayahId: source.kotaLahirWilayahId ?? source.kota_lahir_wilayah_id ?? null,
    tanggalLahir: source.tanggalLahir ?? source.tanggal_lahir ?? '',
    noHandphone:
      source.noHandphone ??
      source.no_handphone ??
      source.handphone ??
      source.telepon ??
      '',
    provinsiKtpId: source.provinsiKtpId ?? source.provinsi_ktp_id ?? null,
    kabupatenKtpId: source.kabupatenKtpId ?? source.kabupaten_ktp_id ?? null,
    alamatKtp: source.alamatKtp ?? source.alamat_ktp ?? '',
    alamat:
      source.alamat ??
      source.alamatTempatTinggal ??
      source.alamat_tempat_tinggal ??
      '',
  };
}

/** Pendaftar dihitung setelah mahasiswa mengisi formulir alamat KTP (bukan saat daftar akun). */
export function hasAlamatKtpLengkap(user) {
  return Boolean(
    user?.provinsiKtpId &&
    user?.kabupatenKtpId &&
    user?.alamatKtp &&
    String(user.alamatKtp).trim()
  );
}

export function normalizeRekening(row) {
  const source = row || {};

  // Legacy fallback: data lama menyimpan bank + pemilik dalam "namRekening".
  const namRekening = source.namRekening ?? '';

  return {
    id: source.id ?? source.rekeningId ?? source.rekening_id ?? null,
    userId: source.userId ?? source.user_id ?? null,
    namaBank:
      source.namaBank ??
      source.nama_bank ??
      (namRekening.includes(' - ') ? namRekening.split(' - ')[0] : namRekening) ??
      '',
    namaPemilik:
      source.namaPemilik ??
      source.nama_pemilik ??
      (namRekening.includes(' - ') ? namRekening.split(' - ').slice(1).join(' - ') : namRekening) ??
      '',
    nomorRekening: source.nomorRekening ?? source.nomor_rekening ?? '',
    fotoBukuUrl: source.fotoBukuUrl ?? source.foto_buku_url ?? '',
    status: source.status ?? '',
  };
}

async function normalizeRekeningForServer(row) {
  const rekening = normalizeRekening(row);
  if (!rekening.nomorRekening || typeof window !== 'undefined') {
    return rekening;
  }

  const { decryptRekeningNumberSafe } = await import('./rekeningCrypto');
  return {
    ...rekening,
    nomorRekening: decryptRekeningNumberSafe(rekening.nomorRekening),
  };
}

export async function getMahasiswaProfile(user) {
  const fallback = normalizeMahasiswaProfile(null, user);
  const filters = [
    ['accountId', user?.accountId],
    ['account_id', user?.accountId],
    ['userId', user?.userId],
    ['user_id', user?.userId],
    ['id', user?.userId],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');

  for (const [column, value] of filters) {
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq(column, value)
      .maybeSingle();

    if (!error && data) {
      return normalizeMahasiswaProfile(data, fallback);
    }
  }

  return fallback;
}

export async function getLatestRekening(userId) {
  if (!userId) return normalizeRekening(null);

  const queries = [
    { userColumn: 'user_id', orderColumn: 'id' },
    { userColumn: 'userId', orderColumn: 'rekeningId' },
  ];

  for (const { userColumn, orderColumn } of queries) {
    const { data, error } = await supabase
      .from('rekening')
      .select('*')
      .eq(userColumn, userId)
      .order(orderColumn, { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return normalizeRekeningForServer(data);
    }
  }

  return normalizeRekening(null);
}

export async function getLatestLulusPendaftaran(userId) {
  if (!userId) return null;

  const filters = [
    ['userId', userId],
    ['user_id', userId],
  ];

  for (const [column, value] of filters) {
    const { data, error } = await supabase
      .from('pendaftaran')
      .select(`
        *,
        beasiswa (
          *,
          pendonor ( * )
        )
      `)
      .eq(column, value)
      .eq('status', 'LULUS')
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) return data;
  }

  return null;
}
