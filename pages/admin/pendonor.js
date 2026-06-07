import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/layouts/AdminLayout';
import { withAuth } from '../../lib/auth';

// ─── Color tokens (matching dashboard.js) ─────────────────────────────────────
const C = {
  blue      : '#0056b3',
  blue_light: '#3b82f6',
  green     : '#059669',
  dark      : '#1e293b',
  white     : '#ffffff',
  red       : '#dc2626',
  gray      : '#6b7280',
  gray_light: '#f3f4f6',
  yellow    : '#fbbf24',
};

const STATUS_COLORS = {
  pending: { bg: '#fef3c7', color: '#92400e', text: 'Pending', border: '#f59e0b' },
  verified: { bg: '#dcfce7', color: '#166534', text: 'Verified', border: '#22c55e' },
  rejected: { bg: '#fee2e2', color: '#991b1b', text: 'Rejected', border: '#ef4444' },
};

// ─── Stat Card Component ──────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{
      background  : C.white,
      border      : '1px solid #e5e7eb',
      borderTop   : `4px solid ${color}`,
      borderRadius: 12,
      padding     : '16px 18px',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <span style={{ fontSize:12, color:C.gray, fontWeight:600 }}>{label}</span>
        <span style={{
          fontSize:18, background:`${color}18`, borderRadius:8,
          width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center',
        }}>{icon}</span>
      </div>
      <p style={{ fontSize:32, fontWeight:800, color, lineHeight:1 }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>{sub}</p>}
    </div>
  );
}

