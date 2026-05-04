import { supabase } from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';

/**
 * GET /api/mahasiswa/pendaftaran
 * Ambil semua pendaftaran milik mahasiswa yang sedang login.
 *
 * Kolom tabel pendaftaran: pendaftaranId, userId, beasiswaId, status, createdAt, updatedAt
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

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

  const { data, error } = await supabase
    .from('pendaftaran')
    .select(`
      pendaftaranId,
      status,
      createdAt,
      beasiswaId,
      beasiswa (
        judul,
        deadline,
        pendonor ( statusOrganisasi )
      )
    `)
    .eq('userId', userId)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[GET /api/mahasiswa/pendaftaran]', error);
    return res.status(500).json({ message: 'Gagal mengambil data pendaftaran.' });
  }

  return res.status(200).json(data ?? []);
}
