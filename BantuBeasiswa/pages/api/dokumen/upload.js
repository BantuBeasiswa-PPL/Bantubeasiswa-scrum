import { verifyToken } from '../../../lib/auth';
import { getServerSupabase } from '../../../lib/supabaseServer';
import { buildDokumenInsertPayload } from '../../../lib/dokumenInsertPayload';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

const VALID_JENIS = ['ktp', 'transkrip', 'motivation_letter'];

function isRlsError(message) {
  return typeof message === 'string' && message.toLowerCase().includes('row level security');
}

/**
 * POST /api/dokumen/upload
 * Upload file ke Supabase Storage + insert baris dokumen (server-side, memakai service role bila ada).
 * Menghindari RLS client pada bucket storage.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ message: 'Tidak terautentikasi' });
  if (decoded.role !== 'mahasiswa') {
    return res.status(403).json({ message: 'Hanya mahasiswa yang dapat mengunggah dokumen' });
  }

  const { pendaftaranId, jenis, fileBase64, mimeType, fileName } = req.body || {};
  if (!pendaftaranId || !jenis || !fileBase64) {
    return res.status(400).json({ message: 'pendaftaranId, jenis, dan fileBase64 wajib diisi' });
  }
  if (!VALID_JENIS.includes(jenis)) {
    return res.status(400).json({ message: 'Jenis dokumen tidak valid' });
  }

  const supabase = getServerSupabase();
  const usingServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  let userId = decoded.userId ?? null;
  if (!userId) {
    const { data: profil } = await supabase
      .from('user')
      .select('userId')
      .eq('accountId', decoded.accountId)
      .single();
    userId = profil?.userId ?? null;
  }
  if (!userId) {
    return res.status(401).json({ message: 'Profil mahasiswa tidak ditemukan.' });
  }

  const { data: pendaftaran, error: pendaftaranError } = await supabase
    .from('pendaftaran')
    .select('userId')
    .eq('pendaftaranId', pendaftaranId)
    .single();

  if (pendaftaranError || !pendaftaran) {
    console.error('[dokumen/upload] lookup pendaftaran:', pendaftaranError);
    return res.status(404).json({ message: 'Pendaftaran tidak ditemukan' });
  }
  if (pendaftaran.userId !== userId) {
    return res.status(403).json({ message: 'Pendaftaran tidak milik Anda' });
  }

  let buffer;
  try {
    buffer = Buffer.from(String(fileBase64), 'base64');
  } catch {
    return res.status(400).json({ message: 'Format file tidak valid' });
  }
  if (!buffer.length) {
    return res.status(400).json({ message: 'File kosong' });
  }

  const rawExt = typeof fileName === 'string' && fileName.includes('.')
    ? fileName.split('.').pop()
    : 'bin';
  const safeExt = /^[a-z0-9]+$/i.test(rawExt) ? rawExt.toLowerCase() : 'bin';
  const storagePath = `${pendaftaranId}/${jenis}_${Date.now()}.${safeExt}`;
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'dokumen-pendaftaran';
  const contentType = typeof mimeType === 'string' && mimeType ? mimeType : 'application/octet-stream';

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error('[dokumen/upload] storage:', uploadError);
    const msg = uploadError.message || 'Upload storage gagal';
    if (isRlsError(msg) && !usingServiceRole) {
      return res.status(503).json({
        message:
          'Upload ditolak kebijakan RLS Supabase. Set SUPABASE_SERVICE_ROLE_KEY di .env.local (server) lalu restart dev server, atau longgarkan policy Storage di dashboard Supabase.',
      });
    }
    return res.status(500).json({ message: `Upload gagal: ${msg}` });
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const fileUrl = urlData?.publicUrl;
  if (!fileUrl) {
    return res.status(500).json({ message: 'Gagal mendapatkan URL publik file' });
  }

  const { data: newDokumen, error: insertError } = await supabase
    .from('dokumen')
    .insert(buildDokumenInsertPayload({ pendaftaranId, jenis, fileUrl }))
    .select('dokumenId, statusDokumen')
    .single();

  if (insertError || !newDokumen) {
    console.error('[dokumen/upload] insert dokumen:', insertError);
    const msg = insertError?.message || 'Gagal menyimpan metadata dokumen';
    if (isRlsError(msg) && !usingServiceRole) {
      return res.status(503).json({
        message:
          'Penyimpanan metadata ditolak RLS. Set SUPABASE_SERVICE_ROLE_KEY di .env.local untuk API server, atau tambahkan policy INSERT pada tabel dokumen.',
      });
    }
    return res.status(500).json({ message: 'Gagal menyimpan metadata dokumen', detail: msg });
  }

  return res.status(201).json({
    dokumenId    : newDokumen.dokumenId,
    statusDokumen: newDokumen.statusDokumen,
    publicUrl    : fileUrl,
  });
}
