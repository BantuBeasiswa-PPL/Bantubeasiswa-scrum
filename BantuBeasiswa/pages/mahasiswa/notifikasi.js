import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '@/lib/supabaseClient';
import MahasiswaLayout from '@/components/layouts/MahasiswaLayout';
import { withAuth } from '@/lib/auth';

/**
 * Halaman Inbox Notifikasi Mahasiswa
 */
export default function NotifikasiPage({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifikasi')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (!error) {
        setNotifications(data || []);
      }
      setLoading(false);
    };

    fetchNotifications();
  }, [userId]);

  const markAsRead = async (notifId) => {
    // Optimistic update
    setNotifications(prev => 
      prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
    );

    await supabase
      .from('notifikasi')
      .update({ is_read: true })
      .eq('id', notifId);
  };

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    await supabase
      .from('notifikasi')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  };

  const formatWaktu = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const menit = Math.floor(diff / 60000);
    if (menit < 1) return 'Baru saja';
    if (menit < 60) return `${menit} menit lalu`;
    const jam = Math.floor(menit / 60);
    if (jam < 24) return `${jam} jam lalu`;
    return `${Math.floor(jam / 24)} hari lalu`;
  };

  return (
    <MahasiswaLayout user={user}>
      <Head>
        <title>Notifikasi Saya – BantuBeasiswa</title>
      </Head>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Notifikasi</h1>
            <p className="text-sm text-gray-500 mt-1">Pantau informasi terbaru terkait beasiswamu.</p>
          </div>
          
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-sm font-bold transition-all"
            >
              Tandai Semua Dibaca
            </button>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-50">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-6 animate-pulse flex gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                  className={`p-6 transition-all cursor-pointer group ${!notif.is_read ? 'bg-blue-50/30' : 'bg-white hover:bg-gray-50'}`}
                >
                  <div className="flex gap-5">
                    {/* Icon */}
                    <div className={`mt-1 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${!notif.is_read ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-gray-100 text-gray-400'}`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${!notif.is_read ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                          {notif.is_read ? 'Terbaca' : 'Baru'}
                        </span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatWaktu(notif.created_at)}
                        </span>
                      </div>
                      <p className={`text-base leading-relaxed ${!notif.is_read ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                        {notif.pesan}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-20 text-center">
              <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-16 h-16 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Belum ada notifikasi</h2>
              <p className="text-gray-500 max-w-xs mx-auto">Kami akan memberitahumu jika ada kabar terbaru mengenai pendaftaran beasiswamu.</p>
            </div>
          )}
        </div>
      </div>
    </MahasiswaLayout>
  );
}

export async function getServerSideProps(context) {
  return withAuth(context, 'mahasiswa');
}
