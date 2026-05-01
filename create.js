import { verifyToken } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';

/**
 * POST /api/pendaftaran/create
 *
 * Body: { beasiswa_id: number }
 *
 * Alur berurutan (chain):
 *  1. Auth → account_id dari JWT
 *  2. Resolusi user_id dari tabel "user"
 *  3. Cek duplikat pendaftaran
 *  4. Cek beasiswa masih aktif
 *  5. Cek kuota tersisa
 *  6. INSERT pendaftaran → return pendaftaran_id
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  /* ── 1. Auth ── */
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Tidak terautentikasi' });

  const { beasiswa_id } = req.body;
  if (!beasiswa_id) {
    return res.status(400).json({ message: 'beasiswa_id wajib diisi' });
  }

  /* ── 2. Resolusi user_id ── */
  const { data: userData, error: userError } = await supabase
    .from('user')
    .select('id')
    .eq('account_id', decoded.accountId)
    .single();

  if (userError || !userData) {
    return res.status(404).json({ message: 'Profil mahasiswa tidak ditemukan' });
  }
  const userId = userData.id;

  /* ── 3. Cek duplikat ── */
  // maybeSingle() tidak error kalau row tidak ada (berbeda dengan single())
  const { data: existing, error: dupError } = await supabase
    .from('pendaftaran')
    .select('id')
    .eq('user_id', userId)
    .eq('beasiswa_id', beasiswa_id)
    .maybeSingle();

  if (dupError) {
    console.error('[pendaftaran/create] cek duplikat:', dupError);
    return res.status(500).json({ message: 'Gagal memeriksa status pendaftaran' });
  }

  if (existing) {
    return res.status(409).json({
      code: 'DUPLICATE',
      message: 'Kamu sudah mendaftar program ini sebelumnya',
      pendaftaran_id: existing.id,
    });
  }

  /* ── 4. Cek beasiswa aktif ── */
  const { data: beasiswa, error: beasiswaError } = await supabase
    .from('beasiswa')
    .select('status, kuota, deadline, judul')
    .eq('id', beasiswa_id)
    .single();

  if (beasiswaError || !beasiswa) {
    return res.status(404).json({ message: 'Beasiswa tidak ditemukan' });
  }

  if (beasiswa.status !== 'aktif') {
    return res.status(400).json({
      code: 'NOT_ACTIVE',
      message: `Pendaftaran beasiswa ini sudah ${beasiswa.status === 'ditutup' ? 'ditutup' : 'tidak tersedia'}`,
    });
  }

  // Cek deadline
  if (beasiswa.deadline && new Date(beasiswa.deadline) < new Date()) {
    return res.status(400).json({
      code: 'DEADLINE_PASSED',
      message: 'Batas waktu pendaftaran beasiswa ini sudah berakhir',
    });
  }

  /* ── 5. Cek kuota tersisa ── */
  const { count: jumlahPendaftar, error: countError } = await supabase
    .from('pendaftaran')
    .select('*', { count: 'exact', head: true }) // head:true = tidak fetch rows, hanya count
    .eq('beasiswa_id', beasiswa_id)
    .neq('status', 'DITOLAK'); // pendaftar yang ditolak tidak dihitung terhadap kuota

  if (countError) {
    console.error('[pendaftaran/create] hitung kuota:', countError);
    return res.status(500).json({ message: 'Gagal memeriksa kuota' });
  }

  if (beasiswa.kuota !== null && jumlahPendaftar >= beasiswa.kuota) {
    return res.status(400).json({
      code: 'QUOTA_FULL',
      message: `Kuota pendaftar sudah terpenuhi (${beasiswa.kuota} orang)`,
    });
  }

  /* ── 6. INSERT pendaftaran baru ── */
  const { data: newPendaftaran, error: insertError } = await supabase
    .from('pendaftaran')
    .insert({
      user_id:     userId,
      beasiswa_id: beasiswa_id,
      status:      'TERDAFTAR',
    })
    .select('id, status, created_at')
    .single();

  if (insertError || !newPendaftaran) {
    console.error('[pendaftaran/create] insert:', insertError);
    return res.status(500).json({ message: 'Gagal membuat pendaftaran' });
  }

  return res.status(201).json({
    message: 'Pendaftaran berhasil dibuat',
    pendaftaran_id: newPendaftaran.id,
    status:         newPendaftaran.status,
    created_at:     newPendaftaran.created_at,
    beasiswa_judul: beasiswa.judul,
    sisa_kuota:     beasiswa.kuota !== null ? beasiswa.kuota - (jumlahPendaftar + 1) : null,
  });
}
