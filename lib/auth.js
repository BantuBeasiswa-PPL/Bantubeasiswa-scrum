import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { supabase } from './db';

const JWT_SECRET = process.env.JWT_SECRET;

export function verifyToken(req) {
  try {
    const cookies = parse(req.headers.cookie || '');
    const token   = cookies.token;

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
}

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

function pendonorUserProps(decoded) {
  return {
    accountId: decoded.accountId,
    userId   : decoded.userId   ?? null,
    email    : decoded.email,
    role     : decoded.role,
    nama     : decoded.nama     ?? '',
  };
}

/**
<<<<<<< Updated upstream
 * Helper getServerSideProps: proteksi halaman pendonor yang sudah diverifikasi admin.
 * Redirect ke login dengan notifikasi jika belum diverifikasi.
=======
 * Proteksi halaman pendonor.
 * - verified: akses penuh
 * - pending + allowPending: hanya profil & dokumen verifikasi
 * - pending tanpa allowPending: redirect ke dokumen verifikasi
 * - rejected: redirect ke login
>>>>>>> Stashed changes
 */
export async function withPendonorAuth(context, options = {}) {
  const { allowPending = false } = options;
  const decoded = verifyToken(context.req);

  if (!decoded || decoded.role !== 'pendonor') {
    return {
      redirect: {
        destination: '/login',
        permanent  : false,
      },
    };
  }

  const { data: pendonorData, error } = await supabase
    .from('pendonor')
    .select('statusVerifikasi')
    .eq('accountId', decoded.accountId)
    .single();

  const status = (pendonorData?.statusVerifikasi || 'pending').toLowerCase();
<<<<<<< Updated upstream

  if (error || !pendonorData || status !== 'verified') {
    const query = status === 'rejected' ? 'verifikasi=rejected' : 'verifikasi=pending';
    return {
      redirect: {
        destination: `/login?${query}`,
=======
  const isPending = status !== 'verified';

  if (error || !pendonorData) {
    return {
      redirect: {
        destination: '/login',
        permanent  : false,
      },
    };
  }

  if (status === 'rejected') {
    return {
      redirect: {
        destination: '/login?verifikasi=rejected',
        permanent  : false,
      },
    };
  }

  if (isPending && !allowPending) {
    return {
      redirect: {
        destination: '/pendonor/dokumen-verifikasi',
>>>>>>> Stashed changes
        permanent  : false,
      },
    };
  }

  return {
    props: {
      user: pendonorUserProps(decoded),
      statusVerifikasi: status,
      isPending,
    },
  };
}
