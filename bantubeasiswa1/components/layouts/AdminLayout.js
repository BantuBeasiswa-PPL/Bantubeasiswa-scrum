import BaseLayout from './BaseLayout';

const MENU_ITEMS = [
  { href: '/admin/dashboard',    icon: 'dashboard', label: 'Dashboard Statistik'  },
  { href: '/admin/wilayah',      icon: 'map',       label: 'Kelola Data Wilayah'  },
  { href: '/admin/pendonor',     icon: 'users',     label: 'Kelola Pendonor'      },
  { href: '/admin/beasiswa',     icon: 'book',      label: 'Kelola Beasiswa'      },
  { href: '/admin/laporan',      icon: 'alert',     label: 'Laporan Kendala'      },
];

/**
 * AdminLayout
 * @param {{ children: React.ReactNode, user: { nama: string, role: string } }} props
 */
export default function AdminLayout({ children, user }) {
  return (
    <BaseLayout user={user} menuItems={MENU_ITEMS}>
      {children}
    </BaseLayout>
  );
}
