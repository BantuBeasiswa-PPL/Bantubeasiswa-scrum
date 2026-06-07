import { getServerSupabase } from '../../../lib/supabaseServer';
import { verifyToken } from '../../../lib/auth';

/**
 * GET /api/pendonor/laporan
 * Mengambil data rekapitulasi penyaluran dana untuk pendonor yang sedang login.
 * Menghubungkan beasiswa -> pendaftaran (LULUS) -> user -> rekening, serta penyaluran_dana.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 1. Auth guard: verify token & role
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'pendonor') {
      return res.status(401).json({ message: 'Tidak ada session. Silakan login terlebih dahulu.' });
    }

    const supabase = getServerSupabase();

    // 2. Resolve pendonorId
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

    // 3. Fetch beasiswa + pendaftaran (LULUS) + penyaluran_dana
    const { data: beasiswaList, error: beasiswaError } = await supabase
      .from('beasiswa')
      .select(`
        beasiswaId,
        judul,
        nominal,
        pendaftaran (
          status
        ),
        penyaluran_dana (
          tanggalPenyaluran,
          status,
          jumlahDana
        )
      `)
      .eq('pendonorId', pendonorId);

    if (beasiswaError) {
      console.error('[GET /api/pendonor/laporan] fetch error:', beasiswaError);
      return res.status(500).json({ message: 'Gagal memproses data laporan' });
    }

    // 4. Flatten/aggregate data per program beasiswa
    const reportData = [];

    for (const b of (beasiswaList || [])) {
      const graduates = (b.pendaftaran || []).filter(p => p.status === 'LULUS');
      const penyaluranList = b.penyaluran_dana || [];

      const jumlahLulus = graduates.length;
      
      // Hitung total dana tersalurkan (status confirmed atau tersalurkan)
      const totalTersalurkan = penyaluranList
        .filter(p => p.status === 'confirmed' || p.status === 'tersalurkan')
        .reduce((sum, p) => sum + (p.jumlahDana || 0), 0);

      // Cari tanggal penyaluran terbaru
      let tanggalPenyaluran = '—';
      const dates = penyaluranList
        .filter(p => p.tanggalPenyaluran)
        .map(p => new Date(p.tanggalPenyaluran));
      if (dates.length > 0) {
        const maxDate = new Date(Math.max(...dates));
        const year = maxDate.getFullYear();
        const month = String(maxDate.getMonth() + 1).padStart(2, '0');
        const day = String(maxDate.getDate()).padStart(2, '0');
        tanggalPenyaluran = `${year}-${month}-${day}`;
      }

      // Tentukan status program:
      // - pending: jika tidak ada yang tersalurkan/confirmed
      // - diproses: jika sebagian sudah tersalurkan/confirmed
      // - tersalurkan: jika semua lulus sudah confirmed/tersalurkan
      let status = 'pending';
      if (jumlahLulus > 0) {
        const countPaid = penyaluranList.filter(p => p.status === 'confirmed' || p.status === 'tersalurkan').length;
        if (countPaid === jumlahLulus) {
          status = 'tersalurkan';
        } else if (countPaid > 0) {
          status = 'diproses';
        }
      }

      reportData.push({
        beasiswaId: b.beasiswaId,
        judul: b.judul,
        nominal: b.nominal || 0,
        jumlahLulus,
        totalTersalurkan,
        tanggal_penyaluran: tanggalPenyaluran,
        status,
      });
    }

    // Ambil nama pendonor untuk metaInfo
    const { data: donorProfile } = await supabase
      .from('pendonor')
      .select('statusOrganisasi')
      .eq('pendonorId', pendonorId)
      .single();

    return res.status(200).json({
      message: 'Data laporan berhasil diambil',
      metaInfo: {
        namaPendonor: donorProfile?.statusOrganisasi || 'Mitra Pendonor',
        tanggalGenerate: new Date().toLocaleDateString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric'
        }),
      },
      data: reportData,
    });

  } catch (error) {
    console.error('[GET /api/pendonor/laporan] Server Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}
