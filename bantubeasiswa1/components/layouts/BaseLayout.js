import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

/* ─── Icon primitives (SVG inline — no icon-lib dependency) ── */
function IconDashboard()  { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }
function IconMap()        { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>; }
function IconUsers()      { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IconBookOpen()   { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>; }
function IconAlert()      { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function IconSearch()     { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function IconClipboard()  { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>; }
function IconVideo()      { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>; }
function IconHeart()      { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>; }
function IconHelp()       { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function IconUser()       { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function IconSettings()   { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>; }
function IconChevronRight(){ return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>; }
function IconFilter()     { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>; }
function IconChart()      { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function IconMenu()       { return <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>; }
function IconX()          { return <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function IconSun()        { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>; }

/* ─── Icon resolver ──────────────────────────────────────────── */
const ICON_MAP = {
  dashboard:  <IconDashboard />,
  map:        <IconMap />,
  users:      <IconUsers />,
  book:       <IconBookOpen />,
  alert:      <IconAlert />,
  search:     <IconSearch />,
  clipboard:  <IconClipboard />,
  video:      <IconVideo />,
  heart:      <IconHeart />,
  help:       <IconHelp />,
  user:       <IconUser />,
  settings:   <IconSettings />,
  filter:     <IconFilter />,
  chart:      <IconChart />,
};

/** Initials avatar dari nama */
function getInitials(nama = '') {
  return nama
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/* ─── Sidebar Menu Item ──────────────────────────────────────── */
function SidebarItem({ href, icon, label, onClick }) {
  const router = useRouter();
  const isActive = router.pathname === href || router.pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        'flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 text-sm font-medium transition-all duration-150 group',
        isActive
          ? 'bg-white/20 text-white border-l-4 border-white pl-3'
          : 'text-white/80 hover:bg-white/10 hover:text-white',
      ].join(' ')}
    >
      <span className={isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}>
        {ICON_MAP[icon] ?? <IconDashboard />}
      </span>
      <span>{label}</span>
      {isActive && (
        <span className="ml-auto text-white/60">
          <IconChevronRight />
        </span>
      )}
    </Link>
  );
}

/* ─── Sidebar ────────────────────────────────────────────────── */
function Sidebar({ menuItems, user, isOpen, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed top-0 left-0 h-full z-40 flex flex-col',
          'bg-[#0056b3] transition-transform duration-300 ease-in-out',
          'w-[220px]',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* ── Brand ── */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#ffc107] rounded-full flex items-center justify-center shadow">
              <svg className="w-4 h-4 text-[#0056b3]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-white font-bold text-sm leading-tight">
              BantuBeasiswa
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-white/70 hover:text-white p-1"
          >
            <IconX />
          </button>
        </div>

        {/* ── User Profile ── */}
        <div className="flex flex-col items-center py-5 px-4 border-b border-white/10 gap-2">
          <div className="w-14 h-14 rounded-full bg-[#ffc107] text-[#0056b3] flex items-center justify-center text-lg font-bold shadow-md ring-2 ring-white/30">
            {getInitials(user?.nama)}
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-sm leading-tight">{user?.nama || 'Pengguna'}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/20 text-white/90 capitalize">
              {user?.role || 'user'}
            </span>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              onClick={onClose}
            />
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="px-4 py-3 border-t border-white/10 text-[10px] text-white/40 text-center">
          © 2025 BantuBeasiswa
        </div>
      </aside>
    </>
  );
}

/* ─── Navbar ─────────────────────────────────────────────────── */
function Navbar({ onToggleSidebar, user }) {
  return (
    <header className="sticky top-0 z-20 h-16 bg-white shadow-sm flex items-center px-4 gap-3">
      {/* Hamburger — mobile only */}
      <button
        onClick={onToggleSidebar}
        className="lg:hidden p-2 rounded-lg text-[#0056b3] hover:bg-[#f0f5ff] transition-colors"
        aria-label="Toggle sidebar"
      >
        <IconMenu />
      </button>

      {/* Search bar */}
      <div className="flex-1 flex items-center gap-2 bg-[#f8f9fa] rounded-lg px-3 py-2 max-w-md border border-gray-200 focus-within:border-[#0056b3] transition-colors">
        <span className="text-gray-400">
          <IconSearch />
        </span>
        <input
          type="text"
          placeholder="Cari kata kunci beasiswa..."
          className="bg-transparent flex-1 text-sm text-[#333] outline-none placeholder-gray-400"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Accessibility controls */}
      <div className="flex items-center gap-2">
        {/* Contrast toggle */}
        <button
          title="Toggle kontras tinggi"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#0056b3] border border-[#0056b3]/30 hover:bg-[#0056b3] hover:text-white transition-all"
        >
          <span className="text-[#ffc107]">
            <IconSun />
          </span>
          <span className="hidden sm:inline">Kontras</span>
        </button>

        {/* Font size controls */}
        <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
          <button
            title="Perkecil teks"
            className="px-3 py-2 text-sm font-bold text-[#333] hover:bg-[#f0f5ff] hover:text-[#0056b3] transition-colors border-r border-gray-200"
          >
            −
          </button>
          <span className="px-2 text-xs text-gray-400 font-medium">A</span>
          <button
            title="Perbesar teks"
            className="px-3 py-2 text-sm font-bold text-[#333] hover:bg-[#f0f5ff] hover:text-[#0056b3] transition-colors border-l border-gray-200"
          >
            +
          </button>
        </div>

        {/* User avatar */}
        <div className="w-9 h-9 rounded-full bg-[#0056b3] text-white flex items-center justify-center text-sm font-bold cursor-pointer hover:bg-[#004494] transition-colors ring-2 ring-[#0056b3]/20">
          {getInitials(user?.nama)}
        </div>
      </div>
    </header>
  );
}

/* ─── BaseLayout (shared shell) ─────────────────────────────── */
export default function BaseLayout({ children, user, menuItems }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fa]">
      {/* Sidebar */}
      <Sidebar
        menuItems={menuItems}
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <Navbar
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          user={user}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
