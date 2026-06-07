import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useContrastMode } from '../../lib/useContrastMode';
import { useFontSize } from '../../lib/useFontSize';

// ─── Helper: get user initials for avatar ────────────────────────────────────
function getInitials(nama = '') {
  return nama
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// ─── Hamburger icon ───────────────────────────────────────────────────────────
function HamburgerIcon({ open }) {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

// ─── Sidebar Item ─────────────────────────────────────────────────────────────
function SidebarItem({ item, isActive, onClose }) {
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={`
        flex items-center px-4 py-3 rounded-lg mx-2 text-sm font-medium
        transition-all duration-200 group
        ${item.icon ? 'gap-3' : ''}
        ${
          isActive
            ? 'bg-white/20 text-white border-l-4 border-white pl-3'
            : 'text-blue-100 hover:bg-white/10 hover:text-white border-l-4 border-transparent pl-3'
        }
      `}
    >
      {item.icon && <span className="text-lg leading-none">{item.icon}</span>}
      <span className="leading-tight">{item.label}</span>
    </Link>
  );
}

// ─── Main BaseLayout ──────────────────────────────────────────────────────────
export default function BaseLayout({ children, user, menuItems }) {
  const router = useRouter();
  const [sidebarOpen,   setSidebarOpen  ] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  
  // Accessibility hooks
  const { isHighContrast, toggle: toggleContrast } = useContrastMode(user?.id);
  const { level, decrease: decreaseFont, increase: increaseFont, canDecrease, canIncrease } = useFontSize(user?.id);

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  }

  const nama  = user?.nama  || 'Pengguna';
  const role  = user?.role  || 'mahasiswa';

  const roleLabel = {
    admin:      'Administrator',
    mahasiswa:  'Mahasiswa',
    pendonor:   'Pendonor',
  }[role] || role;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#f8f9fa' }}>

      {/* ── Overlay (mobile) ─────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-30 flex flex-col
          transition-transform duration-300 ease-in-out
          w-56
          lg:static lg:translate-x-0 lg:shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ backgroundColor: '#0056b3' }}
      >
        {/* Brand / Logo */}
        <div className="px-4 pt-6 pb-4 border-b border-white/20">
          <div className="flex items-center gap-2 mb-5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
              style={{ backgroundColor: '#ffc107', color: '#0056b3' }}
            >
              BB
            </div>
            <span className="text-white font-bold text-base leading-tight">
              BantuBeasiswa
            </span>
          </div>

          {/* User Avatar + Info */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ring-2 ring-white/40"
              style={{ backgroundColor: '#ffc107', color: '#0056b3' }}
            >
              {getInitials(nama)}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm leading-tight truncate">
                {nama}
              </p>
              <p className="text-blue-200 text-xs mt-0.5">{roleLabel}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 py-4 overflow-y-auto space-y-0.5">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              isActive={
                item.href === router.pathname ||
                (item.href !== '/' && (
                  router.pathname.startsWith(item.href + '/') ||
                  router.pathname === item.href
                ))
              }
              onClose={() => setSidebarOpen(false)}
            />
          ))}
        </nav>

        {/* Bottom: Logout + version tag */}
        <div className="px-4 py-3 border-t border-white/20 space-y-2">
          <button
            id="btn-logout"
            onClick={handleLogout}
            disabled={logoutLoading}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              backgroundColor: logoutLoading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
              color          : logoutLoading ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)',
              border         : '1px solid rgba(255,255,255,0.15)',
              cursor         : logoutLoading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!logoutLoading) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)';
                e.currentTarget.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (!logoutLoading) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
              }
            }}
          >
            {logoutLoading ? (
              <>
                <span style={{
                  width: '12px', height: '12px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Keluar...
              </>
            ) : (
              <>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Keluar
              </>
            )}
          </button>
          <p className="text-blue-200 text-xs text-center">v1.0.0 · BantuBeasiswa</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </aside>

      {/* ── MAIN AREA (navbar + content) ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── NAVBAR ───────────────────────────────────────────────────── */}
        <header
          className="h-16 shrink-0 flex items-center gap-4 px-4 shadow-sm z-10"
          style={{ backgroundColor: '#ffffff' }}
        >
          {/* Hamburger (mobile) */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: '#0056b3' }}
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
          >
            <HamburgerIcon open={sidebarOpen} />
          </button>

          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Cari kata kunci beasiswa..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: '#f8f9fa',
                  color: '#333333',
                  // focus ring handled inline via onFocus/onBlur for simplicity
                }}
                onFocus={(e) => (e.target.style.borderColor = '#0056b3')}
                onBlur={(e)  => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Accessibility Controls */}
          <div className="flex items-center gap-2">
            {/* Kontras Button */}
            <button
              onClick={toggleContrast}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all hover:shadow-sm"
              style={{
                borderColor: '#ffc107',
                color: '#0056b3',
                backgroundColor: isHighContrast ? '#00d9ff' : '#fff9e6',
              }}
              title="Toggle kontras tinggi"
              aria-label="Toggle kontras"
            >
              <span style={{ color: isHighContrast ? '#0a0e27' : '#ffc107' }}>◑</span>
              <span className="hidden sm:inline">{isHighContrast ? 'Normal' : 'Kontras'}</span>
            </button>

            {/* Font Size Controls */}
            <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
              <button
                onClick={decreaseFont}
                disabled={!canDecrease}
                className="w-10 h-10 flex items-center justify-center text-lg font-bold transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: '#0056b3' }}
                title="Perkecil font"
                aria-label="Perkecil ukuran font"
              >
                −
              </button>
              <div className="w-px h-5 bg-gray-200" />
              <button
                onClick={increaseFont}
                disabled={!canIncrease}
                className="w-10 h-10 flex items-center justify-center text-lg font-bold transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: '#0056b3' }}
                title="Perbesar font"
                aria-label="Perbesar ukuran font"
              >
                +
              </button>
            </div>

            {/* User badge (desktop) */}
            <div
              className="hidden md:flex items-center gap-2 pl-3 border-l"
              style={{ borderColor: '#e5e7eb' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ backgroundColor: '#0056b3', color: '#ffffff' }}
              >
                {getInitials(nama)}
              </div>
              <div className="text-right leading-tight">
                <p className="text-xs font-semibold" style={{ color: '#333333' }}>{nama}</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>{roleLabel}</p>
              </div>
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ─────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{ backgroundColor: '#f8f9fa' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
