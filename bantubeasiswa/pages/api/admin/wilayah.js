import { getSupabaseAdmin } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';

/**
 * GET  /api/admin/wilayah        → list semua wilayah is3T=true
 * POST /api/admin/wilayah        → tambah wilayah baru
 *
 * Hanya dapat diakses oleh role 'admin'.
 */
export default async function handler(req, res) {
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const db = getSupabaseAdmin();

  // ── GET ─────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await db
      .from('wilayah')
      .select('*')
      .eq('is3T', true)
      .order('nama', { ascending: true });

    if (error) {
      console.error('[GET /api/admin/wilayah]', error);
      return res.status(500).json({ message: 'Gagal mengambil data wilayah.' });
    }

    return res.status(200).json(data);
  }

  // ── POST ─────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { nama, tipe, kode, mode, isAfirmasi, is3T } = req.body;
    const kodeVal = (kode ?? mode)?.trim() || '3T';

    if (!nama?.trim() || !tipe?.trim()) {
      return res.status(400).json({ message: 'Nama dan tipe wajib diisi.' });
    }

    const { data, error } = await db
      .from('wilayah')
      .insert({
        nama       : nama.trim(),
        tipe       : tipe.trim(),
        kode       : kodeVal,
        isAfirmasi : isAfirmasi ?? false,
        is3T       : is3T ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/admin/wilayah]', error);
      return res.status(500).json({ message: 'Gagal menambah wilayah.' });
    }

    return res.status(201).json(data);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
