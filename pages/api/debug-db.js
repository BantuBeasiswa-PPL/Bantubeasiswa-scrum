import { supabase } from '../../lib/db';
import { verifyToken } from '../../lib/auth';

export default async function handler(req, res) {
  // Decode token untuk cek accountId yang sedang login
  const decoded = verifyToken(req);

  // Cari user profile berdasarkan accountId dari token
  let userProfile = null;
  if (decoded?.accountId) {
    const { data } = await supabase
      .from('user')
      .select('userId, accountId, nama, email')
      .eq('accountId', decoded.accountId)
      .maybeSingle();
    userProfile = data;
  }

  const [userSample, pendaftaranSample] = await Promise.all([
    supabase.from('user').select('*').limit(3),
    supabase.from('pendaftaran').select('*').limit(3),
  ]);

  res.status(200).json({
    // Info akun yang sedang login
    logged_in_as: decoded
      ? { accountId: decoded.accountId, role: decoded.role, email: decoded.email, userId_in_jwt: decoded.userId ?? null }
      : 'Token tidak ditemukan / tidak valid',

    // Apakah ada user profile untuk akun ini?
    user_profile_found: userProfile
      ? { userId: userProfile.userId, accountId: userProfile.accountId, nama: userProfile.nama }
      : `TIDAK ADA — tidak ada baris di tabel 'user' dengan accountId = ${decoded?.accountId}`,

    // Semua user yang ada di DB (untuk cek)
    all_users_in_db: userSample.data?.map(u => ({
      userId: u.userId, accountId: u.accountId, nama: u.nama, email: u.email,
    })),
  });
}

