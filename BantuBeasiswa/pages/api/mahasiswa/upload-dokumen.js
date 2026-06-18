import { verifyToken } from '../../../lib/auth';
import { getServerSupabase } from '../../../lib/supabaseServer';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const VALID_TYPES = ['transkrip', 'kk', 'ktp', 'rekening'];
const VALID_MIMES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  // 1. Authenticate user
  const decoded = verifyToken(req);
  if (!decoded) {
    return res.status(401).json({ message: 'Tidak terautentikasi.' });
  }
  if (decoded.role !== 'mahasiswa') {
    return res.status(403).json({ message: 'Akses ditolak. Hanya mahasiswa yang diizinkan.' });
  }

  const { jenis, fileBase64, mimeType, fileName } = req.body || {};

  if (!jenis || !fileBase64 || !mimeType) {
    return res.status(400).json({ message: 'Field jenis, fileBase64, dan mimeType wajib diisi.' });
  }

  if (!VALID_TYPES.includes(jenis)) {
    return res.status(400).json({ message: 'Jenis dokumen tidak valid.' });
  }

  if (!VALID_MIMES.includes(mimeType)) {
    return res.status(400).json({ message: 'Format dokumen tidak didukung. Harap upload PDF, JPG, atau PNG.' });
  }

  const supabase = getServerSupabase();

  // 2. Resolve userId
  let userId = decoded.userId ?? null;
  if (!userId) {
    const { data: userData } = await supabase
      .from('user')
      .select('userId')
      .eq('accountId', decoded.accountId)
      .single();
    userId = userData?.userId ?? null;
  }

  if (!userId) {
    return res.status(404).json({ message: 'Profil mahasiswa tidak ditemukan.' });
  }

  // 3. Decode base64 to buffer
  let buffer;
  try {
    buffer = Buffer.from(String(fileBase64), 'base64');
  } catch {
    return res.status(400).json({ message: 'Format file tidak valid.' });
  }

  if (buffer.length > 5 * 1024 * 1024) {
    return res.status(400).json({ message: 'File terlalu besar. Maksimal 5MB.' });
  }

  // 4. Construct path and upload to Storage
  const rawExt = typeof fileName === 'string' && fileName.includes('.')
    ? fileName.split('.').pop()
    : mimeType.split('/').pop() || 'bin';
  const safeExt = /^[a-z0-9]+$/i.test(rawExt) ? rawExt.toLowerCase() : 'bin';
  
  const storagePath = `profile/${userId}/${jenis}_${Date.now()}.${safeExt}`;
  const bucketName = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'dokumen-pendaftaran';

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error('[upload-dokumen] Storage error:', uploadError);
    return res.status(500).json({ message: `Gagal mengupload dokumen: ${uploadError.message}` });
  }

  // 5. Retrieve public URL
  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
  const publicUrl = urlData?.publicUrl;

  if (!publicUrl) {
    return res.status(500).json({ message: 'Gagal mendapatkan URL publik file.' });
  }

  return res.status(200).json({
    message: 'File berhasil diupload.',
    publicUrl,
  });
}
