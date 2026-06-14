import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

// ─── Relative time formatter (no library) ────────────────────────────────────
const formatWaktu = (timestamp) => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const menit = Math.floor(diff / 60000);
  if (menit < 1) return 'Baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 7) return `${hari} hari lalu`;
  return new Date(timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

const truncate = (text, len = 80) => {
  if (!text) return '';
  return text.length <= len ? text : text.substring(0, len) + '…';
};

// ─── Bell SVG Icon ────────────────────────────────────────────────────────────
function BellIcon({ active }) {
  return (
    <svg
      className={`w-5 h-5 transition-all duration-300 ${active ? 'text-blue-600 scale-110' : 'text-gray-500'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function SkeletonItem() {
  return (
    <div className="flex gap-3 px-4 py-3 animate-pulse">
      <div className="w-2.5 h-2.5 rounded-full bg-gray-200 mt-2 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-4/5" />
        <div className="h-3 bg-gray-200 rounded w-3/5" />
        <div className="h-2.5 bg-gray-100 rounded w-1/4" />
      </div>
    </div>
  );
}

/**
 * NotificationBell Component
 * Bell icon with unread badge + dropdown preview + real-time subscription
 * @param {{ userId: number|string }} props
 */
export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [isOpen, setIsOpen]               = useState(false);
  const [loading, setLoading]             = useState(false);
  const dropdownRef = useRef(null);

  // ── Fetch initial data ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [countRes, listRes] = await Promise.all([
        supabase
          .from('notifikasi')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false),
        supabase
          .from('notifikasi')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setUnreadCount(countRes.count || 0);
      setNotifications(listRes.data || []);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ── Mark single notification as read ───────────────────────────────────────
  const markAsRead = async (notifId) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    await supabase
      .from('notifikasi')
      .update({ is_read: true })
      .eq('id', notifId);
  };

  // ── Mark all as read ────────────────────────────────────────────────────────
  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    await supabase
      .from('notifikasi')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  };

  // ── Real-time subscription + initial fetch ──────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    fetchData();

    // Listen for INSERT → increment badge + prepend to list
    const channel = supabase
      .channel(`notifikasi-bell-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifikasi',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setUnreadCount((prev) => prev + 1);
          setNotifications((prev) => [payload.new, ...prev].slice(0, 5));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifikasi',
          filter: `user_id=eq.${userId}`,
        },
        // Sync badge after mark-as-read from inbox page: recalculate from local list
        (payload) => {
          setNotifications((prev) => {
            const updated = prev.map((n) =>
              n.id === payload.new.id ? { ...n, is_read: payload.new.is_read } : n
            );
            // Recount unread from updated list
            setUnreadCount(updated.filter((n) => !n.is_read).length);
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);


  // ── Close dropdown on outside click ────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Close on Escape ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const hasUnread = unreadCount > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Bell Button ──────────────────────────────────────────────────────── */}
      <button
        id="btn-notifikasi"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2.5 rounded-xl transition-all duration-200 ${
          isOpen
            ? 'bg-blue-50 shadow-inner'
            : 'hover:bg-gray-100 active:bg-gray-200'
        }`}
        aria-label="Notifikasi"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <BellIcon active={isOpen || hasUnread} />

        {/* Badge */}
        {hasUnread && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white"
            style={{ animation: 'badgePop 0.25s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ───────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 z-50 rounded-2xl bg-white border border-gray-100 shadow-xl overflow-hidden"
          style={{ animation: 'dropdownOpen 0.2s cubic-bezier(0.16,1,0.3,1) both' }}
          role="dialog"
          aria-label="Panel notifikasi"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 className="text-sm font-bold text-white tracking-wide">Notifikasi</h3>
              {hasUnread && (
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} baru
                </span>
              )}
            </div>
            {hasUnread && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-blue-200 hover:text-white font-semibold transition-colors"
              >
                Tandai semua
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <>
                <SkeletonItem />
                <SkeletonItem />
                <SkeletonItem />
              </>
            ) : notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.is_read) markAsRead(notif.id);
                  }}
                  className={`flex gap-3 px-4 py-3.5 cursor-pointer transition-colors duration-150 group ${
                    !notif.is_read
                      ? 'bg-blue-50/60 hover:bg-blue-50'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {/* Dot indicator */}
                  <div className="shrink-0 mt-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125 ${
                        !notif.is_read ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm leading-snug ${
                        !notif.is_read
                          ? 'text-gray-900 font-semibold'
                          : 'text-gray-500 font-normal'
                      }`}
                    >
                      {truncate(notif.pesan)}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatWaktu(notif.created_at)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <div className="w-14 h-14 mx-auto mb-3 bg-gray-50 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-400">Belum ada notifikasi</p>
                <p className="text-xs text-gray-300 mt-0.5">Kami akan memberitahumu di sini</p>
              </div>
            )}
          </div>

          {/* Footer CTA */}
          <div className="border-t border-gray-100 bg-gray-50/70">
            <Link
              href="/mahasiswa/notifikasi"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-1.5 w-full py-3 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
            >
              Lihat Semua Notifikasi
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Inline keyframe animations */}
      <style>{`
        @keyframes badgePop {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes dropdownOpen {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
