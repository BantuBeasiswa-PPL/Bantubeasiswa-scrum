import BaseLayout from './BaseLayout';

<<<<<<< Updated upstream
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
=======
const FULL_MENU = [
  { label: 'Dashboard Pendonor', href: '/pendonor/dashboard' },
  { label: 'Profil Pendonor', href: '/pendonor/profil' },
  { label: 'Kelola Program', href: '/pendonor/program' },
  { label: 'Seleksi Pendaftar', href: '/pendonor/seleksi-pendaftar' },
  { label: 'Pembayaran Beasiswa', href: '/pendonor/pembayaran' },
  { label: 'Dashboard Laporan', href: '/pendonor/dashboard-laporan' },
>>>>>>> Stashed changes
];

const PENDING_MENU = [
  { label: 'Profil Pendonor', href: '/pendonor/profil' },
  { label: 'Dokumen Verifikasi', href: '/pendonor/dokumen-verifikasi' },
];

export default function PendonorLayout({ children, user, isPending = false }) {
  const menuItems = isPending ? PENDING_MENU : FULL_MENU;

  return (
    <BaseLayout user={user} menuItems={menuItems}>
      {isPending && (
        <div
          className="mb-5 flex items-start gap-3 px-4 py-3 rounded-lg text-sm"
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
          }}
        >
          <span className="text-base leading-5">⏳</span>
          <div>
            <p className="font-semibold mb-0.5">Akun menunggu verifikasi admin</p>
            <p className="text-xs leading-relaxed opacity-90">
              Lengkapi profil dan unggah dokumen pendukung. Setelah diverifikasi, menu fitur pendonor lainnya akan terbuka.
            </p>
          </div>
        </div>
      )}
      {children}
    </BaseLayout>
  );
}
