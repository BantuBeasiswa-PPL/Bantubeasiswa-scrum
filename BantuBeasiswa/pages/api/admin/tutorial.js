import { supabase } from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';

/**
 * CRUD API /api/admin/tutorial
 * POST   → Tambah tutorial baru
 * PUT    → Update tutorial yang sudah ada
 * DELETE → Hapus tutorial berdasarkan ID
 * Hanya dapat diakses oleh pengguna dengan role 'admin'.
 */
export default async function handler(req, res) {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(403).json({ message: 'Hanya admin yang dapat mengakses endpoint ini' });
  }

  // ── POST (tambah tutorial baru) ────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { judul, konten } = req.body;

      if (!judul || !judul.trim()) {
        return res.status(400).json({ message: 'Judul wajib diisi' });
      }
      if (!konten || !konten.trim()) {
        return res.status(400).json({ message: 'Konten tutorial wajib diisi' });
      }

      // Insert ke tabel tutorial (Supabase)
      const { data, error } = await supabase
        .from('tutorial')
        .insert([{ judul, konten }])
        .select('tutorialId, judul, konten')
        .single();

      if (error) throw error;

      return res.status(201).json(data);
    } catch (err) {
      console.error('[POST /api/admin/tutorial]', err);
      return res.status(500).json({ message: 'Gagal menambahkan tutorial baru' });
    }
  }

  // ── PUT (update tutorial) ──────────────────────────────────────────────────
  if (req.method === 'PUT') {
    try {
      const { tutorialId, judul, konten } = req.body;

      if (!tutorialId) {
        return res.status(400).json({ message: 'tutorialId wajib ditentukan' });
      }
      if (!judul || !judul.trim()) {
        return res.status(400).json({ message: 'Judul wajib diisi' });
      }
      if (!konten || !konten.trim()) {
        return res.status(400).json({ message: 'Konten wajib diisi' });
      }

      // Update ke tabel tutorial (Supabase)
      const { data, error } = await supabase
        .from('tutorial')
        .update({ judul, konten })
        .eq('tutorialId', tutorialId)
        .select('tutorialId, judul, konten')
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ message: 'Tutorial tidak ditemukan' });

      return res.status(200).json(data);
    } catch (err) {
      console.error('[PUT /api/admin/tutorial]', err);
      return res.status(500).json({ message: 'Gagal memperbarui data tutorial' });
    }
  }

  // ── DELETE (hapus tutorial) ────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ message: 'ID tutorial wajib disertakan pada query parameter' });
      }

      const { error } = await supabase
        .from('tutorial')
        .delete()
        .eq('tutorialId', id);

      if (error) throw error;

      return res.status(200).json({ message: 'Tutorial berhasil dihapus', tutorialId: id });
    } catch (err) {
      console.error('[DELETE /api/admin/tutorial]', err);
      return res.status(500).json({ message: 'Gagal menghapus tutorial' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
