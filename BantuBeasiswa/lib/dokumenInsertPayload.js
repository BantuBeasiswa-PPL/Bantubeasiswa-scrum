/**
 * Bentuk baris insert ke tabel `dokumen` — nama kolom untuk URL file beda per skema.
 *
 * Default `error`: sesuai skema camelCase di `database/database/schema.sql` (URL/path file di kolom `error`).
 * Opsional: set `SUPABASE_DOKUMEN_URL_COLUMN` ke `fileUrl` atau `file_url` jika tabel Supabase-mu memakai nama itu.
 */
export function buildDokumenInsertPayload({ pendaftaranId, jenis, fileUrl }) {
  const col = (process.env.SUPABASE_DOKUMEN_URL_COLUMN || 'error').trim();
  const status = 'MENUNGGU';

  if (col === 'file_url') {
    return {
      pendaftaran_id: pendaftaranId,
      jenis,
      file_url      : fileUrl,
      status_dokumen: status,
    };
  }

  if (col === 'fileUrl') {
    return {
      pendaftaranId,
      jenis,
      fileUrl,
      statusDokumen: status,
    };
  }

  return {
    pendaftaranId,
    jenis,
    error        : fileUrl,
    statusDokumen: status,
  };
}
