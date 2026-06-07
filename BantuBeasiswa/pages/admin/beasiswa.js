import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/layouts/AdminLayout';
import { withAuth } from '../../lib/auth';
import { showSuccess, showError, showConfirm } from '../../lib/swal';

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
  indigo    : '#4f46e5',
  indigoLight: '#e0e7ff',
};

// ─── Status Config ───────────────────────────────────────────────────────────
const STATUS_CFG = {
  draft   : { label: 'Draft', bg: '#f3f4f6', color: '#374151' },
  pending : { label: 'Menunggu Persetujuan', bg: '#fffbeb', color: '#b45309' },
  aktif   : { label: 'Aktif', bg: '#ecfdf5', color: '#047857' },
  ditutup : { label: 'Ditutup', bg: '#fef2f2', color: '#b91c1c' },
  selesai : { label: 'Selesai', bg: '#e0e7ff', color: '#3730a3' },
};

function StatusBadge({ status }) {
  const s = STATUS_CFG[status] || { label: status, bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      background: s.bg, color: s.color, padding: '0.25rem 0.65rem',
      borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
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
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function KelolaBeasiswaPage({ user }) {
  const [beasiswaList, setBeasiswaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');

  // Modals state
  const [detailBeasiswa, setDetailBeasiswa] = useState(null);
  const [rejectBeasiswa, setRejectBeasiswa] = useState(null);
  const [deleteBeasiswa, setDeleteBeasiswa] = useState(null);

  const [rejectReason, setRejectReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/beasiswa');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal memuat beasiswa');
      setBeasiswaList(data.data || []);
    } catch (e) {
      setError(e.message || 'Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleApprove = async (beasiswaId) => {
    const item = beasiswaList.find(b => b.beasiswaId === beasiswaId);
    const result = await showConfirm(
      'Setujui Beasiswa?',
      `Apakah Anda yakin ingin menyetujui program beasiswa "${item?.judul}"?`,
      'Ya, Setujui',
      'Batal'
    );
    if (!result.isConfirmed) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/beasiswa/${beasiswaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyetujui beasiswa');
      
      await showSuccess('Berhasil!', 'Program beasiswa berhasil disetujui dan berstatus aktif.');
      setDetailBeasiswa(null);
      await fetchData();
    } catch (e) {
      await showError('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setModalError('Alasan penolakan wajib diisi');
      return;
    }

    setSubmitting(true); setModalError('');
    try {
      const res = await fetch(`/api/admin/beasiswa/${rejectBeasiswa.beasiswaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', alasan: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menolak beasiswa');

      await showSuccess('Berhasil!', 'Program beasiswa telah ditolak dan dikembalikan ke status draft pendonor.');
      setRejectBeasiswa(null);
      setRejectReason('');
      setDetailBeasiswa(null);
      await fetchData();
    } catch (e) {
      setModalError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async (e) => {
    e.preventDefault();
    if (!deleteReason.trim()) {
      setModalError('Alasan penghapusan wajib diisi');
      return;
    }

    setSubmitting(true); setModalError('');
    try {
      const res = await fetch(`/api/admin/beasiswa/${deleteBeasiswa.beasiswaId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alasan: deleteReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menghapus beasiswa');

      await showSuccess('Berhasil!', 'Program beasiswa berhasil dihapus secara permanen.');
      setDeleteBeasiswa(null);
      setDeleteReason('');
      setDetailBeasiswa(null);
      await fetchData();
    } catch (e) {
      setModalError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Stats
  const statPendingCount = beasiswaList.filter(b => b.status === 'pending').length;
  const statActiveCount = beasiswaList.filter(b => b.status === 'aktif').length;
  const statTotalCount = beasiswaList.length;

  // Filter & Search logic
  const displayedList = beasiswaList.filter((b) => {
    const q = search.toLowerCase();
    const matchesSearch = b.judul?.toLowerCase().includes(q) || b.pendonor?.statusOrganisasi?.toLowerCase().includes(q);
    
    if (filterStatus === 'Semua') return matchesSearch;
    if (filterStatus === 'Ditutup / Selesai') {
      return (b.status === 'ditutup' || b.status === 'selesai') && matchesSearch;
    }
    return b.status === filterStatus && matchesSearch;
  });

  return (
    <>
      <Head>
        <title>Kelola Program Beasiswa · BantuBeasiswa Admin</title>
        <meta name="description" content="Dashboard persetujuan dan manajemen program beasiswa oleh admin." />
      </Head>

      <AdminLayout user={user}>
        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-7 rounded-full" style={{ background: C.gold }} />
            <h1 className="text-2xl font-extrabold" style={{ color: C.dark }}>Persetujuan Beasiswa</h1>
          </div>
          <p className="text-sm ml-4" style={{ color: C.gray }}>
            Kelola dan evaluasi pengajuan program beasiswa baru dari mitra pendonor.
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

        {/* ── Stat Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <StatCard
            icon="⏱️" label="Menunggu Persetujuan"
            value={loading ? '…' : statPendingCount}
            accent={C.gold}
            desc="Beasiswa draft yang diajukan oleh pendonor"
          />
          <StatCard
            icon="🎓" label="Beasiswa Aktif"
            value={loading ? '…' : statActiveCount}
            accent={C.green}
            desc="Beasiswa terpublikasi & dapat didaftar mahasiswa"
          />
          <StatCard
            icon="📚" label="Total Program Beasiswa"
            value={loading ? '…' : statTotalCount}
            accent={C.blue}
            desc="Semua beasiswa yang terdaftar di platform"
          />
        </div>

        {/* ── Filter & Search controls ─────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          {/* Pills filter */}
          <div className="flex flex-wrap gap-2">
            {['Semua', 'pending', 'aktif', 'draft', 'Ditutup / Selesai'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: '0.4rem 0.9rem', borderRadius: '9999px',
                  fontSize: '0.78rem', fontWeight: 600, border: '1.5px solid',
                  cursor: 'pointer', transition: 'all 0.15s',
                  borderColor: filterStatus === status ? C.blue : '#d1d5db',
                  background: filterStatus === status ? '#eff6ff' : C.white,
                  color: filterStatus === status ? C.blue : '#6b7280',
                }}
              >
                {status === 'Semua' ? 'Semua' : STATUS_CFG[status]?.label || status}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', color: '#9ca3af' }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari beasiswa atau pendonor..."
              style={{
                paddingLeft: '2.2rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem',
                fontSize: '0.8125rem', borderRadius: '0.625rem', border: '1.5px solid #d1d5db',
                outline: 'none', width: '15rem', color: C.dark, background: C.white,
              }}
              onFocus={(e) => (e.target.style.borderColor = C.blue)}
              onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
            />
          </div>
        </div>

        {/* ── Table Area ──────────────────────────────────────────────── */}
        <div style={{ background: C.white, borderRadius: '0.875rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Nama Program Beasiswa', 'Pendonor', 'Nominal per Penerima', 'Kuota', 'Deadline', 'Status', 'Aksi'].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 6 ? 'center' : 'left', padding: '0.875rem 1rem',
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
                      <td colSpan={7} style={{ padding: '1.25rem 1rem' }}>
                        <div style={{ height: '1rem', background: '#e5e7eb', borderRadius: 4, width: '90%', animation: 'pulse 1.5s infinite' }} />
                      </td>
                    </tr>
                  ))
                ) : displayedList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: C.gray }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎓</div>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0, color: '#374151' }}>Tidak Ada Program Beasiswa</p>
                      <p style={{ fontSize: '0.8rem', color: C.gray, marginTop: '0.25rem', margin: 0 }}>
                        Data program beasiswa tidak ditemukan untuk filter ini.
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedList.map((b, idx) => (
                    <tr
                      key={b.beasiswaId}
                      style={{
                        borderTop: '1px solid #f3f4f6',
                        background: idx % 2 === 1 ? '#f9fafb' : C.white,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f7ff')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 1 ? '#f9fafb' : C.white)}
                    >
                      {/* Judul & Jalur */}
                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle' }}>
                        <p style={{ fontWeight: 700, color: C.dark, margin: 0 }}>{b.judul}</p>
                        <p style={{ fontSize: '0.72rem', color: C.gray, margin: 0 }}>Jalur: {b.jalur || 'Reguler'}</p>
                      </td>
                      {/* Pendonor */}
                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle', color: '#4b5563' }}>
                        {b.pendonor?.statusOrganisasi || '—'}
                      </td>
                      {/* Nominal */}
                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle', fontWeight: 600, color: C.dark }}>
                        {fmtRupiah(b.nominal)}
                      </td>
                      {/* Kuota */}
                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle', color: '#4b5563' }}>
                        {b.kuota} Mahasiswa
                      </td>
                      {/* Deadline */}
                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle', color: '#4b5563' }}>
                        {fmtTgl(b.deadline)}
                      </td>
                      {/* Status */}
                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle' }}>
                        <StatusBadge status={b.status} />
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => setDetailBeasiswa(b)}
                            title="Detail Program"
                            style={{
                              background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.375rem',
                              padding: '0.375rem', cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.9rem'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                          >
                            📄
                          </button>
                          
                          {b.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(b.beasiswaId)}
                                title="Setujui Program"
                                style={{
                                  background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '0.375rem',
                                  padding: '0.375rem', cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.9rem'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#d1fae5'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#ecfdf5'; }}
                              >
                                ✅
                              </button>
                              <button
                                onClick={() => {
                                  setRejectBeasiswa(b);
                                  setRejectReason('');
                                  setModalError('');
                                }}
                                title="Tolak Program"
                                style={{
                                  background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.375rem',
                                  padding: '0.375rem', cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.9rem'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#fef3c7'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fffbeb'; }}
                              >
                                ❌
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => {
                              setDeleteBeasiswa(b);
                              setDeleteReason('');
                              setModalError('');
                            }}
                            title="Hapus Program"
                            style={{
                              background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '0.375rem',
                              padding: '0.375rem', cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.9rem'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && (
            <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.78rem', color: C.gray, margin: 0 }}>
                Menampilkan <strong style={{ color: C.dark }}>{displayedList.length}</strong> dari <strong style={{ color: C.dark }}>{beasiswaList.length}</strong> program beasiswa
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

      {/* ─── MODAL DETAIL BEASISWA ────────────────────────────────────────── */}
      {detailBeasiswa && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)',
          padding: '1rem', backdropFilter: 'blur(3px)'
        }} onClick={() => setDetailBeasiswa(null)}>
          <div style={{
            background: C.white, borderRadius: '1.25rem', width: '100%', maxWidth: '640px',
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            animation: 'fadeIn 0.2s ease-out'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: C.dark, margin: 0 }}>Detail Pengajuan Beasiswa</h2>
              <button onClick={() => setDetailBeasiswa(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: C.gray }}>✕</button>
            </div>
            
            {/* Content */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Judul & Status */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.25rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: C.blue, margin: 0 }}>{detailBeasiswa.judul}</h3>
                  <StatusBadge status={detailBeasiswa.status} />
                </div>
                <p style={{ fontSize: '0.85rem', color: C.gray, margin: 0 }}>
                  Diposkan oleh: <strong>{detailBeasiswa.pendonor?.statusOrganisasi || 'Mitra Pendonor'}</strong>
                </p>
              </div>

              {/* Grid Ringkasan */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem',
                background: C.grayLight, padding: '0.875rem 1rem', borderRadius: '0.75rem'
              }}>
                <div>
                  <p style={{ fontSize: '0.72rem', color: C.gray, margin: 0, textTransform: 'uppercase', fontWeight: 700 }}>Nominal</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: C.green, margin: 0 }}>{fmtRupiah(detailBeasiswa.nominal)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.72rem', color: C.gray, margin: 0, textTransform: 'uppercase', fontWeight: 700 }}>Kuota</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: C.dark, margin: 0 }}>{detailBeasiswa.kuota} Penerima</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.72rem', color: C.gray, margin: 0, textTransform: 'uppercase', fontWeight: 700 }}>Jalur</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: C.dark, margin: 0 }}>{detailBeasiswa.jalur || 'Reguler'}</p>
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.dark, margin: '0 0 0.375rem 0' }}>Deskripsi Beasiswa</h4>
                <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {detailBeasiswa.deskripsi || 'Tidak ada deskripsi'}
                </p>
              </div>

              {/* Syarat */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.dark, margin: '0 0 0.375rem 0' }}>Persyaratan</h4>
                <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {detailBeasiswa.syarat || 'Tidak ada persyaratan spesifik'}
                </p>
              </div>

              {/* Wilayah Target */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.dark, margin: '0 0 0.5rem 0' }}>Wilayah Sasaran</h4>
                {detailBeasiswa.beasiswa_wilayah && detailBeasiswa.beasiswa_wilayah.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                    {detailBeasiswa.beasiswa_wilayah.map((bw) => (
                      <span key={bw.wilayah?.wilayahId} style={{
                        fontSize: '0.72rem', fontWeight: 600, background: '#eff6ff',
                        color: C.blue, border: '1px solid #bfdbfe', borderRadius: '0.375rem',
                        padding: '0.2rem 0.5rem'
                      }}>
                        {bw.wilayah?.provinsi?.nama ? `${bw.wilayah.provinsi.nama} - ` : ''}{bw.wilayah?.nama}
                        {bw.wilayah?.is3T && ' (3T)'}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: C.gray, margin: 0 }}>Seluruh Indonesia (Nasional)</p>
                )}
              </div>

              {/* Rejection Reason Banner (Jika ada) */}
              {detailBeasiswa.alasanPenolakan && (
                <div style={{
                  padding: '0.875rem 1rem', background: C.redLight, border: `1px solid #fecdd3`,
                  borderRadius: '0.75rem', color: C.red, fontSize: '0.8125rem'
                }}>
                  <strong style={{ display: 'block', marginBottom: '0.125rem' }}>⚠️ Catatan Penolakan Sebelumnya:</strong>
                  {detailBeasiswa.alasanPenolakan}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', padding: '1.25rem 1.5rem', borderTop: '1px solid #f3f4f6', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDetailBeasiswa(null)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1.5px solid #e5e7eb',
                  background: C.white, color: C.gray, fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem'
                }}
              >
                Tutup
              </button>

              {detailBeasiswa.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectBeasiswa(detailBeasiswa);
                      setRejectReason('');
                      setModalError('');
                    }}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
                      background: '#d97706', color: C.white, fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem'
                    }}
                  >
                    Tolak
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(detailBeasiswa.beasiswaId)}
                    disabled={submitting}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
                      background: C.green, color: C.white, fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem'
                    }}
                  >
                    Setujui Beasiswa
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL TOLAK BEASISWA ────────────────────────────────────────── */}
      {rejectBeasiswa && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 110, display: 'flex',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)',
          padding: '1rem', backdropFilter: 'blur(3px)'
        }} onClick={() => setRejectBeasiswa(null)}>
          <div style={{
            background: C.white, borderRadius: '1.25rem', width: '100%', maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'fadeIn 0.2s ease-out'
          }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleRejectSubmit}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: C.dark, margin: 0 }}>Tolak Pengajuan Beasiswa</h2>
                <button type="button" onClick={() => setRejectBeasiswa(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: C.gray }}>✕</button>
              </div>

              {/* Content */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: 0 }}>
                  Apakah Anda yakin ingin menolak program beasiswa <strong>"{rejectBeasiswa.judul}"</strong>? Berikan alasan agar pendonor dapat memperbaikinya.
                </p>

                <div>
                  <label htmlFor="reason-reject" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.dark, marginBottom: '0.375rem', textTransform: 'uppercase' }}>
                    Alasan Penolakan <span style={{ color: C.red }}>*</span>
                  </label>
                  <textarea
                    id="reason-reject"
                    rows={4}
                    required
                    placeholder="Contoh: Deskripsi program kurang detail, harap lengkapi poin-poin kontribusi..."
                    value={rejectReason}
                    onChange={(e) => { setRejectReason(e.target.value); setModalError(''); }}
                    style={{
                      width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                      border: '1.5px solid #d1d5db', fontSize: '0.85rem', outline: 'none', resize: 'vertical'
                    }}
                    onFocus={(e) => (e.target.style.borderColor = C.blue)}
                    onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                  />
                </div>

                {modalError && (
                  <div style={{ color: C.red, fontSize: '0.8rem', fontWeight: 600 }}>
                    ⚠️ {modalError}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: '0.75rem', padding: '1.25rem 1.5rem', borderTop: '1px solid #f3f4f6', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setRejectBeasiswa(null)}
                  disabled={submitting}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1.5px solid #e5e7eb',
                    background: C.white, color: C.gray, fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !rejectReason.trim()}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
                    background: C.red, color: C.white, fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
                    opacity: (!rejectReason.trim() || submitting) ? 0.6 : 1
                  }}
                >
                  {submitting ? 'Mengirim...' : 'Tolak & Kembalikan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL HAPUS BEASISWA ────────────────────────────────────────── */}
      {deleteBeasiswa && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 110, display: 'flex',
          alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)',
          padding: '1rem', backdropFilter: 'blur(3px)'
        }} onClick={() => setDeleteBeasiswa(null)}>
          <div style={{
            background: C.white, borderRadius: '1.25rem', width: '100%', maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'fadeIn 0.2s ease-out'
          }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleDeleteSubmit}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: C.dark, margin: 0 }}>Hapus Program Beasiswa</h2>
                <button type="button" onClick={() => setDeleteBeasiswa(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: C.gray }}>✕</button>
              </div>

              {/* Content */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  background: C.redLight, color: C.red, padding: '0.75rem 1rem',
                  borderRadius: '0.625rem', fontSize: '0.8125rem', fontWeight: 600
                }}>
                  ⚠️ Peringatan: Tindakan ini akan menghapus program beasiswa secara permanen dari database.
                </div>

                <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: 0 }}>
                  Apakah Anda yakin ingin menghapus <strong>"{deleteBeasiswa.judul}"</strong>? Cantumkan alasan resmi tindakan penghapusan ini.
                </p>

                <div>
                  <label htmlFor="reason-delete" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.dark, marginBottom: '0.375rem', textTransform: 'uppercase' }}>
                    Alasan Penghapusan <span style={{ color: C.red }}>*</span>
                  </label>
                  <textarea
                    id="reason-delete"
                    rows={4}
                    required
                    placeholder="Contoh: Program terdeteksi spam / melanggar syarat platform..."
                    value={deleteReason}
                    onChange={(e) => { setDeleteReason(e.target.value); setModalError(''); }}
                    style={{
                      width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                      border: '1.5px solid #d1d5db', fontSize: '0.85rem', outline: 'none', resize: 'vertical'
                    }}
                    onFocus={(e) => (e.target.style.borderColor = C.blue)}
                    onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                  />
                </div>

                {modalError && (
                  <div style={{ color: C.red, fontSize: '0.8rem', fontWeight: 600 }}>
                    ⚠️ {modalError}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: '0.75rem', padding: '1.25rem 1.5rem', borderTop: '1px solid #f3f4f6', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setDeleteBeasiswa(null)}
                  disabled={submitting}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1.5px solid #e5e7eb',
                    background: C.white, color: C.gray, fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !deleteReason.trim()}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
                    background: C.red, color: C.white, fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
                    opacity: (!deleteReason.trim() || submitting) ? 0.6 : 1
                  }}
                >
                  {submitting ? 'Menghapus...' : 'Hapus Permanen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Style Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ─── SSR Auth Guard ───────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  return withAuth(context, 'admin');
}
