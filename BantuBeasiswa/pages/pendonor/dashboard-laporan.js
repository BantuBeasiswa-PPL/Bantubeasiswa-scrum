import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import PendonorLayout from '../../components/layouts/PendonorLayout';
import { withAuth } from '../../lib/auth';
import { showError, showWarning } from '../../lib/swal';

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

// ─── Status Config ───────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending    : { label: 'Pending', bg: '#fffbeb', color: '#b45309' },
  confirmed  : { label: 'Confirmed', bg: '#eff6ff', color: '#1d4ed8' },
  tersalurkan: { label: 'Tersalurkan', bg: '#ecfdf5', color: '#047857' },
  gagal      : { label: 'Gagal', bg: '#fef2f2', color: '#b91c1c' },
  diproses   : { label: 'Diproses', bg: '#f5f3ff', color: '#6d28d9' },
};

function StatusBadge({ status }) {
  const s = STATUS_CFG[status] || { label: status, bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      background: s.bg, color: s.color, padding: '0.2rem 0.6rem',
      borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

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
  if (!angka) return '—';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(angka);
}

function fmtTgl(iso) {
  if (!iso || iso === '—') return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardLaporanPage({ user }) {
  const [laporanList, setLaporanList] = useState([]);
  const [metaInfo, setMetaInfo] = useState({ namaPendonor: 'Mitra Pendonor', tanggalGenerate: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterProgram, setFilterProgram] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [exporting, setExporting] = useState(false);

  // Fetch report data
  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/pendonor/laporan');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal memuat laporan');
      setLaporanList(data.data || []);
      setMetaInfo(data.metaInfo || { namaPendonor: 'Mitra Pendonor', tanggalGenerate: '' });
    } catch (e) {
      setError(e.message || 'Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extract unique program titles for filter dropdown
  const uniquePrograms = Array.from(new Set(laporanList.map((item) => item.judul)));

  // Filter & Search logic
  const displayedList = laporanList.filter((row) => {
    const q = search.toLowerCase();
    const matchesSearch = row.judul?.toLowerCase().includes(q);
    const matchesProgram = filterProgram === 'Semua' || row.judul === filterProgram;
    const matchesStatus = filterStatus === 'Semua' || row.status === filterStatus;
    return matchesSearch && matchesProgram && matchesStatus;
  });

  // Calculate sum totals
  const totalPenerima = displayedList.reduce((sum, item) => sum + item.jumlahLulus, 0);
  const totalDana = displayedList.reduce((sum, item) => sum + item.totalTersalurkan, 0);

  // Generate PDF client side
  const handleDownloadPDF = async () => {
    if (displayedList.length === 0) {
      await showWarning('Perhatian', 'Tidak ada data untuk diekspor!');
      return;
    }

    setExporting(true);
    try {
      // Dynamic import to prevent SSR compilation errors
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();

      const namaProgramStr = filterProgram === 'Semua' ? 'Semua Program Beasiswa' : filterProgram;

      // Draw header manually
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Laporan Rekapitulasi Program Beasiswa', 14, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Program: ' + namaProgramStr, 14, 28);
      doc.text('Pendonor: ' + metaInfo.namaPendonor, 14, 34);
      doc.text('Tanggal Cetak: ' + metaInfo.tanggalGenerate, 14, 40);

      // Draw horizontal line
      doc.setDrawColor(229, 231, 235);
      doc.line(14, 44, 196, 44);

      // Create Table
      autoTable(doc, {
        startY: 48,
        head: [['No', 'Program Beasiswa', 'Penerima Lulus', 'Pagu Dana per Anak', 'Total Komitmen Dana', 'Total Dana Tersalurkan', 'Penyaluran Terbaru', 'Status']],
        body: displayedList.map((row, i) => [
          i + 1,
          row.judul,
          `${row.jumlahLulus} Mahasiswa`,
          'Rp ' + row.nominal.toLocaleString('id-ID'),
          'Rp ' + (row.jumlahLulus * row.nominal).toLocaleString('id-ID'),
          'Rp ' + row.totalTersalurkan.toLocaleString('id-ID'),
          fmtTgl(row.tanggal_penyaluran),
          STATUS_CFG[row.status]?.label || row.status
        ]),
        headStyles: { fillColor: [0, 86, 179], fontStyle: 'bold' },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 8 },
          2: { cellWidth: 22 },
          3: { cellWidth: 26 },
          4: { cellWidth: 28 },
          5: { cellWidth: 28 },
          6: { cellWidth: 22 },
        }
      });

      // Draw Total Footer
      const finalY = doc.lastAutoTable.finalY || 50;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Penerima: ${totalPenerima} Mahasiswa`, 14, finalY + 12);
      doc.text(`Total Dana Tersalurkan: Rp ${totalDana.toLocaleString('id-ID')}`, 14, finalY + 18);

      // Trigger download
      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`laporan-rekap-program-${dateStr}.pdf`);
    } catch (e) {
      console.error('Error generating PDF:', e);
      await showError('Gagal!', 'Gagal menghasilkan PDF. Silakan coba lagi.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Laporan Penyaluran Dana · BantuBeasiswa Pendonor</title>
        <meta name="description" content="Dashboard rekapitulasi penyaluran dana beasiswa oleh pendonor." />
      </Head>

      <PendonorLayout user={{ nama: user.nama || 'Pendonor', role: 'pendonor' }}>
        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-7 rounded-full" style={{ background: C.gold }} />
            <h1 className="text-2xl font-extrabold" style={{ color: C.dark }}>Rekapitulasi Program Beasiswa</h1>
          </div>
          <p className="text-sm ml-4" style={{ color: C.gray }}>
            Lihat daftar ringkasan program beasiswa Anda, jumlah mahasiswa lulus seleksi, dan total transfer penyaluran dana.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          <StatCard
            icon="👥" label="Total Penerima Beasiswa Lulus"
            value={loading ? '…' : `${totalPenerima} Mahasiswa`}
            accent={C.blue}
            desc="Mahasiswa yang dinyatakan lulus seleksi di seluruh program Anda"
          />
          <StatCard
            icon="💰" label="Total Dana Tersalurkan"
            value={loading ? '…' : fmtRupiah(totalDana)}
            accent={C.green}
            desc="Akumulasi dana yang sudah berhasil ditransfer langsung ke mahasiswa"
          />
        </div>

        {/* ── Main Content Container ───────────────────────────────────── */}
        <div style={{ background: C.white, borderRadius: '0.875rem', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          {/* Action controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between p-5 border-b gap-4" style={{ borderColor: '#f3f4f6' }}>
            {/* Filter Group */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Program filter */}
              <div>
                <label htmlFor="filter-program" style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: C.gray, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Program Beasiswa</label>
                <select
                  id="filter-program"
                  value={filterProgram}
                  onChange={(e) => setFilterProgram(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem', borderRadius: '0.5rem', border: '1.5px solid #d1d5db',
                    fontSize: '0.825rem', outline: 'none', background: C.white, color: C.dark, width: '12rem'
                  }}
                >
                  <option value="Semua">Semua Program</option>
                  {uniquePrograms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div>
                <label htmlFor="filter-status" style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: C.gray, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Status Penyaluran</label>
                <select
                  id="filter-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem', borderRadius: '0.5rem', border: '1.5px solid #d1d5db',
                    fontSize: '0.825rem', outline: 'none', background: C.white, color: C.dark, width: '10rem'
                  }}
                >
                  <option value="Semua">Semua Status</option>
                  {Object.keys(STATUS_CFG).map((key) => (
                    <option key={key} value={key}>{STATUS_CFG[key].label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right side controls: search & download */}
            <div className="flex flex-wrap items-center gap-3 lg:self-end">
              {/* Search input */}
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#9ca3af' }}>🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari program beasiswa..."
                  style={{
                    paddingLeft: '2.1rem', paddingRight: '0.75rem', paddingTop: '0.47rem', paddingBottom: '0.47rem',
                    fontSize: '0.825rem', borderRadius: '0.5rem', border: '1.5px solid #d1d5db',
                    outline: 'none', width: '13rem', color: C.dark, background: C.white,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = C.blue)}
                  onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                />
              </div>

              {/* Export button */}
              <button
                onClick={handleDownloadPDF}
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
                <span>📄</span> {exporting ? 'Mengunduh...' : 'Download PDF'}
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                  {['No', 'Nama Program Beasiswa', 'Penerima Lulus', 'Dana per Penerima', 'Total Komitmen', 'Total Dana Tersalurkan', 'Penyaluran Terbaru', 'Status'].map((h) => (
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
                      <td colSpan={8} style={{ padding: '1.25rem 1rem' }}>
                        <div style={{ height: '0.875rem', background: '#e5e7eb', borderRadius: 4, width: '90%', animation: 'pulse 1.5s infinite' }} />
                      </td>
                    </tr>
                  ))
                ) : displayedList.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: C.gray }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</div>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0, color: '#374151' }}>Tidak Ada Data Program</p>
                      <p style={{ fontSize: '0.8rem', color: C.gray, marginTop: '0.25rem', margin: 0 }}>
                        Data rekapitulasi program tidak ditemukan untuk filter saat ini.
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedList.map((row, idx) => (
                    <tr
                      key={idx}
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
                        {row.judul}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: '#4b5563', fontWeight: 600 }}>{row.jumlahLulus} Mahasiswa</td>
                      <td style={{ padding: '0.875rem 1rem', color: '#4b5563' }}>{fmtRupiah(row.nominal)}</td>
                      <td style={{ padding: '0.875rem 1rem', color: '#4b5563', fontWeight: 600 }}>{fmtRupiah(row.jumlahLulus * row.nominal)}</td>
                      <td style={{ padding: '0.875rem 1rem', color: C.green, fontWeight: 700 }}>{fmtRupiah(row.totalTersalurkan)}</td>
                      <td style={{ padding: '0.875rem 1rem', color: '#4b5563' }}>{fmtTgl(row.tanggal_penyaluran)}</td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <StatusBadge status={row.status} />
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
                Menampilkan <strong style={{ color: C.dark }}>{displayedList.length}</strong> dari <strong style={{ color: C.dark }}>{laporanList.length}</strong> program beasiswa
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
      </PendonorLayout>
    </>
  );
}

// ─── SSR Auth Guard ───────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  return withAuth(context, 'pendonor');
}
