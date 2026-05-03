import { serialize } from 'cookie';

/**
 * POST /api/auth/logout
 * Hapus cookie token lalu redirect ke /login.
 */
export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Hapus cookie dengan mengatur maxAge = 0
  res.setHeader('Set-Cookie', serialize('token', '', {
    httpOnly: true,
    secure  : process.env.NODE_ENV === 'production',
    path    : '/',
    maxAge  : 0,
    sameSite: 'lax',
  }));

  return res.status(200).json({ message: 'Logout berhasil.' });
}
