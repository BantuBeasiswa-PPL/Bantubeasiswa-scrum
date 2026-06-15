import { supabase } from '../../../lib/db';

/**
 * GET /api/admin/repair-user-profiles
 * Cari semua account 'mahasiswa' yang tidak punya baris di tabel user,
 * lalu insert baris user otomatis.
 *
 * Hapus endpoint ini setelah dipakai.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // 1. Ambil semua account mahasiswa
  const { data: accounts, error: accErr } = await supabase
    .from('account')
    .select('accountId, email')
    .eq('role', 'mahasiswa');

  if (accErr) return res.status(500).json({ error: accErr.message });

  // 2. Ambil semua accountId yang sudah ada di tabel user
  const { data: users, error: userErr } = await supabase
    .from('user')
    .select('accountId');

  if (userErr) return res.status(500).json({ error: userErr.message });

  const existingAccountIds = new Set(users.map(u => u.accountId));

  // 3. Filter akun yang belum punya profil user
  const orphanAccounts = accounts.filter(a => !existingAccountIds.has(a.accountId));

  if (orphanAccounts.length === 0) {
    return res.status(200).json({ message: 'Semua akun sudah punya profil user. Tidak ada yang perlu diperbaiki.', fixed: [] });
  }

  // 4. Insert baris user untuk tiap akun yatim
  const toInsert = orphanAccounts.map(a => ({
    accountId   : a.accountId,
    email       : a.email,
    nama        : a.email.split('@')[0], // nama sementara dari email
    kataSandi   : '',                    // kosong, login pakai kataKunci di account
    ukuranFont  : 16,
    modeKontras : 0,
  }));

  const { data: inserted, error: insertErr } = await supabase
    .from('user')
    .insert(toInsert)
    .select('userId, accountId, email, nama');

  if (insertErr) {
    return res.status(500).json({ error: insertErr.message, toInsert });
  }

  return res.status(200).json({
    message: `Berhasil memperbaiki ${inserted.length} akun.`,
    fixed  : inserted,
  });
}
