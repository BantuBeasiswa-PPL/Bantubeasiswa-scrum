import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// ─── Constants ────────────────────────────────────────────────────────────────
const COLORS = {
  primaryBlue : '#0056b3',
  accentGold  : '#ffc107',
  darkText    : '#333333',
  lightBG     : '#f8f9fa',
  white       : '#ffffff',
};

const ROLES = [
  { value: 'mahasiswa', label: 'Mahasiswa' },
  { value: 'pendonor',  label: 'Pendonor'  },
  { value: 'admin',     label: 'Admin'      },
];

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    text: 'Filter wilayah 3T & 16 Provinsi Afirmasi',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    text: 'Pendaftaran internal & tracking real-time',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    text: 'Penyaluran dana transparan & terverifikasi',
  },
];

// ─── Eye icons for password toggle ───────────────────────────────────────────
function EyeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState('mahasiswa');
  const [email,        setEmail        ] = useState('');
  const [password,     setPassword     ] = useState('');
  const [showPassword, setShowPassword ] = useState(false);
  const [error,        setError        ] = useState('');
  const [loading,      setLoading      ] = useState(false);

  // ── Handle Login ────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/loginAPI', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ email, password, role: selectedRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Login gagal. Periksa kembali email dan password Anda.');
        return;
      }

      router.push(data.redirect || '/');
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Masuk · BantuBeasiswa</title>
        <meta name="description" content="Masuk ke platform BantuBeasiswa — akses beasiswa untuk wilayah 3T dan daerah afirmasi Indonesia." />
      </Head>

      <div className="min-h-screen flex" style={{ backgroundColor: COLORS.lightBG }}>

        {/* ══════════════════════════════════════════════════════════════════
            PANEL KIRI — hidden di mobile
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="hidden lg:flex lg:w-2/5 flex-col justify-between p-10 relative overflow-hidden"
          style={{ backgroundColor: COLORS.primaryBlue }}
        >
          {/* Decorative circles */}
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10"
            style={{ backgroundColor: COLORS.white }}
          />
          <div
            className="absolute bottom-10 -left-16 w-48 h-48 rounded-full opacity-10"
            style={{ backgroundColor: COLORS.accentGold }}
          />

          {/* Top: Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-base shrink-0"
                style={{ backgroundColor: COLORS.accentGold, color: COLORS.primaryBlue }}
              >
                BB
              </div>
              <span className="text-white font-bold text-xl tracking-wide">
                BantuBeasiswa
              </span>
            </div>

            {/* Tagline */}
            <h1 className="text-white font-extrabold text-3xl leading-tight mb-4">
              Akses Pendidikan<br />
              untuk Semua Daerah
            </h1>
            <p className="text-blue-200 text-sm leading-relaxed mb-10">
              Platform terpadu beasiswa untuk masyarakat wilayah 3T dan daerah afirmasi Indonesia.
            </p>

            {/* Feature list */}
            <ul className="space-y-5">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: COLORS.accentGold }}
                  >
                    {f.icon}
                  </div>
                  <p className="text-white text-sm leading-snug pt-1.5">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom: tagline kecil */}
          <p className="relative z-10 text-blue-200 text-xs">
            © 2026 BantuBeasiswa · Kementerian Pendidikan
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PANEL KANAN — form login
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="flex-1 lg:w-3/5 flex items-center justify-center p-6 sm:p-10"
          style={{ backgroundColor: COLORS.lightBG }}
        >
          <div className="w-full max-w-md">

            {/* Mobile-only logo */}
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm"
                style={{ backgroundColor: COLORS.primaryBlue, color: COLORS.white }}
              >
                BB
              </div>
              <span className="font-bold text-lg" style={{ color: COLORS.primaryBlue }}>
                BantuBeasiswa
              </span>
            </div>

            {/* Heading */}
            <h2 className="font-extrabold text-2xl mb-1" style={{ color: COLORS.darkText }}>
              Masuk ke Akun
            </h2>
            <p className="text-sm mb-8" style={{ color: '#6b7280' }}>
              Pilih peran kamu, lalu masukkan kredensial
            </p>

            <form onSubmit={handleLogin} noValidate>

              {/* ── Role Selector ─────────────────────────────────────────── */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {ROLES.map((r) => {
                  const isActive = selectedRole === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => { setSelectedRole(r.value); setError(''); }}
                      className="py-2.5 rounded-lg text-sm font-semibold border-2 transition-all duration-200 focus:outline-none"
                      style={{
                        borderColor      : isActive ? COLORS.primaryBlue : '#d1d5db',
                        backgroundColor  : isActive ? '#e8f0fb'          : COLORS.white,
                        color            : isActive ? COLORS.primaryBlue : '#6b7280',
                        transform        : isActive ? 'translateY(-1px)' : 'none',
                        boxShadow        : isActive ? '0 2px 8px rgba(0,86,179,0.2)' : 'none',
                      }}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>

              {/* ── Email ─────────────────────────────────────────────────── */}
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: COLORS.darkText }}
                >
                  Email
                </label>
                <div className="relative">
                  {/* Ikon amplop */}
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9ca3af' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-gray-200 outline-none transition-all"
                    style={{ backgroundColor: COLORS.white, color: COLORS.darkText }}
                    onFocus={(e) => { e.target.style.borderColor = COLORS.primaryBlue; e.target.style.boxShadow = '0 0 0 3px rgba(0,86,179,0.1)'; }}
                    onBlur={(e)  => { e.target.style.borderColor = '#e5e7eb';           e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* ── Password ──────────────────────────────────────────────── */}
              <div className="mb-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: COLORS.darkText }}
                >
                  Password
                </label>
                <div className="relative">
                  {/* Ikon kunci */}
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9ca3af' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-gray-200 outline-none transition-all"
                    style={{ backgroundColor: COLORS.white, color: COLORS.darkText }}
                    onFocus={(e) => { e.target.style.borderColor = COLORS.primaryBlue; e.target.style.boxShadow = '0 0 0 3px rgba(0,86,179,0.1)'; }}
                    onBlur={(e)  => { e.target.style.borderColor = '#e5e7eb';           e.target.style.boxShadow = 'none'; }}
                  />
                  {/* Toggle show/hide */}
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#9ca3af' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.primaryBlue)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* ── Lupa password ─────────────────────────────────────────── */}
              <div className="flex justify-end mb-6">
                <a
                  href="#"
                  className="text-xs font-medium transition-colors"
                  style={{ color: COLORS.primaryBlue }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.accentGold)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.primaryBlue)}
                >
                  Lupa password?
                </a>
              </div>

              {/* ── Error Message ─────────────────────────────────────────── */}
              {error && (
                <div
                  className="flex items-start gap-2.5 px-4 py-3 rounded-lg mb-4 text-sm"
                  style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c' }}
                  role="alert"
                >
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* ── Tombol Masuk ──────────────────────────────────────────── */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-sm font-bold text-white transition-all duration-200 relative overflow-hidden"
                style={{
                  backgroundColor : loading ? '#4a8fd4' : COLORS.primaryBlue,
                  boxShadow       : loading ? 'none' : '0 4px 14px rgba(0,86,179,0.35)',
                  cursor          : loading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#004494'; }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = COLORS.primaryBlue; }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memproses...
                  </span>
                ) : (
                  'Masuk'
                )}
              </button>
            </form>

            {/* ── Footer teks ───────────────────────────────────────────── */}
            <p className="text-center text-sm mt-6" style={{ color: '#6b7280' }}>
              Belum punya akun?{' '}
              <a
                href="#"
                className="font-semibold transition-colors"
                style={{ color: COLORS.primaryBlue }}
                onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.accentGold)}
                onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.primaryBlue)}
              >
                Daftar sebagai Pendonor
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
