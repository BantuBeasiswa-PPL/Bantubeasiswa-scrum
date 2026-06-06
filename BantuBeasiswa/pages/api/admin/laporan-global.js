import { getServerSupabase } from '../../../lib/supabaseServer';
import { verifyToken } from '../../../lib/auth';

/**
 * GET /api/admin/laporan-global
 * Mengambil data rekapitulasi penyaluran dana global untuk seluruh pendonor.
 * Data berupa: Nama Pendonor, Total Penerima (Status LULUS), dan Total Dana (penyaluran_dana.jumlahDana).
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

    // 2. Fetch all pendonor + beasiswa + pendaftaran + penyaluran_dana
    const { data: pendonorList, error: fetchError } = await supabase
      .from('pendonor')
      .select(`
        pendonorId,
        statusOrganisasi,
        beasiswa (
          beasiswaId,
          nominal,
          pendaftaran (
            status
          ),
          penyaluran_dana (
            jumlahDana,
            status
          )
        )
      `);

    if (fetchError) {
      console.error('[GET /api/admin/laporan-global] error:', fetchError);
      return res.status(500).json({ message: 'Gagal memproses data laporan global' });
    }

    // 3. Rekap data per pendonor
    const rekapData = (pendonorList || []).map((p) => {
      let totalPenerima = 0;
      let totalDana = 0;

      for (const b of (p.beasiswa || [])) {
        // Hitung penerima yang LULUS
        const lulusCount = (b.pendaftaran || []).filter(reg => reg.status === 'LULUS').length;
        totalPenerima += lulusCount;

        // Hitung total dana tersalurkan dari penyaluran_dana (hanya yang statusnya bukan 'gagal')
        const penyaluranList = b.penyaluran_dana || [];
        for (const pd of penyaluranList) {
          if (pd.status !== 'gagal') {
            totalDana += pd.jumlahDana || 0;
          }
        }
      }

      return {
        pendonorId: p.pendonorId,
        namaPendonor: p.statusOrganisasi || 'Mitra Pendonor',
        totalPenerima,
        totalDana,
      };
    });

    return res.status(200).json({
      message: 'Data laporan global berhasil diambil',
      metaInfo: {
        tanggalGenerate: new Date().toLocaleDateString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric'
        }),
      },
      data: rekapData,
    });

  } catch (error) {
    console.error('[GET /api/admin/laporan-global] Server Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}
