import BaseLayout from './BaseLayout';

const menuItems = [
  {
    label: 'Dashboard Statistik',
    href: '/admin/dashboard',
    icon: '📊',
  },
  {
    label: 'Kelola Data Wilayah',
    href: '/admin/wilayah',
    icon: '🗺️',
  },
  {
    label: 'Kelola Pendonor',
    href: '/admin/pendonor',
    icon: '🏢',
  },
  {
    label: 'Kelola Beasiswa',
    href: '/admin/beasiswa',
    icon: '🎓',
  },
  {
    label: 'Laporan Kendala',
    href: '/admin/laporan',
    icon: '🚩',
  },
];

/**
 * AdminLayout
 * @param {{ children: React.ReactNode, user: { nama: string, role: string } }} props
 */
export default function AdminLayout({ children, user }) {
  return (
    <BaseLayout user={user} menuItems={menuItems}>
      {children}
    </BaseLayout>
  );
}
