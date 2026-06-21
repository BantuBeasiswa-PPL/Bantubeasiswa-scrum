import { getServerSupabase } from '../../../lib/supabaseServer';
import { verifyToken } from '../../../lib/auth';
import { normalizeMahasiswaPendaftaranRow } from '../../../lib/mahasiswaPendaftaranRow';

/**
 * GET /api/mahasiswa/pendaftaran
 * Ambil semua pendaftaran milik mahasiswa yang sedang login.
 *
 * Kolom tabel pendaftaran: pendaftaranId, userId, beasiswaId, status, createdAt, updatedAt
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const supabase = getServerSupabase();

  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'mahasiswa') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Resolve userId: JWT first, fallback DB lookup
  let userId = decoded.userId ?? null;

  if (!userId) {
    const { data: profil } = await supabase
      .from('user')
      .select('userId')
      .eq('accountId', decoded.accountId)
      .single();
    userId = profil?.userId ?? null;
  }

  if (!userId) {
    return res.status(401).json({ message: 'Profil mahasiswa tidak ditemukan.' });
  }

  const { pendaftaranId } = req.query;
  const pendaftaranIdInt = parseInt(Array.isArray(pendaftaranId) ? pendaftaranId[0] : pendaftaranId, 10);

  let query = supabase
    .from('pendaftaran')
    .select(`
      pendaftaranId,
      userId,
      status,
      createdAt,
      beasiswaId,
      beasiswa (
        judul,
        deadline,
        pendonor ( statusOrganisasi )
      )
    `)
    .order('createdAt', { ascending: false });

  if (!Number.isNaN(pendaftaranIdInt) && pendaftaranIdInt > 0) {
    query = query.eq('pendaftaranId', pendaftaranIdInt).limit(1);
  } else {
    query = query.eq('userId', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[GET /api/mahasiswa/pendaftaran]', error);
    return res.status(500).json({ message: 'Gagal mengambil data pendaftaran.' });
  }

  const rows = Array.isArray(data) ? data.map(normalizeMahasiswaPendaftaranRow) : [];
  return res.status(200).json(rows);
}
