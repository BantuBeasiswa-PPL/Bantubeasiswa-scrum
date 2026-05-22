import { getServerSupabase } from '../../../../lib/supabaseServer';
import { verifyToken } from '../../../../lib/auth';

/**
 * API Endpoint: /api/pendonor/beasiswa/[id]
 * 
 * DELETE - Menghapus beasiswa (hanya draft)
 * PUT - Mengubah beasiswa (hanya draft)  
 * PATCH - Mempublikasikan beasiswa (draft → aktif)
 */
export default async function handler(req, res) {
  const { method } = req;
  
  if (!['DELETE', 'PUT', 'PATCH'].includes(method)) {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Auth: cek JWT & role
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'pendonor') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const supabase = getServerSupabase();
    const { id } = req.query;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'ID beasiswa tidak valid' });
    }

    // Resolve pendonorId dari accountId
    const { data: pendonor, error: pendonorError } = await supabase
      .from('pendonor')
      .select('pendonorId')
      .eq('accountId', decoded.accountId)
      .single();

    if (pendonorError || !pendonor) {
      return res.status(404).json({ message: 'Profil pendonor tidak ditemukan' });
    }

    // Cek kepemilikan dan status beasiswa
    const { data: beasiswa, error: checkError } = await supabase
      .from('beasiswa')
      .select('status')
      .eq('beasiswaId', parseInt(id))
      .eq('pendonorId', pendonor.pendonorId)
      .single();

    if (checkError || !beasiswa) {
      return res.status(404).json({ message: 'Beasiswa tidak ditemukan' });
    }

    // ─── DELETE METHOD ─────────────────────────────────────────────────────
    if (method === 'DELETE') {
      if (beasiswa.status !== 'draft') {
        return res.status(403).json({
          message: 'Hanya beasiswa dengan status draft yang dapat dihapus'
        });
      }

      const { error: deleteError } = await supabase
        .from('beasiswa')
        .delete()
        .eq('beasiswaId', parseInt(id));

      if (deleteError) {
        console.error('[pendonor/beasiswa/[id]] DELETE error:', deleteError);
        return res.status(500).json({ message: 'Gagal menghapus beasiswa' });
      }

      return res.status(200).json({ message: 'Beasiswa berhasil dihapus' });
    }

    // ─── PUT METHOD (UPDATE) ───────────────────────────────────────────────
    if (method === 'PUT') {
      if (beasiswa.status !== 'draft') {
        return res.status(403).json({
          message: 'Hanya beasiswa dengan status draft yang dapat diedit'
        });
      }

      const { judul, deskripsi, syarat, nominal, kuota, deadline, provinsiIds } = req.body;

      // Validation
      if (judul !== undefined && !judul?.trim()) {
        return res.status(400).json({ message: 'Judul beasiswa wajib diisi' });
      }
      if (nominal !== undefined && nominal <= 0) {
        return res.status(400).json({ message: 'Nominal beasiswa harus lebih dari 0' });
      }
      if (kuota !== undefined && kuota <= 0) {
        return res.status(400).json({ message: 'Kuota penerima harus lebih dari 0' });
      }
      if (deadline !== undefined) {
        const deadlineTime = new Date(deadline).getTime();
        const nowTime = new Date().getTime();
        const ONE_HOUR = 60 * 60 * 1000;  // 1 hour in milliseconds
        if (deadlineTime <= nowTime + ONE_HOUR) {  // Allow 1 hour tolerance
          return res.status(400).json({ message: 'Deadline harus di masa depan minimal 1 jam' });
        }
      }

      // Build update object (hanya field yang dikirim)
      const updateData = {};
      if (judul !== undefined) updateData.judul = judul.trim();
      if (deskripsi !== undefined) updateData.deskripsi = deskripsi?.trim() || null;
      if (syarat !== undefined) updateData.syarat = syarat?.trim() || null;
      if (nominal !== undefined) updateData.nominal = parseInt(nominal);
      if (kuota !== undefined) updateData.kuota = parseInt(kuota);
      if (deadline !== undefined) updateData.deadline = deadline;
      updateData.updatedAt = new Date().toISOString();

      // Update beasiswa
      const { data: updated, error: updateError } = await supabase
        .from('beasiswa')
        .update(updateData)
        .eq('beasiswaId', parseInt(id))
        .select('beasiswaId')
        .single();

      if (updateError) {
        console.error('[pendonor/beasiswa/[id]] PUT error:', updateError);
        return res.status(500).json({ message: 'Gagal mengubah beasiswa' });
      }

      // Jika ada provinsiIds, update beasiswa_wilayah
      if (Array.isArray(provinsiIds) && provinsiIds.length > 0) {
        const { data: wilayahData, error: wilayahResolveError } = await supabase
          .from('wilayah')
          .select('wilayahId')
          .in('provinsiId', provinsiIds.map(Number));

        if (wilayahResolveError) {
          console.error('[pendonor/beasiswa/[id]] PUT wilayah resolve error:', wilayahResolveError);
          return res.status(500).json({ message: 'Gagal memproses wilayah target' });
        }

        if (!wilayahData || wilayahData.length === 0) {
          return res.status(400).json({ message: 'Tidak ada wilayah yang terdaftar untuk provinsi yang dipilih' });
        }

        // Hapus mapping lama
        const { error: deleteError } = await supabase
          .from('beasiswa_wilayah')
          .delete()
          .eq('beasiswaId', parseInt(id));

        if (deleteError) {
          console.error('[pendonor/beasiswa/[id]] PUT wilayah delete error:', deleteError);
          return res.status(500).json({ message: 'Gagal mengubah wilayah target' });
        }

        // Insert mapping baru
        const wilayahInserts = wilayahData.map((w) => ({
          beasiswaId: parseInt(id),
          wilayahId: w.wilayahId,
        }));

        const { error: wilayahError } = await supabase
          .from('beasiswa_wilayah')
          .insert(wilayahInserts);

        if (wilayahError) {
          console.error('[pendonor/beasiswa/[id]] PUT wilayah insert error:', wilayahError);
          return res.status(500).json({ message: 'Gagal mengubah wilayah target' });
        }
      }

      return res.status(200).json({
        beasiswaId: updated.beasiswaId,
        message: 'Program beasiswa berhasil diubah'
      });
    }

    // ─── PATCH METHOD (PUBLISH) ───────────────────────────────────────────
    if (method === 'PATCH') {
      if (beasiswa.status !== 'draft') {
        return res.status(403).json({
          message: 'Hanya beasiswa dengan status draft yang dapat dipublikasikan'
        });
      }

      const { data: updated, error: updateError } = await supabase
        .from('beasiswa')
        .update({
          status: 'aktif',
          updatedAt: new Date().toISOString()
        })
        .eq('beasiswaId', parseInt(id))
        .select('beasiswaId, status')
        .single();

      if (updateError) {
        console.error('[pendonor/beasiswa/[id]] PATCH error:', updateError);
        return res.status(500).json({ message: 'Gagal mempublikasikan beasiswa' });
      }

      return res.status(200).json({
        beasiswaId: updated.beasiswaId,
        status: updated.status,
        message: 'Program beasiswa berhasil dipublikasikan'
      });
    }
  } catch (err) {
    console.error('[pendonor/beasiswa/[id]]', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}