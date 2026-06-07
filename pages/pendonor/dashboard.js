import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PendonorLayout from '../../components/layouts/PendonorLayout';
import { withPendonorAuth } from '../../lib/auth';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  blue : '#0056b3',
  gold : '#ffc107',
  dark : '#333333',
  light: '#f8f9fa',
  white: '#ffffff',
};


// ─── Badge Tahap Seleksi ──────────────────────────────────────────────────────
const TAHAP_STYLE = {
  TERDAFTAR: { bg: '#eff6ff', color: '#1d4ed8', label: 'Terdaftar'  },
  EXAM      : { bg: '#ede9fe', color: '#7c3aed', label: 'Ujian'      },
  REVIEW    : { bg: '#fefce8', color: '#a16207', label: 'Review'     },
  TOLAK     : { bg: '#fee2e2', color: '#b91c1c', label: 'Ditolak'    },
  DITERIMA  : { bg: '#d1fae5', color: '#065f46', label: 'Diterima'   },
  DITOLAK   : { bg: '#fee2e2', color: '#b91c1c', label: 'Ditolak'    },
  LULUS     : { bg: '#d1fae5', color: '#065f46', label: 'Lulus ✓'    },
};

function TahapBadge({ tahap }) {
  const s = TAHAP_STYLE[tahap] || { bg: '#f3f4f6', color: '#374151', label: tahap };
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}




// ─── Summary Card ─────────────────────────────────────────────────────────────
const CARD_CONFIG = [
  {
    key   : 'totalDana',
    label : 'Total Dana Tersalurkan',
    icon  : '💰',
    accent: '#059669',
    format: (v) =>
      'Rp ' +
      v.toLocaleString('id-ID', { maximumFractionDigits: 0 }),
    desc  : 'Akumulasi dana yang sudah disalurkan',
  },
  {
    key   : 'totalPendaftar',
    label : 'Total Pendaftar',
    icon  : '👥',
    accent: C.blue,
    format: (v) => v.toLocaleString('id-ID'),
    desc  : 'Dari seluruh program Anda',
  },
  {
    key   : 'programAktif',
    label : 'Program Aktif',
    icon  : '🎓',
    accent: '#7c3aed',
    format: (v) => v.toLocaleString('id-ID'),
    desc  : 'Beasiswa berstatus aktif',
  },
  {
    key   : 'kuotaTersisa',
    label : 'Kuota Tersisa',
    icon  : '📊',
    accent: '#d97706',
    format: (v) => v.toLocaleString('id-ID'),
    desc  : 'Slot belum terisi dari total kuota',
  },
];

function SummaryCard({ config, value }) {
  return (
    <div
      className="rounded-xl p-5 border transition-shadow duration-200 hover:shadow-md"
      style={{
        backgroundColor: C.white,
        borderColor    : '#e5e7eb',
        borderTopWidth : '4px',
        borderTopColor : config.accent,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>
          {config.label}
        </p>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: `${config.accent}18` }}
        >
          {config.icon}
        </div>
      </div>
      <p
        className="text-3xl font-extrabold tabular-nums leading-none mb-1"
        style={{ color: config.accent }}
      >
        {config.format(value)}
      </p>
      <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
        {config.desc}
      </p>
    </div>
  );
}

