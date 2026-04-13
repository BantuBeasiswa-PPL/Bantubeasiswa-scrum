import MahasiswaLayout from '../../components/layouts/MahasiswaLayout';

const DUMMY_USER = { nama: 'Budi Santoso', role: 'mahasiswa' };

export default function MahasiswaDashboard() {
  return (
    <MahasiswaLayout user={DUMMY_USER}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Halo, {DUMMY_USER.nama}! Temukan beasiswa yang tepat untukmu.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Beasiswa Diikuti',  value: '3',  color: '#0056b3' },
            { label: 'Favorit',           value: '7',  color: '#ffc107' },
            { label: 'Dokumen Diproses',  value: '2',  color: '#28a745' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-[#333] mb-3">Beasiswa Terbaru</h2>
          <div className="space-y-3">
            {['Beasiswa Cerdas Nusantara 2025', 'Beasiswa Afirmasi Daerah 3T', 'Beasiswa Nusantara Tech'].map((b) => (
              <div key={b} className="flex items-center justify-between p-3 bg-[#f8f9fa] rounded-lg">
                <span className="text-sm text-[#333]">{b}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-[#0056b3]/10 text-[#0056b3] font-medium">Aktif</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MahasiswaLayout>
  );
}
