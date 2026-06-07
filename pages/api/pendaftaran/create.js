import { verifyToken } from '../../../lib/auth';
import { getServerSupabase } from '../../../lib/supabaseServer';

/**
 * POST /api/pendaftaran/create
 *
 * Body: { beasiswaId: number }
 *
 * Alur:
 *  1. Auth → accountId dari JWT
 *  2. Resolusi userId dari tabel "user" (via accountId)
 *  3. Cek duplikat pendaftaran
 *  4. Cek beasiswa masih aktif + deadline
 *  5. Hitung jumlah pendaftar saat ini
 *  6. INSERT pendaftaran → return pendaftaranId
 *
 * Kolom tabel pendaftaran: pendaftaranId, userId, beasiswaId, status, createdAt, updatedAt
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  /* ── 1. Auth ── */
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Tidak terautentikasi' });
  if (decoded.role !== 'mahasiswa') {
    return res.status(403).json({ message: 'Hanya mahasiswa yang dapat mendaftar beasiswa' });
  }

  const { beasiswaId } = req.body;
  if (!beasiswaId) {
    return res.status(400).json({ message: 'beasiswaId wajib diisi' });
  }

  const supabase = getServerSupabase();

  /* ── 2. Resolusi userId ── */
  // Jika userId sudah ada di JWT (login baru), pakai langsung
  let userId = decoded.userId ?? null;

  if (!userId) {
    // Fallback: lookup via accountId
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('userId')
      .eq('accountId', decoded.accountId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ message: 'Profil mahasiswa tidak ditemukan' });
    }
    userId = userData.userId;
  }
  const beasiswaIdNum = Number(beasiswaId);
  if (!Number.isFinite(beasiswaIdNum)) {
    return res.status(400).json({ message: 'beasiswaId tidak valid' });
  }

  /* ── 3. Cek duplikat ── */
  const { data: existing, error: dupError } = await supabase
    .from('pendaftaran')
    .select('pendaftaranId')
    .eq('userId', userId)
    .eq('beasiswaId', beasiswaIdNum)
    .maybeSingle();

  if (dupError) {
    console.error('[pendaftaran/create] cek duplikat:', dupError);
    return res.status(500).json({ message: 'Gagal memeriksa status pendaftaran' });
  }

  if (existing) {
    return res.status(409).json({
      code         : 'DUPLICATE',
      message      : 'Kamu sudah mendaftar program ini sebelumnya',
      pendaftaranId: existing.pendaftaranId,
    });
  }

  /* ── 4. Cek beasiswa aktif + deadline ── */
  const { data: beasiswa, error: beasiswaError } = await supabase
    .from('beasiswa')
    .select('status, deadline, judul')
    .eq('beasiswaId', beasiswaIdNum)
    .single();

  if (beasiswaError) {
    console.error('[pendaftaran/create] lookup beasiswa:', beasiswaError);
    return res.status(500).json({ message: 'Gagal memeriksa data beasiswa. Silakan coba lagi.' });
  }

  if (!beasiswa) {
    return res.status(404).json({ message: 'Beasiswa tidak ditemukan' });
  }

  if (beasiswa.status !== 'aktif') {
    return res.status(400).json({
      code   : 'NOT_ACTIVE',
      message: `Pendaftaran beasiswa ini sudah ${beasiswa.status === 'ditutup' ? 'ditutup' : 'tidak tersedia'}`,
    });
  }

  if (beasiswa.deadline && new Date(beasiswa.deadline) < new Date()) {
    return res.status(400).json({
      code   : 'DEADLINE_PASSED',
      message: 'Batas waktu pendaftaran beasiswa ini sudah berakhir',
    });
  }

  /* ── 5. Hitung jumlah pendaftar saat ini ── */
  const { count: jumlahPendaftar, error: countError } = await supabase
    .from('pendaftaran')
    .select('*', { count: 'exact', head: true })
    .eq('beasiswaId', beasiswaIdNum)
    .neq('status', 'DITOLAK');

  if (countError) {
    console.error('[pendaftaran/create] hitung jumlah pendaftar:', countError);
    return res.status(500).json({ message: 'Gagal menghitung jumlah pendaftar' });
  }

  /* ── 6. INSERT pendaftaran baru ── */
  const { data: newPendaftaran, error: insertError } = await supabase
    .from('pendaftaran')
    .insert({
      userId    : userId,
      beasiswaId: beasiswaIdNum,
      status    : 'TERDAFTAR',
    })
    .select('pendaftaranId, status, createdAt')
    .single();

  if (insertError || !newPendaftaran) {
    console.error('[pendaftaran/create] insert:', insertError);
    return res.status(500).json({ message: 'Gagal membuat pendaftaran' });
  }

  return res.status(201).json({
    message      : 'Pendaftaran berhasil dibuat',
    pendaftaranId: newPendaftaran.pendaftaranId,
    status       : newPendaftaran.status,
    createdAt    : newPendaftaran.createdAt,
    beasiswaJudul: beasiswa.judul,
    sisaKuota    : null,
  });
}
