import { getServerSupabase } from '../../../../lib/supabaseServer';
import { verifyToken } from '../../../../lib/auth';

/**
 * POST /api/pendonor/seleksi/registration
 * Melakukan aksi keseluruhan terhadap pendaftaran (Reject, Request Revision, Verify).
 * Body: { pendaftaranId, action } (action: 'reject' | 'revision' | 'verify')
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
    const { pendaftaranId, action } = req.body || {};
    if (!pendaftaranId || !action) {
      return res.status(400).json({ message: 'pendaftaranId dan action wajib diisi' });
    }

    const pendaftaranIdInt = parseInt(pendaftaranId, 10);
    if (isNaN(pendaftaranIdInt)) {
      return res.status(400).json({ message: 'pendaftaranId tidak valid' });
    }

    // Validasi aksi
    const validActions = ['reject', 'revision', 'verify'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ message: 'action tidak valid' });
    }

    // 4. Verifikasi kepemilikan pendaftaran (melalui beasiswa)
    const { data: registration, error: regError } = await supabase
      .from('pendaftaran')
      .select(`
        pendaftaranId,
        status,
        beasiswa:beasiswaId (
          beasiswaId,
          pendonorId
        )
      `)
      .eq('pendaftaranId', pendaftaranIdInt)
      .single();

    if (regError || !registration || !registration.beasiswa) {
      return res.status(404).json({ message: 'Data pendaftaran tidak ditemukan' });
    }

    const regPendonorId = registration.beasiswa?.pendonorId;
    if (String(regPendonorId) !== String(pendonorId)) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses ke pendaftaran ini' });
    }

    // 5. Tentukan status baru di database berdasarkan aksi
    let newStatus;
    if (action === 'reject') {
      newStatus = 'DITOLAK';
    } else if (action === 'revision') {
      newStatus = 'REVIEW';
    } else if (action === 'verify') {
      newStatus = 'EXAM'; // Verifikasi dokumen sukses, lanjut ke tahap seleksi/ujian
    }

    // 6. Update status pendaftaran
    const { error: updateError } = await supabase
      .from('pendaftaran')
      .update({
        status: newStatus,
        updatedAt: new Date().toISOString()
      })
      .eq('pendaftaranId', pendaftaranIdInt);

    if (updateError) {
      console.error('[api/pendonor/seleksi/registration] update error:', updateError);
      return res.status(500).json({ message: 'Gagal memperbarui status pendaftaran' });
    }

    return res.status(200).json({
      message: `Pendaftaran berhasil diubah statusnya menjadi ${newStatus}`,
      data: {
        pendaftaranId: pendaftaranIdInt,
        status: newStatus
      }
    });
  } catch (error) {
    console.error('[api/pendonor/seleksi/registration] Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}
