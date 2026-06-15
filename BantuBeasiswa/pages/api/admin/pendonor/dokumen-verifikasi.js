import { verifyToken } from '../../../../lib/auth';
import { getServerSupabase } from '../../../../lib/supabaseServer';
import {
  JENIS_LABEL,
  loadDokumenMeta,
  buildDokumenResponse,
  countWajibUploaded,
} from '../../../../lib/pendonorDokumenVerifikasi';

export default async function handler(req, res) {
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pendonorId = parseInt(req.query.pendonorId, 10);
  if (!pendonorId || Number.isNaN(pendonorId)) {
    return res.status(400).json({ error: 'pendonorId wajib diisi' });
  }

  const supabase = getServerSupabase();

  const { data: pendonor, error: pendonorError } = await supabase
    .from('pendonor')
    .select(`
      pendonorId,
      statusOrganisasi,
      kontak,
      alamat,
      statusVerifikasi,
      createdAt,
      account:accountId ( email )
    `)
    .eq('pendonorId', pendonorId)
    .single();

  if (pendonorError || !pendonor) {
    return res.status(404).json({ error: 'Pendonor tidak ditemukan' });
  }

  try {
    const meta = await loadDokumenMeta(supabase, pendonorId);
    const dokumen = await buildDokumenResponse(supabase, meta, {
      pendonorId,
      downloadRole: 'admin',
    });

    return res.status(200).json({
      pendonor: {
        pendonorId: pendonor.pendonorId,
        statusOrganisasi: pendonor.statusOrganisasi,
        kontak: pendonor.kontak,
        alamat: pendonor.alamat,
        statusVerifikasi: pendonor.statusVerifikasi,
        email: pendonor.account?.email ?? null,
        createdAt: pendonor.createdAt,
      },
      dokumen,
      uploadedWajib: countWajibUploaded(meta),
      totalWajib: 3,
      jenisLabel: JENIS_LABEL,
    });
  } catch (err) {
    console.error('[admin/dokumen-verifikasi]', err);
    return res.status(500).json({ error: 'Gagal mengambil dokumen pendonor', detail: err.message });
  }
}
