import { useState, useEffect } from 'react';

const C = {
  blue: '#0056b3', gold: '#ffc107', dark: '#333333',
  green: '#059669', red: '#dc2626', white: '#ffffff',
};

const STATUS_OPTIONS = [
  { value: 'pending',  label: '🔴 Pending'  },
  { value: 'diproses', label: '🟡 Diproses' },
  { value: 'selesai',  label: '🟢 Selesai'  },
  { value: 'ditutup',  label: '⚫ Ditutup'  },
];

export default function TiketDetailPanel({ tiket, onClose, onUpdated }) {
  const [status, setStatus] = useState('pending');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (tiket) {
      setStatus(tiket.status || 'pending');
      setErr('');
    }
  }, [tiket]);

  const handleSave = async () => {
    if (status === tiket.status) {
      setErr('Pilih status baru terlebih dahulu.');
      return;
    }
    setSaving(true); setErr('');
    try {
      const res = await fetch('/api/admin/laporan-kendala', {
        method : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ id: tiket.laporanId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onUpdated?.();
      onClose();
    } catch (e) {
      setErr(e.message || 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const isOpen = !!tiket;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position  : 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.35)',
          opacity   : isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Slide-in panel */}
      <div
        style={{
          position : 'fixed', top: 0, right: 0, bottom: 0,
          width    : '100%', maxWidth: '26rem',
          zIndex   : 50,
          background: C.white,
          boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
          display  : 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {!tiket ? null : (
          <>
            {/* Header */}
            <div style={{ background: `linear-gradient(135deg,${C.blue},#003d82)`, padding: '1.25rem 1.5rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    Tiket #{String(tiket.laporanId).padStart(4, '0')}
                  </p>
                  <h2 style={{ color: C.white, fontWeight: 700, fontSize: '1rem', margin: 0 }}>
                    Detail Laporan
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Tutup panel"
                  style={{
                    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '0.5rem',
                    width: '2rem', height: '2rem', color: C.white, fontSize: '1.25rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >×</button>
              </div>
            </div>

            {/* Body (scrollable) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Profil pelapor */}
              <section>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>
                  Profil Pelapor
                </p>
                <div style={{ background: '#f8f9fa', borderRadius: '0.75rem', padding: '0.875rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px', background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white, fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                    {(tiket.user?.nama || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: C.dark, margin: 0 }}>{tiket.user?.nama || '—'}</p>
                    <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0.1rem 0 0' }}>{tiket.user?.email || '—'}</p>
                    <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0.1rem 0 0' }}>ID Akun: {tiket.userId}</p>
                  </div>
                </div>
              </section>

              {/* Beasiswa */}
              {tiket.beasiswa?.judul && (
                <section>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Beasiswa Terkait</p>
                  <p style={{ fontSize: '0.875rem', color: C.dark, fontWeight: 500 }}>🎓 {tiket.beasiswa.judul}</p>
                </section>
              )}

              {/* Message history */}
              <section>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>Message History</p>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.75rem', padding: '0.875rem 1rem' }}>
                  <p style={{ fontSize: '0.75rem', color: '#3b82f6', marginBottom: '0.375rem', fontWeight: 600 }}>
                    Pelapor · {new Date(tiket.tanggalLapor).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#1e40af', lineHeight: 1.65, margin: 0 }}>
                    {tiket.deskripsi}
                  </p>
                </div>
              </section>

              {/* Status dropdown */}
              <section>
                <label htmlFor="panel-status" style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem' }}>
                  Ubah Status
                </label>
                <select
                  id="panel-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{
                    width: '100%', padding: '0.625rem 0.875rem', fontSize: '0.875rem',
                    borderRadius: '0.625rem', border: '1.5px solid #d1d5db',
                    outline: 'none', color: C.dark, background: C.white,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </section>

              {/* Error */}
              {err && (
                <p style={{ fontSize: '0.8125rem', color: C.red, margin: 0 }}>⚠ {err}</p>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '0.625rem', borderRadius: '0.625rem',
                  border: '1.5px solid #d1d5db', background: C.white,
                  color: '#374151', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                }}
              >Batal</button>
              <button
                id="btn-send-reply"
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 2, padding: '0.625rem', borderRadius: '0.625rem', border: 'none',
                  background: saving ? '#9ca3af' : `linear-gradient(135deg,${C.blue},#003d82)`,
                  color: C.white, fontWeight: 700, fontSize: '0.875rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}
              >
                {saving ? (
                  <>
                    <svg style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                      <path fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Menyimpan...
                  </>
                ) : 'Update Status'}
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
