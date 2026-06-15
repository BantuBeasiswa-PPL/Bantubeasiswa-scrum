import { verifyToken } from '../../../lib/auth';
import { getServerSupabase } from '../../../lib/supabaseServer';

/**
 * GET /api/mahasiswa/dokumen?pendaftaranId=X
 * Mengambil semua dokumen untuk pendaftaran milik mahasiswa yang login.
 * Termasuk statusDokumen dan rejectionReason agar mahasiswa tahu mana yang bermasalah.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Tidak terautentikasi.' });
  if (decoded.role !== 'mahasiswa') {
    return res.status(403).json({ message: 'Hanya mahasiswa yang dapat mengakses endpoint ini.' });
  }

  const { pendaftaranId } = req.query;
  if (!pendaftaranId) {
    return res.status(400).json({ message: 'pendaftaranId wajib diisi.' });
  }

  const pendaftaranIdInt = parseInt(pendaftaranId, 10);
  if (isNaN(pendaftaranIdInt) || pendaftaranIdInt <= 0) {
    return res.status(400).json({ message: 'pendaftaranId tidak valid.' });
  }

  const supabase = getServerSupabase();

  // Resolve userId
  let userId = decoded.userId ?? null;
  if (!userId) {
    const { data: profil } = await supabase
      .from('user')
      .select('userId')
      .eq('accountId', decoded.accountId)
      .single();
    userId = profil?.userId ?? null;
  }
  if (!userId) return res.status(404).json({ message: 'Profil mahasiswa tidak ditemukan.' });

  // Verifikasi kepemilikan pendaftaran
  const { data: pendaftaran, error: pendaftaranError } = await supabase
    .from('pendaftaran')
    .select('userId')
    .eq('pendaftaranId', pendaftaranIdInt)
    .single();

  if (pendaftaranError || !pendaftaran) {
    return res.status(404).json({ message: 'Pendaftaran tidak ditemukan.' });
  }
  if (String(pendaftaran.userId) !== String(userId)) {
    return res.status(403).json({ message: 'Pendaftaran tidak milik Anda.' });
  }

  // Ambil semua dokumen
  const { data: dokumenList, error: dokumenError } = await supabase
    .from('dokumen')
    .select('dokumenId, jenis, statusDokumen, rejectionReason, error, createdAt, updatedAt')
    .eq('pendaftaranId', pendaftaranIdInt)
    .order('dokumenId', { ascending: true });

  if (dokumenError) {
    console.error('[api/mahasiswa/dokumen] fetch error:', dokumenError);
    return res.status(500).json({ message: 'Gagal mengambil data dokumen.' });
  }

  return res.status(200).json({ data: dokumenList ?? [] });
}
