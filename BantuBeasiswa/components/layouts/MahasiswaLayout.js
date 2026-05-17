import BaseLayout from './BaseLayout';

const menuItems = [
  {
    label: 'Dashboard',
    href: '/mahasiswa/dashboard',
    icon: '🏠',
  },
  {
    label: 'Profil Saya',
    href: '/mahasiswa/profil/profil',
    icon: '👤',
  },
  {
    label: 'Cari Beasiswa',
    href: '/mahasiswa/cari',
    icon: '🔍',
  },
  {
    label: 'Status Pendaftaran',
    href: '/mahasiswa/pendaftaran',
    icon: '📋',
  },
  {
    label: 'Daftar Ulang Rekening',
    href: '/mahasiswa/daftar-ulang-rekening',
    icon: '💳',
  },
  {
    label: 'Tutorial Administrasi',
    href: '/mahasiswa/tutorial',
    icon: '📚',
  },
  {
    label: 'Beasiswa Favorit',
    href: '/mahasiswa/favorit',
    icon: '⭐',
  },
];

/**
 * MahasiswaLayout
 * @param {{ children: React.ReactNode, user: { nama: string, role: string } }} props
 */
export default function MahasiswaLayout({ children, user }) {
  return (
    <BaseLayout user={user} menuItems={menuItems}>
      {children}
    </BaseLayout>
  );
}
