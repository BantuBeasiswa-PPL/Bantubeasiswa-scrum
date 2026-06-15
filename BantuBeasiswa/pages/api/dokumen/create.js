import { verifyToken } from '../../../lib/auth';
import { getServerSupabase } from '../../../lib/supabaseServer';
import { buildDokumenInsertPayload } from '../../../lib/dokumenInsertPayload';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Tidak terautentikasi' });
  if (decoded.role !== 'mahasiswa') {
    return res.status(403).json({ message: 'Hanya mahasiswa yang dapat mengunggah dokumen' });
  }

  const { pendaftaranId, jenis, fileUrl } = req.body;
  if (!pendaftaranId || !jenis || !fileUrl) {
    return res.status(400).json({ message: 'pendaftaranId, jenis, dan fileUrl wajib diisi' });
  }

  const validJenis = ['ktp', 'transkrip', 'motivation_letter'];
  if (!validJenis.includes(jenis)) {
    return res.status(400).json({ message: 'Jenis dokumen tidak valid' });
  }

  const supabase = getServerSupabase();

  const { data: pendaftaran, error: pendaftaranError } = await supabase
    .from('pendaftaran')
    .select('userId')
    .eq('pendaftaranId', pendaftaranId)
    .single();

  if (pendaftaranError || !pendaftaran) {
    console.error('[dokumen/create] lookup pendaftaran:', pendaftaranError);
    return res.status(404).json({ message: 'Pendaftaran tidak ditemukan' });
  }

  if (pendaftaran.userId !== decoded.userId) {
    return res.status(403).json({ message: 'Pendaftaran tidak milik Anda' });
  }

  const { data: newDokumen, error: insertError } = await supabase
    .from('dokumen')
    .insert(buildDokumenInsertPayload({ pendaftaranId, jenis, fileUrl }))
    .select('dokumenId, statusDokumen')
    .single();

  if (insertError || !newDokumen) {
    console.error('[dokumen/create] insert:', insertError);
    return res.status(500).json({
      message: 'Gagal menyimpan metadata dokumen',
      detail : insertError?.message || 'Unknown error',
    });
  }

  return res.status(201).json({
    dokumenId   : newDokumen.dokumenId,
    statusDokumen: newDokumen.statusDokumen,
  });
}
