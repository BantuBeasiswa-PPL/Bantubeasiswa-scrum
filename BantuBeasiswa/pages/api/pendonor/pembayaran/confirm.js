import { getServerSupabase } from '../../../../lib/supabaseServer';
import { verifyToken } from '../../../../lib/auth';

/**
 * POST /api/pendonor/pembayaran/confirm
 * Melakukan konfirmasi penyaluran dana dengan menyertakan bukti transfer dan ID transaksi.
 * Body: { penyaluranId, buktiTransferUrl, idTransaksi, tanggalPenyaluran }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 1. Auth: cek JWT & role pendonor
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'pendonor') {
      return res.status(401).json({ message: 'Tidak terautentikasi. Silakan login terlebih dahulu.' });
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

    // 3. Ambil dan validasi request body
    const { penyaluranId, buktiTransferUrl, idTransaksi, tanggalPenyaluran } = req.body || {};
    if (!penyaluranId || !buktiTransferUrl || !idTransaksi || !tanggalPenyaluran) {
      return res.status(400).json({ message: 'Semua kolom (penyaluranId, buktiTransferUrl, idTransaksi, tanggalPenyaluran) wajib diisi' });
    }

    const penyaluranIdInt = parseInt(penyaluranId, 10);
    if (isNaN(penyaluranIdInt)) {
      return res.status(400).json({ message: 'penyaluranId tidak valid' });
    }

    // 4. Ambil data penyaluran dana saat ini + verifikasi kepemilikan
    const { data: penyaluran, error: fetchError } = await supabase
      .from('penyaluran_dana')
      .select(`
        *,
        beasiswa:beasiswaId (
          beasiswaId,
          judul
        )
      `)
      .eq('penyaluranId', penyaluranIdInt)
      .maybeSingle();

    if (fetchError || !penyaluran) {
      return res.status(404).json({ message: 'Data penyaluran dana tidak ditemukan' });
    }

    if (String(penyaluran.pendonorId) !== String(pendonorId)) {
      return res.status(403).json({ message: 'Anda tidak memiliki hak untuk mengonfirmasi penyaluran ini' });
    }

    // 5. Cek apakah status sudah confirmed / tersalurkan / diproses (pencegahan ganda)
    if (penyaluran.status === 'confirmed') {
      return res.status(400).json({ message: 'Penyaluran sudah dikonfirmasi sebelumnya' });
    }

    // 6. Update status dan detail transfer secara atomik
    const { data: updatedRows, error: updateError } = await supabase
      .from('penyaluran_dana')
      .update({
        status: 'confirmed',
        buktiTransferUrl,
        idTransaksi,
        tanggalPenyaluran,
        updatedAt: new Date().toISOString()
      })
      .eq('penyaluranId', penyaluranIdInt)
      .neq('status', 'confirmed') // Proteksi balapan kondisi (race condition)
      .select();

    if (updateError) {
      console.error('[api/pendonor/pembayaran/confirm] Update error:', updateError);
      return res.status(500).json({ message: 'Gagal mengonfirmasi transfer di database' });
    }

    // Jika data updatedRows kosong, berarti baris sudah terupdate oleh thread lain
    if (!updatedRows || updatedRows.length === 0) {
      return res.status(400).json({ message: 'Penyaluran sudah dikonfirmasi sebelumnya' });
    }

    // 7. Cari semua penerima beasiswa (status = 'LULUS') untuk beasiswaId terkait
    const beasiswaId = penyaluran.beasiswaId;
    const beasiswaTitle = penyaluran.beasiswa?.judul || 'Beasiswa';

    const { data: recipients, error: recipientsError } = await supabase
      .from('pendaftaran')
      .select('userId')
      .eq('beasiswaId', beasiswaId)
      .eq('status', 'LULUS');

    if (recipientsError) {
      console.error('[api/pendonor/pembayaran/confirm] Fetch recipients error:', recipientsError);
    }

    // 8. Insert notifikasi secara massal ke semua penerima
    if (recipients && recipients.length > 0) {
      const notifPayloads = recipients.map((r) => ({
        userId: r.userId,
        pesan: `Dana untuk program beasiswa "${beasiswaTitle}" telah dikonfirmasi dan disalurkan oleh pendonor. Silakan periksa rekening Anda secara berkala.`,
      }));

      const { error: notifInsertError } = await supabase
        .from('notifikasi')
        .insert(notifPayloads);

      if (notifInsertError) {
        console.error('[api/pendonor/pembayaran/confirm] Batch notification insert error:', notifInsertError);
      }
    }

    return res.status(200).json({
      message: 'Konfirmasi transfer berhasil disimpan',
      data: updatedRows[0]
    });

  } catch (error) {
    console.error('[api/pendonor/pembayaran/confirm] Server Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal server' });
  }
}
