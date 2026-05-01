import BaseLayout from './BaseLayout';

const menuItems = [
  {
    label: 'Profil Pendonor',
    href: '/pendonor/profil',
    icon: '🏢',
  },
  {
    label: 'Kelola Program',
    href: '/pendonor/program',
    icon: '🎓',
  },
  {
    label: 'Seleksi Pendaftar',
    href: '/pendonor/seleksi',
    icon: '👥',
  },
  {
    label: 'Dashboard Laporan',
    href: '/pendonor/laporan',
    icon: '📈',
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
