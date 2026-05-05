import { supabase } from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';

/**
 * GET /api/mahasiswa/laporan-kendala
 * Mengambil semua laporan kendala yang dibuat oleh mahasiswa yang sedang login.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Auth guard
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'mahasiswa') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Resolve userId
  let userId = decoded.userId ?? null;

  if (!userId) {
    // Fallback lookup
    let { data: userData, error: userError } = await supabase
      .from('user')
      .select('userId')
      .eq('accountId', decoded.accountId)
      .single();

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

  // Fetch laporan milik user ini
  const { data: laporan, error } = await supabase
    .from('laporan_link_rusak')
    .select(`
      laporanId,
      deskripsi,
      status,
      tanggalLapor,
      beasiswa (
        judul,
        pendonor (statusOrganisasi)
      )
    `)
    .eq('userId', userId)
    .order('tanggalLapor', { ascending: false });

  if (error) {
    console.error('[mahasiswa/laporan-kendala] fetch error:', error);
    return res.status(500).json({ message: 'Gagal memuat laporan.' });
  }

  return res.status(200).json({ laporan: laporan || [] });
}