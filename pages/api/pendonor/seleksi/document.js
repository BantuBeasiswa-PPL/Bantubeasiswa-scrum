import { getServerSupabase } from '../../../../lib/supabaseServer';
import { verifyToken } from '../../../../lib/auth';

/**
 * POST /api/pendonor/seleksi/document
 * Mengubah status verifikasi untuk dokumen tertentu (Approve / Flag).
 * Body: { dokumenId, statusDokumen, rejectionReason }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    // 3. Ambil data body
    const { dokumenId, statusDokumen, rejectionReason } = req.body || {};
    if (!dokumenId || !statusDokumen) {
      return res.status(400).json({ message: 'dokumenId dan statusDokumen wajib diisi' });
    }

    const dokumenIdInt = parseInt(dokumenId, 10);
    if (isNaN(dokumenIdInt)) {
      return res.status(400).json({ message: 'dokumenId tidak valid' });
    }

    // Validasi nilai statusDokumen (TRUE, FALSE, MENUNGGU)
    const validStatus = ['TRUE', 'FALSE', 'MENUNGGU'];
    if (!validStatus.includes(statusDokumen)) {
      return res.status(400).json({ message: 'statusDokumen tidak valid' });
    }

    // Jika statusDokumen adalah FALSE (Flag Issue), rejectionReason wajib diisi
    if (statusDokumen === 'FALSE' && (!rejectionReason || !rejectionReason.trim())) {
      return res.status(400).json({ message: 'Alasan penolakan wajib diisi jika dokumen di-flag bermasalah' });
    }

    // 4. Verifikasi kepemilikan dokumen (melalui pendaftaran dan beasiswa)
    const { data: docInfo, error: docError } = await supabase
      .from('dokumen')
      .select(`
        dokumenId,
        pendaftaran:pendaftaranId (
          pendaftaranId,
          beasiswa:beasiswaId (
            beasiswaId,
            pendonorId
          )
        )
      `)
      .eq('dokumenId', dokumenIdInt)
      .single();

    if (docError || !docInfo || !docInfo.pendaftaran) {
      return res.status(404).json({ message: 'Dokumen atau data pendaftaran tidak ditemukan' });
    }

    const docPendonorId = docInfo.pendaftaran?.beasiswa?.pendonorId;
    if (String(docPendonorId) !== String(pendonorId)) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses untuk memodifikasi dokumen ini' });
    }

    // 5. Update dokumen
    const updatePayload = {
      statusDokumen: statusDokumen,
      rejectionReason: statusDokumen === 'FALSE' ? rejectionReason : null,
      updatedAt: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('dokumen')
      .update(updatePayload)
      .eq('dokumenId', dokumenIdInt);

    if (updateError) {
      console.error('[api/pendonor/seleksi/document] update error:', updateError);
      return res.status(500).json({ message: 'Gagal memperbarui status dokumen' });
    }

    return res.status(200).json({
      message: 'Status dokumen berhasil diperbarui',
      data: {
        dokumenId: dokumenIdInt,
        statusDokumen: statusDokumen,
        rejectionReason: updatePayload.rejectionReason
      }
    });
  } catch (error) {
    console.error('[api/pendonor/seleksi/document] Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}
