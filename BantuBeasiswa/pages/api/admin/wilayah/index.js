import { supabase } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';

const VALID_TIPE = ['Terdepan', 'Terluar', 'Tertinggal'];
const SELECT_FIELDS = 'wilayahId, nama, tipe, mode, isAfirmasi, is3T';

function requireAdmin(req, res) {
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'admin') {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }
  return decoded;
}

export default async function handler(req, res) {
  const decoded = requireAdmin(req, res);
  if (!decoded) return;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('wilayah')
        .select(SELECT_FIELDS)
        .eq('is3T', true)
        .order('nama', { ascending: true });

      if (error) {
        console.error('[/api/admin/wilayah] GET error:', error);
        return res.status(500).json({ message: 'Gagal memuat data wilayah.' });
      }

      return res.status(200).json(data || []);
    } catch (err) {
      console.error('[/api/admin/wilayah] GET exception:', err);
      return res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  }

  if (req.method === 'POST') {
    const { nama, tipe, mode, isAfirmasi, is3T } = req.body || {};

    if (!nama || typeof nama !== 'string' || !nama.trim()) {
      return res.status(400).json({ message: 'Nama wilayah wajib diisi.' });
    }
    if (!VALID_TIPE.includes(tipe)) {
      return res.status(400).json({ message: 'Kategori 3T tidak valid.' });
    }

    try {
      const payload = {
        nama: nama.trim(),
        tipe,
        mode: typeof mode === 'string' ? mode.trim() : null,
        isAfirmasi: Boolean(isAfirmasi),
        is3T: Boolean(is3T),
      };

      const { data, error } = await supabase
        .from('wilayah')
        .insert([payload])
        .select(SELECT_FIELDS)
        .single();

      if (error) {
        console.error('[/api/admin/wilayah] POST error:', error);
        return res.status(500).json({ message: 'Gagal menyimpan wilayah.' });
      }

      return res.status(201).json(data);
    } catch (err) {
      console.error('[/api/admin/wilayah] POST exception:', err);
      return res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
