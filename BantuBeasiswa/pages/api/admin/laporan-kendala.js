import { supabase } from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';

/**
 * /api/admin/laporan-kendala
 *
 * GET  — ambil semua tiket + stat cards
 * PATCH — update status + catatan_admin satu tiket
 */
export default async function handler(req, res) {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GET — daftar tiket + stats
  // ══════════════════════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      // Ambil semua tiket dengan join ke user dan beasiswa
      const { data: tiket, error: tiketErr } = await supabase
        .from('laporan_link_rusak')
        .select('*, user:userId(nama, email), beasiswa:beasiswaId(judul)')
        .order('tanggalLapor', { ascending: false });

      if (tiketErr) throw tiketErr;

      // ── Hitung stat cards dari data yang sudah diambil ──────────────────
      const now          = Date.now();
      const MS_24H       = 24 * 60 * 60 * 1000;
      const ACTIVE_STATUSES = ['pending', 'diproses'];

      const totalAktif   = tiket.filter((t) => ACTIVE_STATUSES.includes(t.status)).length;
      const totalUrgent  = tiket.filter((t) => {
        const isActive = ACTIVE_STATUSES.includes(t.status);
        const ageMs    = now - new Date(t.tanggalLapor).getTime();
        return isActive && ageMs > MS_24H;
      }).length;

      // Rata-rata waktu penyelesaian (resolved / selesai saja) dalam jam
      const resolved     = tiket.filter(
        (t) => ['resolved', 'selesai'].includes(t.status) && t.tanggalLapor
      );
      let avgJam         = null;
      if (resolved.length > 0) {
        avgJam = 18; // dummy: ganti jika ada data waktu selesai nyata
      }

      return res.status(200).json({
        tiket,
        stats: {
          totalAktif,
          totalUrgent,
          avgJam,
          totalSemua: tiket.length,
        },
      });
    } catch (err) {
      console.error('[GET /api/admin/laporan-kendala]', err);
      return res.status(500).json({ message: 'Gagal memuat data laporan.' });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PATCH — update satu tiket
  // ══════════════════════════════════════════════════════════════════════════
  if (req.method === 'PATCH') {
    const { id, status } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'ID tiket harus disertakan.' });
    }

    const VALID_STATUS = ['pending', 'diproses', 'selesai', 'ditutup'];
    if (status && !VALID_STATUS.includes(status)) {
      return res.status(400).json({ message: 'Status tidak valid.' });
    }

    const payload = {};
    if (status) payload.status = status;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ message: 'Tidak ada field yang diupdate.' });
    }

    const { error } = await supabase
      .from('laporan_link_rusak')
      .update(payload)
      .eq('laporanId', id);

    if (error) {
      console.error('[PATCH /api/admin/laporan-kendala]', error);
      return res.status(500).json({ message: 'Gagal mengupdate tiket.' });
    }

    return res.status(200).json({ message: 'Tiket berhasil diupdate.' });
  }

  return res.status(405).end();
}
