import { getServerSupabase } from '../../../../lib/supabaseServer';
import { verifyToken } from '../../../../lib/auth';

/**
 * POST /api/pendonor/pembayaran/confirm-batch
 * Melakukan konfirmasi penyaluran dana secara massal (batch).
 * Body: { penyaluranIds }
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
    const { penyaluranIds, buktiTransferUrl } = req.body || {};
    if (!penyaluranIds || !Array.isArray(penyaluranIds) || penyaluranIds.length === 0) {
      return res.status(400).json({ message: 'penyaluranIds harus berupa array dan tidak boleh kosong' });
    }

    // 4. Ambil data penyaluran dana terkait untuk validasi kepemilikan dan mengambil data notifikasi
    const { data: penyalurans, error: fetchError } = await supabase
      .from('penyaluran_dana')
      .select(`
        penyaluranId,
        pendonorId,
        status,
        beasiswa:beasiswaId (
          judul
        ),
        pendaftaran:pendaftaranId (
          userId
        )
      `)
      .in('penyaluranId', penyaluranIds);

    if (fetchError || !penyalurans || penyalurans.length === 0) {
      return res.status(404).json({ message: 'Data penyaluran dana tidak ditemukan' });
    }

    // Pastikan semua penyaluran dana yang dicoba dikonfirmasi adalah milik pendonor ini
    const invalidOwner = penyalurans.some(p => String(p.pendonorId) !== String(pendonorId));
    if (invalidOwner) {
      return res.status(403).json({ message: 'Anda tidak memiliki hak untuk mengonfirmasi salah satu penyaluran ini' });
    }

    // Filter hanya yang statusnya masih pending
    const pendingPenyalurans = penyalurans.filter(p => p.status === 'pending');
    if (pendingPenyalurans.length === 0) {
      return res.status(400).json({ message: 'Semua transaksi yang dipilih sudah terkonfirmasi sebelumnya' });
    }

    const pendingIdsToUpdate = pendingPenyalurans.map(p => p.penyaluranId);
    const batchTxId = `BATCH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const todayStr = new Date().toISOString().split('T')[0];

    // 5. Update status dan detail transfer massal
    const { data: updatedRows, error: updateError } = await supabase
      .from('penyaluran_dana')
      .update({
        status: 'confirmed',
        buktiTransferUrl: buktiTransferUrl || null,
        idTransaksi: batchTxId,
        tanggalPenyaluran: todayStr,
        updatedAt: new Date().toISOString()
      })
      .in('penyaluranId', pendingIdsToUpdate)
      .select();

    if (updateError) {
      console.error('[api/pendonor/pembayaran/confirm-batch] Update error:', updateError);
      return res.status(500).json({ message: 'Gagal mengonfirmasi transfer batch di database' });
    }

    // 6. Kirim notifikasi ke masing-masing penerima beasiswa
    const notifInserts = pendingPenyalurans
      .map(p => {
        const userId = p.pendaftaran?.userId;
        const beasiswaTitle = p.beasiswa?.judul || 'Beasiswa';
        if (!userId) return null;
        return {
          userId,
          pesan: `Dana untuk program beasiswa "${beasiswaTitle}" telah dikonfirmasi secara massal dan ditransfer ke rekening Anda oleh pendonor dengan ID Batch ${batchTxId}. Silakan periksa rekening Anda secara berkala.`,
        };
      })
      .filter(Boolean);

    if (notifInserts.length > 0) {
      const { error: notifInsertError } = await supabase
        .from('notifikasi')
        .insert(notifInserts);

      if (notifInsertError) {
        console.error('[api/pendonor/pembayaran/confirm-batch] Notification inserts error:', notifInsertError);
      }
    }

    return res.status(200).json({
      message: `Berhasil mengonfirmasi ${updatedRows.length} transaksi beasiswa dalam batch ${batchTxId}.`,
      batchTxId,
      count: updatedRows.length
    });

  } catch (error) {
    console.error('[api/pendonor/pembayaran/confirm-batch] Server Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal server' });
  }
}
