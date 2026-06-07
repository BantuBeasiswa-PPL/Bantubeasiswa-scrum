import { verifyToken } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabaseServer';
import { normalizeMahasiswaProfile } from '@/lib/mahasiswaProfile';

const PROFILE_COLUMNS = `
  userId,
  accountId,
  nama,
  email,
  tentangSaya,
  nik,
  jenisKelamin,
  provinsiLahirId,
  kotaLahirWilayahId,
  tanggalLahir,
  noHandphone,
  provinsiKtpId,
  kabupatenKtpId,
  alamatKtp
`;

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : NaN;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function resolveMahasiswaProfile(supabase, decoded) {
  let query = supabase.from('user').select(PROFILE_COLUMNS);

  if (decoded.userId) {
    query = query.eq('userId', decoded.userId);
  } else {
    query = query.eq('accountId', decoded.accountId);
  }

  const { data, error } = await query.maybeSingle();
  return { data, error };
}

async function ensureWilayahMatchesProvinsi(supabase, wilayahId, provinsiId, fieldLabel) {
  const { data, error } = await supabase
    .from('wilayah')
    .select('wilayahId, provinsiId, tipe')
    .eq('wilayahId', wilayahId)
    .maybeSingle();

  if (error || !data) {
    return `${fieldLabel} tidak ditemukan di data wilayah.`;
  }
  if (!['kabupaten', 'kota'].includes(data.tipe)) {
    return `${fieldLabel} harus berupa kabupaten/kota.`;
  }
  if (String(data.provinsiId) !== String(provinsiId)) {
    return `${fieldLabel} tidak sesuai dengan provinsi yang dipilih.`;
  }
  return '';
}

async function validatePayload(supabase, body) {
  const payload = {
    nama: cleanString(body.nama),
    email: cleanString(body.email).toLowerCase(),
    tentangSaya: cleanString(body.tentangSaya) || null,
    nik: cleanString(body.nik) || null,
    jenisKelamin: cleanString(body.jenisKelamin) || null,
    provinsiLahirId: nullableNumber(body.provinsiLahirId),
    kotaLahirWilayahId: nullableNumber(body.kotaLahirWilayahId),
    tanggalLahir: cleanString(body.tanggalLahir) || null,
    noHandphone: cleanString(body.noHandphone) || null,
    provinsiKtpId: nullableNumber(body.provinsiKtpId),
    kabupatenKtpId: nullableNumber(body.kabupatenKtpId),
    alamatKtp: cleanString(body.alamatKtp) || null,
  };

  const errors = {};
  if (!payload.nama) errors.nama = 'Nama lengkap wajib diisi.';
  if (payload.nama && payload.nama.length < 3) errors.nama = 'Nama lengkap minimal 3 karakter.';
  if (!payload.email) errors.email = 'Email wajib diisi.';
  if (payload.email && !isValidEmail(payload.email)) errors.email = 'Format email tidak valid.';
  if (payload.nik && !/^[0-9]{16}$/.test(payload.nik)) errors.nik = 'NIK harus 16 digit angka.';
  if (payload.noHandphone && !/^\+?[0-9]{9,15}$/.test(payload.noHandphone)) {
    errors.noHandphone = 'No handphone hanya boleh angka, 9-15 digit.';
  }
  if (payload.jenisKelamin && !['Laki-laki', 'Perempuan'].includes(payload.jenisKelamin)) {
    errors.jenisKelamin = 'Jenis kelamin tidak valid.';
  }
  if (Number.isNaN(payload.provinsiLahirId)) errors.provinsiLahirId = 'Provinsi lahir tidak valid.';
  if (Number.isNaN(payload.kotaLahirWilayahId)) errors.kotaLahirWilayahId = 'Kabupaten/kota lahir tidak valid.';
  if (Number.isNaN(payload.provinsiKtpId)) errors.provinsiKtpId = 'Provinsi KTP tidak valid.';
  if (Number.isNaN(payload.kabupatenKtpId)) errors.kabupatenKtpId = 'Kabupaten/kota KTP tidak valid.';

  if (!payload.provinsiLahirId) errors.provinsiLahirId = 'Provinsi lahir wajib dipilih.';
  if (!payload.kotaLahirWilayahId) errors.kotaLahirWilayahId = 'Kabupaten/kota lahir wajib dipilih.';
  if (!payload.tanggalLahir) errors.tanggalLahir = 'Tanggal lahir wajib diisi.';
  if (!payload.provinsiKtpId) errors.provinsiKtpId = 'Provinsi KTP wajib dipilih.';
  if (!payload.kabupatenKtpId) errors.kabupatenKtpId = 'Kabupaten/kota KTP wajib dipilih.';
  if (!payload.alamatKtp) errors.alamatKtp = 'Detail alamat KTP wajib diisi.';
  if (payload.alamatKtp && payload.alamatKtp.length < 5) errors.alamatKtp = 'Detail alamat minimal 5 karakter.';

  if (Object.keys(errors).length) return { payload, errors };

  const [lahirError, ktpError] = await Promise.all([
    ensureWilayahMatchesProvinsi(
      supabase,
      payload.kotaLahirWilayahId,
      payload.provinsiLahirId,
      'Kabupaten/kota lahir'
    ),
    ensureWilayahMatchesProvinsi(
      supabase,
      payload.kabupatenKtpId,
      payload.provinsiKtpId,
      'Kabupaten/kota KTP'
    ),
  ]);

  if (lahirError) errors.kotaLahirWilayahId = lahirError;
  if (ktpError) errors.kabupatenKtpId = ktpError;

  return { payload, errors };
}

export default async function handler(req, res) {
  if (!['GET', 'PUT'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end();
  }

  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Tidak terautentikasi' });
  if (decoded.role !== 'mahasiswa') {
    return res.status(403).json({ message: 'Hanya mahasiswa yang dapat mengakses profil ini.' });
  }

  const supabase = getServerSupabase();
  const { data: profile, error: profileError } = await resolveMahasiswaProfile(supabase, decoded);

  if (profileError || !profile) {
    console.error('[api/mahasiswa/profil] lookup:', profileError);
    return res.status(404).json({ message: 'Profil mahasiswa tidak ditemukan.' });
  }

  if (req.method === 'GET') {
    return res.status(200).json({ profile: normalizeMahasiswaProfile(profile, decoded) });
  }

  const { payload, errors } = await validatePayload(supabase, req.body || {});
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: 'Data profil belum valid.', errors });
  }

  const { data: updated, error: updateError } = await supabase
    .from('user')
    .update(payload)
    .eq('userId', profile.userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (updateError || !updated) {
    console.error('[api/mahasiswa/profil] update:', updateError);
    return res.status(500).json({
      message: 'Gagal menyimpan profil.',
      detail: updateError?.message || 'Unknown error',
    });
  }

  return res.status(200).json({
    message: 'Profil berhasil diperbarui.',
    profile: normalizeMahasiswaProfile(updated, decoded),
  });
}
