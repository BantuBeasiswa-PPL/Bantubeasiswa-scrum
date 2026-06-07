const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'dokumen-pendaftaran';

if (!url) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL tidak ditemukan di environment.');
  process.exit(1);
}

if (!serviceKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di environment.');
  console.error('Set SUPABASE_SERVICE_ROLE_KEY di .env.local atau environment Anda, lalu jalankan ulang skrip ini.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

(async () => {
  try {
    const { data, error } = await supabase.storage.createBucket(bucket, { public: false });
    if (error) {
      if (error.status === 409) {
        console.log(`Bucket '${bucket}' sudah ada.`);
        process.exit(0);
      }
      console.error('Gagal membuat bucket:', error.message || error);
      process.exit(1);
    }
    console.log(`Bucket '${bucket}' berhasil dibuat.`);
    console.log(data);
  } catch (err) {
    console.error('Terjadi kesalahan saat membuat bucket:', err.message || err);
    process.exit(1);
  }
})();
