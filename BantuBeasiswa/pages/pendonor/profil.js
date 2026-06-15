import { useState, useEffect } from 'react';
import Head from 'next/head';
import PendonorLayout from '../../components/layouts/PendonorLayout';
import { withPendonorAuth } from '../../lib/auth';

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  blue : '#0056b3',
  gold : '#ffc107',
  dark : '#333333',
  white: '#ffffff',
  gray : '#6b7280',
  green: '#059669',
  red  : '#dc2626',
  light: '#f8f9fa',
};

// ─── Input Field Component ────────────────────────────────────────────────────
function FormField({ label, id, required, children, hint }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold mb-1.5" style={{ color: C.dark }}>
        {label} {required && <span style={{ color: C.red }}>*</span>}
      </label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: C.gray }}>{hint}</p>}
    </div>
  );
}

// ─── Input style ──────────────────────────────────────────────────────────────
const inputStyle = {
  width          : '100%',
  padding        : '0.625rem 0.875rem',
  border         : '1.5px solid #e5e7eb',
  borderRadius   : '0.5rem',
  fontSize       : '0.9rem',
  color          : C.dark,
  backgroundColor: C.white,
  outline        : 'none',
  transition     : 'border-color 0.15s',
};

// ─── Alert Banner ─────────────────────────────────────────────────────────────
function Alert({ type, message }) {
  if (!message) return null;
  const styles = {
    success: { bg: '#d1fae5', border: '#6ee7b7', color: '#065f46', icon: '✓' },
    error  : { bg: '#fee2e2', border: '#fca5a5', color: '#991b1b', icon: '✕' },
  }[type] ?? { bg: '#f3f4f6', border: '#d1d5db', color: '#374151', icon: 'ℹ' };

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-lg text-sm font-medium mb-5"
      style={{ backgroundColor: styles.bg, border: `1px solid ${styles.border}`, color: styles.color }}
    >
      <span className="font-bold text-base leading-5">{styles.icon}</span>
      <span>{message}</span>
    </div>
  );
}

