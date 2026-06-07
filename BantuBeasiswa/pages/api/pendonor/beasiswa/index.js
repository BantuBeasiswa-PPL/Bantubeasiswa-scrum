/**
 * GET /api/pendonor/beasiswa
 * Mengambil semua beasiswa yang dibuat oleh pendonor yang sedang login.
 *
 * Response: { message, count, data: [] }
 */
import { getServerSupabase } from '../../../../lib/supabaseServer';
import { verifyToken } from '../../../../lib/auth';

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

    // 2. Resolve pendonorId dari accountId (fallback ke userId di JWT jika tersedia)
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

    // 3. Parse query parameters
    const { status, limit } = req.query;

    // 4. Fetch beasiswa milik pendonor ini
    let query = supabase
      .from('beasiswa')
      .select(`
        beasiswaId,
        judul,
        jalur,
        deskripsi,
        syarat,
        nominal,
        kuota,
        linkPendaftaran,
        deadline,
        status,
<<<<<<< HEAD
        createdAt,
        pendaftaran(count)
=======
        alasanPenolakan,
        createdAt
>>>>>>> 52eedbe5d5518f1951926949703ae20406197132
      `)
      .eq('pendonorId', pendonorId)
      .order('beasiswaId', { ascending: false });

    // Filter opsional berdasarkan status
    if (status) query = query.eq('status', status);
    // Limit opsional
    if (limit) query = query.limit(parseInt(limit, 10));

    const { data: beasiswaList, error: beasiswaError } = await query;

    if (beasiswaError) {
      console.error('[api/pendonor/beasiswa] fetch error:', beasiswaError);
      return res.status(500).json({ message: 'Gagal mengambil data beasiswa' });
    }

    return res.status(200).json({
      message: 'Daftar program beasiswa berhasil diambil',
      count: (beasiswaList ?? []).length,
      data: beasiswaList ?? [],
    });
  } catch (error) {
    console.error('[api/pendonor/beasiswa] Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}
