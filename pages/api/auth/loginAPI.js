import { supabase } from '../../../lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

const redirectMap = {
  admin: '/admin/dashboard',
  mahasiswa: '/mahasiswa/dashboard',
  pendonor: '/pendonor/dashboard',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Email, password, dan role harus diisi' });
  }

  const { data: user, error } = await supabase
    .from('account')
    .select('*')
    .eq('email', email)
    .eq('role', role)
    .single();

  if (error || !user) {
    return res.status(401).json({ message: 'Email atau password salah' });
  }

  let nama = '';
  let userId = null;
  let pendonorStatus = null;

  if (user.role === 'admin') {
    const { data } = await supabase.from('admin').select('nama, adminId').eq('accountId', user.accountId).single();
    nama = data?.nama ?? 'Admin';
    userId = data?.adminId ?? null;
  } else if (user.role === 'pendonor') {
    const { data } = await supabase.from('pendonor').select('statusOrganisasi, pendonorId, statusVerifikasi').eq('accountId', user.accountId).single();
    nama = data?.statusOrganisasi ?? 'Pendonor';
    userId = data?.pendonorId ?? null;
    pendonorStatus = (data?.statusVerifikasi || 'pending').toLowerCase();
  } else {
    const { data } = await supabase.from('user').select('nama, userId').eq('accountId', user.accountId).single();
    nama = data?.nama ?? '';
    userId = data?.userId ?? null;
  }

  let valid = false;
  try {
    if (user.kataKunci && user.kataKunci.startsWith('$2')) {
      valid = await bcrypt.compare(password, user.kataKunci);
    } else {
      valid = password === user.kataKunci;
    }
  } catch {
    valid = password === user.kataKunci;
  }

  if (!valid) {
    return res.status(401).json({ message: 'Email atau password salah' });
  }

  if (role === 'pendonor' && pendonorStatus === 'rejected') {
    return res.status(401).json({
      message: 'Akun Anda ditolak. Hubungi admin untuk informasi lebih lanjut.',
      status : 'rejected',
    });
  }

  const token = jwt.sign(
    { accountId: user.accountId, role: user.role, email: user.email, nama, userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.setHeader('Set-Cookie', serialize('token', token, {
    httpOnly: true,
    secure  : process.env.NODE_ENV === 'production',
    path    : '/',
    maxAge  : 60 * 60 * 24 * 7,
    sameSite: 'lax',
  }));

  if (role === 'pendonor' && pendonorStatus !== 'verified') {
    return res.status(200).json({
      message : 'Login berhasil',
      redirect: '/pendonor/dokumen-verifikasi',
      status  : 'pending',
      notice  : 'Akun Anda belum diverifikasi admin. Lengkapi profil dan unggah dokumen pendukung untuk proses verifikasi.',
    });
  }

  return res.status(200).json({
    message : 'Login berhasil',
    redirect: redirectMap[role] || '/',
  });
}
