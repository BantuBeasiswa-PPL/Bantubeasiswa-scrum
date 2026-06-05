/**
 * POST /api/pendonor/beasiswa/publish
 * Publish a draft beasiswa (change status from 'draft' to 'aktif').
 *
 * Body: { beasiswaId: number }
 * Response: { message, data }
 */
import { getServerSupabase } from '../../../../lib/supabaseServer';
import { verifyToken } from '../../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'pendonor') {
      return res.status(401).json({ message: 'Tidak ada session. Silakan login terlebih dahulu.' });
    }

    const { beasiswaId } = req.body;
    if (!beasiswaId) {
      return res.status(400).json({ message: 'beasiswaId wajib diisi' });
    }

    const supabase = getServerSupabase();

    // Resolve pendonorId
    let pendonorId = decoded.userId ?? null;
    if (!pendonorId) {
      const { data: pendonor, error: pendonorError } = await supabase
        .from('pendonor')
        .select('pendonorId')
        .eq('accountId', decoded.accountId)
        .single();

      if (pendonorError || !pendonor) {
        return res.status(404).json({ message: 'Profil pendonor tidak ditemukan' });
      }
      pendonorId = pendonor.pendonorId;
    }

    // Verify this beasiswa belongs to the current pendonor and is in draft status
    const { data: beasiswa, error: fetchError } = await supabase
      .from('beasiswa')
      .select('beasiswaId, status, pendonorId')
      .eq('beasiswaId', beasiswaId)
      .eq('pendonorId', pendonorId)
      .single();

    if (fetchError || !beasiswa) {
      return res.status(404).json({ message: 'Program beasiswa tidak ditemukan' });
    }

    if (beasiswa.status !== 'draft') {
      return res.status(400).json({ message: `Program tidak dapat dipublish karena statusnya "${beasiswa.status}", bukan "draft".` });
    }

    // Update status to aktif
    const { data: updated, error: updateError } = await supabase
      .from('beasiswa')
      .update({ status: 'aktif' })
      .eq('beasiswaId', beasiswaId)
      .select()
      .single();

    if (updateError) {
      console.error('[api/pendonor/beasiswa/publish] update error:', updateError);
      return res.status(500).json({ message: 'Gagal mempublish program beasiswa' });
    }

    return res.status(200).json({
      message: 'Program beasiswa berhasil dipublish',
      data: updated,
    });
  } catch (error) {
    console.error('[api/pendonor/beasiswa/publish] Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}
