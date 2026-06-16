import { useState, useEffect } from 'react';
import { supabase } from '@/lib/db';

/**
 * Mapping status DB → nomor step stepper (1-4).
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
 * Custom hook — fetch data awal + subscribe real-time update status pendaftaran.
 *
 * @param {string|null} pendaftaranId  UUID dari tabel pendaftaran
 * @returns {{ status, beasiswaInfo, createdAt, penyaluranInfo, loading, error }}
 *
 * Cara pakai:
 *   const { status, beasiswaInfo, loading, error } = useStatusPendaftaran(id);
 */
export function useStatusPendaftaran(pendaftaranId) {
  const [status, setStatus] = useState(null);
  const [beasiswaInfo, setBeasiswaInfo] = useState(null);
  const [createdAt, setCreatedAt] = useState(null);
  const [penyaluranInfo, setPenyaluranInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Jangan fetch kalau id belum tersedia (Next.js router hydration)
    if (!pendaftaranId) return;

    let isMounted = true;

    // ─── 1. Fetch data awal ───────────────────────────────────────────────────
    async function fetchInitialData() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('pendaftaran')
        .select(`
          status, 
          createdAt, 
          beasiswa (
            beasiswaId,
            judul, 
            nominal, 
            pendonor (
              statusOrganisasi
            )
          ),
          penyaluran_dana (
            penyaluranId,
            status,
            jumlahDana,
            buktiTransferUrl,
            idTransaksi,
            tanggalPenyaluran
          )
        `)
        .eq('pendaftaranId', pendaftaranId)
        .single();

      if (!isMounted) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setStatus(data.status);
      setCreatedAt(data.createdAt);
      
      // Normalisasi beasiswa agar support field camelCase dan snake_case demi backward compatibility
      if (data.beasiswa) {
        const b = data.beasiswa;
        setBeasiswaInfo({
          ...b,
          id: b.beasiswaId,
          pendonor: b.pendonor ? {
            ...b.pendonor,
            nama_organisasi: b.pendonor.statusOrganisasi,
          } : null
        });
      } else {
        setBeasiswaInfo(null);
      }
      
      // Mapping snake_case ke camelCase untuk kompatibilitas UI
      if (data.penyaluran_dana?.[0]) {
        const pd = data.penyaluran_dana[0];
        setPenyaluranInfo({
          penyaluranId: pd.penyaluranId,
          status: pd.status,
          jumlahDana: pd.jumlahDana,
          buktiTransferUrl: pd.buktiTransferUrl,
          idTransaksi: pd.idTransaksi,
          tanggalPenyaluran: pd.tanggalPenyaluran
        });
      } else {
        setPenyaluranInfo(null);
      }
      
      setLoading(false);
    }

    fetchInitialData();

    // ─── 2. Subscribe real-time UPDATE ───────────────────────────────────────
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

    // ─── 3. Cleanup — dipanggil React saat unmount / pendaftaranId berubah ───
    // Ini yang mencegah memory leak dan "state update on unmounted component"
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [pendaftaranId]);

  return { status, beasiswaInfo, createdAt, penyaluranInfo, loading, error };
}