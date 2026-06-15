import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

// ─── Color Tokens ─────────────────────────────────────────────────────────────
const C = {
  blue  : '#0056b3',
  gold  : '#ffc107',
  dark  : '#333333',
  green : '#059669',
  red   : '#dc2626',
  white : '#ffffff',
};

const MIN_CHAR = 20;
const TOAST_DURATION_MS = 4500;

// ─── Toast Notification ───────────────────────────────────────────────────────
function Toast({ message, type = 'success', onDismiss }) {
  const styles = {
    success: { bg: '#ecfdf5', border: '#6ee7b7', icon: '✅', text: '#065f46' },
    error  : { bg: '#fff1f2', border: '#fecdd3', icon: '❌', text: '#be123c' },
    warning: { bg: '#fffbeb', border: '#fde68a', icon: '⚠️', text: '#92400e' },
  };
  const s = styles[type] || styles.success;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position       : 'fixed',
        bottom         : '1.5rem',
        right          : '1.5rem',
        zIndex         : 9999,
        backgroundColor: s.bg,
        border         : `1.5px solid ${s.border}`,
        borderRadius   : '0.75rem',
        padding        : '0.875rem 1.125rem',
        maxWidth       : '22rem',
        display        : 'flex',
        alignItems     : 'flex-start',
        gap            : '0.625rem',
        boxShadow      : '0 8px 24px rgba(0,0,0,0.12)',
        animation      : 'toastSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <span style={{ fontSize: '1rem', lineHeight: 1.5 }}>{s.icon}</span>
      <p style={{ fontSize: '0.875rem', color: s.text, flex: 1, lineHeight: 1.5 }}>
        {message}
      </p>
      <button
        onClick={onDismiss}
        aria-label="Tutup notifikasi"
        style={{
          background: 'none',
          border    : 'none',
          cursor    : 'pointer',
          color     : s.text,
          opacity   : 0.6,
          padding   : '0 0.25rem',
          fontSize  : '1rem',
          lineHeight : 1,
        }}
      >
        ×
      </button>

      {/* Keyframe animation via inline <style> */}
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(1rem) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
/**
 * LaporLinkRusakModal
 *
 * @param {{
 *   isOpen       : boolean,
 *   onClose      : () => void,
 *   beasiswaId   : number | string,
 *   beasiswaNama : string,
 *   userId       : number | null,
 *   onSuccess    : () => void,
 * }} props
 */
export default function LaporLinkRusakModal({
  isOpen,
  onClose,
  beasiswaId,
  beasiswaNama = '',
  userId,
  onSuccess,
}) {
  const router = useRouter();

  const [deskripsi,  setDeskripsi ] = useState('');
  const [loading,    setLoading   ] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [toast,      setToast     ] = useState(null); // { message, type }

  // Reset form setiap kali modal dibuka
  useEffect(() => {
    if (isOpen) {
      setDeskripsi('');
      setFieldError('');
      setLoading(false);
    }
  }, [isOpen]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // Tutup modal dengan Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Validasi real-time saat user mengetik
  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setDeskripsi(val);
    if (fieldError && val.trim().length >= MIN_CHAR) {
      setFieldError('');
    }
  }, [fieldError]);

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Guard: belum login
    if (!userId) {
      onClose();
      setToast({ message: 'Login dulu untuk melaporkan masalah.', type: 'warning' });
      setTimeout(() => router.push('/login'), 1800);
      return;
    }

    // Validasi panjang
    if (deskripsi.trim().length < MIN_CHAR) {
      setFieldError(`Deskripsi minimal ${MIN_CHAR} karakter. Sekarang ${deskripsi.trim().length} karakter.`);
      return;
    }

    setLoading(true);
    setFieldError('');

    try {
      const res = await fetch('/api/laporan-link-rusak', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          beasiswaId : beasiswaId,
          deskripsi  : deskripsi.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Terjadi kesalahan. Coba lagi.');
      }

      // Berhasil
      onClose();
      setToast({
        message: 'Laporan terkirim! Tim kami akan segera menindaklanjuti.',
        type   : 'success',
      });
      onSuccess?.();
    } catch (err) {
      setFieldError(err.message || 'Gagal mengirim laporan. Periksa koneksi kamu.');
    } finally {
      setLoading(false);
    }
  };

  const charCount  = deskripsi.trim().length;
  const isValid    = charCount >= MIN_CHAR;
  const charRemain = Math.max(0, MIN_CHAR - charCount);

  return (
    <>
      {/* ── Toast (rendered outside modal so it persists after modal closes) ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* ── Modal Backdrop ──────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          id="modal-lapor-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-lapor-title"
          style={{
            position       : 'fixed',
            inset          : 0,
            zIndex         : 999,
            backgroundColor: 'rgba(0,0,0,0.45)',
            backdropFilter : 'blur(3px)',
            display        : 'flex',
            alignItems     : 'center',
            justifyContent : 'center',
            padding        : '1rem',
            animation      : 'fadeIn 0.2s ease',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <style>{`
            @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp   { from { opacity: 0; transform: translateY(1.5rem) scale(0.97); }
                                   to   { opacity: 1; transform: translateY(0)      scale(1);    } }
          `}</style>

          {/* ── Modal Card ────────────────────────────────────────────────── */}
          <div
            style={{
              backgroundColor: C.white,
              borderRadius   : '1rem',
              width          : '100%',
              maxWidth       : '30rem',
              boxShadow      : '0 20px 60px rgba(0,0,0,0.2)',
              animation      : 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              overflow       : 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                background   : `linear-gradient(135deg, ${C.blue} 0%, #003d82 100%)`,
                padding      : '1.25rem 1.5rem',
                display      : 'flex',
                alignItems   : 'center',
                justifyContent: 'space-between',
                gap          : '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🔗</span>
                <div>
                  <h2
                    id="modal-lapor-title"
                    style={{ color: C.white, fontWeight: 700, fontSize: '1rem', margin: 0 }}
                  >
                    Laporkan Masalah
                  </h2>
                  {beasiswaNama && (
                    <p
                      style={{
                        color     : 'rgba(255,255,255,0.7)',
                        fontSize  : '0.75rem',
                        marginTop : '0.125rem',
                        maxWidth  : '18rem',
                        overflow  : 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {beasiswaNama}
                    </p>
                  )}
                </div>
              </div>

              {/* Close button */}
              <button
                id="modal-lapor-close"
                onClick={onClose}
                aria-label="Tutup modal"
                style={{
                  background   : 'rgba(255,255,255,0.15)',
                  border       : 'none',
                  borderRadius : '0.5rem',
                  width        : '2rem',
                  height       : '2rem',
                  cursor       : 'pointer',
                  color        : C.white,
                  fontSize     : '1.25rem',
                  display      : 'flex',
                  alignItems   : 'center',
                  justifyContent: 'center',
                  flexShrink   : 0,
                  transition   : 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              {/* Info banner */}
              <div
                style={{
                  backgroundColor: '#eff6ff',
                  border         : '1px solid #bfdbfe',
                  borderRadius   : '0.625rem',
                  padding        : '0.75rem 1rem',
                  marginBottom   : '1.25rem',
                  display        : 'flex',
                  alignItems     : 'flex-start',
                  gap            : '0.5rem',
                }}
              >
                <span style={{ fontSize: '0.9rem', marginTop: '0.05rem' }}>ℹ️</span>
                <p style={{ fontSize: '0.8125rem', color: '#1e40af', lineHeight: 1.5, margin: 0 }}>
                  Laporkan link pendaftaran yang tidak bisa dibuka, error, atau sudah berakhir agar tim kami dapat segera memperbaikinya.
                </p>
              </div>

              {/* Textarea */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="lapor-deskripsi"
                  style={{
                    display      : 'block',
                    fontSize     : '0.875rem',
                    fontWeight   : 600,
                    color        : C.dark,
                    marginBottom : '0.5rem',
                  }}
                >
                  Deskripsi Masalah <span style={{ color: C.red }}>*</span>
                </label>
                <textarea
                  id="lapor-deskripsi"
                  name="deskripsi"
                  value={deskripsi}
                  onChange={handleChange}
                  disabled={loading}
                  rows={5}
                  placeholder="Jelaskan masalah yang kamu temukan, misal: link tidak bisa dibuka, halaman error 404, dll."
                  style={{
                    width          : '100%',
                    resize         : 'vertical',
                    padding        : '0.75rem 1rem',
                    fontSize       : '0.875rem',
                    borderRadius   : '0.625rem',
                    border         : `1.5px solid ${fieldError ? C.red : '#d1d5db'}`,
                    outline        : 'none',
                    color          : C.dark,
                    backgroundColor: loading ? '#f9fafb' : C.white,
                    transition     : 'border-color 0.2s, box-shadow 0.2s',
                    lineHeight     : 1.6,
                    boxSizing      : 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = fieldError ? C.red : C.blue;
                    e.target.style.boxShadow   = `0 0 0 3px ${fieldError ? '#fee2e2' : '#dbeafe'}`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = fieldError ? C.red : '#d1d5db';
                    e.target.style.boxShadow   = 'none';
                  }}
                />

                {/* Character counter + error */}
                <div
                  style={{
                    display       : 'flex',
                    justifyContent: 'space-between',
                    alignItems    : 'flex-start',
                    marginTop     : '0.375rem',
                    gap           : '0.5rem',
                  }}
                >
                  {fieldError ? (
                    <p style={{ fontSize: '0.78125rem', color: C.red, margin: 0 }}>
                      {fieldError}
                    </p>
                  ) : (
                    <p style={{ fontSize: '0.78125rem', color: '#9ca3af', margin: 0 }}>
                      {charRemain > 0
                        ? `Kurang ${charRemain} karakter lagi`
                        : '✓ Deskripsi siap dikirim'}
                    </p>
                  )}
                  <span
                    style={{
                      fontSize  : '0.78125rem',
                      color     : isValid ? C.green : '#9ca3af',
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {charCount}/{MIN_CHAR}+
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                {/* Batal */}
                <button
                  type="button"
                  id="modal-lapor-batal"
                  onClick={onClose}
                  disabled={loading}
                  style={{
                    padding        : '0.625rem 1.25rem',
                    borderRadius   : '0.625rem',
                    border         : '1.5px solid #d1d5db',
                    backgroundColor: C.white,
                    color          : '#374151',
                    fontSize       : '0.875rem',
                    fontWeight     : 600,
                    cursor         : loading ? 'not-allowed' : 'pointer',
                    transition     : 'all 0.2s',
                    opacity        : loading ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = C.white;
                  }}
                >
                  Batal
                </button>

                {/* Kirim */}
                <button
                  type="submit"
                  id="modal-lapor-kirim"
                  disabled={loading || !isValid}
                  style={{
                    padding        : '0.625rem 1.375rem',
                    borderRadius   : '0.625rem',
                    border         : 'none',
                    background     : loading || !isValid
                      ? '#9ca3af'
                      : `linear-gradient(135deg, ${C.blue} 0%, #003d82 100%)`,
                    color          : C.white,
                    fontSize       : '0.875rem',
                    fontWeight     : 700,
                    cursor         : loading || !isValid ? 'not-allowed' : 'pointer',
                    transition     : 'all 0.2s',
                    display        : 'flex',
                    alignItems     : 'center',
                    gap            : '0.5rem',
                    boxShadow      : loading || !isValid ? 'none' : '0 2px 8px rgba(0,86,179,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && isValid) e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  {loading ? (
                    <>
                      <svg
                        style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }}
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                        <path
                          fill="white"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                      </svg>
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <svg style={{ width: '0.9rem', height: '0.9rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                      Kirim Laporan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
