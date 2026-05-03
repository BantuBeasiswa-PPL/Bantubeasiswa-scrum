import BaseLayout from './BaseLayout';

const menuItems = [
  {
    label: 'Dashboard Statistik',
    href: '/admin/dashboard',
  },
  {
    label: 'Kelola Data Wilayah',
    href: '/admin/wilayah',
  },
  {
    label: 'Kelola Pendonor',
    href: '/admin/pendonor',
  },
  {
    label: 'Kelola Beasiswa',
    href: '/admin/beasiswa',
  },
  {
    label: 'Laporan Kendala',
    href: '/admin/laporan',
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
