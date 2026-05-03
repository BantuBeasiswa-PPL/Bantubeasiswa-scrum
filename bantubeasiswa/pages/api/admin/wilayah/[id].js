import { getSupabaseAdmin } from '../../../../../lib/db';
import { verifyToken } from '../../../../../lib/auth';

/**
 * PUT    /api/admin/wilayah/[id]   → update wilayah
 * DELETE /api/admin/wilayah/[id]   → hapus wilayah
 *
 * Hanya dapat diakses oleh role 'admin'.
 */
export default async function handler(req, res) {
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const db = getSupabaseAdmin();

  const { id } = req.query;
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ message: 'ID tidak valid.' });
  }

  // ── PUT ──────────────────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const { nama, tipe, kode, mode, isAfirmasi, is3T } = req.body;
    const kodeVal = (kode ?? mode)?.trim() || '3T';

    if (!nama?.trim() || !tipe?.trim()) {
      return res.status(400).json({ message: 'Nama dan tipe wajib diisi.' });
    }

    const { data, error } = await db
      .from('wilayah')
      .update({
        nama       : nama.trim(),
        tipe       : tipe.trim(),
        kode       : kodeVal,
        isAfirmasi : isAfirmasi ?? false,
        is3T       : is3T ?? true,
      })
      .eq('wilayahId', id)
      .select()
      .single();

    if (error) {
      console.error('[PUT /api/admin/wilayah/[id]]', error);
      return res.status(500).json({ message: 'Gagal memperbarui wilayah.' });
    }

    return res.status(200).json(data);
  }

  // ── DELETE ───────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { error } = await db
      .from('wilayah')
      .delete()
      .eq('wilayahId', id);

    if (error) {
      console.error('[DELETE /api/admin/wilayah/[id]]', error);
      return res.status(500).json({ message: 'Gagal menghapus wilayah.' });
    }

    return res.status(200).json({ message: 'Wilayah berhasil dihapus.' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
