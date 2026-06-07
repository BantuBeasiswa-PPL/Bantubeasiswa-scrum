import { supabase } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';

const VALID_TIPE = ['kabupaten', 'kota'];
const VALID_JENIS_3T = ['Terdepan', 'Terluar', 'Tertinggal'];
const SELECT_FIELDS = 'wilayahId, provinsiId, nama, tipe, mode, isAfirmasi, is3T, jenis_3t, provinsi ( provinsiId, nama )';

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

  const id = Number(req.query.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ message: 'ID wilayah tidak valid.' });
  }

  if (req.method === 'PUT') {
    const { nama, tipe, mode, isAfirmasi, is3T, jenis_3t, provinsiId } = req.body || {};

    if (!nama || typeof nama !== 'string' || !nama.trim()) {
      return res.status(400).json({ message: 'Nama wilayah wajib diisi.' });
    }
    if (!VALID_TIPE.includes(tipe)) {
      return res.status(400).json({ message: 'Tipe wilayah tidak valid. Gunakan kabupaten atau kota.' });
    }
    if (!provinsiId) {
      return res.status(400).json({ message: 'Provinsi wajib dipilih.' });
    }
    if (is3T && !VALID_JENIS_3T.includes(jenis_3t)) {
      return res.status(400).json({ message: 'Kategori 3T tidak valid.' });
    }

    try {
      const payload = {
        nama: nama.trim(),
        tipe,
        provinsiId: Number(provinsiId),
        mode: typeof mode === 'string' ? mode.trim() : null,
        isAfirmasi: Boolean(isAfirmasi),
        is3T: Boolean(is3T),
        jenis_3t: is3T ? jenis_3t : null,
      };

      const { data, error } = await supabase
        .from('wilayah')
        .update(payload)
        .eq('wilayahId', id)
        .select(SELECT_FIELDS)
        .single();

      if (error) {
        console.error('[/api/admin/wilayah/[id]] PUT error:', error);
        return res.status(500).json({ message: 'Gagal memperbarui wilayah.' });
      }
      if (!data) {
        return res.status(404).json({ message: 'Wilayah tidak ditemukan.' });
      }

      return res.status(200).json(data);
    } catch (err) {
      console.error('[/api/admin/wilayah/[id]] PUT exception:', err);
      return res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { data, error } = await supabase
        .from('wilayah')
        .delete()
        .eq('wilayahId', id)
        .select('wilayahId')
        .single();

      if (error) {
        console.error('[/api/admin/wilayah/[id]] DELETE error:', error);
        return res.status(500).json({ message: 'Gagal menghapus wilayah.' });
      }
      if (!data) {
        return res.status(404).json({ message: 'Wilayah tidak ditemukan.' });
      }

      return res.status(200).json({ message: 'Wilayah berhasil dihapus.' });
    } catch (err) {
      console.error('[/api/admin/wilayah/[id]] DELETE exception:', err);
      return res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
