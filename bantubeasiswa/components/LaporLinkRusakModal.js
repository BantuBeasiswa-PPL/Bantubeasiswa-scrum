import { useState, useEffect } from 'react';

const C = {
  blue : '#0056b3',
  red  : '#dc2626',
  dark : '#333333',
  gray : '#6b7280',
  white: '#ffffff',
};

/**
 * LaporLinkRusakModal
 * Props:
 *   isOpen       {boolean}
 *   onClose      {() => void}
 *   beasiswaId   {number|string}
 *   beasiswaNama {string}
 *   userId       {number|null}
 *   onSuccess    {() => void}
 */
export default function LaporLinkRusakModal({
  isOpen,
  onClose,
  beasiswaId,
  beasiswaNama,
  onSuccess,
}) {
  const [deskripsi, setDeskripsi] = useState('');
  const [loading,   setLoading  ] = useState(false);
  const [error,     setError    ] = useState('');
  const [success,   setSuccess  ] = useState(false);

  // Reset state setiap kali modal dibuka
  useEffect(() => {
    if (isOpen) {
      setDeskripsi('');
      setError('');
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  // Tutup modal dengan Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    if (loading) return;
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmed = deskripsi.trim();
    if (trimmed.length < 20) {
      setError('Deskripsi minimal 20 karakter.');
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch('/api/laporan-link-rusak', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ beasiswaId, deskripsi: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Gagal mengirim laporan.');
        return;
      }

      setSuccess(true);
      onSuccess?.();
      // Tutup otomatis setelah 1.5 detik
      setTimeout(() => onClose(), 1500);
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const charCount = deskripsi.trim().length;
  const kurang    = Math.max(0, 20 - charCount);

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={handleClose}
        style={{
          position       : 'fixed',
          inset          : 0,
          backgroundColor: 'rgba(0,0,0,0.45)',
          zIndex         : 50,
          display        : 'flex',
          alignItems     : 'center',
          justifyContent : 'center',
          padding        : '1rem',
          animation      : 'fadeIn 0.15s ease',
        }}
      >
        {/* ── Modal Panel ── */}
        <div
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          style={{
            backgroundColor: C.white,
            borderRadius   : '1rem',
            width          : '100%',
            maxWidth       : '480px',
            boxShadow      : '0 20px 60px rgba(0,0,0,0.2)',
            overflow       : 'hidden',
            animation      : 'slideUp 0.2s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              display        : 'flex',
              alignItems     : 'center',
              justifyContent : 'space-between',
              padding        : '1.125rem 1.5rem',
              borderBottom   : '1px solid #f3f4f6',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <h2
                id="modal-title"
                style={{ fontSize: '1rem', fontWeight: 700, color: C.dark }}
              >
                Laporkan Link Rusak
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              aria-label="Tutup modal"
              style={{
                background   : 'none',
                border       : 'none',
                cursor       : loading ? 'not-allowed' : 'pointer',
                color        : '#9ca3af',
                fontSize     : '1.25rem',
                lineHeight   : 1,
                padding      : '0.25rem',
                borderRadius : '0.375rem',
                transition   : 'color 0.15s',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.color = C.dark; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '1.5rem' }}>

            {/* Nama beasiswa */}
            <div
              style={{
                backgroundColor: '#f8faff',
                border         : '1px solid #e0eaff',
                borderRadius   : '0.625rem',
                padding        : '0.75rem 1rem',
                marginBottom   : '1.25rem',
              }}
            >
              <p style={{ fontSize: '0.75rem', color: C.gray, marginBottom: '0.2rem' }}>
                Beasiswa yang dilaporkan
              </p>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: C.blue, wordBreak: 'break-word' }}>
                {beasiswaNama}
              </p>
            </div>

            {/* Success state */}
            {success ? (
              <div
                style={{
                  display        : 'flex',
                  flexDirection  : 'column',
                  alignItems     : 'center',
                  justifyContent : 'center',
                  padding        : '1.5rem 0',
                  gap            : '0.75rem',
                  textAlign      : 'center',
                }}
              >
                <span style={{ fontSize: '2.5rem' }}>✅</span>
                <p style={{ fontWeight: 700, color: '#065f46', fontSize: '1rem' }}>
                  Laporan berhasil dikirim!
                </p>
                <p style={{ color: C.gray, fontSize: '0.875rem' }}>
                  Terima kasih, tim kami akan segera menindaklanjuti.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <label
                  htmlFor="lapor-deskripsi"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: C.dark, marginBottom: '0.5rem' }}
                >
                  Deskripsi Masalah <span style={{ color: C.red }}>*</span>
                </label>
                <textarea
                  id="lapor-deskripsi"
                  value={deskripsi}
                  onChange={(e) => { setDeskripsi(e.target.value); setError(''); }}
                  rows={4}
                  placeholder="Contoh: Link pendaftaran mengarah ke halaman 404, atau tidak bisa diakses sejak tanggal..."
                  disabled={loading}
                  style={{
                    width          : '100%',
                    boxSizing      : 'border-box',
                    padding        : '0.75rem 1rem',
                    borderRadius   : '0.625rem',
                    border         : `1.5px solid ${error ? '#fca5a5' : '#e5e7eb'}`,
                    fontSize       : '0.9rem',
                    color          : C.dark,
                    resize         : 'vertical',
                    outline        : 'none',
                    transition     : 'border-color 0.15s',
                    backgroundColor: loading ? '#f9fafb' : C.white,
                  }}
                  onFocus={(e)  => { if (!error) e.target.style.borderColor = C.blue; }}
                  onBlur={(e)   => { if (!error) e.target.style.borderColor = '#e5e7eb'; }}
                />

                {/* Counter karakter */}
                <p style={{
                  fontSize : '0.75rem',
                  marginTop: '0.375rem',
                  color    : kurang > 0 ? '#d97706' : '#6b7280',
                  textAlign: 'right',
                }}>
                  {kurang > 0
                    ? `Minimal ${kurang} karakter lagi`
                    : `${charCount} karakter`}
                </p>

                {/* Error message */}
                {error && (
                  <div
                    style={{
                      marginTop      : '0.75rem',
                      padding        : '0.625rem 0.875rem',
                      borderRadius   : '0.5rem',
                      backgroundColor: '#fff1f2',
                      border         : '1px solid #fecdd3',
                      color          : C.red,
                      fontSize       : '0.8125rem',
                      display        : 'flex',
                      alignItems     : 'center',
                      gap            : '0.5rem',
                    }}
                    role="alert"
                  >
                    <span>⚠</span> {error}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    style={{
                      flex           : 1,
                      padding        : '0.75rem',
                      borderRadius   : '0.625rem',
                      border         : '1.5px solid #e5e7eb',
                      backgroundColor: C.white,
                      color          : C.gray,
                      fontWeight     : 600,
                      fontSize       : '0.9rem',
                      cursor         : loading ? 'not-allowed' : 'pointer',
                      transition     : 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.borderColor = '#9ca3af'; e.currentTarget.style.color = C.dark; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = C.gray; }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex           : 1,
                      padding        : '0.75rem',
                      borderRadius   : '0.625rem',
                      border         : 'none',
                      backgroundColor: loading ? '#9ca3af' : C.red,
                      color          : C.white,
                      fontWeight     : 700,
                      fontSize       : '0.9rem',
                      cursor         : loading ? 'not-allowed' : 'pointer',
                      transition     : 'background-color 0.15s',
                      display        : 'flex',
                      alignItems     : 'center',
                      justifyContent : 'center',
                      gap            : '0.5rem',
                    }}
                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#b91c1c'; }}
                    onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = C.red; }}
                  >
                    {loading ? (
                      <>
                        <span style={{
                          width       : '14px',
                          height      : '14px',
                          border      : '2px solid rgba(255,255,255,0.4)',
                          borderTop   : '2px solid white',
                          borderRadius: '50%',
                          display     : 'inline-block',
                          animation   : 'spin 0.7s linear infinite',
                        }} />
                        Mengirim...
                      </>
                    ) : 'Kirim Laporan'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin    { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
