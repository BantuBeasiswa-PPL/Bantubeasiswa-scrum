import pool from '../../../lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password, role } = req.body;

  // Cari akun berdasarkan email dan role
  const [rows] = await pool.query(
    'SELECT * FROM account WHERE email = ? AND role = ?',
    [email, role]
  );

  if (rows.length === 0) {
    return res.status(401).json({ message: 'Email atau password salah' });
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.kataKunci);

  if (!valid) {
    return res.status(401).json({ message: 'Email atau password salah' });
  }

  // Buat JWT token
  const token = jwt.sign(
    { accountId: user.accountId, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Simpan di cookie HTTP-only
  res.setHeader('Set-Cookie', serialize('token', token, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 hari
    sameSite: 'lax',
  }));

  // Redirect berdasarkan role
  const redirectMap = {
    mahasiswa: '/mahasiswa/dashboard',
    pendonor:  '/pendonor/dashboard',
    admin:     '/admin/dashboard',
  };

  return res.status(200).json({ 
    message: 'Login berhasil',
    redirect: redirectMap[role]
  });
}