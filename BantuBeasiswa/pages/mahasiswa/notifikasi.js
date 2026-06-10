import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { supabase } from '@/lib/supabaseClient';
import MahasiswaLayout from '@/components/layouts/MahasiswaLayout';
import { withAuth } from '@/lib/auth';

// ─── Relative time formatter ─────────────────────────────────────────────────
const formatWaktu = (timestamp) => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const menit = Math.floor(diff / 60000);
  if (menit < 1) return 'Baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 7) return `${hari} hari lalu`;
  return new Date(timestamp).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// ─── Empty state illustration ────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="w-28 h-28 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full flex items-center justify-center shadow-inner">
          <svg className="w-14 h-14 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        {/* Decorative dots */}
        <span className="absolute top-2 right-0 w-3 h-3 bg-blue-200 rounded-full" />
        <span className="absolute bottom-3 left-1 w-2 h-2 bg-indigo-200 rounded-full" />
      </div>
      <h2 className="text-xl font-black text-gray-800 mb-2">Belum ada notifikasi</h2>
      <p className="text-sm text-gray-400 text-center max-w-xs leading-relaxed">
        Kami akan memberitahumu di sini saat ada kabar terbaru mengenai pendaftaran beasiswamu.
      </p>
    </div>
  );
}

// ─── Skeleton loader ────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex gap-5 p-6 animate-pulse">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="h-3.5 bg-gray-100 rounded w-1/4" />
        <div className="h-4 bg-gray-100 rounded w-5/6" />
        <div className="h-3.5 bg-gray-100 rounded w-3/5" />
        <div className="h-3 bg-gray-100 rounded w-1/5" />
      </div>
    </div>
  );
}

// ─── Single Notification Row ─────────────────────────────────────────────────
function NotifRow({ notif, onClick }) {
  return (
    <div
      id={`notif-${notif.id}`}
      onClick={() => onClick(notif)}
      className={`flex gap-5 p-6 cursor-pointer transition-all duration-200 group border-b border-gray-50 last:border-0 ${
        !notif.is_read
          ? 'bg-blue-50/40 hover:bg-blue-50/70'
          : 'bg-white hover:bg-gray-50/80'
      }`}
    >
      {/* Icon */}
      <div
        className={`mt-0.5 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
          !notif.is_read
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-200'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        {/* Status badge + time */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
              !notif.is_read
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {!notif.is_read && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            )}
            {notif.is_read ? 'Terbaca' : 'Baru'}
          </span>
          <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatWaktu(notif.created_at)}
          </span>
        </div>

        {/* Message */}
        <p className={`text-sm leading-relaxed ${!notif.is_read ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
          {notif.pesan}
        </p>

        {/* Click hint */}
        {!notif.is_read && (
          <p className="mt-1.5 text-[11px] text-blue-400 group-hover:text-blue-500 transition-colors">
            Klik untuk tandai dibaca
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function NotifikasiPage({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const userId = user?.userId;

  // ── Fetch all notifications ──────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notifikasi')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error) setNotifications(data || []);
    setLoading(false);
  }, [userId]);

  // ── Real-time: new notification inserts while viewing inbox ─────────────
  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    const channel = supabase
      .channel(`notifikasi-inbox-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifikasi',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId, fetchNotifications]);

  // ── Mark single notification as read ──────────────────────────────────────
  const handleNotifClick = async (notif) => {
    if (notif.is_read) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );

    await supabase
      .from('notifikasi')
      .update({ is_read: true })
      .eq('id', notif.id);
  };

  // ── Mark all as read ──────────────────────────────────────────────────────
  const handleMarkAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    await supabase
      .from('notifikasi')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  };

  const hasUnread = notifications.some((n) => !n.is_read);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <MahasiswaLayout user={user}>
      <Head>
        <title>Notifikasi Saya – BantuBeasiswa</title>
        <meta name="description" content="Pantau informasi terbaru terkait beasiswamu di BantuBeasiswa." />
      </Head>

      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Page Header ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 pt-6 pb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-black text-white leading-tight">Notifikasi</h1>
                  <p className="text-blue-200 text-xs mt-0.5">Pantau info terbaru beasiswamu</p>
                </div>
              </div>

              {hasUnread && (
                <button
                  id="btn-tandai-semua"
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold transition-all duration-200 backdrop-blur-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Tandai Semua Dibaca
                </button>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div className="bg-white border-t-0 px-6 py-3 flex items-center gap-4 border-b border-gray-100">
            <span className="text-xs text-gray-500">
              <span className="font-bold text-gray-900">{notifications.length}</span> total notifikasi
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="text-xs text-gray-500">
              <span className="font-bold text-blue-600">{unreadCount}</span> belum dibaca
            </span>
            {!loading && hasUnread && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="flex items-center gap-1 text-blue-500 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
                  Live
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── Notification List ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : notifications.length > 0 ? (
            <div>
              {notifications.map((notif) => (
                <NotifRow key={notif.id} notif={notif} onClick={handleNotifClick} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>

      </div>
    </MahasiswaLayout>
  );
}

export async function getServerSideProps(context) {
  return withAuth(context, 'mahasiswa');
}
