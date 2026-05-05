import { getServerSupabase } from '../../../../lib/supabaseServer';
import { verifyToken } from '../../../../lib/auth';

/**
 * POST /api/pendonor/beasiswa/create
 *
 * Body: {
 *   judul: string,
 *   deskripsi: string,
 *   syarat: string,
 *   nominal: number,
 *   kuota: number,
 *   deadline: string (ISO date),
 *   wilayahIds: number[] (array of wilayah IDs)
 * }
 *
 * Response: { beasiswaId: number, message: string }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // Auth: cek JWT & role
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'pendonor') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const supabase = getServerSupabase();

    // Resolve pendonorId dari accountId
    const { data: pendonor, error: pendonorError } = await supabase
      .from('pendonor')
      .select('pendonorId')
      .eq('accountId', decoded.accountId)
      .single();

    if (pendonorError || !pendonor) {
      return res.status(404).json({ message: 'Profil pendonor tidak ditemukan' });
    }

    const { judul, deskripsi, syarat, nominal, kuota, deadline, wilayahIds } = req.body;

    // Validation
    if (!judul?.trim()) {
      return res.status(400).json({ message: 'Judul beasiswa wajib diisi' });
    }
    if (!nominal || nominal <= 0) {
      return res.status(400).json({ message: 'Nominal beasiswa harus lebih dari 0' });
    }
    if (!kuota || kuota <= 0) {
      return res.status(400).json({ message: 'Kuota penerima harus lebih dari 0' });
    }
    if (!deadline) {
      return res.status(400).json({ message: 'Deadline wajib diisi' });
    }
    if (!Array.isArray(wilayahIds) || wilayahIds.length === 0) {
      return res.status(400).json({ message: 'Minimal satu wilayah target harus dipilih' });
    }

    // Validasi deadline tidak di masa lalu
    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      return res.status(400).json({ message: 'Deadline harus di masa depan' });
    }

    // Insert beasiswa baru
    const { data: beasiswa, error: insertError } = await supabase
      .from('beasiswa')
      .insert({
        pendonorId: pendonor.pendonorId,
        judul: judul.trim(),
        deskripsi: deskripsi?.trim() || null,
        syarat: syarat?.trim() || null,
        nominal: parseInt(nominal),
        kuota: parseInt(kuota),
        deadline: deadline,
        status: 'draft', // Default status draft, perlu approval admin
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[pendonor/beasiswa/create] insert error:', insertError);
      return res.status(500).json({ message: 'Gagal membuat program beasiswa' });
    }

    // Insert wilayah target
    const wilayahInserts = wilayahIds.map(wilayahId => ({
      beasiswaId: beasiswa.id,
      wilayahId: parseInt(wilayahId),
    }));

    const { error: wilayahError } = await supabase
      .from('beasiswa_wilayah')
      .insert(wilayahInserts);

    if (wilayahError) {
      console.error('[pendonor/beasiswa/create] wilayah insert error:', wilayahError);
      // Hapus beasiswa yang sudah dibuat jika gagal insert wilayah
      await supabase.from('beasiswa').delete().eq('id', beasiswa.id);
      return res.status(500).json({ message: 'Gagal menambahkan wilayah target' });
    }

    return res.status(201).json({
      beasiswaId: beasiswa.id,
      message: 'Program beasiswa berhasil dibuat dan menunggu approval admin'
    });
  } catch (err) {
    console.error('[pendonor/beasiswa/create]', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}