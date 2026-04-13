import AdminLayout from '../../components/layouts/AdminLayout';

const DUMMY_USER = { nama: 'Super Admin', role: 'admin' };

export default function AdminDashboard() {
  return (
    <AdminLayout user={DUMMY_USER}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">Dashboard Statistik</h1>
          <p className="text-gray-500 text-sm mt-1">Selamat datang, {DUMMY_USER.nama}</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Total Beasiswa',   value: '24',  sub: '3 baru minggu ini',  color: '#0056b3' },
            { label: 'Total Pendaftar',  value: '312', sub: '↑ 12% bulan ini',    color: '#28a745' },
            { label: 'Pendonor Aktif',   value: '8',   sub: '2 menunggu verifikasi', color: '#ffc107' },
            { label: 'Laporan Kendala',  value: '5',   sub: '2 belum ditangani',  color: '#dc3545' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Placeholder chart area */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-[#333] mb-4">Tren Pendaftaran</h2>
          <div className="h-40 bg-[#f8f9fa] rounded-lg flex items-center justify-center text-gray-400 text-sm">
            [ Grafik akan ditampilkan di sini ]
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
