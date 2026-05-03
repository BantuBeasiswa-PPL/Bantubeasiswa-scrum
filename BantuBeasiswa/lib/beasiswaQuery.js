/**
 * lib/beasiswaQuery.js
 * Helper query Supabase untuk halaman cari-beasiswa.
 */

import { supabase } from './supabaseClient';

// ─── Kolom yang di-select untuk list beasiswa ───────────────
const BEASISWA_LIST_SELECT = `
  beasiswaId,
  judul,
  deskripsi,
  deadline,
  status,
  pendonor ( pendonorId, statusOrganisasi ),
  beasiswa_wilayah (
    wilayah ( wilayahId, nama, tipe, isAfirmasi, is3T )
  )
`;

/**
 * Fetch semua wilayah berdasarkan filter Boolean.
 * @param {'isAfirmasi'|'is3T'} kolom
 * @returns {Promise<number[]>}
 */
async function fetchWilayahIds(kolom) {
  const { data, error } = await supabase
    .from('wilayah')
    .select('wilayahId')
    .eq(kolom, true);

  if (error) throw new Error(`Gagal fetch wilayah [${kolom}]: ${error.message}`);
  return (data ?? []).map((w) => w.wilayahId);
}

/**
 * fetchBeasiswa — query utama halaman cari beasiswa
 */
export async function fetchBeasiswa({ keyword = '', afirmasiId = null, tiga_tId = null } = {}) {
  // ── STEP 1: Kumpulkan beasiswaId dari filter wilayah
  let filteredIds = null;

  if (afirmasiId) {
    const { data: bwData, error: bwError } = await supabase
      .from('beasiswa_wilayah')
      .select('beasiswaId')
      .eq('wilayahId', afirmasiId);

    if (bwError) throw new Error(bwError.message);
    const ids = (bwData ?? []).map((r) => r.beasiswaId);
    filteredIds = filteredIds === null ? new Set(ids) : new Set([...filteredIds].filter((id) => ids.includes(id)));
  }

  if (tiga_tId) {
    const { data: bwData, error: bwError } = await supabase
      .from('beasiswa_wilayah')
      .select('beasiswaId')
      .eq('wilayahId', tiga_tId);

    if (bwError) throw new Error(bwError.message);
    const ids = (bwData ?? []).map((r) => r.beasiswaId);
    filteredIds = filteredIds === null ? new Set(ids) : new Set([...filteredIds].filter((id) => ids.includes(id)));
  }

  // ── STEP 2: Build query utama beasiswa
  let query = supabase
    .from('beasiswa')
    .select(BEASISWA_LIST_SELECT)
    .eq('status', 'aktif')
    .order('deadline', { ascending: true });

  if (keyword.trim()) {
    query = query.ilike('judul', `%${keyword.trim()}%`);
  }

  if (filteredIds !== null) {
    const idsArr = [...filteredIds];
    if (idsArr.length === 0) return [];
    query = query.in('beasiswaId', idsArr);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Gagal fetch beasiswa: ${error.message}`);
  return data ?? [];
}

/**
 * fetchWilayahAfirmasi
 */
export async function fetchWilayahAfirmasi() {
  const { data, error } = await supabase
    .from('wilayah')
    .select('wilayahId, nama, tipe')
    .eq('isAfirmasi', true)
    .order('nama', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * fetchWilayah3T
 */
export async function fetchWilayah3T() {
  const { data, error } = await supabase
    .from('wilayah')
    .select('wilayahId, nama, tipe')
    .eq('is3T', true)
    .order('nama', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * fetchBeasiswaById
 */
export async function fetchBeasiswaById(id) {
  const { data, error } = await supabase
    .from('beasiswa')
    .select(`
      beasiswaId,
      judul,
      deskripsi,
      syarat,
      jalur,
      deadline,
      status,
      linkPendaftaran,
      createdAt,
      pendonor ( pendonorId, statusOrganisasi, kontak, alamat ),
      beasiswa_wilayah (
        keterangan,
        wilayah ( wilayahId, nama, tipe, isAfirmasi, is3T )
      )
    `)
    .eq('beasiswaId', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}
