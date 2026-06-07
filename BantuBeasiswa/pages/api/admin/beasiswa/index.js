import { getServerSupabase } from '../../../../lib/supabaseServer';
import { verifyToken } from '../../../../lib/auth';

/**
 * GET /api/admin/beasiswa
 * Mengambil semua beasiswa yang terdaftar di platform (untuk admin).
 * Dapat difilter berdasarkan status.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 1. Auth guard: verify token & role
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Hanya admin yang dapat mengakses endpoint ini' });
    }

    const supabase = getServerSupabase();

    // 2. Parse status filter from query
    const { status } = req.query;

    // 3. Fetch beasiswa
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
        alasanPenolakan,
        createdAt,
        pendonor (
          pendonorId,
          statusOrganisasi,
          kontak,
          alamat
        ),
        beasiswa_wilayah (
          keterangan,
          wilayah (
            wilayahId,
            nama,
            tipe,
            isAfirmasi,
            is3T,
            provinsi ( provinsiId, nama )
          )
        )
      `)
      .order('beasiswaId', { ascending: false });

    if (status && status !== 'Semua') {
      query = query.eq('status', status);
    }

    const { data: beasiswaList, error: beasiswaError } = await query;

    if (beasiswaError) {
      console.error('[GET /api/admin/beasiswa] error:', beasiswaError);
      return res.status(500).json({ message: 'Gagal mengambil data beasiswa' });
    }

    return res.status(200).json({
      message: 'Daftar program beasiswa berhasil diambil',
      count: (beasiswaList ?? []).length,
      data: beasiswaList ?? [],
    });
  } catch (error) {
    console.error('[GET /api/admin/beasiswa] Server Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}
