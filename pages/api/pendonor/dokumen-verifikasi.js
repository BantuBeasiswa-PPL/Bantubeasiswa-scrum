import { verifyToken } from '../../../lib/auth';
import { getServerSupabase } from '../../../lib/supabaseServer';
import {
  VALID_JENIS,
  JENIS_LABEL,
  getBucket,
  loadDokumenMeta,
  saveDokumenMeta,
  buildDokumenResponse,
  countWajibUploaded,
} from '../../../lib/pendonorDokumenVerifikasi';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

async function resolvePendonor(supabase, decoded) {
  const { data, error } = await supabase
    .from('pendonor')
    .select('pendonorId, statusVerifikasi')
    .eq('accountId', decoded.accountId)
    .single();

  if (error || !data) return null;
  return data;
}

export default async function handler(req, res) {
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'pendonor') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const supabase = getServerSupabase();
  const pendonor = await resolvePendonor(supabase, decoded);
  if (!pendonor) {
    return res.status(404).json({ message: 'Profil pendonor tidak ditemukan' });
  }

  const bucket = getBucket();

  if (req.method === 'GET') {
    try {
      const meta = await loadDokumenMeta(supabase, pendonor.pendonorId);
      const dokumen = await buildDokumenResponse(supabase, meta);

      return res.status(200).json({
        statusVerifikasi: (pendonor.statusVerifikasi || 'pending').toLowerCase(),
        dokumen,
        uploadedWajib: countWajibUploaded(meta),
        totalWajib: 3,
        jenisWajib: VALID_JENIS,
        jenisLabel: JENIS_LABEL,
      });
    } catch (err) {
      console.error('[dokumen-verifikasi GET]', err);
      return res.status(500).json({ message: 'Gagal mengambil dokumen verifikasi', detail: err.message });
    }
  }

  if (req.method === 'POST') {
    const { jenis, fileBase64, mimeType, fileName } = req.body || {};

    if (!jenis || !fileBase64) {
      return res.status(400).json({ message: 'jenis dan fileBase64 wajib diisi' });
    }
    if (!VALID_JENIS.includes(jenis)) {
      return res.status(400).json({ message: 'Jenis dokumen tidak valid' });
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
      : 'pdf';
    const safeExt = /^[a-z0-9]+$/i.test(rawExt) ? rawExt.toLowerCase() : 'pdf';
    const storagePath = `pendonor-verifikasi/${pendonor.pendonorId}/${jenis}_${Date.now()}.${safeExt}`;
    const contentType = typeof mimeType === 'string' && mimeType ? mimeType : 'application/pdf';

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (uploadError) {
      console.error('[dokumen-verifikasi upload]', uploadError);
      return res.status(500).json({ message: `Upload gagal: ${uploadError.message}` });
    }

    try {
      const meta = await loadDokumenMeta(supabase, pendonor.pendonorId);
      meta[jenis] = {
        storagePath,
        fileName: fileName || `${jenis}.${safeExt}`,
        mimeType: contentType,
        statusDokumen: 'MENUNGGU',
        rejectionReason: null,
        updatedAt: new Date().toISOString(),
      };
      await saveDokumenMeta(supabase, pendonor.pendonorId, meta);

      const [saved] = await buildDokumenResponse(supabase, { [jenis]: meta[jenis] });

      return res.status(201).json({
        message: 'Dokumen berhasil diunggah',
        dokumen: saved,
        uploadedWajib: countWajibUploaded(meta),
      });
    } catch (err) {
      console.error('[dokumen-verifikasi save meta]', err);
      return res.status(500).json({ message: 'Gagal menyimpan dokumen', detail: err.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
