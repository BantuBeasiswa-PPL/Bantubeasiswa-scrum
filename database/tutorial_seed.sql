-- ============================================================
-- SQL Seed Data: Tutorial Administrasi BantuBeasiswa (Updated)
-- Jalankan di SQL Editor Supabase
-- ============================================================

-- Bersihkan data tutorial lama jika diinginkan (opsional)
-- TRUNCATE TABLE tutorial RESTART IDENTITY CASCADE;

INSERT INTO tutorial (judul, konten) VALUES
(
  'Cara Membuat SKTM (Surat Keterangan Tidak Mampu)',
  '<h2>Panduan Pengajuan SKTM</h2><p>Surat Keterangan Tidak Mampu (SKTM) sangat penting sebagai dokumen penunjang pengajuan beasiswa ekonomi. Berikut adalah tata cara membuatnya:</p><ul><li>Minta <strong>surat pengantar</strong> dari ketua RT dan RW setempat dengan menjelaskan tujuan pembuatan SKTM.</li><li>Bawa KTP orang tua, Kartu Keluarga (KK), dan surat pengantar tersebut ke <strong>Kantor Kelurahan/Desa</strong>.</li><li>Petugas kelurahan akan memproses dan menerbitkan lembar SKTM resmi yang telah ditandatangani Lurah/Kepala Desa untuk Anda gunakan.</li></ul>'
),
(
  'Panduan Pengisian KIP-K',
  '<h2>Langkah Sukses Pengisian KIP Kuliah</h2><p>Ikuti langkah-langkah berikut agar pendaftaran KIP-K Anda berjalan lancar tanpa kendala administratif:</p><ul><li>Masukkan nomor <strong>NIK</strong>, <strong>NISN</strong>, dan <strong>NPSN</strong> yang valid di portal SIM KIP-K.</li><li>Lengkapi berkas data diri, detail <strong>kondisi ekonomi keluarga</strong>, serta prestasi jika ada.</li><li>Pastikan mengunggah foto hunian keluarga dan surat keterangan penghasilan orang tua yang telah terverifikasi resmi.</li></ul>'
),
(
  'Cara Membuat Surat Domisili',
  '<h2>Langkah Mengurus Surat Keterangan Domisili</h2><p>Surat keterangan domisili diperlukan jika Anda tinggal di luar daerah asal. Berikut langkah praktis untuk mengurusnya:</p><ul><li>Kunjungi pengurus RT/RW setempat dengan membawa <strong>KTP</strong> dan <strong>Kartu Keluarga asli beserta fotokopi</strong>.</li><li>Sampaikan maksud untuk membuat surat keterangan domisili tinggal sementara.</li><li>Bawa surat pengantar RT/RW ke Kelurahan untuk disahkan secara resmi oleh <strong>Lurah setempat</strong>.</li></ul>'
),
(
  'Tips Menulis Motivation Letter Beasiswa',
  '<h2>Strategi Menulis Motivation Letter yang Memikat</h2><p>Motivation letter adalah kesempatan terbaik Anda untuk menonjol di mata komite seleksi beasiswa. Ikuti tips penting ini:</p><ul><li>Tulis <strong>pembuka yang menarik</strong> dengan menceritakan visi besar hidup Anda.</li><li>Hubungkan latar belakang akademis Anda dengan kontribusi nyata yang ingin Anda berikan setelah lulus.</li><li>Tunjukkan alasan kuat mengapa program beasiswa ini <strong>layak memilih Anda</strong> sebagai salah satu penerimanya.</li></ul>'
),
(
  'Cara Upload Dokumen di BantuBeasiswa',
  '<h2>Panduan Unggah Dokumen Administrasi</h2><p>Berikut adalah tata cara mengunggah dokumen persyaratan di platform BantuBeasiswa dengan aman dan benar:</p><ul><li>Gunakan format file <strong>PDF</strong> atau <strong>Gambar (JPG/PNG)</strong> dengan ukuran maksimal <strong>2MB</strong>.</li><li>Pastikan hasil scan dokumen Anda terlihat jelas, tajam, tidak buram, dan tidak terpotong.</li><li>Periksa kembali status persetujuan dokumen Anda secara berkala di halaman <strong>Status Pendaftaran</strong>.</li></ul>'
);
