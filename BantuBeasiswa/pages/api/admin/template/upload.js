import { verifyToken } from '../../../../lib/auth';
import { getServerSupabase } from '../../../../lib/supabaseServer';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

/**
 * POST /api/admin/template/upload
 * Mengunggah file template ke Supabase Storage bucket 'templates'.
 * Hanya dapat diakses oleh admin.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // 1. Auth guard: verify token & role
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(403).json({ message: 'Hanya admin yang dapat mengakses endpoint ini' });
  }

  const { fileName, fileBase64, mimeType } = req.body || {};
  if (!fileName || !fileBase64) {
    return res.status(400).json({ message: 'fileName dan fileBase64 wajib diisi' });
  }

  try {
    const supabase = getServerSupabase();

    // 2. Cek/buat bucket 'templates' agar publik
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (listError) throw listError;
      
      const exists = buckets?.some(b => b.id === 'templates');
      if (!exists) {
        console.log("Bucket 'templates' tidak ditemukan, membuat bucket baru dengan properti public...");
        const { error: createError } = await supabase.storage.createBucket('templates', {
          public: true,
        });
        if (createError) throw createError;
      }
    } catch (bucketErr) {
      console.warn('Gagal memeriksa/membuat bucket templates:', bucketErr.message);
    }

    // 3. Decode base64 menjadi Buffer
    const buffer = Buffer.from(fileBase64, 'base64');
    if (!buffer.length) {
      return res.status(400).json({ message: 'File kosong atau tidak valid' });
    }

    const contentType = mimeType || 'application/octet-stream';

    // 4. Upload file ke storage bucket 'templates'
    const { error: uploadError } = await supabase.storage
      .from('templates')
      .upload(fileName, buffer, {
        contentType,
        upsert: true, // Upsert true agar menimpa file lama dengan nama yang sama
      });

    if (uploadError) {
      console.error('[API Admin Template Upload] error:', uploadError);
      return res.status(500).json({ message: `Gagal mengunggah file ke storage: ${uploadError.message}` });
    }

    // 5. Ambil URL publik hasil upload
    const { data: urlData } = supabase.storage.from('templates').getPublicUrl(fileName);
    const publicUrl = urlData?.publicUrl;

    return res.status(200).json({
      message: 'Template berhasil diunggah',
      fileName,
      publicUrl,
    });
  } catch (error) {
    console.error('[API Admin Template Upload] Server error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan internal server' });
  }
}
