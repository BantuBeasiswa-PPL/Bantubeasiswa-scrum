import { useEffect, useState } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/layouts/AdminLayout';
import { withAuth } from '../../lib/auth';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  blue  : '#0056b3',
  gold  : '#ffc107',
  dark  : '#333333',
  light : '#f8f9fa',
  white : '#ffffff',
};

// ─── Summary Card Config ──────────────────────────────────────────────────────
const CARD_CONFIG = [
  {
    key     : 'totalBeasiswa',
    label   : 'Total Beasiswa Aktif',
    icon    : '🎓',
    desc    : 'Beasiswa dengan status aktif',
    accentColor: C.blue,
  },
  {
    key     : 'totalPendaftar',
    label   : 'Total Pendaftar',
    icon    : '📋',
    desc    : 'Cumulative semua pendaftaran',
    accentColor: '#7c3aed',
  },
  {
    key     : 'totalPendonor',
    label   : 'Mitra Pendonor',
    icon    : '🏢',
    desc    : 'Pendonor terdaftar di platform',
    accentColor: '#059669',
  },
  {
    key     : 'totalWilayah3T',
    label   : 'Wilayah 3T Terdaftar',
    icon    : '🗺️',
    desc    : 'Wilayah terdepan, terluar, tertinggal',
    accentColor: '#d97706',
  },
];

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-xl p-5 border animate-pulse"
      style={{
        backgroundColor: C.white,
        borderColor    : '#e5e7eb',
        borderTopWidth : '4px',
        borderTopColor : '#e5e7eb',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="w-10 h-10 rounded-lg bg-gray-200" />
      </div>
      <div className="h-9 w-20 rounded bg-gray-200 mb-2" />
      <div className="h-3 w-40 rounded bg-gray-100" />
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ config, value }) {
  return (
    <div
      className="rounded-xl p-5 border transition-shadow duration-200 hover:shadow-md"
      style={{
        backgroundColor: C.white,
        borderColor    : '#e5e7eb',
        borderTopWidth : '4px',
        borderTopColor : config.accentColor,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold" style={{ color: '#6b7280' }}>
          {config.label}
        </p>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: `${config.accentColor}18` }}
        >
          {config.icon}
        </div>
      </div>

      <p
        className="text-4xl font-extrabold tabular-nums leading-none mb-1"
        style={{ color: config.accentColor }}
      >
        {value.toLocaleString('id-ID')}
      </p>
      <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
        {config.desc}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage({ user }) {
  const [stats,  setStats ] = useState(null);
  const [error,  setError ] = useState('');
  const [loading, setLoading] = useState(true);

  // Ambil data statistik dari API
  useEffect(() => {
    async function fetchStats() {
      try {
        const res  = await fetch('/api/admin/stats');
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || 'Gagal memuat data statistik.');
          return;
        }
        setStats(data);
      } catch {
        setError('Terjadi kesalahan jaringan. Coba refresh halaman.');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <>
      <Head>
        <title>Dashboard Statistik · BantuBeasiswa Admin</title>
        <meta name="description" content="Dashboard statistik platform BantuBeasiswa untuk administrator." />
      </Head>

      <AdminLayout user={user}>
        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-1 h-7 rounded-full"
              style={{ backgroundColor: C.gold }}
            />
            <h1 className="text-2xl font-extrabold" style={{ color: C.dark }}>
              Dashboard Statistik
            </h1>
          </div>
          <p className="text-sm ml-4" style={{ color: '#6b7280' }}>
            Ringkasan performa platform BantuBeasiswa secara keseluruhan
          </p>
        </div>

        {/* ── Error State ──────────────────────────────────────────────── */}
        {error && !loading && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-lg mb-6 text-sm"
            style={{
              backgroundColor: '#fff1f2',
              border         : '1px solid #fecdd3',
              color          : '#be123c',
            }}
            role="alert"
          >
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold">Gagal memuat data</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Summary Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {loading
            ? CARD_CONFIG.map((c) => <SkeletonCard key={c.key} />)
            : CARD_CONFIG.map((c) => (
                <SummaryCard
                  key={c.key}
                  config={c}
                  value={stats?.[c.key] ?? 0}
                />
              ))}
        </div>

        {/* ── Placeholder Section: bisa diisi chart / tabel berikutnya ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Recent Activity placeholder */}
          <div
            className="lg:col-span-2 rounded-xl border p-5"
            style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-base" style={{ color: C.dark }}>
                Aktivitas Terbaru
              </h2>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: '#e8f0fb', color: C.blue }}
              >
                Coming soon
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-sm font-medium" style={{ color: '#6b7280' }}>
                Tabel aktivitas pendaftaran akan ditampilkan di sini
              </p>
              <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                Fitur ini sedang dalam pengembangan
              </p>
            </div>
          </div>

          {/* Quick Stats / Distribusi placeholder */}
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-base" style={{ color: C.dark }}>
                Distribusi Status
              </h2>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: '#e8f0fb', color: C.blue }}
              >
                Coming soon
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="text-4xl mb-3">🥧</div>
              <p className="text-sm font-medium" style={{ color: '#6b7280' }}>
                Chart distribusi status pendaftaran
              </p>
              <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                (Recharts — segera hadir)
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

// ─── SSR Guard ───────────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  return withAuth(context, 'admin');
}
