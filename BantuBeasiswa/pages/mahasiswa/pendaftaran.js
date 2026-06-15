import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import MahasiswaLayout from '../../components/layouts/MahasiswaLayout';
import { withAuth } from '../../lib/auth';
import { normalizeMahasiswaPendaftaranRow } from '../../lib/mahasiswaPendaftaranRow';

const C = {
  blue : '#0056b3',
  gold : '#ffc107',
  dark : '#333333',
  gray : '#6b7280',
  white: '#ffffff',
};

// ─── Mapping status → label + warna ──────────────────────────────────────────
const STATUS_CONFIG = {
  TERDAFTAR: { label: 'Terdaftar',          bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6' },
  REVIEW   : { label: 'Verifikasi Dokumen', bg: '#fefce8', color: '#854d0e', dot: '#eab308' },
  EXAM     : { label: 'Tahap Seleksi',      bg: '#f5f3ff', color: '#5b21b6', dot: '#8b5cf6' },
  LULUS    : { label: 'Lulus',              bg: '#f0fdf4', color: '#166534', dot: '#22c55e' },
  DITOLAK  : { label: 'Tidak Lolos',        bg: '#fff1f2', color: '#9f1239', dot: '#f43f5e' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' };
  return (
    <span style={{
      display        : 'inline-flex',
      alignItems     : 'center',
      gap            : '6px',
      padding        : '3px 10px',
      borderRadius   : '9999px',
      fontSize       : '0.75rem',
      fontWeight     : 600,
      backgroundColor: cfg.bg,
      color          : cfg.color,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: cfg.dot, display: 'inline-block' }} />
      {cfg.label}
    </span>
  );
}

function formatTanggal(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div style={{
      padding        : '16px 20px',
      borderBottom   : '1px solid #f3f4f6',
      display        : 'flex',
      alignItems     : 'center',
      gap            : '16px',
      animation      : 'pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ height: 16, width: '60%', backgroundColor: '#e5e7eb', borderRadius: 6, marginBottom: 8 }} />
        <div style={{ height: 12, width: '35%', backgroundColor: '#f3f4f6', borderRadius: 6 }} />
      </div>
      <div style={{ height: 24, width: 90, backgroundColor: '#e5e7eb', borderRadius: 9999 }} />
      <div style={{ height: 32, width: 100, backgroundColor: '#f3f4f6', borderRadius: 8 }} />
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ padding: '48px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
      <p style={{ fontWeight: 700, color: C.dark, fontSize: '1rem', marginBottom: 6 }}>
        Belum ada pendaftaran
      </p>
      <p style={{ color: C.gray, fontSize: '0.875rem', marginBottom: 20 }}>
        Kamu belum pernah mendaftar beasiswa apapun.
      </p>
      <Link
        href="/mahasiswa/cari"
        style={{
          display        : 'inline-block',
          padding        : '10px 22px',
          backgroundColor: C.blue,
          color          : C.white,
          borderRadius   : 8,
          fontWeight     : 700,
          fontSize       : '0.875rem',
          textDecoration : 'none',
        }}
      >
        Cari Beasiswa Sekarang →
      </Link>
    </div>
  );
}

// ─── Halaman Utama ────────────────────────────────────────────────────────────
export default function PendaftaranPage({ user }) {
  const [list,    setList   ] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError  ] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const res  = await fetch('/api/mahasiswa/pendaftaran');
        const data = await res.json();
        if (!res.ok) { setError(data.message || 'Gagal memuat data.'); return; }
        const rows = Array.isArray(data) ? data.map(normalizeMahasiswaPendaftaranRow) : [];
        setList(rows);
      } catch {
        setError('Terjadi kesalahan jaringan.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <>
      <Head>
        <title>Status Pendaftaran · BantuBeasiswa</title>
        <meta name="description" content="Pantau semua status pendaftaran beasiswamu di BantuBeasiswa." />
      </Head>

      <MahasiswaLayout user={user}>

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 4, height: 24, borderRadius: 9999, backgroundColor: C.gold }} />
            <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: C.dark }}>
              Status Pendaftaran
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: C.gray, marginLeft: 14 }}>
            Pantau progress semua beasiswa yang sudah kamu daftarkan
          </p>
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            padding        : '12px 16px',
            borderRadius   : 8,
            backgroundColor: '#fff1f2',
            border         : '1px solid #fecdd3',
            color          : '#be123c',
            fontSize       : '0.875rem',
            marginBottom   : 20,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Tabel Pendaftaran ────────────────────────────────────────────── */}
        <div style={{
          backgroundColor: C.white,
          borderRadius   : 12,
          border         : '1px solid #e5e7eb',
          overflow       : 'hidden',
        }}>
          {/* Header tabel */}
          <div style={{
            display        : 'grid',
            gridTemplateColumns: '1fr 120px 140px 100px',
            padding        : '12px 20px',
            backgroundColor: '#f8faff',
            borderBottom   : '1px solid #e5e7eb',
            fontSize       : '0.75rem',
            fontWeight     : 600,
            color          : C.gray,
            textTransform  : 'uppercase',
            letterSpacing  : '0.05em',
          }}>
            <span>Beasiswa</span>
            <span>Terdaftar</span>
            <span>Status</span>
            <span></span>
          </div>

          {/* Rows */}
          {loading ? (
            [1,2,3].map(i => <SkeletonRow key={i} />)
          ) : list.length === 0 ? (
            <EmptyState />
          ) : (
            list.map((item, index) => (
              <div
                key={
                  item.pendaftaranId != null && item.pendaftaranId !== ''
                    ? String(item.pendaftaranId)
                    : `pendaftaran-row-${index}`
                }
                style={{
                  display        : 'grid',
                  gridTemplateColumns: '1fr 120px 140px 100px',
                  padding        : '16px 20px',
                  borderBottom   : '1px solid #f3f4f6',
                  alignItems     : 'center',
                  transition     : 'background-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8faff')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {/* Nama beasiswa + pendonor */}
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    fontWeight  : 600,
                    fontSize    : '0.9375rem',
                    color       : C.dark,
                    marginBottom: 2,
                    whiteSpace  : 'nowrap',
                    overflow    : 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {item.beasiswa?.judul ?? '—'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: C.gray }}>
                    {item.beasiswa?.pendonor?.statusOrganisasi ?? '—'}
                  </p>
                </div>

                {/* Tanggal daftar */}
                <span style={{ fontSize: '0.8125rem', color: C.gray }}>
                  {formatTanggal(item.createdAt)}
                </span>

                {/* Status badge */}
                <StatusBadge status={item.status} />

                {/* Tombol lihat detail */}
                <Link
                  href={`/mahasiswa/status-pendaftaran?id=${item.pendaftaranId}`}
                  style={{
                    display        : 'inline-block',
                    padding        : '7px 14px',
                    borderRadius   : 7,
                    border         : `1.5px solid ${C.blue}`,
                    color          : C.blue,
                    fontSize       : '0.8125rem',
                    fontWeight     : 600,
                    textDecoration : 'none',
                    textAlign      : 'center',
                    transition     : 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = C.blue;
                    e.currentTarget.style.color = C.white;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = C.blue;
                  }}
                >
                  Pantau
                </Link>
              </div>
            ))
          )}
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.5; }
          }
        `}</style>

      </MahasiswaLayout>
    </>
  );
}

// ─── SSR Auth Guard ───────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  return withAuth(context, 'mahasiswa');
}
