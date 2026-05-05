import { getServerSupabase } from '../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const supabase = getServerSupabase();

    const { data: wilayahList, error } = await supabase
      .from('wilayah')
      .select('wilayahId, nama, tipe, isAfirmasi, is3T, jenis_3t, provinsiId, provinsi ( provinsiId, nama )')
      .order('nama', { ascending: true });

    if (error) {
      console.error('[wilayah] fetch error:', error);
      return res.status(500).json({ message: 'Gagal mengambil data wilayah' });
    }

    return res.status(200).json(wilayahList || []);
  } catch (err) {
    console.error('[wilayah]', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}