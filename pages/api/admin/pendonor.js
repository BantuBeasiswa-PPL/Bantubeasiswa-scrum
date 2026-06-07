import { supabase } from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  // Auth check: harus admin
  const decoded = verifyToken(req);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Fetch semua pendonor dengan relationship ke account
    const { status } = req.query;

    let query = supabase.from('pendonor').select(`
      pendonorId,
      accountId,
      statusOrganisasi,
      kontak,
      alamat,
      statusVerifikasi,
      createdAt,
      account:accountId (
        accountId,
        email
      )
    `).order('createdAt', { ascending: false });

    if (status && status !== 'semua') {
      query = query.eq('statusVerifikasi', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ data: data || [] });
  }

  if (req.method === 'PUT') {
    const { pendonorId, action, alasanPenolakan } = req.body;

    if (action === 'verify') {
      const { error } = await supabase
        .from('pendonor')
        .update({ statusVerifikasi: 'verified' })
        .eq('pendonorId', pendonorId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ message: 'Pendonor verified' });
    }

    if (action === 'reject') {
      if (!alasanPenolakan || alasanPenolakan.length < 10) {
        return res.status(400).json({ error: 'Alasan penolakan minimal 10 karakter' });
      }

      const { error } = await supabase
        .from('pendonor')
        .update({ statusVerifikasi: 'rejected' })
        .eq('pendonorId', pendonorId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ message: 'Pendonor rejected' });
    }

    if (action === 'revoke') {
      const { error } = await supabase
        .from('pendonor')
        .update({ statusVerifikasi: 'pending' })
        .eq('pendonorId', pendonorId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ message: 'Verification revoked' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
