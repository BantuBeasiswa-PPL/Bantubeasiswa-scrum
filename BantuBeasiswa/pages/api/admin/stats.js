import { supabase } from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';
import { hasAlamatKtpLengkap } from '../../../lib/mahasiswaProfile';

/**
 * GET /api/admin/stats
 * Mengembalikan 4 angka ringkasan untuk dashboard admin.
 * Hanya bisa diakses oleh role 'admin'.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Proteksi: verifikasi token & role
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Jalankan 4 query sekaligus (paralel)
    const [
      { count: totalBeasiswa,  error: e1 },
      { data: userKtpRows,     error: e2 },
      { count: totalPendonor,  error: e3 },
      { count: totalWilayah3T, error: e4 },
    ] = await Promise.all([

      // 1. Beasiswa aktif
      supabase
        .from('beasiswa')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aktif'),

      // 2. Mahasiswa dengan formulir alamat KTP lengkap
      supabase
        .from('user')
        .select('provinsiKtpId, kabupatenKtpId, alamatKtp'),

      // 3. Pendonor (account with role='pendonor')
      supabase
        .from('account')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'pendonor'),

      // 4. Wilayah 3T
      supabase
        .from('wilayah')
        .select('*', { count: 'exact', head: true })
        .eq('is3T', true),
    ]);

    if (e1 || e2 || e3 || e4) {
      throw new Error('Query error');
    }

    const totalPendaftar = (userKtpRows || []).filter(hasAlamatKtpLengkap).length;

    return res.status(200).json({
      totalBeasiswa : totalBeasiswa  ?? 0,
      totalPendaftar,
      totalPendonor : totalPendonor  ?? 0,
      totalWilayah3T: totalWilayah3T ?? 0,
    });
  } catch (err) {
    console.error('[/api/admin/stats]', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
}
