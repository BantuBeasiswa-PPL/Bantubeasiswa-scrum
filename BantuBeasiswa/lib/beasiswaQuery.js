import { supabase } from './supabaseClient';

const BEASISWA_LIST_SELECT = `
  beasiswaId,
  judul,
  deskripsi,
  deadline,
  status,
  pendonor ( pendonorId, statusOrganisasi ),
  beasiswa_wilayah (
    wilayah ( wilayahId, nama, tipe, isAfirmasi, is3T, jenis_3t, provinsiId,
      provinsi ( provinsiId, nama, isAfirmasi )
    )
  )
`;

async function fetchWilayahIdsByProvinsi(provinsiId) {
  const { data, error } = await supabase
    .from('wilayah')
    .select('wilayahId')
    .eq('provinsiId', provinsiId);

  if (error) throw new Error(`Gagal fetch wilayah by provinsi: ${error.message}`);
  return (data ?? []).map((w) => w.wilayahId);
}

export async function fetchBeasiswa({ keyword = '', afirmasiId = null, tiga_tId = null } = {}) {
  let filteredIds = null;

  if (afirmasiId) {
    const wilayahIds = await fetchWilayahIdsByProvinsi(afirmasiId);
    if (wilayahIds.length === 0) return [];

    const { data: bwData, error: bwError } = await supabase
      .from('beasiswa_wilayah')
      .select('beasiswaId')
      .in('wilayahId', wilayahIds);

    if (bwError) throw new Error(bwError.message);
    const ids = (bwData ?? []).map((r) => r.beasiswaId);
    filteredIds = new Set(ids);
  }

  if (tiga_tId) {
    const { data: bwData, error: bwError } = await supabase
      .from('beasiswa_wilayah')
      .select('beasiswaId')
      .eq('wilayahId', tiga_tId);

    if (bwError) throw new Error(bwError.message);
    const ids = (bwData ?? []).map((r) => r.beasiswaId);
    filteredIds = filteredIds === null
      ? new Set(ids)
      : new Set([...filteredIds].filter((id) => ids.includes(id)));
  }

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

export async function fetchWilayahAfirmasi() {
  const { data, error } = await supabase
    .from('provinsi')
    .select('provinsiId, nama, isAfirmasi')
    .eq('isAfirmasi', true)
    .order('nama', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchWilayah3T() {
  const { data, error } = await supabase
    .from('wilayah')
    .select('wilayahId, nama, tipe, jenis_3t')
    .eq('is3T', true)
    .order('nama', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

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
        wilayah ( wilayahId, nama, tipe, isAfirmasi, is3T, jenis_3t,
          provinsi ( provinsiId, nama, isAfirmasi )
        )
      )
    `)
    .eq('beasiswaId', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}
