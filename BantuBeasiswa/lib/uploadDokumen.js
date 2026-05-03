/**
 * uploadDokumen — Upload file dokumen ke Supabase Storage.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {File}   file            File object dari browser
 * @param {string} pendaftaranId   ID pendaftaran (untuk penamaan folder)
 * @param {string} jenis           Jenis dokumen: 'ktp' | 'transkrip' | 'motivation_letter'
 * @returns {Promise<{ publicUrl: string }>}
 */
export async function uploadDokumen(supabase, file, pendaftaranId, jenis) {
  if (!file) throw new Error('File tidak tersedia');
  if (!pendaftaranId) throw new Error('Pendaftaran ID tidak tersedia');

  // Tentukan nama file unik
  const ext      = file.name.split('.').pop() || 'pdf';
  const fileName = `${pendaftaranId}/${jenis}_${Date.now()}.${ext}`;
  const bucket   = 'dokumen-pendaftaran';

  // Upload ke Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert      : false,
      contentType : file.type,
    });

  if (uploadError) {
    throw new Error(`Upload gagal: ${uploadError.message}`);
  }

  // Ambil public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  if (!urlData?.publicUrl) {
    throw new Error('Gagal mendapatkan URL publik file');
  }

  return { publicUrl: urlData.publicUrl };
}
