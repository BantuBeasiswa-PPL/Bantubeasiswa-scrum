import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/db';

export default function BookmarkButton({ beasiswaId, userId }) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState('snake'); // 'snake' or 'camel'

  useEffect(() => {
    if (!userId || !beasiswaId) {
      setLoading(false);
      return;
    }

    async function checkStatus() {
      try {
        // Coba snake_case dulu
        const { data: snakeData, error: snakeError } = await supabase
          .from('favorit')
          .select('id')
          .eq('user_id', userId)
          .eq('beasiswa_id', beasiswaId)
          .maybeSingle();

        if (snakeError) {
          // Jika gagal karena kolom tidak ada, coba camelCase
          const { data: camelData, error: camelError } = await supabase
            .from('favorit')
            .select('favoritId')
            .eq('userId', userId)
            .eq('beasiswaId', beasiswaId)
            .maybeSingle();

          if (!camelError) {
            setIsSaved(!!camelData);
            setFormat('camel');
          }
        } else {
          setIsSaved(!!snakeData);
          setFormat('snake');
        }
      } catch (err) {
        console.error('Gagal mengecek status bookmark:', err);
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, [beasiswaId, userId]);

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Jika belum login, arahkan ke halaman login
    if (!userId) {
      router.push('/login');
      return;
    }

    // Optimistic Update
    const prevSaved = isSaved;
    setIsSaved(!prevSaved);

    try {
      if (prevSaved) {
        // Hapus dari favorit
        const { error } = format === 'camel'
          ? await supabase.from('favorit').delete().eq('userId', userId).eq('beasiswaId', beasiswaId)
          : await supabase.from('favorit').delete().eq('user_id', userId).eq('beasiswa_id', beasiswaId);

        if (error) throw error;
      } else {
        // Tambah ke favorit
        const payload = format === 'camel'
          ? { userId, beasiswaId }
          : { user_id: userId, beasiswa_id: beasiswaId };

        const { error } = await supabase.from('favorit').insert([payload]);

        if (error) throw error;
      }
    } catch (err) {
      console.error('Gagal memperbarui bookmark:', err);
      // Revert state jika gagal
      setIsSaved(prevSaved);
    }
  };

  if (loading) {
    return (
      <span className="w-5 h-5 animate-pulse rounded bg-gray-100 inline-block shrink-0" />
    );
  }

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-full transition-all duration-250 hover:bg-blue-50/50 focus:outline-none shrink-0"
      title={isSaved ? "Hapus dari Favorit" : "Simpan Ke Favorit"}
    >
      {isSaved ? (
        // Solid Bookmark Icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5 text-blue-600 transition-transform duration-200 scale-105"
        >
          <path
            fillRule="evenodd"
            d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        // Outline Bookmark Icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors duration-200"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z"
          />
        </svg>
      )}
    </button>
  );
}
