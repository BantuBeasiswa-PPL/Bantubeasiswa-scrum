import BaseLayout from './BaseLayout';

const menuItems = [
  {
    label: 'Profil Pendonor',
    href: '/pendonor/profil',
  },
  {
    label: 'Kelola Program',
    href: '/pendonor/program',
  },
  {
    label: 'Seleksi Pendaftar',
    href: '/pendonor/seleksi',
  },
  {
    label: 'Dashboard Laporan',
    href: '/pendonor/laporan',
  },
];

/**
 * PendonorLayout
 * @param {{ children: React.ReactNode, user: { nama: string, role: string } }} props
 */
export default function PendonorLayout({ children, user }) {
  return (
    <BaseLayout user={user} menuItems={menuItems}>
      {children}
    </BaseLayout>
  );
}
