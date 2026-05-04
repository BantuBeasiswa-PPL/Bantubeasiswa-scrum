import { supabase } from '../../lib/db';
import { verifyToken } from '../../lib/auth';

/**
 * POST /api/laporan-link-rusak
 * Submit laporan link rusak dari mahasiswa yang sudah login.
 *
 * Body: { beasiswaId, deskripsi }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // ── Auth guard ───────────────────────────────────────────────────────────
  const decoded = verifyToken(req);
  if (!decoded) {
    return res.status(401).json({ message: 'Login dulu untuk melaporkan masalah.' });
  }

  const { beasiswaId, deskripsi } = req.body;

  // ── Validasi input ───────────────────────────────────────────────────────
  if (!beasiswaId || !deskripsi) {
    return res.status(400).json({ message: 'beasiswaId dan deskripsi harus diisi.' });
  }

  const deskripsiTrimmed = String(deskripsi).trim();
  if (deskripsiTrimmed.length < 20) {
    return res.status(400).json({ message: 'Deskripsi minimal 20 karakter.' });
  }

  // ── Cek beasiswa ada ─────────────────────────────────────────────────────
  const { data: beasiswa, error: beasiswaError } = await supabase
    .from('beasiswa')
    .select('beasiswaId')
    .eq('beasiswaId', beasiswaId)
    .single();

  if (beasiswaError || !beasiswa) {
    return res.status(404).json({ message: 'Beasiswa tidak ditemukan.' });
  }

  // ── Insert laporan ───────────────────────────────────────────────────────
  const { error } = await supabase
    .from('laporan_link_rusak')
    .insert({
      user_id    : decoded.accountId,
      beasiswa_id: Number(beasiswaId),
      deskripsi  : deskripsiTrimmed,
      // tanggal_lapor dan status diisi default DB
    });

  if (error) {
    console.error('[/api/laporan-link-rusak] insert error:', error);
    return res.status(500).json({ message: 'Gagal menyimpan laporan. Coba lagi.' });
  }

  return res.status(201).json({ message: 'Laporan berhasil disimpan.' });
}
