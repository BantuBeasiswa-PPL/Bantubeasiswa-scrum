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

  // 2. GANTI CONST LAMA: Cari akun menggunakan Supabase Client
  // Kita langsung mengambil satu data (single) yang email dan rolenya cocok
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

  // 3. Verifikasi password (menggunakan kolom kataKunci sesuai skema kamu)
  const valid = await bcrypt.compare(password, user.kataKunci);

  if (!valid) {
    return res.status(401).json({ message: 'Email atau password salah' });
  }

  // 4. Buat JWT token
  const token = jwt.sign(
    { accountId: user.accountId, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // 5. Simpan di cookie HTTP-only
  res.setHeader('Set-Cookie', serialize('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Aktifkan secure jika sudah online (HTTPS)
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 hari
    sameSite: 'lax',
  }));

  // 6. Map redirect berdasarkan role
  const redirectMap = {
    mahasiswa: '/mahasiswa/dashboard',
    pendonor:  '/pendonor/dashboard',
    admin:     '/admin/dashboard',
  };

  return res.status(200).json({ 
    message: 'Login berhasil',
    redirect: redirectMap[role] || '/'
  });
}