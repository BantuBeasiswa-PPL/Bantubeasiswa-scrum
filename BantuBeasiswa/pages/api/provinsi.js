import { getServerSupabase } from '../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const supabase = getServerSupabase();
    const { afirmasi } = req.query;

    let query = supabase
      .from('provinsi')
      .select('provinsiId, nama, isAfirmasi')
      .order('nama', { ascending: true });

    if (afirmasi === 'true') {
      query = query.eq('isAfirmasi', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[/api/provinsi] fetch error:', error);
      return res.status(500).json({ message: 'Gagal mengambil data provinsi' });
    }

    return res.status(200).json(data || []);
  } catch (err) {
    console.error('[/api/provinsi]', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}
