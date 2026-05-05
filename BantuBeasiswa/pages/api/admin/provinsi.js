import { supabase } from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';

/**
 * GET   /api/admin/provinsi            → semua provinsi
 * GET   /api/admin/provinsi?afirmasi=true → hanya isAfirmasi=true
 * PATCH /api/admin/provinsi            → toggle isAfirmasi satu provinsi
 *   body: { provinsiId: number, isAfirmasi: boolean }
 */
export default async function handler(req, res) {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(403).json({ message: 'Hanya admin yang dapat mengakses endpoint ini' });
  }

  // ── GET ────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { afirmasi } = req.query;

      let query = supabase
        .from('provinsi')
        .select('provinsiId, nama, isAfirmasi')
        .order('nama', { ascending: true });

      if (afirmasi === 'true') {
        query = query.eq('isAfirmasi', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json(data || []);
    } catch (err) {
      console.error('[GET /api/admin/provinsi]', err);
      return res.status(500).json({ message: 'Gagal mengambil data provinsi' });
    }
  }

  // ── PATCH (toggle isAfirmasi) ──────────────────────────────────────────────
  if (req.method === 'PATCH') {
    try {
      const { provinsiId, isAfirmasi } = req.body;

      if (provinsiId === undefined || isAfirmasi === undefined) {
        return res.status(400).json({ message: 'provinsiId dan isAfirmasi wajib diisi' });
      }

      const { data, error } = await supabase
        .from('provinsi')
        .update({ isAfirmasi })
        .eq('provinsiId', provinsiId)
        .select('provinsiId, nama, isAfirmasi')
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ message: 'Provinsi tidak ditemukan' });

      return res.status(200).json(data);
    } catch (err) {
      console.error('[PATCH /api/admin/provinsi]', err);
      return res.status(500).json({ message: 'Gagal memperbarui status provinsi' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
