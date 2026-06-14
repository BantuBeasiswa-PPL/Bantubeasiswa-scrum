import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

/**
 * NotificationBell Component
 * Displays unread count badge + dropdown preview
 */
export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 1. Fetch initial unread count & top 5 notifications
  useEffect(() => {
    if (!userId) return;

    const fetchInitialData = async () => {
      // Unread count
      const { count } = await supabase
        .from('notifikasi')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      setUnreadCount(count || 0);

      // Latest 5 notifications
      const { data } = await supabase
        .from('notifikasi')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setNotifications(data || []);
    };

    fetchInitialData();

    // 2. Real-time subscription
    const channel = supabase.channel('notifikasi-realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifikasi', 
        filter: `user_id=eq.${userId}` 
      }, (payload) => {
        setUnreadCount(prev => prev + 1);
        setNotifications(prev => [payload.new, ...prev].slice(0, 5));
      })
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatWaktu = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const menit = Math.floor(diff / 60000);
    if (menit < 1) return 'Baru saja';
    if (menit < 60) return `${menit} menit lalu`;
    const jam = Math.floor(menit / 60);
    if (jam < 24) return `${jam} jam lalu`;
    return `${Math.floor(jam / 24)} hari lalu`;
  };

  const truncate = (text, len = 80) => {
    if (text.length <= len) return text;
    return text.substring(0, len) + '...';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-all duration-200 group"
        aria-label="Notifikasi"
      >
        <svg
          className={`w-6 h-6 transition-colors duration-200 ${isOpen ? 'text-blue-600' : 'text-gray-600 group-hover:text-blue-600'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-in zoom-in duration-300">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 origin-top-right rounded-2xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Notifikasi Terbaru</h3>
            <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {unreadCount} Baru
            </span>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 transition-colors hover:bg-gray-50 ${!notif.is_read ? 'bg-blue-50/40' : 'bg-white'}`}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${!notif.is_read ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 leading-snug">
                          {truncate(notif.pesan)}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatWaktu(notif.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-500">Belum ada notifikasi</p>
              </div>
            )}
          </div>

          <div className="p-3 bg-gray-50 rounded-b-2xl border-t border-gray-100">
            <Link
              href="/mahasiswa/notifikasi"
              className="block w-full text-center py-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-white rounded-lg transition-all"
              onClick={() => setIsOpen(false)}
            >
              Lihat Semua Notifikasi
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
