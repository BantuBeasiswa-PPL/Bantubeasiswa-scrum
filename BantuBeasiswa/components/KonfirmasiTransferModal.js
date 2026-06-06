import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/db';

const C = {
  blue: '#0056b3',
  blueLight: '#eff6ff',
  blueBorder: '#bfdbfe',
  gold: '#ffc107',
  dark: '#333333',
  gray: '#6b7280',
  grayLight: '#f3f4f6',
  white: '#ffffff',
  red: '#dc2626',
  redLight: '#fff1f2',
  redBorder: '#fecdd3',
  green: '#059669',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];

/**
 * KonfirmasiTransferModal
 * Props:
 *   isOpen       {boolean}
 *   onClose      {() => void}
 *   penyaluran   {object} - Row dari penyaluran_dana
 *   pendonorId   {number|string}
 *   onSuccess    {() => void}
 */
export default function KonfirmasiTransferModal({
  isOpen,
  onClose,
  penyaluran,
  pendonorId,
  onSuccess,
}) {
  const fileInputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [idTransaksi, setIdTransaksi] = useState('');
  const [tanggalTransfer, setTanggalTransfer] = useState('');
  const [certified, setCertified] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const todayStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  // Reset state saat modal dibuka/ditutup
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setIdTransaksi('');
      setTanggalTransfer('');
      setCertified(false);
      setError('');
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    if (loading) return;
    onClose();
  }

  function handleFile(selectedFile) {
    setError('');
    if (!selectedFile) return;

    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setError('Format file tidak didukung. Harap unggah berkas PNG, JPG, JPEG, atau PDF.');
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('Ukuran file melebihi 5MB. Harap unggah berkas yang lebih kecil.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
  }

  function handleFileInput(e) {
    handleFile(e.target.files?.[0] || null);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0] || null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file || !idTransaksi.trim() || !tanggalTransfer || !certified) {
      setError('Harap lengkapi semua kolom dan centang verifikasi.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Cek status terbaru via client Supabase untuk prevent konfirmasi ganda
      const { data: latestRow, error: checkError } = await supabase
        .from('penyaluran_dana')
        .select('status')
        .eq('penyaluranId', penyaluran.penyaluranId)
        .maybeSingle();

      if (checkError) {
        throw new Error('Gagal memeriksa status pembayaran terbaru.');
      }

      if (latestRow?.status === 'confirmed') {
        setError('Penyaluran sudah dikonfirmasi sebelumnya');
        setLoading(false);
        return;
      }

      // 2. Upload file bukti ke Supabase Storage
      const ext = file.name.split('.').pop().toLowerCase();
      const storagePath = `transfer/${pendonorId}_${penyaluran.penyaluranId}_${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('dokumen')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) {
        console.error('[Storage Upload Error]', uploadError);
        throw new Error(`Gagal mengunggah file bukti transfer ke storage: ${uploadError.message}`);
      }

      // 3. Dapatkan URL Publik
      const { data: urlData } = supabase.storage.from('dokumen').getPublicUrl(storagePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) {
        throw new Error('Gagal mendapatkan URL publik untuk file bukti transfer.');
      }

      // 4. Update data penyaluran + insert notifikasi melalui API route
      const response = await fetch('/api/pendonor/pembayaran/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          penyaluranId: penyaluran.penyaluranId,
          buktiTransferUrl: publicUrl,
          idTransaksi: idTransaksi.trim(),
          tanggalPenyaluran: tanggalTransfer,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Gagal menyimpan konfirmasi pembayaran.');
      }

      // 5. Sukses
      setSuccess(true);
      onSuccess?.();
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('[Submit Confirmation Error]', err);
      setError(err.message || 'Terjadi kesalahan tidak terduga.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const isFormValid = file && idTransaksi.trim() && tanggalTransfer && certified && !loading;

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(3px)',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* ── Modal Container ── */}
        <div
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          style={{
            backgroundColor: C.white,
            borderRadius: '1.25rem',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f3f4f6',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.3rem' }}>💳</span>
              <h2 id="modal-title" style={{ fontSize: '1.1rem', fontWeight: 800, color: C.dark }}>
                Konfirmasi Transfer Dana
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              aria-label="Tutup modal"
              style={{
                background: 'none',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                color: C.gray,
                fontSize: '1.25rem',
                padding: '0.25rem',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.color = C.dark;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = C.gray;
              }}
            >
              ✕
            </button>
          </div>

          {/* Form / Content Area */}
          <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
            {/* Rincian Penyaluran */}
            <div
              style={{
                backgroundColor: C.blueLight,
                border: `1px solid ${C.blueBorder}`,
                borderRadius: '0.75rem',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
              }}
            >
              <div style={{ gridColumn: 'span 2' }}>
                <p style={{ fontSize: '0.75rem', color: C.gray, textTransform: 'uppercase', fontWeight: 700 }}>
                  Program Beasiswa
                </p>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: C.blue }}>
                  {penyaluran?.beasiswa?.judul}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: C.gray }}>Jumlah Penerima</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: C.dark }}>
                  {penyaluran?.jumlahPenerima} Mahasiswa
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: C.gray }}>Total Transfer</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: C.green }}>
                  Rp {penyaluran?.jumlahDana?.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {success ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  gap: '0.75rem',
                }}
              >
                <span style={{ fontSize: '3rem', animation: 'bounce 1s infinite' }}>✅</span>
                <h3 style={{ fontWeight: 800, color: C.green, fontSize: '1.2rem' }}>
                  Konfirmasi Berhasil!
                </h3>
                <p style={{ color: C.gray, fontSize: '0.9rem' }}>
                  Bukti transfer telah disimpan. Penerima beasiswa akan segera mendapatkan notifikasi.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Drag and Drop Area */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: C.dark, marginBottom: '0.5rem' }}>
                    Unggah Bukti Transfer <span style={{ color: C.red }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!loading) fileInputRef.current?.click();
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
                      width: '100%',
                      minHeight: '130px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `2px dashed ${dragActive ? C.blue : '#d1d5db'}`,
                      borderRadius: '0.75rem',
                      backgroundColor: dragActive ? C.blueLight : C.grayLight,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      padding: '1.25rem',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!loading && !dragActive) e.currentTarget.style.borderColor = C.blue;
                    }}
                    onMouseLeave={(e) => {
                      if (!loading && !dragActive) e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                  >
                    <span style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>📤</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: C.dark }}>
                      {file ? file.name : 'Klik atau seret file ke sini untuk mengunggah'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: C.gray, marginTop: '0.25rem' }}>
                      PNG, JPG, JPEG, atau PDF (Maksimal 5MB)
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                    disabled={loading}
                  />
                </div>

                {/* ID Transaksi */}
                <div>
                  <label htmlFor="id-transaksi" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: C.dark, marginBottom: '0.5rem' }}>
                    ID Transaksi <span style={{ color: C.red }}>*</span>
                  </label>
                  <input
                    id="id-transaksi"
                    type="text"
                    required
                    placeholder="Contoh: TRX129847192"
                    value={idTransaksi}
                    onChange={(e) => {
                      setIdTransaksi(e.target.value);
                      setError('');
                    }}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.6rem',
                      border: '1.5px solid #d1d5db',
                      fontSize: '0.9rem',
                      outline: 'none',
                      backgroundColor: loading ? C.grayLight : C.white,
                      color: C.dark,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = C.blue)}
                    onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                  />
                </div>

                {/* Tanggal Transfer */}
                <div>
                  <label htmlFor="tanggal-transfer" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: C.dark, marginBottom: '0.5rem' }}>
                    Tanggal Transfer <span style={{ color: C.red }}>*</span>
                  </label>
                  <input
                    id="tanggal-transfer"
                    type="date"
                    required
                    max={todayStr}
                    value={tanggalTransfer}
                    onChange={(e) => {
                      setTanggalTransfer(e.target.value);
                      setError('');
                    }}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.6rem',
                      border: '1.5px solid #d1d5db',
                      fontSize: '0.9rem',
                      outline: 'none',
                      backgroundColor: loading ? C.grayLight : C.white,
                      color: C.dark,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = C.blue)}
                    onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                  />
                </div>

                {/* Checkbox */}
                <div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '0.6rem',
                      backgroundColor: C.grayLight,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={certified}
                      onChange={(e) => {
                        setCertified(e.target.checked);
                        setError('');
                      }}
                      disabled={loading}
                      style={{
                        marginTop: '0.2rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        accentColor: C.blue,
                      }}
                    />
                    <span style={{ fontSize: '0.825rem', color: C.dark, lineHeight: '1.4', fontWeight: 500 }}>
                      Pastikan nominal transfer sesuai dengan tagihan mahasiswa
                    </span>
                  </label>
                </div>

                {/* Error Box */}
                {error && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '0.6rem',
                      backgroundColor: C.redLight,
                      border: `1px solid ${C.redBorder}`,
                      color: C.red,
                      fontSize: '0.825rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontWeight: 500,
                    }}
                    role="alert"
                  >
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid #f3f4f6', paddingTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: '0.6rem',
                      border: '1.5px solid #e5e7eb',
                      backgroundColor: C.white,
                      color: C.gray,
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.borderColor = '#9ca3af';
                        e.currentTarget.style.color = C.dark;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.color = C.gray;
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: '0.6rem',
                      border: 'none',
                      backgroundColor: isFormValid ? C.blue : '#9ca3af',
                      color: C.white,
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: isFormValid ? 'pointer' : 'not-allowed',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                    onMouseEnter={(e) => {
                      if (isFormValid) e.currentTarget.style.backgroundColor = '#004494';
                    }}
                    onMouseLeave={(e) => {
                      if (isFormValid) e.currentTarget.style.backgroundColor = C.blue;
                    }}
                  >
                    {loading ? (
                      <>
                        <span
                          style={{
                            width: '14px',
                            height: '14px',
                            border: '2px solid rgba(255,255,255,0.4)',
                            borderTop: '2px solid white',
                            borderRadius: '50%',
                            display: 'inline-block',
                            animation: 'spin 0.8s linear infinite',
                          }}
                        />
                        Memproses...
                      </>
                    ) : (
                      'Konfirmasi & Simpan'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Style Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
