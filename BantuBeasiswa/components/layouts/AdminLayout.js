import BaseLayout from './BaseLayout';

const menuItems = [
  {
    label: 'Dashboard Statistik',
    href: '/admin/dashboard',
  },
  {
    label: 'Dashboard Analitik',
    href: '/admin/dashboard-analitik',
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
  {
    label: 'Laporan Global',
    href: '/admin/laporan-global',
  },
  {
    label: 'Tutorial Administrasi',
    href: '/tutorial-administrasi',
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
