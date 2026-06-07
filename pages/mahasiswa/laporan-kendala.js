import { useEffect, useState } from 'react';
import Head from 'next/head';
import MahasiswaLayout from '../../components/layouts/MahasiswaLayout';
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

// ─── Format tanggal ───────────────────────────────────────────────────────────
function fmtTgl(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LaporanKendalaPage({ user }) {
  const [laporanList, setLaporanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLaporan();
  }, []);

  async function fetchLaporan() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/mahasiswa/laporan-kendala');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLaporanList(data.laporan || []);
    } catch (e) {
      setError(e.message || 'Gagal memuat laporan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Laporan Kendala · BantuBeasiswa</title>
        <meta name="description" content="Lihat laporan kendala yang Anda kirimkan." />
      </Head>

      <MahasiswaLayout user={user}>
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: C.dark, marginBottom: '0.5rem' }}>
              Laporan Kendala
            </h1>
            <p style={{ color: '#6b7280' }}>
              Daftar laporan kendala yang Anda kirimkan terkait beasiswa.
            </p>
          </div>

          {/* ── Error ── */}
          {error && (
            <div style={{
              background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '0.5rem',
              marginBottom: '1.5rem', border: '1px solid #fecaca'
            }}>
              {error}
            </div>
          )}

          {/* ── Loading ── */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ display: 'inline-block', width: '2rem', height: '2rem', border: '3px solid #e5e7eb', borderTop: `3px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: '1rem', color: '#6b7280' }}>Memuat laporan...</p>
            </div>
          )}

          {/* ── Table ── */}
          {!loading && laporanList.length > 0 && (
            <div style={{ background: C.white, borderRadius: '0.75rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: C.dark, borderBottom: '1px solid #e5e7eb' }}>Tanggal</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: C.dark, borderBottom: '1px solid #e5e7eb' }}>Beasiswa</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: C.dark, borderBottom: '1px solid #e5e7eb' }}>Pendonor</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: C.dark, borderBottom: '1px solid #e5e7eb' }}>Deskripsi</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: C.dark, borderBottom: '1px solid #e5e7eb' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {laporanList.map((l) => (
                    <tr key={l.laporanId} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '1rem', color: C.dark }}>{fmtTgl(l.tanggalLapor)}</td>
                      <td style={{ padding: '1rem', color: C.dark }}>{l.beasiswa?.judul || '—'}</td>
                      <td style={{ padding: '1rem', color: C.dark }}>{l.beasiswa?.pendonor?.nama_organisasi || '—'}</td>
                      <td style={{ padding: '1rem', color: C.dark, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.deskripsi}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <StatusBadge status={l.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Empty State ── */}
          {!loading && laporanList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', background: C.white, borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: C.dark, marginBottom: '0.5rem' }}>
                Belum ada laporan
              </h3>
              <p style={{ color: '#6b7280' }}>
                Anda belum mengirimkan laporan kendala apapun.
              </p>
            </div>
          )}

        </div>
      </MahasiswaLayout>
    </>
  );
}

// ─── SSR Auth Guard ───────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  return withAuth(context, 'mahasiswa');
}