import { supabase } from '../../lib/db';
import { verifyToken } from '../../lib/auth';

/**
 * POST /api/laporan-kendala
 * Submit laporan kendala dari mahasiswa yang sudah login.
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

  // ── Resolusi userId ──────────────────────────────────────────────────────
  let userId = decoded.userId ?? null;

  if (!userId) {
    // Fallback: lookup via accountId - coba camelCase dulu (schema lama)
    let { data: userData, error: userError } = await supabase
      .from('user')
      .select('userId')
      .eq('accountId', decoded.accountId)
      .single();

    // Jika gagal, coba snake_case (schema baru)
    if (userError) {
      const result = await supabase
        .from('user')
        .select('id')
        .eq('account_id', decoded.accountId)
        .single();
      userData = result.data;
      userError = result.error;
      if (!userError && userData) userId = userData.id;
    } else if (userData) {
      userId = userData.userId;
    }

    if (!userId) {
      return res.status(404).json({ message: 'Profil mahasiswa tidak ditemukan.' });
    }
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
      userId    : userId,
      beasiswaId: Number(beasiswaId),
      deskripsi : deskripsiTrimmed,
      // tanggalLapor dan status diisi default DB
    });

  if (error) {
    console.error('[/api/laporan-link-rusak] insert error:', error);
    return res.status(500).json({ message: 'Gagal menyimpan laporan. Coba lagi.' });
  }

  return res.status(201).json({ message: 'Laporan berhasil disimpan.' });
}
