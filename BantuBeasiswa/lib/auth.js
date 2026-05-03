import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verifikasi JWT dari cookie request SSR.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {{ accountId: number, role: string, email: string } | null}
 */
export function verifyToken(req) {
  try {
    const cookies = parse(req.headers.cookie || '');
    const token   = cookies.token;

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded; // { accountId, role, email, iat, exp }
  } catch {
    return null;
  }
}

/**
 * Helper getServerSideProps: proteksi halaman berdasarkan role.
 * Redirect ke /login jika token tidak valid atau role tidak sesuai.
 *
 * @param {object} context   - Next.js SSR context
 * @param {string|string[]} allowedRoles - role yang boleh akses halaman ini
 * @returns {{ props: { user } } | { redirect }}
 */
export function withAuth(context, allowedRoles) {
  const decoded = verifyToken(context.req);
  const roles   = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!decoded || !roles.includes(decoded.role)) {
    return {
      redirect: {
        destination: '/login',
        permanent  : false,
      },
    };
  }

  return {
    props: {
      user: {
        accountId: decoded.accountId,
        userId   : decoded.userId   ?? null,
        email    : decoded.email,
        role     : decoded.role,
        nama     : decoded.nama     ?? '',
      },
    },
  };
}
