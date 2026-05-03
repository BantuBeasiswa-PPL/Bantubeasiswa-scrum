import BaseLayout from './BaseLayout';

const menuItems = [
  { label: 'Dashboard', href: '/mahasiswa/dashboard', icon: '🏠' },
  { label: 'Cari Beasiswa', href: '/mahasiswa/cari', icon: '🔍' },
  { label: 'Status Pendaftaran', href: '/mahasiswa/status-pendaftaran', icon: '📋' },
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
