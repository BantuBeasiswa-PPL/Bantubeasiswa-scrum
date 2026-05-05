import { supabase } from '../../../lib/db'; 
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password, role } = req.body;

  // 1. Validasi input sederhana
  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Email, password, dan role harus diisi' });
  }

  // 2. Cari akun berdasarkan email + role
  const { data: user, error } = await supabase
    .from('account')
    .select('*')
    .eq('email', email)
    .eq('role', role)
    .single();

  // Jika error atau user tidak ditemukan
  if (error || !user) {
    return res.status(401).json({ message: 'Email atau password salah' });
  }

<<<<<<< HEAD
  // 2b. Ambil nama + userId dari tabel user (profil) — untuk mahasiswa
  let nama   = '';
  let userId = null;

  if (role === 'mahasiswa') {
    const { data: profil } = await supabase
      .from('user')
      .select('nama, userId')
      .eq('accountId', user.accountId)
      .single();

    nama   = profil?.nama   ?? '';
    userId = profil?.userId ?? null;
  } else if (role === 'pendonor') {
    // Cek apakah pendonor profile sudah ada
    let { data: pendonor } = await supabase
      .from('pendonor')
      .select('id, nama_organisasi')
      .eq('accountId', user.accountId)
      .single();

    // Jika belum ada, buat profile pendonor default
    if (!pendonor) {
      const { data: newPendonor, error: createError } = await supabase
        .from('pendonor')
        .insert({
          accountId: user.accountId,
          nama_organisasi: email.split('@')[0] || 'Organisasi Baru',
          status_verifikasi: 'pending'
        })
        .select('id, nama_organisasi')
        .single();

      if (createError) {
        console.error('[loginAPI] Error creating pendonor profile:', createError);
        return res.status(500).json({ message: 'Gagal membuat profil pendonor' });
      }

      pendonor = newPendonor;
    }

    nama = pendonor?.nama_organisasi ?? '';
    userId = pendonor?.id ?? null;
=======
  // 2b. Ambil profil berdasarkan role
  let nama = '';
  let userId = null;

  if (user.role === 'admin') {
    const { data } = await supabase.from('admin').select('nama, adminId').eq('accountId', user.accountId).single();
    nama = data?.nama ?? 'Admin';
    userId = data?.adminId ?? null;
  } else if (user.role === 'pendonor') {
    const { data } = await supabase.from('pendonor').select('statusOrganisasi, pendonorId').eq('accountId', user.accountId).single();
    nama = data?.statusOrganisasi ?? 'Pendonor';
    userId = data?.pendonorId ?? null;
  } else {
    const { data } = await supabase.from('user').select('nama, userId').eq('accountId', user.accountId).single();
    nama = data?.nama ?? '';
    userId = data?.userId ?? null;
>>>>>>> f31f5a7acc3555f9542f9cc8fe7febd68bea84c6
  }

  // 3. Verifikasi password (bcrypt dengan fallback plain text)
  let valid = false;
  try {
    // Cek apakah password di DB adalah hash bcrypt (biasanya dimulai dengan $2)
    if (user.kataKunci && user.kataKunci.startsWith('$2')) {
      valid = await bcrypt.compare(password, user.kataKunci);
    } else {
      // Jika bukan hash, bandingkan langsung
      valid = password === user.kataKunci;
    }
  } catch (err) {
    // Fallback jika terjadi error pada bcrypt
    valid = password === user.kataKunci;
  }

  if (!valid) {
    return res.status(401).json({ message: 'Email atau password salah' });
  }

  // 4. Buat JWT token
  const token = jwt.sign(
    { accountId: user.accountId, role: user.role, email: user.email, nama, userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // 5. Simpan di cookie HTTP-only
  res.setHeader('Set-Cookie', serialize('token', token, {
    httpOnly: true,
    secure  : process.env.NODE_ENV === 'production',
    path    : '/',
    maxAge  : 60 * 60 * 24 * 7, // 7 hari
    sameSite: 'lax',
  }));

  // 6. Map redirect berdasarkan role
  const redirectMap = {
    mahasiswa: '/mahasiswa/dashboard',
    pendonor : '/pendonor/dashboard',
    admin    : '/admin/dashboard',
  };

  return res.status(200).json({ 
    message : 'Login berhasil',
    redirect: redirectMap[role] || '/'
  });
}