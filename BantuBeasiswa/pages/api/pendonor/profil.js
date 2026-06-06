import { getServerSupabase } from '../../../lib/supabaseServer';
import { verifyToken } from '../../../lib/auth';

/**
 * GET  /api/pendonor/profil  → ambil profil pendonor yang sedang login
 * PUT  /api/pendonor/profil  → update statusOrganisasi, kontak, alamat
 */
export default async function handler(req, res) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'pendonor') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const supabase = getServerSupabase();

  // ── Resolve pendonorId ───────────────────────────────────────────────────────
  const { data: pendonor, error: pendonorError } = await supabase
    .from('pendonor')
    .select('pendonorId, statusOrganisasi, kontak, alamat, accountId')
    .eq('accountId', decoded.accountId)
    .single();

  if (pendonorError || !pendonor) {
    return res.status(404).json({ message: 'Profil pendonor tidak ditemukan' });
  }

  // ── GET ─────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    // Ambil email dari tabel account
    const { data: account } = await supabase
      .from('account')
      .select('email')
      .eq('accountId', decoded.accountId)
      .single();

    return res.status(200).json({
      pendonorId      : pendonor.pendonorId,
      statusOrganisasi: pendonor.statusOrganisasi ?? '',
      kontak          : pendonor.kontak ?? '',
      alamat          : pendonor.alamat ?? '',
      email           : account?.email ?? decoded.email ?? '',
    });
  }

  // ── PUT ─────────────────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const { statusOrganisasi, kontak, alamat } = req.body ?? {};

    if (!statusOrganisasi || !statusOrganisasi.trim()) {
      return res.status(400).json({ message: 'Nama organisasi wajib diisi' });
    }

    const { error: updateError } = await supabase
      .from('pendonor')
      .update({
        statusOrganisasi: statusOrganisasi.trim(),
        kontak          : kontak?.trim() ?? null,
        alamat          : alamat?.trim() ?? null,
        updatedAt       : new Date().toISOString(),
      })
      .eq('pendonorId', pendonor.pendonorId);

    if (updateError) {
      console.error('[pendonor/profil PUT]', updateError);
      return res.status(500).json({ message: 'Gagal memperbarui profil' });
    }

    return res.status(200).json({ message: 'Profil berhasil diperbarui' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
