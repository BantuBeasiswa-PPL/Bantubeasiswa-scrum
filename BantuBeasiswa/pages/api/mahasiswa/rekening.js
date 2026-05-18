import { verifyToken } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabaseServer';

/**
 * POST /api/mahasiswa/rekening
 * Schema aktual Supabase:
 *   "rekeningId" bigserial PK
 *   "userId"     bigint FK -> user("userId")
 *   "namRekening" text NOT NULL          ← perhatikan: bukan "namaRekening"
 *   "nomorRekening" text NOT NULL
 *   status       text NOT NULL DEFAULT 'aktif'
 *   "createdAt"  timestamptz
 *   "updatedAt"  timestamptz
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Tidak terautentikasi.' });
  if (decoded.role !== 'mahasiswa') {
    return res.status(403).json({ message: 'Hanya mahasiswa yang dapat mengakses endpoint ini.' });
  }

  const supabase = getServerSupabase();

  // Resolve userId (camelCase sesuai kolom user."userId")
  let userId = decoded.userId ?? null;
  if (!userId) {
    const { data } = await supabase
      .from('user')
      .select('"userId"')
      .eq('"accountId"', decoded.accountId)
      .maybeSingle();
    if (data) userId = data.userId;
  }
  if (!userId) return res.status(404).json({ message: 'Profil mahasiswa tidak ditemukan.' });

  const { namaBank, namaPemilik, nomorRekening } = req.body || {};

  if (!namaPemilik || namaPemilik.trim().length < 3) {
    return res.status(400).json({ message: 'Nama pemilik rekening minimal 3 karakter.' });
  }
  if (!nomorRekening || !/^\d{10,16}$/.test(nomorRekening.trim())) {
    return res.status(400).json({ message: 'Nomor rekening harus 10–16 digit angka.' });
  }

  // Gabungkan nama bank + nama pemilik ke kolom "namRekening"
  const namRekening = namaBank
    ? `${namaBank.trim()} - ${namaPemilik.trim()}`
    : namaPemilik.trim();

  const payload = {
    namRekening,                           // kolom aktual: "namRekening" (bukan namaRekening)
    nomorRekening: nomorRekening.trim(),
  };

  // Cek existing rekening (untuk update jika sudah ada)
  const { data: existing } = await supabase
    .from('rekening')
    .select('"rekeningId"')
    .eq('"userId"', userId)
    .order('"rekeningId"', { ascending: false })
    .limit(1)
    .maybeSingle();

  let result;
  if (existing?.rekeningId) {
    const { data, error } = await supabase
      .from('rekening')
      .update(payload)
      .eq('"rekeningId"', existing.rekeningId)
      .select('*')
      .single();
    result = { data, error };
  } else {
    const { data, error } = await supabase
      .from('rekening')
      .insert({ ...payload, userId })
      .select('*')
      .single();
    result = { data, error };
  }

  if (result.error || !result.data) {
    console.error('[api/mahasiswa/rekening] error:', JSON.stringify(result.error), '| userId:', userId);
    return res.status(500).json({
      message: 'Gagal menyimpan data rekening.',
      detail: result.error?.message || result.error?.details || 'Unknown error',
    });
  }

  return res.status(200).json({ message: 'Data rekening berhasil disimpan.', rekening: result.data });
}
