/**
 * Bentuk baris insert ke tabel `dokumen`.
 *
 * Schema Supabase aktif (database/database/schema.sql) menggunakan kolom `error`
 * untuk menyimpan URL file dokumen, dan `statusDokumen` untuk status.
 *
 * Opsional: set env SUPABASE_DOKUMEN_URL_COLUMN ke 'file_url' atau 'fileUrl'
 * jika skema tabel Supabase-mu menggunakan nama kolom yang berbeda.
 */
export function buildDokumenInsertPayload({ pendaftaranId, jenis, fileUrl }) {
  const col = (process.env.SUPABASE_DOKUMEN_URL_COLUMN || 'error').trim();
  const status = 'MENUNGGU';

  if (col === 'file_url') {
    // snake_case schema
    return {
      pendaftaran_id: pendaftaranId,
      jenis,
      file_url      : fileUrl,
      status_dokumen: status,
    };
  }

  if (col === 'fileUrl') {
    // camelCase schema dengan kolom fileUrl
    return {
      pendaftaranId,
      jenis,
      fileUrl,
      statusDokumen: status,
    };
  }

  // Default: schema aktif menggunakan kolom 'error' untuk URL file
  return {
    pendaftaranId,
    jenis,
    error        : fileUrl,
    statusDokumen: status,
  };
}
