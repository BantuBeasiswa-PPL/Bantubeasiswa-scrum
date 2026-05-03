import BaseLayout from './BaseLayout';

const menuItems = [
  { label: 'Dashboard', href: '/mahasiswa/dashboard' },
  { label: 'Cari Beasiswa', href: '/mahasiswa/cari' },
  { label: 'Status Pendaftaran', href: '/mahasiswa/status-pendaftaran' },
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
