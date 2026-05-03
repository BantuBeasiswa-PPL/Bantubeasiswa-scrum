import { useState } from 'react';
import Head from 'next/head';
import PendonorLayout from '../../components/layouts/PendonorLayout';
import { withAuth } from '../../lib/auth';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  blue : '#0056b3',
  gold : '#ffc107',
  dark : '#333333',
  light: '#f8f9fa',
  white: '#ffffff',
};

// ─── Dummy Data (ganti dengan fetch API saat backend siap) ────────────────────
const DUMMY_STATS = {
  totalDana      : 700000000,
  totalPendaftar : 84,
  programAktif   : 3,
  kuotaTersisa   : 67,
};

const DUMMY_PROGRAMS = [
  {
    id          : 1,
    nama        : 'Beasiswa Prestasi Nusantara 2026',
    tahap       : 'REVIEW',
    pendaftar   : 42,
    kuotaIsi    : 25,
    kuotaTotal  : 50,
  },
  {
    id          : 2,
    nama        : 'Beasiswa Afirmasi Papua 2026',
    tahap       : 'EXAM',
    pendaftar   : 30,
    kuotaIsi    : 10,
    kuotaTotal  : 20,
  },
  {
    id          : 3,
    nama        : 'Beasiswa Wirausaha Muda 2026',
    tahap       : 'TERDAFTAR',
    pendaftar   : 12,
    kuotaIsi    : 0,
    kuotaTotal  : 30,
  },
  {
    id          : 4,
    nama        : 'Beasiswa Inovasi Digital 2026',
    tahap       : 'LULUS',
    pendaftar   : 20,
    kuotaIsi    : 20,
    kuotaTotal  : 20,
  },
];

const DUMMY_ACTIONS = [
  { id: 1, type: 'warning', icon: '📄', text: '14 pendaftar menunggu verifikasi berkas di Beasiswa Prestasi Nusantara.' },
  { id: 2, type: 'info',    icon: '🔍', text: '8 pendaftar sedang dalam tahap EXAM — jadwal ujian belum dikonfirmasi.' },
  { id: 3, type: 'success', icon: '✅', text: 'Laporan penyaluran Afirmasi Papua sudah tersedia untuk diunduh.' },
  { id: 4, type: 'warning', icon: '⏰', text: 'Deadline Beasiswa Wirausaha Muda: 1 September 2026 (138 hari lagi).' },
];

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

// ─── Action type style ────────────────────────────────────────────────────────
const ACTION_STYLE = {
  warning: { border: '#fbbf24', bg: '#fffbeb' },
  info   : { border: '#60a5fa', bg: '#eff6ff' },
  success: { border: '#34d399', bg: '#ecfdf5' },
};

function ActionItem({ item }) {
  const s = ACTION_STYLE[item.type] || ACTION_STYLE.info;
  return (
    <li
      className="flex items-start gap-3 p-3 rounded-lg border-l-4 text-sm"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
      <p style={{ color: C.dark }}>{item.text}</p>
    </li>
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
  // Dummy state — ganti dengan useEffect + fetch saat API siap
  const [stats]    = useState(DUMMY_STATS);
  const [programs] = useState(DUMMY_PROGRAMS);
  const [actions]  = useState(DUMMY_ACTIONS);

  // Data pendonor (idealnya di-fetch berdasarkan user.accountId)
  const pendonorInfo = {
    nama      : 'Yayasan Pendidikan Nusantara',
    verified  : true,
    kontak    : '021-55512345',
    alamat    : 'Jakarta Pusat',
  };

  return (
    <>
      <Head>
        <title>Dashboard Pendonor · BantuBeasiswa</title>
        <meta
          name="description"
          content="Dashboard pengelolaan program beasiswa untuk pendonor BantuBeasiswa."
        />
      </Head>

      <PendonorLayout user={{ nama: pendonorInfo.nama, role: 'pendonor' }}>

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

          {/* Tombol Tambah Program — placeholder */}
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shrink-0 transition-all hover:shadow-md active:scale-95"
            style={{ backgroundColor: C.blue }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Program
          </button>
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {CARD_CONFIG.map((c) => (
            <SummaryCard key={c.key} config={c} value={stats[c.key]} />
          ))}
        </div>

        {/* ── Main Content: Tabel + Pending Actions ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Tabel Program Aktif (2/3 lebar) ──────────────────────── */}
          <div
            className="lg:col-span-2 rounded-xl border overflow-hidden"
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
                    <th
                      className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide"
                      style={{ color: '#6b7280' }}
                    >
                      Nama Program
                    </th>
                    <th
                      className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide"
                      style={{ color: '#6b7280' }}
                    >
                      Tahap
                    </th>
                    <th
                      className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide"
                      style={{ color: '#6b7280' }}
                    >
                      Pendaftar
                    </th>
                    <th
                      className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide min-w-40"
                      style={{ color: '#6b7280' }}
                    >
                      Kuota
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((prog, idx) => (
                    <tr
                      key={prog.id}
                      className="border-t transition-colors hover:bg-blue-50"
                      style={{
                        borderColor    : '#f3f4f6',
                        backgroundColor: idx % 2 === 1 ? '#f9fafb' : C.white,
                      }}
                    >
                      {/* Nama */}
                      <td className="px-5 py-3.5">
                        <p className="font-medium leading-snug" style={{ color: C.dark }}>
                          {prog.nama}
                        </p>
                      </td>
                      {/* Tahap */}
                      <td className="px-4 py-3.5">
                        <TahapBadge tahap={prog.tahap} />
                      </td>
                      {/* Pendaftar */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-semibold tabular-nums" style={{ color: C.blue }}>
                          {prog.pendaftar.toLocaleString('id-ID')}
                        </span>
                      </td>
                      {/* Kuota bar */}
                      <td className="px-4 py-3.5">
                        <KuotaBar isi={prog.kuotaIsi} total={prog.kuotaTotal} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer tabel */}
            <div
              className="px-5 py-3 flex justify-end border-t"
              style={{ borderColor: '#f3f4f6' }}
            >
              <button
                className="text-xs font-semibold transition-colors"
                style={{ color: C.blue }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.gold)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.blue)}
              >
                Lihat semua program →
              </button>
            </div>
          </div>

          {/* ── Pending Actions (1/3 lebar) ──────────────────────────── */}
          <div
            className="rounded-xl border"
            style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: '#f3f4f6' }}
            >
              <h2 className="font-bold text-base" style={{ color: C.dark }}>
                Pending Actions
              </h2>
              <span
                className="w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full text-white"
                style={{ backgroundColor: '#ef4444' }}
              >
                {actions.length}
              </span>
            </div>

            {/* Action list */}
            <ul className="p-4 space-y-3">
              {actions.map((a) => (
                <ActionItem key={a.id} item={a} />
              ))}
            </ul>

            {/* CTA */}
            <div className="px-4 pb-4">
              <button
                className="w-full py-2.5 rounded-lg text-sm font-semibold border-2 transition-all hover:shadow-sm"
                style={{ borderColor: C.blue, color: C.blue, backgroundColor: '#e8f0fb' }}
              >
                Lihat Semua Notifikasi
              </button>
            </div>
          </div>
        </div>

      </PendonorLayout>
    </>
  );
}

// ─── SSR Guard ────────────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  return withAuth(context, 'pendonor');
}
