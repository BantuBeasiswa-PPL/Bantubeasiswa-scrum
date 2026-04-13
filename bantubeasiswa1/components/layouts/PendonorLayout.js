import BaseLayout from './BaseLayout';

const MENU_ITEMS = [
  { href: '/pendonor/profil',     icon: 'user',      label: 'Profil Pendonor'     },
  { href: '/pendonor/program',    icon: 'book',      label: 'Kelola Program'      },
  { href: '/pendonor/seleksi',    icon: 'filter',    label: 'Seleksi Pendaftar'   },
  { href: '/pendonor/laporan',    icon: 'chart',     label: 'Dashboard Laporan'   },
];

/**
 * PendonorLayout
 * @param {{ children: React.ReactNode, user: { nama: string, role: string } }} props
 */
export default function PendonorLayout({ children, user }) {
  return (
    <BaseLayout user={user} menuItems={MENU_ITEMS}>
      {children}
    </BaseLayout>
  );
}
