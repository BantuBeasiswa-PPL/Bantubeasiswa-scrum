import { getServerSupabase } from '../../../../lib/supabaseServer';
import { verifyToken } from '../../../../lib/auth';

/**
 * DELETE /api/pendonor/beasiswa/[id]
 * Menghapus beasiswa milik pendonor yang sedang login.
 * Hanya bisa hapus beasiswa dengan status 'draft'.
 */
export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();

  try {
    // Auth: cek JWT & role
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'pendonor') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const supabase = getServerSupabase();
    const { id } = req.query;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'ID beasiswa tidak valid' });
    }

    // Resolve pendonorId dari accountId
    const { data: pendonor, error: pendonorError } = await supabase
      .from('pendonor')
      .select('pendonorId')
      .eq('accountId', decoded.accountId)
      .single();

    if (pendonorError || !pendonor) {
      return res.status(404).json({ message: 'Profil pendonor tidak ditemukan' });
    }

    // Cek kepemilikan dan status beasiswa
    const { data: beasiswa, error: checkError } = await supabase
      .from('beasiswa')
      .select('status')
      .eq('beasiswaId', parseInt(id))
      .eq('pendonorId', pendonor.pendonorId)
      .single();

    if (checkError || !beasiswa) {
      return res.status(404).json({ message: 'Beasiswa tidak ditemukan' });
    }

    if (beasiswa.status !== 'draft') {
      return res.status(403).json({
        message: 'Hanya beasiswa dengan status draft yang dapat dihapus'
      });
    }

    // Hapus beasiswa (cascade akan hapus beasiswa_wilayah)
    const { error: deleteError } = await supabase
      .from('beasiswa')
      .delete()
      .eq('beasiswaId', parseInt(id));

    if (deleteError) {
      console.error('[pendonor/beasiswa/[id]] delete error:', deleteError);
      return res.status(500).json({ message: 'Gagal menghapus beasiswa' });
    }

    return res.status(200).json({ message: 'Beasiswa berhasil dihapus' });
  } catch (err) {
    console.error('[pendonor/beasiswa/[id]]', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}