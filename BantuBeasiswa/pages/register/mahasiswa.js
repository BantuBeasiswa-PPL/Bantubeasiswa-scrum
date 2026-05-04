import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

const COLORS = {
  primaryBlue : '#0056b3',
  accentGold  : '#ffc107',
  darkText    : '#333333',
  lightBG     : '#f8f9fa',
  white       : '#ffffff',
};

// ─── Eye icons for password toggle ───────────────────────────────────────────
function EyeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

export default function RegisterMahasiswaPage() {
  const router = useRouter();

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Password dan Konfirmasi Password tidak cocok.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-mahasiswa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Pendaftaran gagal. Silakan coba lagi.');
        return;
      }

      // Berhasil, redirect ke halaman login
      router.push('/login?registered=true');
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Daftar Mahasiswa · BantuBeasiswa</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center p-6 sm:p-10" style={{ backgroundColor: COLORS.lightBG }}>
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          
          <div className="flex items-center gap-2 mb-8 justify-center">
             <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-base shrink-0" style={{ backgroundColor: COLORS.primaryBlue, color: COLORS.white }}>
                BB
             </div>
             <span className="font-bold text-2xl tracking-wide" style={{ color: COLORS.primaryBlue }}>
                BantuBeasiswa
             </span>
          </div>

          <h2 className="font-extrabold text-2xl mb-1 text-center" style={{ color: COLORS.darkText }}>
            Daftar Mahasiswa
          </h2>
          <p className="text-sm mb-6 text-center" style={{ color: '#6b7280' }}>
            Buat akun untuk mulai mencari beasiswa
          </p>

          <form onSubmit={handleRegister} noValidate>
            
            {/* ── Nama Lengkap ── */}
            <div className="mb-4">
              <label htmlFor="nama" className="block text-sm font-medium mb-1.5" style={{ color: COLORS.darkText }}>
                Nama Lengkap
              </label>
              <input
                id="nama" type="text" required
                value={nama} onChange={(e) => setNama(e.target.value)}
                placeholder="Misal: Budi Santoso"
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 outline-none transition-all"
                style={{ color: COLORS.darkText }}
                onFocus={(e) => { e.target.style.borderColor = COLORS.primaryBlue; e.target.style.boxShadow = '0 0 0 3px rgba(0,86,179,0.1)'; }}
                onBlur={(e)  => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* ── Email ── */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: COLORS.darkText }}>
                Email
              </label>
              <input
                id="email" type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 outline-none transition-all"
                style={{ color: COLORS.darkText }}
                onFocus={(e) => { e.target.style.borderColor = COLORS.primaryBlue; e.target.style.boxShadow = '0 0 0 3px rgba(0,86,179,0.1)'; }}
                onBlur={(e)  => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* ── Password ── */}
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: COLORS.darkText }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password" type={showPassword ? 'text' : 'password'} required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter" minLength={6}
                  className="w-full px-4 pr-10 py-2.5 text-sm rounded-lg border border-gray-200 outline-none transition-all"
                  style={{ color: COLORS.darkText }}
                  onFocus={(e) => { e.target.style.borderColor = COLORS.primaryBlue; e.target.style.boxShadow = '0 0 0 3px rgba(0,86,179,0.1)'; }}
                  onBlur={(e)  => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* ── Confirm Password ── */}
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5" style={{ color: COLORS.darkText }}>
                Konfirmasi Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  className="w-full px-4 pr-10 py-2.5 text-sm rounded-lg border border-gray-200 outline-none transition-all"
                  style={{ color: COLORS.darkText }}
                  onFocus={(e) => { e.target.style.borderColor = COLORS.primaryBlue; e.target.style.boxShadow = '0 0 0 3px rgba(0,86,179,0.1)'; }}
                  onBlur={(e)  => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* ── Error Message ── */}
            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg mb-4 text-sm bg-red-50 border border-red-200 text-red-700" role="alert">
                <span>{error}</span>
              </div>
            )}

            {/* ── Submit Button ── */}
            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-bold text-white transition-all duration-200"
              style={{
                backgroundColor: loading ? '#4a8fd4' : COLORS.primaryBlue,
                boxShadow: loading ? 'none' : '0 4px 14px rgba(0,86,179,0.35)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#004494'; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = COLORS.primaryBlue; }}
            >
              {loading ? 'Memproses...' : 'Daftar Sekarang'}
            </button>

            <div className="mt-4 text-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                ← Kembali ke Beranda
              </Link>
            </div>
          </form>

          <p className="text-center text-sm mt-6 text-gray-500">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-yellow-500 transition-colors">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