// ─── Info Card (read-only saat bukan edit mode) ───────────────────────────────
function InfoCard({ label, value, icon }) {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-lg"
      style={{ backgroundColor: C.light, border: '1px solid #e5e7eb' }}
    >
      {icon && <span style={{ fontSize: '1.1rem', marginTop: '0.05rem' }}>{icon}</span>}
      <div>
        <p className="text-xs mb-0.5" style={{ color: C.gray }}>{label}</p>
        <p className="text-sm font-semibold break-words" style={{ color: value ? C.dark : C.gray }}>
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfilPendonorPage({ user, isPending }) {
  const [profil, setProfil]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [alert, setAlert]     = useState({ type: '', message: '' });

  const [form, setForm] = useState({
    statusOrganisasi: '',
    kontak          : '',
    alamat          : '',
  });

  // ── Fetch profil ─────────────────────────────────────────────────────────────
  const fetchProfil = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pendonor/profil');
      if (!res.ok) throw new Error('Gagal memuat profil');
      const data = await res.json();
      setProfil(data);
      setForm({
        statusOrganisasi: data.statusOrganisasi ?? '',
        kontak          : data.kontak ?? '',
        alamat          : data.alamat ?? '',
      });
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfil(); }, []);

  // ── Submit update ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert({ type: '', message: '' });

    if (!form.statusOrganisasi.trim()) {
      setAlert({ type: 'error', message: 'Nama organisasi wajib diisi.' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/pendonor/profil', {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyimpan');

      setAlert({ type: 'success', message: 'Profil berhasil diperbarui!' });
      setEditMode(false);
      await fetchProfil(); // refresh data
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── Cancel edit ───────────────────────────────────────────────────────────────
  const handleCancel = () => {
    setEditMode(false);
    setAlert({ type: '', message: '' });
    if (profil) {
      setForm({
        statusOrganisasi: profil.statusOrganisasi ?? '',
        kontak          : profil.kontak ?? '',
        alamat          : profil.alamat ?? '',
      });
    }
  };

  // ── Skeleton Loader ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Head><title>Profil Pendonor · BantuBeasiswa</title></Head>
        <PendonorLayout user={user} isPending={isPending}>
          <div className="mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="max-w-2xl space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </PendonorLayout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Profil Pendonor · BantuBeasiswa</title>
        <meta name="description" content="Kelola profil pendonor BantuBeasiswa" />
      </Head>

      <PendonorLayout user={user} isPending={isPending}>

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-7 rounded-full" style={{ backgroundColor: C.gold }} />
            <h1 className="text-2xl font-extrabold" style={{ color: C.dark }}>
              Profil Pendonor
            </h1>
          </div>
          <p className="text-sm ml-4" style={{ color: C.gray }}>
            Informasi organisasi Anda yang tampil pada program beasiswa
          </p>
        </div>

        <div className="max-w-2xl">

          {/* ── Alert ──────────────────────────────────────────────────────── */}
          <Alert type={alert.type} message={alert.message} />

          {/* ── Profile Card ─────────────────────────────────────────────── */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: C.white, borderColor: '#e5e7eb' }}
          >
            {/* Header card */}
            <div
              className="px-6 py-5 flex items-center justify-between"
              style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#fafafa' }}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-extrabold shrink-0"
                  style={{ backgroundColor: C.blue, color: C.white }}
                >
                  {(profil?.statusOrganisasi || 'P')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-base" style={{ color: C.dark }}>
                    {profil?.statusOrganisasi || 'Organisasi belum diisi'}
                  </p>
                  <p className="text-sm" style={{ color: C.gray }}>
                    {profil?.email}
                  </p>
                </div>
              </div>

              {/* Edit / Batal tombol */}
              {!editMode ? (
                <button
                  id="btn-edit-profil"
                  onClick={() => { setEditMode(true); setAlert({ type: '', message: '' }); }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150"
                  style={{ backgroundColor: C.blue, color: C.white, border: 'none', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#004494'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.blue; }}
                >
                  ✏️ Edit Profil
                </button>
              ) : (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150"
                  style={{ backgroundColor: C.white, color: C.gray, border: '1.5px solid #e5e7eb', cursor: 'pointer' }}
                >
                  Batal
                </button>
              )}
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              {editMode ? (
                /* ── Form Edit ─────────────────────────────────────────────── */
                <form id="form-profil-pendonor" onSubmit={handleSubmit} className="space-y-5">

                  <FormField id="statusOrganisasi" label="Nama Organisasi / Perusahaan" required>
                    <input
                      id="statusOrganisasi"
                      type="text"
                      value={form.statusOrganisasi}
                      onChange={(e) => setForm(p => ({ ...p, statusOrganisasi: e.target.value }))}
                      placeholder="Contoh: PT Inovasi Bangsa Tbk."
                      style={inputStyle}
                      onFocus={(e)  => { e.target.style.borderColor = C.blue; }}
                      onBlur={(e)   => { e.target.style.borderColor = '#e5e7eb'; }}
                      required
                    />
                  </FormField>

                  <FormField
                    id="kontak"
                    label="Nomor Kontak"
                    hint="Nomor telepon atau WhatsApp yang bisa dihubungi pendaftar"
                  >
                    <input
                      id="kontak"
                      type="text"
                      value={form.kontak}
                      onChange={(e) => setForm(p => ({ ...p, kontak: e.target.value }))}
                      placeholder="Contoh: 031-77789012"
                      style={inputStyle}
                      onFocus={(e)  => { e.target.style.borderColor = C.blue; }}
                      onBlur={(e)   => { e.target.style.borderColor = '#e5e7eb'; }}
                    />
                  </FormField>

                  <FormField
                    id="alamat"
                    label="Alamat"
                    hint="Alamat kantor atau domisili organisasi"
                  >
                    <textarea
                      id="alamat"
                      value={form.alamat}
                      onChange={(e) => setForm(p => ({ ...p, alamat: e.target.value }))}
                      placeholder="Contoh: Jl. Pemuda No. 45, Surabaya"
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                      onFocus={(e)  => { e.target.style.borderColor = C.blue; }}
                      onBlur={(e)   => { e.target.style.borderColor = '#e5e7eb'; }}
                    />
                  </FormField>

                  {/* Read-only: Email */}
                  <FormField id="email" label="Email Akun" hint="Email tidak dapat diubah di sini">
                    <input
                      id="email"
                      type="email"
                      value={profil?.email ?? ''}
                      readOnly
                      style={{
                        ...inputStyle,
                        backgroundColor: '#f3f4f6',
                        color          : C.gray,
                        cursor         : 'not-allowed',
                      }}
                    />
                  </FormField>

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-5 py-2.5 rounded-lg text-sm font-semibold border transition-colors"
                      style={{ borderColor: '#e5e7eb', color: C.gray, cursor: 'pointer', backgroundColor: C.white }}
                    >
                      Batal
                    </button>
                    <button
                      id="btn-simpan-profil"
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150"
                      style={{
                        backgroundColor: saving ? '#9ca3af' : C.green,
                        color          : C.white,
                        border         : 'none',
                        cursor         : saving ? 'not-allowed' : 'pointer',
                      }}
                      onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = '#047857'; }}
                      onMouseLeave={(e) => { if (!saving) e.currentTarget.style.backgroundColor = C.green; }}
                    >
                      {saving ? 'Menyimpan...' : '✓ Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              ) : (
                /* ── View Mode ─────────────────────────────────────────────── */
                <div className="space-y-3">
                  <InfoCard icon="🏢" label="Nama Organisasi / Perusahaan" value={profil?.statusOrganisasi} />
                  <InfoCard icon="📞" label="Nomor Kontak"                value={profil?.kontak} />
                  <InfoCard icon="📍" label="Alamat"                      value={profil?.alamat} />
                  <InfoCard icon="✉️" label="Email Akun"                  value={profil?.email} />
                </div>
              )}
            </div>
          </div>

          {/* ── Info note ────────────────────────────────────────────────────── */}
          {!editMode && (
            <p className="text-xs text-center mt-4" style={{ color: C.gray }}>
              Informasi di atas akan ditampilkan kepada mahasiswa pada halaman detail beasiswa Anda.
            </p>
          )}

        </div>
      </PendonorLayout>
    </>
  );
}

// ─── SSR Auth Guard ───────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  return withPendonorAuth(context, { allowPending: true });
}
