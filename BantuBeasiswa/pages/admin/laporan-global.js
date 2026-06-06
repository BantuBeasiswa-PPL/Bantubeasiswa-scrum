import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/layouts/AdminLayout';
import { withAuth } from '../../lib/auth';

// ─── Color tokens ────────────────────────────────────────────────────────────
const C = {
  blue      : '#0056b3',
  blueLight : '#eff6ff',
  green     : '#059669',
  greenLight: '#ecfdf5',
  gold      : '#d97706',
  goldLight : '#fffbeb',
  red       : '#dc2626',
  redLight  : '#fef2f2',
  dark      : '#1e293b',
  white     : '#ffffff',
  gray      : '#6b7280',
  grayLight : '#f3f4f6',
  purple    : '#7c3aed',
  purpleLight: '#f5f3ff',
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, accent, desc }) {
  return (
    <div style={{
      background: C.white, borderRadius: '0.875rem', padding: '1.125rem 1.25rem',
      border: '1px solid #e5e7eb', borderTop: `4px solid ${accent}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      transition: 'transform 0.2s',
    }} className="hover:scale-[1.02] cursor-default">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', margin: 0 }}>{label}</p>
        <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
          {icon}
        </div>
      </div>
      <p style={{ fontSize: '2rem', fontWeight: 800, color: accent, margin: 0, lineHeight: 1 }}>
        {value ?? '—'}
      </p>
      {desc && <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.375rem', margin: 0 }}>{desc}</p>}
    </div>
  );
}

// ─── Format Currency & Date ──────────────────────────────────────────────────
function fmtRupiah(angka) {
  if (angka === undefined || angka === null) return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(angka);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminLaporanGlobalPage({ user }) {
  const [globalList, setGlobalList] = useState([]);
  const [metaInfo, setMetaInfo] = useState({ tanggalGenerate: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  // Fetch report data
  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/laporan-global');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal memuat laporan global');
      setGlobalList(data.data || []);
      setMetaInfo(data.metaInfo || { tanggalGenerate: '' });
    } catch (e) {
      setError(e.message || 'Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter & Search logic
  const displayedList = globalList.filter((row) => {
    const q = search.toLowerCase();
    return row.namaPendonor?.toLowerCase().includes(q);
  });

  // Calculate sum totals
  const totalPendonor = displayedList.length;
  const totalPenerima = displayedList.reduce((sum, item) => sum + (item.totalPenerima || 0), 0);
  const totalDana = displayedList.reduce((sum, item) => sum + (item.totalDana || 0), 0);

  // Generate PDF client side
  const handleExportPDF = async () => {
    if (displayedList.length === 0) {
      alert('Tidak ada data untuk diekspor!');
      return;
    }

    setExporting(true);
    try {
      // Dynamic import to prevent SSR compilation errors
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();

      // Draw header manually
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Laporan Global Penyaluran Dana Beasiswa', 14, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Platform: BantuBeasiswa Admin Portal', 14, 28);
      doc.text('Tanggal Rekapitulasi: ' + metaInfo.tanggalGenerate, 14, 34);

      // Draw horizontal line
      doc.setDrawColor(229, 231, 235);
      doc.line(14, 38, 196, 38);

      // Create Table
      autoTable(doc, {
        startY: 42,
        head: [['No', 'Nama Mitra Pendonor', 'Total Penerima Beasiswa', 'Total Dana Penyaluran']],
        body: displayedList.map((row, i) => [
          i + 1,
          row.namaPendonor,
          row.totalPenerima + ' Mahasiswa',
          'Rp ' + row.totalDana.toLocaleString('id-ID')
        ]),
        headStyles: { fillColor: [0, 86, 179], fontStyle: 'bold' },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 10 },
          2: { cellWidth: 45 },
          3: { cellWidth: 45 },
        }
      });

      // Draw Total Footer
      const finalY = doc.lastAutoTable.finalY || 50;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Mitra Pendonor: ${totalPendonor} Organisasi`, 14, finalY + 12);
      doc.text(`Total Penerima Global: ${totalPenerima} Mahasiswa`, 14, finalY + 18);
      doc.text(`Total Penyaluran Dana Global: Rp ${totalDana.toLocaleString('id-ID')}`, 14, finalY + 24);

      // Trigger download
      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`laporan-global-penyaluran-${dateStr}.pdf`);
    } catch (e) {
      console.error('Error generating PDF:', e);
      alert('Gagal menghasilkan PDF. Silakan coba lagi.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Laporan Global Penyaluran · BantuBeasiswa Admin</title>
        <meta name="description" content="Dashboard laporan rekapitulasi global penyaluran dana beasiswa." />
      </Head>

      <AdminLayout user={user}>
        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-7 rounded-full" style={{ background: C.gold }} />
            <h1 className="text-2xl font-extrabold" style={{ color: C.dark }}>Rekapitulasi Penyaluran Global</h1>
          </div>
          <p className="text-sm ml-4" style={{ color: C.gray }}>
            Pantau statistik komitmen pendanaan dan penyaluran dana beasiswa dari seluruh mitra pendonor.
          </p>
        </div>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg mb-6 text-sm"
            style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c' }} role="alert">
            <span>⚠️</span>
            <p className="margin-0">{error}</p>
          </div>
        )}

        {/* ── Stats Summary Grid ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <StatCard
            icon="🏢" label="Total Mitra Pendonor"
            value={loading ? '…' : `${totalPendonor} Mitra`}
            accent={C.purple}
            desc="Mitra yang membagikan beasiswa di platform"
          />
          <StatCard
            icon="👥" label="Penerima Beasiswa"
            value={loading ? '…' : `${totalPenerima} Mahasiswa`}
            accent={C.blue}
            desc="Total penerima seleksi berstatus LULUS"
          />
          <StatCard
            icon="💰" label="Total Dana Tersalurkan"
            value={loading ? '…' : fmtRupiah(totalDana)}
            accent={C.green}
            desc="Akumulasi dana komitmen seluruh pendonor"
          />
        </div>

        {/* ── Main Content Container ───────────────────────────────────── */}
        <div style={{ background: C.white, borderRadius: '0.875rem', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          {/* Action controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between p-5 border-b gap-4" style={{ borderColor: '#f3f4f6' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: C.dark, margin: 0 }}>Rangkuman Penyaluran Dana Mitra</h2>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#9ca3af' }}>🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari mitra pendonor..."
                  style={{
                    paddingLeft: '2.1rem', paddingRight: '0.75rem', paddingTop: '0.47rem', paddingBottom: '0.47rem',
                    fontSize: '0.825rem', borderRadius: '0.5rem', border: '1.5px solid #d1d5db',
                    outline: 'none', width: '14rem', color: C.dark, background: C.white,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = C.blue)}
                  onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                />
              </div>

              {/* Export button */}
              <button
                onClick={handleExportPDF}
                disabled={exporting || displayedList.length === 0}
                style={{
                  padding: '0.47rem 1.1rem', borderRadius: '0.5rem', border: 'none',
                  background: displayedList.length === 0 ? '#9ca3af' : C.blue,
                  color: C.white, fontWeight: 700, fontSize: '0.825rem',
                  cursor: displayedList.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.375rem', transition: 'all 0.15s'
                }}
                className="hover:opacity-95 active:scale-95"
              >
                <span>🌍</span> {exporting ? 'Mengekspor...' : 'Export PDF Global'}
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                  {['No', 'Nama Mitra Pendonor', 'Total Penerima Beasiswa', 'Total Dana Penyaluran'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '0.875rem 1rem',
                      fontSize: '0.72rem', fontWeight: 700, color: '#6b7280',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td colSpan={4} style={{ padding: '1.25rem 1rem' }}>
                        <div style={{ height: '0.875rem', background: '#e5e7eb', borderRadius: 4, width: '90%', animation: 'pulse 1.5s infinite' }} />
                      </td>
                    </tr>
                  ))
                ) : displayedList.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: C.gray }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏢</div>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0, color: '#374151' }}>Tidak Ada Data Pendonor</p>
                      <p style={{ fontSize: '0.8rem', color: C.gray, marginTop: '0.25rem', margin: 0 }}>
                        Data rekapitulasi pendonor tidak ditemukan.
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedList.map((row, idx) => (
                    <tr
                      key={row.pendonorId}
                      style={{
                        borderTop: '1px solid #f3f4f6',
                        background: idx % 2 === 1 ? '#f9fafb' : C.white,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f7ff')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 1 ? '#f9fafb' : C.white)}
                    >
                      <td style={{ padding: '0.875rem 1rem', color: C.gray }}>{idx + 1}</td>
                      <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: C.dark }}>
                        {row.namaPendonor}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: '#4b5563', fontWeight: 600 }}>
                        {row.totalPenerima} Mahasiswa
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: C.green, fontWeight: 700 }}>
                        {fmtRupiah(row.totalDana)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          {!loading && (
            <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.78rem', color: C.gray, margin: 0 }}>
                Menampilkan <strong style={{ color: C.dark }}>{displayedList.length}</strong> dari <strong style={{ color: C.dark }}>{globalList.length}</strong> mitra pendonor
              </p>
              <button
                onClick={fetchData}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  fontSize: '0.78rem', fontWeight: 600, color: C.blue,
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                🔄 Refresh Data
              </button>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}

// ─── SSR Auth Guard ───────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  return withAuth(context, 'admin');
}
