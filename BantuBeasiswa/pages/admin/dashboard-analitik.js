import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import AdminLayout from '../../components/layouts/AdminLayout';
import { withAuth } from '../../lib/auth';
import { supabase } from '../../lib/db';

// ─── Dynamic import recharts (no SSR — recharts depends on DOM) ──────────────
const RechartsBarChart = dynamic(
  () =>
    import('recharts').then((mod) => {
      // Return a wrapper component that uses the recharts primitives
      const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } = mod;

      function Chart({ data }) {
        // Color palette per category
        const BAR_COLORS = {
          Terdepan: '#2563eb',
          Terluar: '#0ea5e9',
          Tertinggal: '#6366f1',
        };

        const CustomTooltip = ({ active, payload, label }) => {
          if (!active || !payload?.length) return null;
          return (
            <div style={{
              background: '#1e293b', color: '#f8fafc',
              padding: '10px 16px', borderRadius: 10,
              fontSize: 13, fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <p style={{ marginBottom: 4, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Kategori Wilayah
              </p>
              <p style={{ fontSize: 15, marginBottom: 2 }}>{label}</p>
              <p style={{ color: '#60a5fa', fontSize: 20, fontWeight: 800 }}>
                {payload[0].value.toLocaleString('id-ID')} <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>pendaftar</span>
              </p>
            </div>
          );
        };

        return (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="barGradient_terdepan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="barGradient_terluar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="barGradient_tertinggal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="kategori"
                tick={{ fontSize: 13, fontWeight: 600, fill: '#374151' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
              <Bar dataKey="jumlah" radius={[8, 8, 0, 0]} maxBarSize={80}>
                {data.map((entry) => (
                  <Cell
                    key={entry.kategori}
                    fill={`url(#barGradient_${entry.kategori.toLowerCase()})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }

      return Chart;
    }),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb',
        color: '#6b7280', fontSize: 14,
      }}>
        📊 Memuat chart...
      </div>
    ),
  }
);

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  blue: '#0056b3',
  blue_light: '#3b82f6',
  green: '#059669',
  gold: '#d97706',
  dark: '#1e293b',
  white: '#ffffff',
  red: '#dc2626',
  gray: '#6b7280',
  gray_light: '#f3f4f6',
  purple: '#7c3aed',
  cyan: '#0891b2',
  indigo: '#4f46e5',
};

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub, loading }) {
  return (
    <div
      id={`stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
      style={{
        background: C.white,
        border: '1px solid #e5e7eb',
        borderTop: `4px solid ${color}`,
        borderRadius: 12,
        padding: '20px 22px',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: C.gray, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        <span style={{
          fontSize: 20, background: `${color}18`, borderRadius: 10,
          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{icon}</span>
      </div>
      <p style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>
        {loading ? (
          <span style={{
            display: 'inline-block', width: 60, height: 32, borderRadius: 6,
            background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }} />
        ) : value}
      </p>
      {sub && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{sub}</p>}
    </div>
  );
}

// ─── Legend badge ──────────────────────────────────────────────────────────────
function LegendBadge({ color, label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: `${color}10`, border: `1px solid ${color}30`,
      borderRadius: 20, padding: '6px 14px',
    }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{label}</span>
      {value !== undefined && (
        <span style={{ fontSize: 12, fontWeight: 800, color }}>{value}</span>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardAnalitikPage({ user }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ totalBeasiswaAktif: 0, totalPendaftar: 0, persen3T: 0 });
  const [chartData, setChartData] = useState([]);

  // PBI-20 state
  const [metricsData, setMetricsData] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Beasiswa aktif count
      const { count: totalBeasiswaAktif, error: e1 } = await supabase
        .from('beasiswa')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aktif');

      if (e1) throw new Error(`Gagal hitung beasiswa aktif: ${e1.message}`);

      // 2. Total pendaftar count
      const { count: totalPendaftar, error: e2 } = await supabase
        .from('pendaftaran')
        .select('*', { count: 'exact', head: true });

      if (e2) throw new Error(`Gagal hitung pendaftar: ${e2.message}`);

      // 3. Query wilayah 3T → beasiswa_wilayah → beasiswa → pendaftaran
      //    Reversed direction: start from 3T wilayah, find beasiswa targeting them,
      //    then count pendaftaran for those beasiswa.
      const { data: wilayah3T, error: e3 } = await supabase
        .from('wilayah')
        .select(`
          wilayahId,
          jenis_3t,
          is3T,
          beasiswa_wilayah (
            beasiswaId
          )
        `)
        .eq('is3T', true);

      if (e3) throw new Error(`Gagal ambil data wilayah 3T: ${e3.message}`);

      // Collect unique beasiswaIds per jenis_3t category
      const beasiswaPerKategori = { Terdepan: new Set(), Terluar: new Set(), Tertinggal: new Set() };
      (wilayah3T || []).forEach((w) => {
        const kat = w.jenis_3t;
        if (!kat || !beasiswaPerKategori[kat]) return;
        const bwList = w.beasiswa_wilayah;
        if (!Array.isArray(bwList)) return;
        bwList.forEach((bw) => {
          if (bw.beasiswaId) beasiswaPerKategori[kat].add(bw.beasiswaId);
        });
      });

      // Fetch all pendaftaran once
      const { data: allPendaftaran, error: e4 } = await supabase
        .from('pendaftaran')
        .select('pendaftaranId, beasiswaId');

      if (e4) throw new Error(`Gagal ambil data pendaftaran: ${e4.message}`);

      // 4. Client-side aggregation: count pendaftar per jenis_3t category
      const kategoriCount = { Terdepan: 0, Terluar: 0, Tertinggal: 0 };
      const countedPerKategori = { Terdepan: new Set(), Terluar: new Set(), Tertinggal: new Set() };

      (allPendaftaran || []).forEach((p) => {
        Object.entries(beasiswaPerKategori).forEach(([kat, beasiswaIds]) => {
          if (beasiswaIds.has(p.beasiswaId) && !countedPerKategori[kat].has(p.pendaftaranId)) {
            countedPerKategori[kat].add(p.pendaftaranId);
            kategoriCount[kat]++;
          }
        });
      });

      // Count unique 3T pendaftar (a pendaftar counts once even if linked to multiple 3T categories)
      const all3TIds = new Set([
        ...countedPerKategori.Terdepan,
        ...countedPerKategori.Terluar,
        ...countedPerKategori.Tertinggal,
      ]);
      const totalPendaftar3T = all3TIds.size;

      // 5. Build chart data
      const barData = [
        { kategori: 'Terdepan', jumlah: kategoriCount.Terdepan },
        { kategori: 'Terluar', jumlah: kategoriCount.Terluar },
        { kategori: 'Tertinggal', jumlah: kategoriCount.Tertinggal },
      ];

      // 6. 3T priority fulfillment %
      const persen3T = totalPendaftar > 0
        ? parseFloat(((totalPendaftar3T / totalPendaftar) * 100).toFixed(1))
        : 0;

      setStats({
        totalBeasiswaAktif: totalBeasiswaAktif ?? 0,
        totalPendaftar: totalPendaftar ?? 0,
        persen3T,
        totalPendaftar3T,
      });
      setChartData(barData);
    } catch (err) {
      console.error('[DashboardAnalitik]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Fetch regional metrics via RPC (PBI-20) ────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('get_regional_metrics');
      if (rpcErr) throw new Error(`RPC error: ${rpcErr.message}`);
      setMetricsData(data || []);
    } catch (err) {
      console.error('[fetchMetrics]', err);
      setMetricsError(err.message);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  // ── Export CSV helper (PBI-20) ─────────────────────────────────────────────
  function exportCSV() {
    if (!metricsData.length) return;
    const headers = ['Wilayah', 'Provinsi', 'Tipe', 'Jenis 3T', '3T', 'Afirmasi', 'Total Pendaftar', 'Total Dana (Rp)'];
    const rows = metricsData.map((r) => [
      `"${r.wilayah_nama}"`,
      `"${r.provinsi_nama ?? ''}"`,
      `"${r.tipe}"`,
      `"${r.jenis_3t ?? '-'}"`,
      r.is_3t ? 'Ya' : 'Tidak',
      r.is_afirmasi ? 'Ya' : 'Tidak',
      r.total_pendaftar,
      r.total_dana,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regional_metrics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Dashboard Analitik · BantuBeasiswa Admin</title>
        <meta name="description" content="Visualisasi distribusi pendaftar beasiswa berdasarkan kategori wilayah 3T (Terdepan, Terluar, Tertinggal)." />
      </Head>

      <AdminLayout user={user}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 4, height: 28, borderRadius: 4, background: 'linear-gradient(180deg, #3b82f6, #6366f1)' }} />
            <h1 id="page-title" style={{ fontSize: 22, fontWeight: 800, color: C.dark }}>
              Dashboard Analitik Wilayah
            </h1>
          </div>
          <p style={{ fontSize: 13, color: C.gray, marginLeft: 14 }}>
            Visualisasi distribusi pendaftar beasiswa berdasarkan kategori wilayah 3T
          </p>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            background: '#fff1f2', border: '1px solid #fecdd3',
            borderRadius: 10, padding: '12px 16px', color: C.red,
            fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            {error}
          </div>
        )}

        {/* ── 3 Stat Cards ──────────────────────────────────────────────── */}
        <div id="stat-cards-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 18, marginBottom: 28,
        }}>
          <StatCard
            label="Total Beasiswa Aktif"
            value={stats.totalBeasiswaAktif.toLocaleString('id-ID')}
            icon="🎓"
            color={C.blue}
            sub="Beasiswa dengan status aktif saat ini"
            loading={loading}
          />
          <StatCard
            label="Total Pendaftar"
            value={stats.totalPendaftar.toLocaleString('id-ID')}
            icon="📋"
            color={C.purple}
            sub="Kumulatif semua pendaftaran beasiswa"
            loading={loading}
          />
          <StatCard
            label="3T Priority Fulfillment"
            value={loading ? '…' : `${stats.persen3T}%`}
            icon="🎯"
            color={stats.persen3T >= 50 ? C.green : C.gold}
            sub={loading ? '' : `${stats.totalPendaftar3T} dari ${stats.totalPendaftar} pendaftar berasal dari wilayah 3T`}
            loading={loading}
          />
        </div>

        {/* ── Bar Chart: Distribusi Pendaftar per Kategori Wilayah ───── */}
        <div id="chart-distribusi-wilayah" style={{
          background: C.white, border: '1px solid #e5e7eb',
          borderRadius: 14, overflow: 'hidden', marginBottom: 28,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          {/* Chart Header */}
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: C.dark, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>📊</span>
                Distribusi Pendaftar per Kategori Wilayah 3T
              </h2>
              <p style={{ fontSize: 12, color: C.gray, marginTop: 4 }}>
                Jumlah pendaftar beasiswa yang terhubung ke wilayah Terdepan, Terluar, dan Tertinggal
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <LegendBadge color="#2563eb" label="Terdepan" value={loading ? '…' : chartData[0]?.jumlah} />
              <LegendBadge color="#0ea5e9" label="Terluar" value={loading ? '…' : chartData[1]?.jumlah} />
              <LegendBadge color="#6366f1" label="Tertinggal" value={loading ? '…' : chartData[2]?.jumlah} />
            </div>
          </div>

          {/* Chart Body */}
          <div style={{ padding: '24px 20px 16px' }}>
            {loading ? (
              <div style={{
                height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, border: '3px solid #e5e7eb',
                  borderTop: '3px solid #3b82f6', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <span style={{ fontSize: 13, color: C.gray }}>Memuat data chart…</span>
              </div>
            ) : (
              <RechartsBarChart data={chartData} />
            )}
          </div>

          {/* Chart Footer */}
          <div style={{
            padding: '12px 24px', borderTop: '1px solid #f3f4f6',
            background: '#fafbfc', fontSize: 12, color: C.gray,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 14 }}>💡</span>
            Data di-aggregate dari tabel <strong style={{ margin: '0 2px' }}>pendaftaran</strong> →
            <strong style={{ margin: '0 2px' }}>beasiswa</strong> →
            <strong style={{ margin: '0 2px' }}>beasiswa_wilayah</strong> →
            <strong style={{ margin: '0 2px' }}>wilayah</strong> (GROUP BY jenis_3t secara client-side)
          </div>
        </div>

        {/* ── PBI-20: Detailed Regional Metrics Table ─────────────────── */}
        <div id="regional-metrics-table" style={{
          background: C.white, border: '1px solid #e5e7eb',
          borderRadius: 14, overflow: 'hidden', marginBottom: 28,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>

          {/* Table Header */}
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: C.dark, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🗂️</span>
                Detailed Regional Metrics
              </h2>
              <p style={{ fontSize: 12, color: C.gray, marginTop: 4 }}>
                Data wilayah 3T &amp; Afirmasi — pendaftar &amp; dana tersalurkan per daerah
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                background: '#eff6ff', color: C.blue_light,
                border: '1px solid #bfdbfe', borderRadius: 20,
                padding: '4px 14px', fontSize: 12, fontWeight: 700,
              }}>
                {metricsLoading ? '…' : `${metricsData.length} wilayah`}
              </span>
              <button
                id="btn-export-csv"
                onClick={exportCSV}
                disabled={metricsLoading || !metricsData.length}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: metricsData.length ? C.blue : '#e5e7eb',
                  color: metricsData.length ? C.white : C.gray,
                  border: 'none', borderRadius: 8,
                  padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  cursor: metricsData.length ? 'pointer' : 'not-allowed',
                  transition: 'opacity 0.2s, transform 0.15s',
                }}
                onMouseEnter={(e) => { if (metricsData.length) e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                ⬇️ Export CSV
              </button>
            </div>
          </div>

          {/* Table Error */}
          {metricsError && (
            <div style={{
              margin: '12px 24px', background: '#fff1f2',
              border: '1px solid #fecdd3', borderRadius: 8,
              padding: '10px 14px', color: C.red, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>⚠️</span> {metricsError}
            </div>
          )}

          {/* Table Body */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e2e8f0' }}>
                  {['Region Name', 'Provinsi', 'Classification', 'Total Applicants', 'Allocated Funds', 'Status'].map((h) => (
                    <th key={h} style={{
                      padding: '11px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: '#374151',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metricsLoading ? (
                  // Skeleton rows
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} style={{ padding: '13px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            width: j === 0 ? 120 : j === 3 ? 60 : 80,
                            height: 14, borderRadius: 6,
                            background: 'linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite',
                          }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : metricsData.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div style={{
                        padding: '48px 24px', textAlign: 'center',
                        color: C.gray, display: 'flex',
                        flexDirection: 'column', alignItems: 'center', gap: 10,
                      }}>
                        <span style={{ fontSize: 48, opacity: 0.25 }}>🗂️</span>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Belum ada data wilayah 3T / Afirmasi</p>
                        <p style={{ fontSize: 12 }}>Pastikan wilayah sudah diisi dengan is_3t atau is_afirmasi = true</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  metricsData.map((row) => {
                    const isExpanded = expandedRow === row.wilayah_id;
                    const danaPerPendaftar = row.total_pendaftar > 0
                      ? Math.round(row.total_dana / row.total_pendaftar)
                      : 0;
                    // Classification badge config
                    const badgeCfg = row.jenis_3t
                      ? { label: row.jenis_3t, bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }
                      : row.is_afirmasi
                        ? { label: 'Afirmasi', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' }
                        : { label: row.tipe, bg: '#f9fafb', color: C.gray, border: '#e5e7eb' };

                    return (
                      <>
                        <tr
                          key={row.wilayah_id}
                          id={`metrics-row-${row.wilayah_id}`}
                          onClick={() => setExpandedRow(isExpanded ? null : row.wilayah_id)}
                          style={{
                            borderBottom: isExpanded ? 'none' : '1px solid #f3f4f6',
                            background: isExpanded ? '#f0f9ff' : C.white,
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = C.white; }}
                        >
                          {/* Region Name */}
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: C.dark, whiteSpace: 'nowrap' }}>
                            <span style={{ marginRight: 8, fontSize: 11, color: C.gray }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                            {row.wilayah_nama}
                          </td>
                          {/* Provinsi */}
                          <td style={{ padding: '12px 16px', color: C.gray, fontSize: 12, whiteSpace: 'nowrap' }}>
                            {row.provinsi_nama ?? '—'}
                          </td>
                          {/* Classification badge */}
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              background: badgeCfg.bg, color: badgeCfg.color,
                              border: `1px solid ${badgeCfg.border}`,
                              borderRadius: 20, padding: '3px 10px',
                              fontSize: 11, fontWeight: 700,
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: badgeCfg.color }} />
                              {badgeCfg.label}
                              {row.is_3t && row.is_afirmasi && (
                                <span style={{
                                  marginLeft: 4, background: '#fefce8', color: '#854d0e',
                                  border: '1px solid #fde68a', borderRadius: 10,
                                  padding: '1px 6px', fontSize: 10,
                                }}>+Afirmasi</span>
                              )}
                            </span>
                          </td>
                          {/* Total Applicants */}
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: C.dark, textAlign: 'right' }}>
                            {Number(row.total_pendaftar).toLocaleString('id-ID')}
                          </td>
                          {/* Allocated Funds */}
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: C.green, textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {row.total_dana > 0
                              ? `Rp ${Number(row.total_dana).toLocaleString('id-ID')}`
                              : <span style={{ color: '#d1d5db', fontWeight: 400 }}>—</span>}
                          </td>
                          {/* Status badge */}
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              background: '#f0fdf4', color: '#166534',
                              border: '1px solid #bbf7d0',
                              borderRadius: 20, padding: '3px 10px',
                              fontSize: 11, fontWeight: 700,
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
                              Aktif
                            </span>
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {isExpanded && (
                          <tr key={`${row.wilayah_id}-detail`} style={{ borderBottom: '1px solid #f3f4f6', background: '#f0f9ff' }}>
                            <td colSpan={6} style={{ padding: '0 16px 16px 40px' }}>
                              <div style={{
                                display: 'flex', gap: 24, flexWrap: 'wrap',
                                padding: '14px 20px',
                                background: C.white, borderRadius: 10,
                                border: '1px solid #bfdbfe',
                                boxShadow: '0 2px 8px rgba(59,130,246,0.06)',
                              }}>
                                <div>
                                  <p style={{ fontSize: 11, color: C.gray, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Regional ID</p>
                                  <p style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>#{row.wilayah_id}</p>
                                </div>
                                <div>
                                  <p style={{ fontSize: 11, color: C.gray, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Tipe Wilayah</p>
                                  <p style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{row.tipe}</p>
                                </div>
                                <div>
                                  <p style={{ fontSize: 11, color: C.gray, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Jenis 3T</p>
                                  <p style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{row.jenis_3t ?? '—'}</p>
                                </div>
                                <div>
                                  <p style={{ fontSize: 11, color: C.gray, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Dana / Pendaftar</p>
                                  <p style={{ fontSize: 15, fontWeight: 700, color: C.green }}>
                                    {danaPerPendaftar > 0 ? `Rp ${danaPerPendaftar.toLocaleString('id-ID')}` : '—'}
                                  </p>
                                </div>
                                <div>
                                  <p style={{ fontSize: 11, color: C.gray, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Flag</p>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {row.is_3t && (
                                      <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>3T</span>
                                    )}
                                    {row.is_afirmasi && (
                                      <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>Afirmasi</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {!metricsLoading && metricsData.length > 0 && (
            <div style={{
              padding: '12px 24px', borderTop: '1px solid #f3f4f6',
              background: '#fafbfc', fontSize: 12, color: C.gray,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 14 }}>💡</span>
              Data via RPC <strong style={{ margin: '0 2px' }}>get_regional_metrics()</strong> —
              JOIN 5 tabel: wilayah, beasiswa_wilayah, beasiswa, pendaftaran, penyaluran_dana.
              Klik baris untuk detail. Total: <strong style={{ marginLeft: 4 }}>{metricsData.length} wilayah</strong>
            </div>
          )}
        </div>

        {/* Shimmer + spin + pulse animation */}
        <style>{`
          @keyframes shimmer {
            0%   { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>

      </AdminLayout>
    </>
  );
}

export async function getServerSideProps(context) {
  return withAuth(context, 'admin');
}
