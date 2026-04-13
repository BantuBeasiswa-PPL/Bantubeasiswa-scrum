import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

/* ─── SVG Icons ──────────────────────────────────────────────── */
function IconMap() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function IconMoney() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function IconEye({ off }) {
  return off ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function IconSpinner() {
  return (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ─── Role config ────────────────────────────────────────────── */
const ROLES = [
  { id: 'mahasiswa', label: 'Mahasiswa' },
  { id: 'pendonor',  label: 'Pendonor'  },
  { id: 'admin',     label: 'Admin'     },
];

const FEATURES = [
  {
    icon: <IconMap />,
    text: 'Filter wilayah 3T & 16 Provinsi Afirmasi',
  },
  {
    icon: <IconDoc />,
    text: 'Pendaftaran internal & tracking real-time',
  },
  {
    icon: <IconMoney />,
    text: 'Penyaluran dana transparan & terverifikasi',
  },
];

/* ─── Main Component ─────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState('mahasiswa');
  const [email,        setEmail       ] = useState('');
  const [password,     setPassword    ] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError       ] = useState('');
  const [loading,      setLoading     ] = useState(false);

  /* ── handleLogin ── */
  async function handleLogin(e) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/loginAPI', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: selectedRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Login gagal. Coba lagi.');
      } else {
        router.push(data.redirect);
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Periksa koneksi Anda.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Masuk — BantuBeasiswa</title>
        <meta name="description" content="Login ke platform BantuBeasiswa untuk mengakses beasiswa wilayah 3T dan afirmasi Indonesia." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div
        className="min-h-screen flex items-stretch"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* ═══════════════════════════════════════════════════
            PANEL KIRI — hanya tampil di lg ke atas
        ═══════════════════════════════════════════════════ */}
        <div
          className="hidden lg:flex lg:w-2/5 flex-col justify-between p-10 relative overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #0056b3 0%, #003d82 100%)' }}
        >
          {/* Decorative circles */}
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10"
            style={{ background: '#ffc107' }}
          />
          <div
            className="absolute bottom-10 -left-16 w-48 h-48 rounded-full opacity-10"
            style={{ background: '#ffffff' }}
          />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-extrabold text-lg shadow-md"
              style={{ background: '#ffffff', color: '#0056b3' }}
            >
              B
            </div>
            <span className="text-white font-bold text-lg tracking-wide">BantuBeasiswa</span>
          </div>

          {/* Middle content */}
          <div className="relative z-10 space-y-8">
            <div className="space-y-3">
              <h1 className="text-white font-extrabold text-3xl leading-tight">
                Akses Pendidikan<br />untuk Semua Daerah
              </h1>
              <p className="text-white/75 text-sm leading-relaxed max-w-xs">
                Platform terpadu beasiswa untuk masyarakat wilayah 3T dan daerah afirmasi Indonesia
              </p>
            </div>

            {/* Feature list */}
            <ul className="space-y-4">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
                    style={{ background: 'rgba(255,193,7,0.2)', color: '#ffc107' }}
                  >
                    {f.icon}
                  </span>
                  <span className="text-white/90 text-sm leading-snug pt-1.5">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer note */}
          <p className="relative z-10 text-white/40 text-xs">
            © 2025 BantuBeasiswa · Kemendikbud RI
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════
            PANEL KANAN — form login
        ═══════════════════════════════════════════════════ */}
        <div
          className="flex-1 flex items-center justify-center p-6 md:p-12"
          style={{ background: '#f8f9fa' }}
        >
          <div className="w-full max-w-md space-y-7">

            {/* Mobile logo */}
            <div className="flex items-center gap-2 lg:hidden">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base"
                style={{ background: '#0056b3', color: '#ffffff' }}
              >
                B
              </div>
              <span className="font-bold text-base" style={{ color: '#0056b3' }}>BantuBeasiswa</span>
            </div>

            {/* Heading */}
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold" style={{ color: '#333333' }}>
                Masuk ke Akun
              </h2>
              <p className="text-sm text-gray-500">
                Pilih peran kamu, lalu masukkan kredensial
              </p>
            </div>

            {/* Role selector */}
            <div className="flex gap-2">
              {ROLES.map((r) => {
                const active = selectedRole === r.id;
                return (
                  <button
                    id={`role-${r.id}`}
                    key={r.id}
                    type="button"
                    onClick={() => { setSelectedRole(r.id); setError(''); }}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all duration-150"
                    style={
                      active
                        ? {
                            borderColor: '#0056b3',
                            background: '#e8f0fb',
                            color: '#0056b3',
                          }
                        : {
                            borderColor: '#dde2e8',
                            background: '#ffffff',
                            color: '#6b7280',
                          }
                    }
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            {/* Form card */}
            <form
              onSubmit={handleLogin}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 space-y-5"
            >
              {/* Error banner */}
              {error && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium"
                  style={{ background: '#fff0f0', color: '#c0392b', border: '1px solid #f5c6cb' }}
                >
                  <IconAlert />
                  <span>{error}</span>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-sm font-semibold"
                  style={{ color: '#333333' }}
                >
                  Email
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#9ca3af' }}
                  >
                    <IconMail />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contoh@email.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm border border-gray-200 outline-none transition-all"
                    style={{ color: '#333333' }}
                    onFocus={(e) => (e.target.style.borderColor = '#0056b3')}
                    onBlur={(e)  => (e.target.style.borderColor = '#e5e7eb')}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-semibold"
                  style={{ color: '#333333' }}
                >
                  Password
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#9ca3af' }}
                  >
                    <IconLock />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    required
                    className="w-full pl-10 pr-11 py-2.5 rounded-lg text-sm border border-gray-200 outline-none transition-all"
                    style={{ color: '#333333' }}
                    onFocus={(e) => (e.target.style.borderColor = '#0056b3')}
                    onBlur={(e)  => (e.target.style.borderColor = '#e5e7eb')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#9ca3af' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#0056b3')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    <IconEye off={showPassword} />
                  </button>
                </div>

                {/* Forgot password */}
                <div className="flex justify-end">
                  <a
                    href="#"
                    className="text-xs font-medium transition-colors"
                    style={{ color: '#0056b3' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#003d82')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#0056b3')}
                  >
                    Lupa password?
                  </a>
                </div>
              </div>

              {/* Submit */}
              <button
                id="btn-login"
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-150 shadow-md"
                style={{
                  background: loading ? '#4a90d9' : '#0056b3',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#004494'; }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#0056b3'; }}
              >
                {loading ? (
                  <>
                    <IconSpinner />
                    <span>Memproses...</span>
                  </>
                ) : (
                  'Masuk'
                )}
              </button>
            </form>

            {/* Register link */}
            <p className="text-center text-sm text-gray-500">
              Belum punya akun?{' '}
              <a
                href="#"
                className="font-semibold transition-colors"
                style={{ color: '#0056b3' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#003d82')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#0056b3')}
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
