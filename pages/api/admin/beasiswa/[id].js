import { getServerSupabase } from '../../../../lib/supabaseServer';
import { verifyToken } from '../../../../lib/auth';

/**
 * API Endpoint: /api/admin/beasiswa/[id]
 *
 * PATCH - Menyetujui atau menolak beasiswa (approve / reject)
 *   body: { action: 'approve' | 'reject', alasan?: string }
 *
 * DELETE - Menghapus beasiswa secara permanen dengan mencantumkan alasan
 *   body: { alasan: string }
 */
export default async function handler(req, res) {
  const { method } = req;

  if (!['PATCH', 'DELETE'].includes(method)) {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 1. Auth guard: verify token & role
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Hanya admin yang dapat mengakses endpoint ini' });
    }

    const supabase = getServerSupabase();
    const { id } = req.query;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'ID beasiswa tidak valid' });
    }

    const beasiswaIdInt = parseInt(id, 10);

    // Cek apakah beasiswa ada
    const { data: beasiswa, error: checkError } = await supabase
      .from('beasiswa')
      .select('beasiswaId, judul, status')
      .eq('beasiswaId', beasiswaIdInt)
      .maybeSingle();

    if (checkError || !beasiswa) {
      return res.status(404).json({ message: 'Beasiswa tidak ditemukan' });
    }

    // ─── PATCH METHOD (APPROVE / REJECT) ───────────────────────────────────
    if (method === 'PATCH') {
      const { action, alasan } = req.body || {};

      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: "Action wajib diisi ('approve' atau 'reject')" });
      }

      if (action === 'reject' && (!alasan || !alasan.trim())) {
        return res.status(400).json({ message: 'Alasan penolakan wajib diisi' });
      }

      let updatePayload = {};
      if (action === 'approve') {
        updatePayload = {
          status: 'aktif',
          alasanPenolakan: null,
          updatedAt: new Date().toISOString()
        };
      } else {
        updatePayload = {
          status: 'draft',
          alasanPenolakan: alasan.trim(),
          updatedAt: new Date().toISOString()
        };
      }

      const { data: updated, error: updateError } = await supabase
        .from('beasiswa')
        .update(updatePayload)
        .eq('beasiswaId', beasiswaIdInt)
        .select('beasiswaId, status, alasanPenolakan')
        .single();

      if (updateError) {
        console.error('[PATCH /api/admin/beasiswa/[id]] error:', updateError);
        return res.status(500).json({ message: 'Gagal memperbarui status beasiswa' });
      }

      const msg = action === 'approve'
        ? 'Program beasiswa berhasil disetujui'
        : 'Program beasiswa berhasil ditolak dan dikembalikan ke draft';

      return res.status(200).json({
        beasiswaId: updated.beasiswaId,
        status: updated.status,
        message: msg
      });
    }

    // ─── DELETE METHOD (DELETE WITH REASON) ────────────────────────────────
    if (method === 'DELETE') {
      const { alasan } = req.body || {};

      if (!alasan || !alasan.trim()) {
        return res.status(400).json({ message: 'Alasan penghapusan wajib dicantumkan' });
      }

      // Log alasan penghapusan beasiswa oleh admin
      console.log(`[ADMIN ACTION] Beasiswa "${beasiswa.judul}" (ID: ${beasiswa.beasiswaId}) dihapus oleh admin dengan alasan: "${alasan.trim()}"`);

      const { error: deleteError } = await supabase
        .from('beasiswa')
        .delete()
        .eq('beasiswaId', beasiswaIdInt);

      if (deleteError) {
        console.error('[DELETE /api/admin/beasiswa/[id]] error:', deleteError);
        return res.status(500).json({ message: 'Gagal menghapus beasiswa dari database' });
      }

      return res.status(200).json({
        message: `Program beasiswa "${beasiswa.judul}" berhasil dihapus dengan alasan: ${alasan.trim()}`
      });
    }

  } catch (error) {
    console.error('[api/admin/beasiswa/[id]] Server Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}
