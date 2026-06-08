import BaseLayout from './BaseLayout';

const menuItems = [
  {
    label: 'Dashboard Pendonor',
    href: '/pendonor/dashboard',
  },
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
    href: '/pendonor/seleksi-pendaftar',
  },
  {
    label: 'Pembayaran Beasiswa',
    href: '/pendonor/dashboard-pembayaran',
  },
  {
    label: 'Dashboard Laporan',
    href: '/pendonor/dashboard-laporan',
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