export default function PendonorPage({ user }) {
  const [pendonors, setPendonors] = useState([]);
  const [statusFilter, setStatusFilter] = useState('semua');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReason, setSelectedReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDokumenModal, setShowDokumenModal] = useState(false);
  const [dokumenLoading, setDokumenLoading] = useState(false);
  const [dokumenData, setDokumenData] = useState(null);

  const stats = {
    total: pendonors.length,
    pending: pendonors.filter(p => p.statusVerifikasi === 'pending').length,
    verified: pendonors.filter(p => p.statusVerifikasi === 'verified').length,
    rejected: pendonors.filter(p => p.statusVerifikasi === 'rejected').length,
  };

  useEffect(() => {
    fetchPendonors();
  }, [statusFilter]);

  const fetchPendonors = async () => {
    setIsLoading(true);
    try {
      const query = statusFilter === 'semua' 
        ? '/api/admin/pendonor'
        : `/api/admin/pendonor?status=${statusFilter}`;

      const response = await fetch(query);
      const result = await response.json();

      if (response.ok) {
        setPendonors(result.data);
      } else {
        console.error('Error fetching pendonors:', result.error);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (pendonorId) => {
    try {
      const response = await fetch('/api/admin/pendonor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pendonorId,
          action: 'verify',
        }),
      });

      if (response.ok) {
        // Optimistic update
        setPendonors(pendonors.map(p =>
          p.pendonorId === pendonorId ? { ...p, statusVerifikasi: 'verified' } : p
        ));
      } else {
        const result = await response.json();
        alert('Error: ' + result.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleRejectClick = (pendonorId) => {
    setRejectingId(pendonorId);
    setSelectedReason('');
    setShowRejectModal(true);
  };

  const handleViewDokumen = async (pendonorId) => {
    setShowDokumenModal(true);
    setDokumenLoading(true);
    setDokumenData(null);
    try {
      const res = await fetch(`/api/admin/pendonor/dokumen-verifikasi?pendonorId=${pendonorId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat dokumen');
      setDokumenData(data);
    } catch (err) {
      alert('Error: ' + err.message);
      setShowDokumenModal(false);
    } finally {
      setDokumenLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (selectedReason.length < 10) {
      alert('Alasan penolakan minimal 10 karakter');
      return;
    }

    try {
      const response = await fetch('/api/admin/pendonor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pendonorId: rejectingId,
          action: 'reject',
          alasanPenolakan: selectedReason,
        }),
      });

      if (response.ok) {
        // Optimistic update
        setPendonors(pendonors.map(p =>
          p.pendonorId === rejectingId ? { ...p, statusVerifikasi: 'rejected' } : p
        ));
        setShowRejectModal(false);
        setRejectingId(null);
      } else {
        const result = await response.json();
        alert('Error: ' + result.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleRevoke = async (pendonorId) => {
    if (!window.confirm('Yakin ingin mencabut verifikasi pendonor ini?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/pendonor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pendonorId,
          action: 'revoke',
        }),
      });

      if (response.ok) {
        // Optimistic update
        setPendonors(pendonors.map(p =>
          p.pendonorId === pendonorId ? { ...p, statusVerifikasi: 'pending' } : p
        ));
      } else {
        const result = await response.json();
        alert('Error: ' + result.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const filteredPendonors = statusFilter === 'semua'
    ? pendonors
    : pendonors.filter(p => p.statusVerifikasi === statusFilter);

  return (
    <AdminLayout user={user}>
      <Head>
        <title>Kelola Pendonor - BantuBeasiswa</title>
      </Head>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: C.dark, margin: 0, marginBottom: '4px' }}>
            Kelola Pendonor
          </h1>
          <p style={{ fontSize: '14px', color: C.gray, margin: 0 }}>
            Verifikasi dan kelola akun pendonor baru
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '30px',
      }}>
        <StatCard label="Total Pendonor" value={stats.total} icon="👥" color={C.blue} />
        <StatCard label="Pending Review" value={stats.pending} icon="⏳" color={C.yellow} />
        <StatCard label="Verified" value={stats.verified} icon="✓" color={C.green} />
        <StatCard label="Rejected" value={stats.rejected} icon="✗" color={C.red} />
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        {['semua', 'pending', 'verified', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              padding: '10px 16px',
              background: statusFilter === status ? C.blue : C.white,
              color: statusFilter === status ? C.white : C.dark,
              border: statusFilter === status ? 'none' : `1px solid #e5e7eb`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: statusFilter === status ? '600' : '500',
              transition: 'all 0.2s',
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div style={{
        background: C.white,
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}>
        {isLoading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: C.gray, fontSize: '16px' }}>
            ⏳ Sedang memuat data pendonor...
          </div>
        ) : filteredPendonors.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: C.gray, fontSize: '16px' }}>
            📭 Tidak ada pendonor dengan status ini
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}>
              <thead>
                <tr style={{ background: C.gray_light, borderBottom: `1px solid #e5e7eb` }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: C.dark }}>
                    Nama Organisasi
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: C.dark }}>
                    Email
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: C.dark }}>
                    Kontak
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: C.dark }}>
                    Tgl Daftar
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: C.dark }}>
                    Status
                  </th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: C.dark }}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPendonors.map((pendonor, idx) => (
                  <tr
                    key={pendonor.pendonorId}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      background: idx % 2 === 0 ? C.white : C.gray_light,
                      transition: 'background 0.2s',
                    }}
                  >
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: C.dark }}>
                      {pendonor.statusOrganisasi}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: C.dark }}>
                      {pendonor.account?.email || 'N/A'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: C.dark }}>
                      {pendonor.kontak}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: C.gray }}>
                      {new Date(pendonor.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        background: STATUS_COLORS[pendonor.statusVerifikasi].bg,
                        color: STATUS_COLORS[pendonor.statusVerifikasi].color,
                        border: `1px solid ${STATUS_COLORS[pendonor.statusVerifikasi].border}`,
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}>
                        {STATUS_COLORS[pendonor.statusVerifikasi].text}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleViewDokumen(pendonor.pendonorId)}
                          title="Lihat dokumen verifikasi"
                          style={{
                            padding: '6px 10px',
                            background: C.blue_light,
                            color: C.white,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          📄 Dokumen
                        </button>
                        {pendonor.statusVerifikasi === 'pending' && (
                          <>
                            <button
                              onClick={() => handleVerify(pendonor.pendonorId)}
                              title="Verifikasi pendonor ini"
                              style={{
                                padding: '6px 10px',
                                background: C.green,
                                color: C.white,
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                transition: 'opacity 0.2s',
                              }}
                              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                              onMouseLeave={(e) => e.target.style.opacity = '1'}
                            >
                              ✓ Verifikasi
                            </button>
                            <button
                              onClick={() => handleRejectClick(pendonor.pendonorId)}
                              title="Tolak pendonor ini"
                              style={{
                                padding: '6px 10px',
                                background: C.red,
                                color: C.white,
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                transition: 'opacity 0.2s',
                              }}
                              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                              onMouseLeave={(e) => e.target.style.opacity = '1'}
                            >
                              ✗ Tolak
                            </button>
                          </>
                        )}
                        {pendonor.statusVerifikasi === 'verified' && (
                          <button
                            onClick={() => handleRevoke(pendonor.pendonorId)}
                            title="Cabut verifikasi"
                            style={{
                              padding: '6px 10px',
                              background: C.gray,
                              color: C.white,
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              transition: 'opacity 0.2s',
                            }}
                            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.target.style.opacity = '1'}
                          >
                            ⊘ Cabut
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dokumen Verifikasi Modal */}
      {showDokumenModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: C.white, borderRadius: '12px', padding: '28px',
            maxWidth: '560px', width: '92%', maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ color: C.dark, marginBottom: '8px', fontSize: '18px', fontWeight: '700' }}>
              Dokumen Verifikasi Pendonor
            </h2>
            {dokumenData?.pendonor && (
              <p style={{ color: C.gray, fontSize: '14px', marginBottom: '16px' }}>
                {dokumenData.pendonor.statusOrganisasi} · {dokumenData.pendonor.email}
              </p>
            )}

            {dokumenLoading ? (
              <p style={{ color: C.gray, fontSize: '14px', padding: '24px 0', textAlign: 'center' }}>
                Memuat dokumen...
              </p>
            ) : dokumenData?.dokumen?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '13px', color: C.gray }}>
                  Dokumen wajib terunggah: {dokumenData.uploadedWajib} / {dokumenData.totalWajib}
                </p>
                {dokumenData.dokumen.map((doc) => (
                  <div
                    key={doc.jenis}
                    style={{
                      border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px',
                      background: '#fafafa',
                    }}
                  >
                    <p style={{ fontWeight: '700', fontSize: '14px', color: C.dark, marginBottom: '4px' }}>
                      {doc.label}
                    </p>
                    <p style={{ fontSize: '12px', color: C.gray, marginBottom: '8px' }}>
                      Status: {doc.statusDokumen}
                      {doc.updatedAt && ` · ${new Date(doc.updatedAt).toLocaleString('id-ID')}`}
                    </p>
                    {doc.downloadUrl ? (
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={doc.fileName || doc.jenis}
                        style={{
                          display: 'inline-block', padding: '8px 14px', borderRadius: '6px',
                          background: C.blue, color: C.white, fontSize: '12px', fontWeight: '600',
                          textDecoration: 'none',
                        }}
                      >
                        ⬇ Unduh / Lihat
                      </a>
                    ) : (
                      <span style={{ fontSize: '12px', color: C.red }}>URL unduhan tidak tersedia</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: C.gray, fontSize: '14px', padding: '16px 0' }}>
                Belum ada dokumen yang diunggah oleh pendonor ini.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => { setShowDokumenModal(false); setDokumenData(null); }}
                style={{
                  padding: '10px 20px', background: C.gray_light, color: C.dark,
                  border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: '600', fontSize: '14px',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: C.white,
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ color: C.dark, marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
              Tolak Pendonor
            </h2>
            <p style={{ color: C.gray, fontSize: '14px', marginBottom: '16px' }}>
              Masukkan alasan penolakan. Pesan ini akan membantu pendonor memahami keputusan Anda.
            </p>

            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: C.dark,
              fontSize: '14px',
            }}>
              Alasan Penolakan (min. 10 karakter)
            </label>

            <textarea
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              placeholder="Jelaskan alasan penolakan..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid #e5e7eb`,
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                minHeight: '100px',
                marginBottom: '20px',
                color: C.dark,
                resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingId(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: C.gray_light,
                  color: C.dark,
                  border: `1px solid #e5e7eb`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                onMouseLeave={(e) => e.target.style.opacity = '1'}
              >
                Batal
              </button>

              <button
                onClick={handleRejectSubmit}
                disabled={selectedReason.length < 10}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: C.red,
                  color: C.white,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedReason.length < 10 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  opacity: selectedReason.length < 10 ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (selectedReason.length >= 10) e.target.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  if (selectedReason.length >= 10) e.target.style.opacity = '1';
                }}
              >
                Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export async function getServerSideProps(context) {
  return withAuth(context, 'admin');
}
