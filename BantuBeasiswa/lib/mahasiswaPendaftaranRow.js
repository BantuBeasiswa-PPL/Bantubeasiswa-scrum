/**
 * Menyamakan bentuk baris pendaftaran dari Supabase (camelCase / snake_case /
 * relasi tunggal vs array) agar UI dan key React konsisten.
 */
export function normalizeMahasiswaPendaftaranRow(row) {
  if (!row || typeof row !== 'object') return row;

  const pendaftaranId = row.pendaftaranId ?? row.pendaftaran_id ?? row.id;
  const beasiswaId = row.beasiswaId ?? row.beasiswa_id;
  const createdAt = row.createdAt ?? row.created_at;

  let beasiswa = row.beasiswa;
  if (Array.isArray(beasiswa)) beasiswa = beasiswa[0] ?? null;

  if (beasiswa && beasiswa.pendonor != null) {
    let pendonor = beasiswa.pendonor;
    if (Array.isArray(pendonor)) pendonor = pendonor[0];
    beasiswa = {
      ...beasiswa,
      pendonor: pendonor
        ? {
            ...pendonor,
            statusOrganisasi:
              pendonor.statusOrganisasi ??
              pendonor.status_organisasi ??
              pendonor.status_verifikasi ??
              null,
          }
        : null,
    };
  }

  return {
    ...row,
    pendaftaranId,
    beasiswaId,
    createdAt,
    beasiswa,
  };
}
