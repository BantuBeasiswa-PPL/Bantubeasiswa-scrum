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
 *   provinsiIds: number[] (array of provinsi IDs yang dipilih pendonor)
 * }
 *
 * Flow: provinsiIds → resolve semua wilayahId per provinsi → insert beasiswa_wilayah
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

    const { judul, deskripsi, syarat, nominal, kuota, deadline, provinsiIds } = req.body;

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
    if (!Array.isArray(provinsiIds) || provinsiIds.length === 0) {
      return res.status(400).json({ message: 'Minimal satu provinsi target harus dipilih' });
    }

    // Validasi deadline tidak di masa lalu
    if (new Date(deadline) <= new Date()) {
      return res.status(400).json({ message: 'Deadline harus di masa depan' });
    }

    // Resolve: provinsiIds → wilayahIds (semua kab/kota dalam provinsi yang dipilih)
    const { data: wilayahData, error: wilayahResolveError } = await supabase
      .from('wilayah')
      .select('wilayahId')
      .in('provinsiId', provinsiIds.map(Number));

    if (wilayahResolveError) {
      console.error('[pendonor/beasiswa/create] wilayah resolve error:', wilayahResolveError);
      return res.status(500).json({ message: 'Gagal memproses wilayah target' });
    }

    if (!wilayahData || wilayahData.length === 0) {
      return res.status(400).json({ message: 'Tidak ada wilayah (kab/kota) yang terdaftar untuk provinsi yang dipilih' });
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
      .select('beasiswaId')
      .single();

    if (insertError) {
      console.error('[pendonor/beasiswa/create] insert error:', insertError);
      return res.status(500).json({ message: 'Gagal membuat program beasiswa' });
    }

    // Insert beasiswa_wilayah untuk setiap kab/kota dalam provinsi yang dipilih
    const wilayahInserts = wilayahData.map((w) => ({
      beasiswaId: beasiswa.beasiswaId,
      wilayahId: w.wilayahId,
    }));

    const { error: wilayahError } = await supabase
      .from('beasiswa_wilayah')
      .insert(wilayahInserts);

    if (wilayahError) {
      console.error('[pendonor/beasiswa/create] wilayah insert error:', wilayahError);
      // Hapus beasiswa yang sudah dibuat jika gagal insert wilayah
      await supabase.from('beasiswa').delete().eq('beasiswaId', beasiswa.beasiswaId);
      return res.status(500).json({ message: 'Gagal menambahkan wilayah target' });
    }

    return res.status(201).json({
      beasiswaId: beasiswa.beasiswaId,
      message: 'Program beasiswa berhasil dibuat dan menunggu approval admin',
    });
  } catch (err) {
    console.error('[pendonor/beasiswa/create]', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}