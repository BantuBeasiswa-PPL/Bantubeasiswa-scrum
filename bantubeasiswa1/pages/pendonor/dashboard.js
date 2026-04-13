import PendonorLayout from '../../components/layouts/PendonorLayout';

const DUMMY_USER = { nama: 'Yayasan Cerdas', role: 'pendonor' };

export default function PendonorDashboard() {
  return (
    <PendonorLayout user={DUMMY_USER}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">Dashboard Laporan</h1>
          <p className="text-gray-500 text-sm mt-1">Pantau program beasiswa Anda.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Program Aktif',       value: '2', color: '#0056b3' },
            { label: 'Total Pendaftar',     value: '89', color: '#28a745' },
            { label: 'Dana Tersalurkan',    value: 'Rp 80jt', color: '#ffc107' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-[#333] mb-3">Program Beasiswa</h2>
          <div className="space-y-3">
            {[
              { name: 'Beasiswa Cerdas Nusantara 2025', daftar: 52, status: 'Aktif' },
              { name: 'Beasiswa Afirmasi Daerah 3T',    daftar: 37, status: 'Aktif' },
            ].map((p) => (
              <div key={p.name} className="flex items-center justify-between p-3 bg-[#f8f9fa] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-[#333]">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.daftar} pendaftar</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-[#0056b3]/10 text-[#0056b3] font-medium">{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PendonorLayout>
  );
}
