import BaseLayout from './BaseLayout';

const menuItems = [
  {
    label: 'Dashboard',
    href: '/mahasiswa/dashboard',
  },
  {
    label: 'Cari Beasiswa',
    href: '/mahasiswa/cari',
  },
  {
    label: 'Status Pendaftaran',
    href: '/mahasiswa/pendaftaran',
  },
  {
    label: 'Tutorial Administrasi',
    href: '/mahasiswa/tutorial',
  },
  {
    label: 'Beasiswa Favorit',
    href: '/mahasiswa/favorit',
  },
  {
    label: 'Bantuan',
    href: '/mahasiswa/bantuan',
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
