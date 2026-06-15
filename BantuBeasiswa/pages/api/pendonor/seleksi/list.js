import { getServerSupabase } from '../../../../lib/supabaseServer';
import { verifyToken } from '../../../../lib/auth';
import { decryptRekeningRow } from '../../../../lib/rekeningCrypto';

/**
 * GET /api/pendonor/seleksi/list?beasiswaId=X
 * Mengambil daftar pendaftar beserta dokumen mereka untuk beasiswa tertentu.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 1. Auth: cek JWT & role
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'pendonor') {
      return res.status(401).json({ message: 'Tidak ada session. Silakan login terlebih dahulu.' });
    }

    const supabase = getServerSupabase();

    // 2. Resolve pendonorId dari accountId
    let pendonorId = decoded.userId ?? null;
    if (!pendonorId) {
      const { data: pendonor, error: pendonorError } = await supabase
        .from('pendonor')
        .select('pendonorId')
        .eq('accountId', decoded.accountId)
        .single();

      if (pendonorError || !pendonor) {
        return res.status(404).json({ message: 'Profil pendonor tidak ditemukan' });
      }
      pendonorId = pendonor.pendonorId;
    }

    // 3. Ambil & validasi beasiswaId
    const { beasiswaId } = req.query;
    if (!beasiswaId) {
      return res.status(400).json({ message: 'beasiswaId wajib diisi' });
    }

    const beasiswaIdInt = parseInt(beasiswaId, 10);
    if (isNaN(beasiswaIdInt)) {
      return res.status(400).json({ message: 'beasiswaId tidak valid' });
    }

    // 4. Verifikasi kepemilikan beasiswa
    const { data: beasiswa, error: beasiswaError } = await supabase
      .from('beasiswa')
      .select('pendonorId')
      .eq('beasiswaId', beasiswaIdInt)
      .single();

    if (beasiswaError || !beasiswa) {
      return res.status(404).json({ message: 'Program beasiswa tidak ditemukan' });
    }

    if (String(beasiswa.pendonorId) !== String(pendonorId)) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses ke program beasiswa ini' });
    }

    // 5. Ambil data pendaftaran beserta relasi user, beasiswa, dan dokumen
    const { data: pendaftaranList, error: pendaftaranError } = await supabase
      .from('pendaftaran')
      .select(`
        pendaftaranId,
        userId,
        status,
        createdAt,
        user:userId (
          nama,
          email
        ),
        beasiswa:beasiswaId (
          judul
        ),
        dokumen (
          dokumenId,
          jenis,
          error,
          statusDokumen,
          rejectionReason
        )
      `)
      .eq('beasiswaId', beasiswaIdInt)
      .order('createdAt', { ascending: true });

    if (pendaftaranError) {
      console.error('[api/pendonor/seleksi/list] fetch error:', pendaftaranError);
      return res.status(500).json({ message: 'Gagal mengambil data pendaftar' });
    }

    const userIds = [...new Set((pendaftaranList ?? []).map((item) => item.userId).filter(Boolean))];
    let rekeningByUserId = {};

    if (userIds.length > 0) {
      const { data: rekeningList, error: rekeningError } = await supabase
        .from('rekening')
        .select('*')
        .in('userId', userIds)
        .order('rekeningId', { ascending: false });

      if (rekeningError) {
        console.error('[api/pendonor/seleksi/list] rekening fetch error:', rekeningError);
      } else {
        rekeningByUserId = (rekeningList ?? []).reduce((acc, rekening) => {
          if (!acc[rekening.userId]) acc[rekening.userId] = decryptRekeningRow(rekening);
          return acc;
        }, {});
      }
    }

    const data = (pendaftaranList ?? []).map((item) => ({
      ...item,
      user: {
        ...(item.user ?? {}),
        rekening: rekeningByUserId[item.userId] ? [rekeningByUserId[item.userId]] : [],
      },
    }));

    return res.status(200).json({
      message: 'Daftar pendaftar berhasil diambil',
      data,
    });
  } catch (error) {
    console.error('[api/pendonor/seleksi/list] Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}
