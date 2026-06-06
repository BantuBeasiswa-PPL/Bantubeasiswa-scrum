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

export function normalizeRekening(row) {
  const source = row || {};

  // "namRekening" adalah nama kolom aktual di Supabase (format: "NamaBank - NamaPemilik")
  const namRekening = source.namRekening ?? '';
  const hasCombinedName = namRekening.includes(' - ');

  return {
    namaBank:
      source.namaBank ??
      source.nama_bank ??
      (hasCombinedName ? namRekening.split(' - ')[0] : '') ??
      '',
    namaPemilik:
      source.namaPemilik ??
      source.nama_pemilik ??
      (hasCombinedName ? namRekening.split(' - ').slice(1).join(' - ') : namRekening) ??
      '',
    nomorRekening: source.nomorRekening ?? source.nomor_rekening ?? '',
    fotoBukuUrl: source.fotoBukuUrl ?? source.foto_buku_url ?? '',
    status: source.status ?? '',
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

  const filters = [
    ['userId', userId],
    ['user_id', userId],
  ];

  for (const [column, value] of filters) {
    const { data, error } = await supabase
      .from('rekening')
      .select('*')
      .eq(column, value)
      .order('rekeningId', { ascending: false })  // PK aktual adalah rekeningId
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return normalizeRekening(data);
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
