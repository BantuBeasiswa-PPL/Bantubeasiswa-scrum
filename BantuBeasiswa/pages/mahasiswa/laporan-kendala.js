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
export default function LaporanKendalaPage({ user, beasiswaList = [] }) {
  const [laporanList, setLaporanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [beasiswaId, setBeasiswaId] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!beasiswaId || deskripsi.trim().length < 20) return;

    setSubmitting(true);
    setFormSuccess('');
    setFormError('');

    try {
      const res = await fetch('/api/laporan-kendala', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beasiswaId, deskripsi: deskripsi.trim() })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengirim laporan.');
      }

      setFormSuccess('Laporan kendala berhasil dikirim!');
      setDeskripsi('');
      setBeasiswaId('');
      fetchLaporan();

      setTimeout(() => setFormSuccess(''), 4000);
    } catch (err) {
      setFormError(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Laporan Kendala · BantuBeasiswa</title>
        <meta name="description" content="Lihat laporan kendala yang Anda kirimkan." />
      </Head>

      <MahasiswaLayout user={user}>
        <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 4, height: 28, borderRadius: 9999, backgroundColor: C.gold }} />
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: C.dark, margin: 0 }}>
                Laporan Kendala
              </h1>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '4px', marginBottom: 0 }}>
                Laporkan masalah teknis atau administrasi dan pantau tindak lanjutnya.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', alignItems: 'start' }}>

            {/* ── Left: Form ── */}
            <div style={{ background: C.white, borderRadius: '1rem', border: '1px solid #e5e7eb', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 750, color: C.dark, marginBottom: '0.5rem' }}>
                Laporkan Kendala Baru
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
                Laporkan masalah Anda terkait proses seleksi beasiswa, re-registrasi rekening, atau pencairan dana.
              </p>

              {formSuccess && (
                <div style={{
                  background: '#ecfdf5', color: '#047857', padding: '0.875rem 1rem', borderRadius: '0.5rem',
                  marginBottom: '1.5rem', border: '1px solid #a7f3d0', fontSize: '0.8125rem', fontWeight: 600
                }}>
                  {formSuccess}
                </div>
              )}

              {formError && (
                <div style={{
                  background: '#fee2e2', color: '#b91c1c', padding: '0.875rem 1rem', borderRadius: '0.5rem',
                  marginBottom: '1.5rem', border: '1px solid #fecaca', fontSize: '0.8125rem', fontWeight: 600
                }}>
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="beasiswaId" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Program Beasiswa <span style={{ color: C.red }}>*</span>
                  </label>
                  <select
                    id="beasiswaId"
                    value={beasiswaId}
                    onChange={(e) => setBeasiswaId(e.target.value)}
                    required
                    style={{
                      width: '100%', borderRadius: '0.5rem', border: '1px solid #d1d5db', padding: '0.75rem 1rem',
                      fontSize: '0.875rem', outline: 'none', background: '#ffffff', color: '#000000'
                    }}
                  >
                    <option value="">-- Pilih Beasiswa --</option>
                    {beasiswaList.map((b) => (
                      <option key={b.beasiswaId} value={b.beasiswaId}>
                        {b.judul}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="deskripsi" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Deskripsi Masalah <span style={{ color: C.red }}>*</span>
                  </label>
                  <textarea
                    id="deskripsi"
                    rows={6}
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    placeholder="Tuliskan detail kendala secara lengkap..."
                    required
                    style={{
                      width: '100%', borderRadius: '0.5rem', border: '1px solid #d1d5db', padding: '0.75rem 1rem',
                      fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: '#000000'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: deskripsi.length < 20 ? C.red : '#6b7280', fontWeight: 500 }}>
                      {deskripsi.length < 20 ? `Minimal 20 karakter (${20 - deskripsi.length} tersisa)` : 'Panjang deskripsi valid'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      {deskripsi.length} karakter
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || deskripsi.length < 20 || !beasiswaId}
                  style={{
                    width: '100%', padding: '0.875rem', borderRadius: '0.5rem', border: 'none',
                    background: (submitting || deskripsi.length < 20 || !beasiswaId) ? '#e5e7eb' : C.blue,
                    color: (submitting || deskripsi.length < 20 || !beasiswaId) ? '#9ca3af' : C.white,
                    fontWeight: 700, fontSize: '0.875rem', cursor: (submitting || deskripsi.length < 20 || !beasiswaId) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,54,179,0.1)'
                  }}
                >
                  {submitting ? 'Mengirim...' : 'Kirim Laporan'}
                </button>
              </form>
            </div>

            {/* ── Right: History ── */}
            <div style={{ background: C.white, borderRadius: '1rem', border: '1px solid #e5e7eb', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 750, color: C.dark, marginBottom: '1.25rem' }}>
                Riwayat Laporan Anda
              </h2>

              {/* ── Error ── */}
              {error && (
                <div style={{
                  background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '0.5rem',
                  marginBottom: '1.5rem', border: '1px solid #fecaca', fontSize: '0.8125rem'
                }}>
                  {error}
                </div>
              )}

              {/* ── Loading ── */}
              {loading && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ display: 'inline-block', width: '2rem', height: '2rem', border: '3px solid #e5e7eb', borderTop: `3px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>Memuat laporan...</p>
                </div>
              )}

              {/* ── Empty State ── */}
              {!loading && laporanList.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', border: '1px dashed #d1d5db', borderRadius: '0.75rem', background: '#fafafa' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📂</div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: C.dark, marginBottom: '0.25rem' }}>
                    Belum ada laporan
                  </h3>
                  <p style={{ color: '#888888', fontSize: '0.75rem', margin: 0 }}>
                    Anda belum pernah membuat laporan kendala sebelumnya.
                  </p>
                </div>
              )}

              {/* ── Table / List ── */}
              {!loading && laporanList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                  {laporanList.map((l) => (
                    <div key={l.laporanId} style={{ border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#888888', fontWeight: 500 }}>
                          📅 {fmtTgl(l.tanggalLapor)}
                        </span>
                        <StatusBadge status={l.status} />
                      </div>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: C.dark, margin: 0 }}>
                        {l.beasiswa?.judul || 'Beasiswa'}
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
                        Pendonor: {l.beasiswa?.pendonor?.statusOrganisasi || l.beasiswa?.pendonor?.nama_organisasi || '—'}
                      </p>
                      <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '0.75rem 1rem', borderLeft: `3px solid #0056b3`, fontSize: '0.8125rem', color: '#4b5563', marginTop: '6px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                        {l.deskripsi}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </MahasiswaLayout>
    </>
  );
}

// ─── SSR Auth Guard ───────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  const auth = withAuth(context, 'mahasiswa');
  if (auth.redirect) return auth;

  const { user } = auth.props;
  const { getServerSupabase } = await import('@/lib/supabaseServer');
  const supabaseServer = getServerSupabase();
  const { data: beasiswaList } = await supabaseServer
    .from('beasiswa')
    .select('beasiswaId, judul')
    .order('judul', { ascending: true });

  return {
    props: {
      user,
      beasiswaList: beasiswaList || [],
    },
  };
}