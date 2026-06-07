import { supabase } from '../../lib/db';
import { verifyToken } from '../../lib/auth';

/**
 * POST /api/pendaftaran
 * Daftarkan mahasiswa ke beasiswa tertentu.
 * Body: { beasiswaId }
 * Response: { pendaftaranId }
 *
 * Kolom tabel pendaftaran: pendaftaranId, userId, beasiswaId, status, createdAt, updatedAt
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // ── Auth guard ───────────────────────────────────────────────────────────
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'mahasiswa') {
    return res.status(401).json({ message: 'Login sebagai mahasiswa untuk mendaftar.' });
  }

  // Resolve userId: try JWT first, fallback to DB lookup
  let userId = decoded.userId ?? null;

  if (!userId) {
    // Fallback: cari userId dari tabel user berdasarkan accountId
    const { data: profil } = await supabase
      .from('user')
      .select('userId')
      .eq('accountId', decoded.accountId)
      .single();
    userId = profil?.userId ?? null;
  }

  if (!userId) {
    return res.status(401).json({ message: 'Profil mahasiswa tidak ditemukan. Silakan login ulang.' });
  }

  const { beasiswaId } = req.body;
  if (!beasiswaId) {
    return res.status(400).json({ message: 'beasiswaId harus diisi.' });
  }

  // ── Cek beasiswa ada dan masih aktif ────────────────────────────────────
  const { data: beasiswa, error: beasiswaError } = await supabase
    .from('beasiswa')
    .select('beasiswaId, status, deadline')
    .eq('beasiswaId', beasiswaId)
    .single();

  if (beasiswaError || !beasiswa) {
    return res.status(404).json({ message: 'Beasiswa tidak ditemukan.' });
  }

  if (beasiswa.status !== 'aktif') {
    return res.status(400).json({ message: 'Beasiswa ini sudah tidak aktif.' });
  }

  if (beasiswa.deadline && new Date(beasiswa.deadline) < new Date()) {
    return res.status(400).json({ message: 'Batas waktu pendaftaran beasiswa ini sudah berakhir.' });
  }

  // ── Cek sudah pernah daftar ─────────────────────────────────────────────
  const { data: existing } = await supabase
    .from('pendaftaran')
    .select('pendaftaranId')
    .eq('beasiswaId', beasiswaId)
    .eq('userId', userId)
    .maybeSingle();

  if (existing) {
    return res.status(200).json({
      message      : 'Kamu sudah pernah mendaftar beasiswa ini.',
      pendaftaranId: existing.pendaftaranId,
      sudahDaftar  : true,
    });
  }

  // ── Insert pendaftaran baru ──────────────────────────────────────────────
  const { data: newPendaftaran, error: insertError } = await supabase
    .from('pendaftaran')
    .insert({
      userId     : userId,
      beasiswaId : Number(beasiswaId),
      status     : 'TERDAFTAR',
    })
    .select('pendaftaranId')
    .single();

  if (insertError || !newPendaftaran) {
    console.error('[/api/pendaftaran] insert error:', insertError);
    return res.status(500).json({ message: 'Gagal mendaftarkan. Coba lagi.' });
  }

  return res.status(201).json({
    message      : 'Pendaftaran berhasil!',
    pendaftaranId : newPendaftaran.pendaftaranId,
    sudahDaftar  : false,
  });
}
