import { getServerSupabase } from '../../../lib/supabaseServer';
import { verifyToken } from '../../../lib/auth';

/**
 * GET /api/pendonor/beasiswa
 * Mengambil semua beasiswa yang dibuat oleh pendonor yang sedang login.
 *
 * Response: Array of beasiswa objects
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    // Auth: cek JWT & role
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'pendonor') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const supabase = getServerSupabase();

    // Resolve pendonorId dari accountId
    const { data: pendonor, error: pendonorError } = await supabase
      .from('pendonor')
      .select('pendonorId')
      .eq('accountId', decoded.accountId)
      .single();

    if (pendonorError || !pendonor) {
      return res.status(404).json({ message: 'Profil pendonor tidak ditemukan' });
    }

    // Fetch beasiswa milik pendonor ini
    const { data: beasiswaList, error: beasiswaError } = await supabase
      .from('beasiswa')
      .select(`
        beasiswaId: id,
        judul,
        deskripsi,
        nominal,
        kuota,
        deadline,
        status,
        createdAt: created_at,
        updatedAt: updated_at
      `)
      .eq('pendonorId', pendonor.pendonorId)
      .order('created_at', { ascending: false });

    if (beasiswaError) {
      console.error('[pendonor/beasiswa] fetch error:', beasiswaError);
      return res.status(500).json({ message: 'Gagal mengambil data beasiswa' });
    }

    return res.status(200).json(beasiswaList || []);
  } catch (err) {
    console.error('[pendonor/beasiswa]', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}