// ─── Kuota Bar ────────────────────────────────────────────────────────────────
function KuotaBar({ isi, total }) {
  const pct = total > 0 ? Math.round((isi / total) * 100) : 0;
  const barColor =
    pct >= 100 ? '#059669' : pct >= 60 ? C.blue : C.gold;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium tabular-nums" style={{ color: C.dark, minWidth: 44 }}>
        {isi}/{total}
      </span>
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-xs" style={{ color: '#9ca3af', minWidth: 32 }}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PendonorDashboardPage({ user }) {
  const [stats,    setStats   ] = useState({ totalDana: 0, totalPendaftar: 0, programAktif: 0, kuotaTersisa: 0 });
  const [programs, setPrograms] = useState([]);
  const [loading,  setLoading ] = useState(true);

  // Data pendonor dari API (user.nama dari JWT sudah berisi statusOrganisasi)
  const [pendonorInfo, setPendonorInfo] = useState({
    nama    : user?.nama || 'Pendonor',
    verified: Boolean(user?.nama),
    kontak  : '',
    alamat  : '',
  });

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);

        // Fetch profil + dashboard sekaligus
        const [profilRes, dashRes] = await Promise.all([
          fetch('/api/pendonor/profil'),
          fetch('/api/pendonor/dashboard'),
        ]);

        if (profilRes.ok) {
          const profil = await profilRes.json();
          setPendonorInfo({
            nama    : profil.statusOrganisasi || user?.nama || 'Pendonor',
            verified: Boolean(profil.statusOrganisasi),
            kontak  : profil.kontak || '',
            alamat  : profil.alamat || '',
          });
        }

        if (dashRes.ok) {
          const dash = await dashRes.json();
          setStats(dash.stats ?? {});
          setPrograms(dash.programs ?? []);
        }
      } catch (err) {
        console.error('[dashboard] fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);


  return (
    <>
      <Head>
        <title>Dashboard Pendonor · BantuBeasiswa</title>
        <meta
          name="description"
          content="Dashboard pengelolaan program beasiswa untuk pendonor BantuBeasiswa."
        />
      </Head>

      <PendonorLayout user={{ ...user, nama: pendonorInfo.nama, role: 'pendonor' }}>

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-7">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className="w-1 h-8 rounded-full shrink-0"
                style={{ backgroundColor: C.gold }}
              />
              <h1 className="text-2xl font-extrabold" style={{ color: C.dark }}>
                {pendonorInfo.nama}
              </h1>
              {pendonorInfo.verified && (
                <span
                  className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: '#d1fae5', color: '#065f46' }}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified
                </span>
              )}
            </div>
            <p className="text-sm mt-1 ml-4" style={{ color: '#6b7280' }}>
              📍 {pendonorInfo.alamat} &nbsp;·&nbsp; 📞 {pendonorInfo.kontak}
            </p>
          </div>

          {/* Tombol Tambah Program */}
          <Link
            href="/pendonor/program"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shrink-0 transition-all hover:shadow-md active:scale-95"
            style={{ backgroundColor: C.blue }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Program
          </Link>
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {loading
            ? [1,2,3,4].map(i => (
                <div key={i} className="rounded-xl p-5 border bg-white animate-pulse" style={{ borderColor: '#e5e7eb' }}>
                  <div className="h-3 w-24 bg-gray-200 rounded mb-4" />
                  <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-28 bg-gray-100 rounded" />
                </div>
              ))
            : CARD_CONFIG.map((c) => (
                <SummaryCard key={c.key} config={c} value={stats[c.key] ?? 0} />
              ))
          }
        </div>

        {/* ── Main Content: Tabel Program Beasiswa Aktif ────────────────── */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}
        >
          {/* Header tabel */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: '#f3f4f6' }}
          >
            <h2 className="font-bold text-base" style={{ color: C.dark }}>
              Program Beasiswa Aktif
            </h2>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ backgroundColor: '#e8f0fb', color: C.blue }}
            >
              {programs.length} program
            </span>
          </div>

          {/* Tabel */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: '#6b7280' }}>Nama Program</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: '#6b7280' }}>Tahap</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: '#6b7280' }}>Pendaftar</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide min-w-40" style={{ color: '#6b7280' }}>Kuota</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3].map(i => (
                    <tr key={i} className="border-t animate-pulse" style={{ borderColor: '#f3f4f6' }}>
                      <td className="px-5 py-4"><div className="h-4 w-48 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-4"><div className="h-5 w-16 bg-gray-100 rounded-full" /></td>
                      <td className="px-4 py-4 text-right"><div className="h-4 w-8 bg-gray-200 rounded ml-auto" /></td>
                      <td className="px-4 py-4"><div className="h-3 w-full bg-gray-100 rounded-full" /></td>
                    </tr>
                  ))
                ) : programs.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-sm" style={{ color: '#9ca3af' }}>Belum ada program beasiswa. Klik + Tambah Program untuk mulai.</td></tr>
                ) : (
                  programs.map((prog, idx) => (
                    <tr
                      key={prog.beasiswaId}
                      className="border-t transition-colors hover:bg-blue-50"
                      style={{ borderColor: '#f3f4f6', backgroundColor: idx % 2 === 1 ? '#f9fafb' : C.white }}
                    >
                      <td className="px-5 py-3.5"><p className="font-medium leading-snug" style={{ color: C.dark }}>{prog.judul}</p></td>
                      <td className="px-4 py-3.5"><TahapBadge tahap={prog.tahap} /></td>
                      <td className="px-4 py-3.5 text-right"><span className="font-semibold tabular-nums" style={{ color: C.blue }}>{(prog.pendaftar ?? 0).toLocaleString('id-ID')}</span></td>
                      <td className="px-4 py-3.5"><KuotaBar isi={prog.kuotaIsi ?? 0} total={prog.kuotaTotal ?? 0} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer tabel */}
          <div
            className="px-5 py-3 flex justify-end border-t"
            style={{ borderColor: '#f3f4f6' }}
          >
            <Link
              href="/pendonor/program"
              className="text-xs font-semibold transition-colors"
              style={{ color: C.blue }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.gold)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.blue)}
            >
              Lihat semua program →
            </Link>
          </div>
        </div>

      </PendonorLayout>
    </>
  );
}

// ─── SSR Guard ────────────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  return withPendonorAuth(context);
}
