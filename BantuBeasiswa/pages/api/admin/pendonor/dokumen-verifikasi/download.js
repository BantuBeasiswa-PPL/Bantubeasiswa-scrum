import { verifyToken } from '../../../../../lib/auth';
import { getServerSupabase } from '../../../../../lib/supabaseServer';
import {
  VALID_JENIS,
  JENIS_LABEL,
  loadDokumenMeta,
  resolveStoragePath,
  downloadStorageFile,
} from '../../../../../lib/pendonorDokumenVerifikasi';

function guessMimeType(fileName, storedMime) {
  if (storedMime) return storedMime;
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

export default async function handler(req, res) {
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pendonorId = parseInt(req.query.pendonorId, 10);
  const jenis = req.query.jenis;

  if (!pendonorId || Number.isNaN(pendonorId)) {
    return res.status(400).json({ error: 'pendonorId wajib diisi' });
  }
  if (!jenis || !VALID_JENIS.includes(jenis)) {
    return res.status(400).json({ error: 'Jenis dokumen tidak valid' });
  }

  try {
    const supabase = getServerSupabase();
    const meta = await loadDokumenMeta(supabase, pendonorId);
    const storagePath = await resolveStoragePath(supabase, pendonorId, jenis, meta);

    if (!storagePath) {
      return res.status(404).json({
        error: 'Dokumen tidak ditemukan. Minta pendonor untuk mengunggah ulang.',
      });
    }

    const blob = await downloadStorageFile(supabase, storagePath);
    const row = meta[jenis] || {};
    const fileName = row.fileName || `${JENIS_LABEL[jenis] || jenis}.pdf`;
    const mimeType = guessMimeType(fileName, row.mimeType);
    const buffer = Buffer.from(await blob.arrayBuffer());

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('[admin/dokumen-verifikasi/download]', err);
    return res.status(500).json({ error: 'Gagal mengunduh dokumen', detail: err.message });
  }
}
