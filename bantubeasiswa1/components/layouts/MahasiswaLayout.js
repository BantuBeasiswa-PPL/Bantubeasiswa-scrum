import BaseLayout from './BaseLayout';

const MENU_ITEMS = [
  { href: '/mahasiswa/dashboard',    icon: 'dashboard',  label: 'Dashboard'              },
  { href: '/mahasiswa/cari',         icon: 'search',     label: 'Cari Beasiswa'          },
  { href: '/mahasiswa/pendaftaran',  icon: 'clipboard',  label: 'Status Pendaftaran'     },
  { href: '/mahasiswa/tutorial',     icon: 'video',      label: 'Tutorial Administrasi'  },
  { href: '/mahasiswa/favorit',      icon: 'heart',      label: 'Beasiswa Favorit'       },
  { href: '/mahasiswa/bantuan',      icon: 'help',       label: 'Bantuan'                },
];

/**
 * MahasiswaLayout
 * @param {{ children: React.ReactNode, user: { nama: string, role: string } }} props
 */
export default function MahasiswaLayout({ children, user }) {
  return (
    <BaseLayout user={user} menuItems={MENU_ITEMS}>
      {children}
    </BaseLayout>
  );
}
