import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/layouts/AdminLayout';
import TiketDetailPanel from '../../components/TiketDetailPanel';
import { withAuth } from '../../lib/auth';

// ─── Color tokens ────────────────────────────────────────────────────────────
const C = {
  blue: '#0056b3', gold: '#ffc107', dark: '#333333',
  green: '#059669', red: '#dc2626', orange: '#d97706', white: '#ffffff',
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending : { label: 'Pending', bg: '#fee2e2', color: '#b91c1c' },
  diproses: { label: 'Diproses', bg: '#fef9c3', color: '#92400e' },
  selesai : { label: 'Selesai',  bg: '#d1fae5', color: '#065f46' },
  ditutup : { label: 'Ditutup',  bg: '#e5e7ff', color: '#3730a3' },
};

function StatusBadge({ status }) {
  const s = STATUS_CFG[status] || { label: status, bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      background: s.bg, color: s.color, padding: '0.2rem 0.625rem',
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
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', margin: 0 }}>{label}</p>
        <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
          {icon}
        </div>
      </div>
      <p style={{ fontSize: '2rem', fontWeight: 800, color: accent, margin: 0, lineHeight: 1 }}>
        {value ?? '—'}
      </p>
      {desc && <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.375rem' }}>{desc}</p>}
    </div>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr style={{ borderTop: '1px solid #f3f4f6' }}>
      {[1,2,3,4,5,6].map((i) => (
        <td key={i} style={{ padding: '0.875rem 1rem' }}>
          <div style={{ height: '0.875rem', borderRadius: '0.25rem', background: '#e5e7eb', width: i === 1 ? '3rem' : i === 3 ? '80%' : '60%' }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Format tanggal ───────────────────────────────────────────────────────────
function fmtTgl(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Filter bar ───────────────────────────────────────────────────────────────
const FILTER_STATUS = ['semua', 'pending', 'diproses', 'selesai'];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LaporanKendalaPage({ user }) {
  const [tiketList,    setTiketList   ] = useState([]);
  const [stats,        setStats       ] = useState(null);
  const [loading,      setLoading     ] = useState(true);
  const [error,        setError       ] = useState('');
  const [selectedTiket,setSelected    ] = useState(null);
  const [filterStatus, setFilterStatus] = useState('semua');
  const [search,       setSearch      ] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/admin/laporan-kendala');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTiketList(data.tiket || []);
      setStats(data.stats);
    } catch (e) {
      setError(e.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filter + search ───────────────────────────────────────────────────────
  const displayed = tiketList.filter((t) => {
    const matchStatus = filterStatus === 'semua' || t.status === filterStatus;
    const q           = search.toLowerCase();
    const matchSearch = !q ||
      t.user?.nama?.toLowerCase().includes(q)   ||
      t.deskripsi?.toLowerCase().includes(q)    ||
      t.beasiswa?.judul?.toLowerCase().includes(q) ||
      String(t.laporanId).includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <>
      <Head>
        <title>Laporan Kendala · BantuBeasiswa Admin</title>
        <meta name="description" content="Halaman admin untuk mengelola laporan kendala dari mahasiswa." />
      </Head>

      <AdminLayout user={user}>

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-7 rounded-full" style={{ background: C.gold }} />
            <h1 className="text-2xl font-extrabold" style={{ color: C.dark }}>Laporan Kendala</h1>
          </div>
          <p className="text-sm ml-4" style={{ color: '#6b7280' }}>
            Kelola tiket laporan kendala yang dikirimkan oleh mahasiswa
          </p>
        </div>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg mb-6 text-sm"
            style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c' }} role="alert">
            <span>⚠</span>
            <p>{error}</p>
          </div>
        )}

        {/* ── Stat Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <StatCard
            icon="🎫" label="Total Tiket Aktif"
            value={stats?.totalAktif ?? (loading ? '…' : 0)}
            accent={C.red}
            desc="Status open — belum ditangani"
          />
          <StatCard
            icon="⏱" label="Rata-rata Penyelesaian"
            value={stats?.avgJam != null ? `${stats.avgJam} jam` : '—'}
            accent={C.blue}
            desc="Dari tiket yang sudah resolved"
          />
          <StatCard
            icon="🚨" label="Tiket Urgent"
            value={stats?.totalUrgent ?? (loading ? '…' : 0)}
            accent={C.orange}
            desc="Open lebih dari 24 jam"
          />
        </div>

        {/* ── Filter + Search bar ───────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Status filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_STATUS.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: '0.375rem 0.875rem', borderRadius: '9999px',
                  fontSize: '0.78rem', fontWeight: 600, border: '1.5px solid',
                  cursor: 'pointer', transition: 'all 0.15s',
                  borderColor : filterStatus === s ? C.blue : '#d1d5db',
                  background  : filterStatus === s ? '#eff6ff' : C.white,
                  color       : filterStatus === s ? C.blue : '#6b7280',
                }}
              >
                {s === 'semua' ? 'Semua' : STATUS_CFG[s]?.label || s}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <svg style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', width: '0.9rem', height: '0.9rem', color: '#9ca3af' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tiket, pelapor, beasiswa…"
              style={{
                paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.4375rem', paddingBottom: '0.4375rem',
                fontSize: '0.8125rem', borderRadius: '0.625rem', border: '1.5px solid #d1d5db',
                outline: 'none', width: '14rem', color: C.dark, background: C.white,
              }}
              onFocus={(e) => (e.target.style.borderColor = C.blue)}
              onBlur={(e)  => (e.target.style.borderColor = '#d1d5db')}
            />
          </div>
        </div>

        {/* ── Tabel tiket ──────────────────────────────────────────────── */}
        <div style={{ background: C.white, borderRadius: '0.875rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Ticket ID', 'Pelapor', 'Subject', 'Beasiswa', 'Status', 'Tanggal'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '0.75rem 1rem',
                      fontSize: '0.72rem', fontWeight: 700, color: '#6b7280',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? [1,2,3,4].map((i) => <SkeletonRow key={i} />)
                  : displayed.length === 0
                    ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                          <p style={{ fontWeight: 500 }}>Tidak ada tiket ditemukan</p>
                        </td>
                      </tr>
                    )
                    : displayed.map((t, idx) => {
                      const isUrgent = ['pending', 'diproses'].includes(t.status) &&
                        (Date.now() - new Date(t.tanggalLapor).getTime()) > 86400000;
                      return (
                        <tr
                          key={t.laporanId}
                          id={`tiket-row-${t.laporanId}`}
                          onClick={() => setSelected(t)}
                          style={{
                            borderTop: '1px solid #f3f4f6',
                            background: idx % 2 === 1 ? '#f9fafb' : C.white,
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 1 ? '#f9fafb' : C.white)}
                        >
                          {/* Ticket ID */}
                          <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 700, color: C.blue, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                              #{String(t.laporanId).padStart(4, '0')}
                            </span>
                            {isUrgent && (
                              <span style={{ marginLeft: '0.375rem', fontSize: '0.7rem', background: '#fee2e2', color: C.red, padding: '0.1rem 0.375rem', borderRadius: '9999px', fontWeight: 700 }}>
                                URGENT
                              </span>
                            )}
                          </td>
                          {/* Pelapor */}
                          <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap' }}>
                            <p style={{ fontWeight: 600, color: C.dark, margin: 0 }}>{t.user?.nama || '—'}</p>
                            <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: 0 }}>{t.user?.email || ''}</p>
                          </td>
                          {/* Subject */}
                          <td style={{ padding: '0.875rem 1rem', maxWidth: '16rem' }}>
                            <p style={{ margin: 0, color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.deskripsi?.slice(0, 60)}{t.deskripsi?.length > 60 ? '…' : ''}
                            </p>
                          </td>
                          {/* Beasiswa */}
                          <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap', color: '#4b5563' }}>
                            {t.beasiswa?.judul || '—'}
                          </td>
                          {/* Status */}
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <StatusBadge status={t.status} />
                          </td>
                          {/* Tanggal */}
                          <td style={{ padding: '0.875rem 1rem', whiteSpace: 'nowrap', color: '#6b7280', fontSize: '0.8125rem' }}>
                            {fmtTgl(t.tanggalLapor)}
                          </td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          {!loading && (
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0 }}>
                Menampilkan <strong style={{ color: C.dark }}>{displayed.length}</strong> dari <strong style={{ color: C.dark }}>{tiketList.length}</strong> tiket
              </p>
              <button
                onClick={fetchData}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  fontSize: '0.78rem', fontWeight: 600, color: C.blue,
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          )}
        </div>

      </AdminLayout>

      {/* ── Detail Panel (rendered outside layout untuk stacking context) ── */}
      <TiketDetailPanel
        tiket={selectedTiket}
        onClose={() => setSelected(null)}
        onUpdated={() => {
          setSelected(null);
          fetchData();
        }}
      />
    </>
  );
}

export async function getServerSideProps(context) {
  return withAuth(context, 'admin');
}
