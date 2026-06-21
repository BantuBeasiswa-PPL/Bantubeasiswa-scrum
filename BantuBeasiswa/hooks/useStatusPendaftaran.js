import { useState, useEffect } from 'react';
import { supabase } from '@/lib/db';

/**
 * Mapping status DB -> nomor step stepper (1-4).
 * LULUS dan DITOLAK sama-sama di step 4 (Keputusan Akhir).
 */
export const STATUS_TO_STEP = {
  TERDAFTAR: 1,
  REVIEW: 2,
  EXAM: 3,
  LULUS: 4,
  DITOLAK: 4,
};

/**
 * Custom hook - fetch data awal + subscribe real-time update status pendaftaran.
 *
 * @param {string|null} pendaftaranId UUID dari tabel pendaftaran
 * @returns {{ status, beasiswaInfo, createdAt, loading, error }}
 */
export function useStatusPendaftaran(pendaftaranId) {
  const [status, setStatus] = useState(null);
  const [beasiswaInfo, setBeasiswaInfo] = useState(null);
  const [createdAt, setCreatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pendaftaranId) return;

    let isMounted = true;
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    async function fetchInitialData() {
      setLoading(true);
      setError(null);

      let lastError = null;

      for (let attempt = 1; attempt <= 8; attempt += 1) {
        const response = await fetch(`/api/mahasiswa/pendaftaran?pendaftaranId=${pendaftaranId}`);
        const payload = await response.json();
        const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];
        const data = rows.find(row => String(row.pendaftaranId) === String(pendaftaranId)) ?? rows[0] ?? null;

        if (!isMounted) return;

        if (!response.ok) {
          lastError = payload?.message || 'Gagal mengambil data pendaftaran.';
          break;
        }

        if (data) {
          setStatus(data.status);
          setCreatedAt(data.createdAt ?? data.created_at ?? null);
          setBeasiswaInfo(data.beasiswa ?? null);
          setLoading(false);
          return;
        }

        lastError = 'Data pendaftaran tidak ditemukan.';
        if (attempt < 8) {
          await sleep(500);
        }
      }

      if (!isMounted) return;
      setError(lastError || 'Data pendaftaran tidak ditemukan.');
      setLoading(false);
    }

    fetchInitialData();

    const channel = supabase
      .channel(`status-pendaftaran-${pendaftaranId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pendaftaran',
          filter: `pendaftaranId=eq.${pendaftaranId}`,
        },
        (payload) => {
          if (isMounted) {
            setStatus(payload.new.status);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [pendaftaranId]);

  return { status, beasiswaInfo, createdAt, loading, error };
}
