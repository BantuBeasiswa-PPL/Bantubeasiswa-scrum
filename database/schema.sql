-- ============================================================
-- BantuBeasiswa – PostgreSQL Schema for Supabase
-- Updated: 2026-04-20
-- Run this entire script in Supabase > SQL Editor
-- ============================================================


-- ============================================================
-- SECTION 1: CLEANUP (aman dijalankan ulang / re-run safe)
-- Drop tabel dari yang paling bergantung ke yang paling dasar
-- ============================================================
DROP TABLE IF EXISTS notifikasi          CASCADE;
DROP TABLE IF EXISTS penyaluran_dana     CASCADE;
DROP TABLE IF EXISTS tutorial            CASCADE;
DROP TABLE IF EXISTS laporan_link_rusak  CASCADE;
DROP TABLE IF EXISTS favorit             CASCADE;
DROP TABLE IF EXISTS rekening            CASCADE;
DROP TABLE IF EXISTS dokumen             CASCADE;
DROP TABLE IF EXISTS pendaftaran         CASCADE;
DROP TABLE IF EXISTS beasiswa_wilayah    CASCADE;
DROP TABLE IF EXISTS beasiswa            CASCADE;
DROP TABLE IF EXISTS wilayah             CASCADE;
DROP TABLE IF EXISTS pendonor            CASCADE;
DROP TABLE IF EXISTS admin               CASCADE;
DROP TABLE IF EXISTS "user"              CASCADE;
DROP TABLE IF EXISTS account             CASCADE;

-- Drop type jika ada dari versi lama
DROP TYPE IF EXISTS role_enum                CASCADE;
DROP TYPE IF EXISTS pendaftaran_status_enum  CASCADE;
DROP TYPE IF EXISTS verifikasi_status_enum   CASCADE;
DROP TYPE IF EXISTS beasiswa_status_enum     CASCADE;
DROP TYPE IF EXISTS rekening_status_enum     CASCADE;
DROP TYPE IF EXISTS laporan_status_enum      CASCADE;
DROP TYPE IF EXISTS penyaluran_status_enum   CASCADE;


-- ============================================================
-- SECTION 2: ENUM TYPES
-- Menggunakan ENUM agar database menjaga konsistensi nilai
-- ============================================================

-- Role pengguna pada tabel account
CREATE TYPE role_enum AS ENUM ('admin', 'mahasiswa', 'pendonor');

-- Status pendaftaran beasiswa (sesuai alur bisnis)
CREATE TYPE pendaftaran_status_enum AS ENUM (
    'TERDAFTAR',   -- baru mendaftar
    'REVIEW',      -- dokumen sedang diperiksa
    'EXAM',        -- sedang dalam tahap ujian/tes
    'LULUS',       -- diterima / lulus seleksi
    'DITOLAK'      -- ditolak
);

-- Status verifikasi pendonor
CREATE TYPE verifikasi_status_enum AS ENUM ('pending', 'terverifikasi', 'ditolak');

-- Status beasiswa
CREATE TYPE beasiswa_status_enum AS ENUM ('draft', 'aktif', 'ditutup', 'selesai');

-- Status rekening bank mahasiswa
CREATE TYPE rekening_status_enum AS ENUM ('pending', 'terverifikasi', 'ditolak');

-- Status laporan link rusak
CREATE TYPE laporan_status_enum AS ENUM ('open', 'diproses', 'selesai', 'ditutup');

-- Status penyaluran dana
CREATE TYPE penyaluran_status_enum AS ENUM ('pending', 'diproses', 'tersalurkan', 'gagal');


-- ============================================================
-- SECTION 3: TABLES
-- ============================================================

-- ----------------------------------------------------------
-- 3.1  account
-- Menyimpan kredensial login untuk semua tipe user
-- ----------------------------------------------------------
CREATE TABLE account (
    id          SERIAL       PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    kata_sandi  VARCHAR(255) NOT NULL,
    role        role_enum    NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  account           IS 'Tabel utama autentikasi. Satu baris per pengguna.';
COMMENT ON COLUMN account.kata_sandi IS 'Simpan HASH bcrypt, bukan plaintext!';


-- ----------------------------------------------------------
-- 3.2  user  (mahasiswa)
-- Profil tambahan untuk pengguna dengan role mahasiswa
-- ----------------------------------------------------------
CREATE TABLE "user" (
    id            SERIAL       PRIMARY KEY,
    account_id    INT          NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    nama          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    ukuran_font   INT          NOT NULL DEFAULT 3,      -- skala: 1=kecil, 3=normal, 5=besar
    mode_kontras  BOOLEAN      NOT NULL DEFAULT FALSE   -- aksesibilitas kontras tinggi
);

COMMENT ON TABLE "user" IS 'Profil mahasiswa. Terhubung 1-ke-1 dengan account.';


-- ----------------------------------------------------------
-- 3.3  admin
-- Profil tambahan untuk pengguna dengan role admin
-- ----------------------------------------------------------
CREATE TABLE admin (
    id          SERIAL       PRIMARY KEY,
    account_id  INT          NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    nama        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL
);

COMMENT ON TABLE admin IS 'Profil admin. Terhubung 1-ke-1 dengan account.';


-- ----------------------------------------------------------
-- 3.4  pendonor
-- Profil organisasi / lembaga pemberi beasiswa
-- ----------------------------------------------------------
CREATE TABLE pendonor (
    id                  SERIAL              PRIMARY KEY,
    account_id          INT                 NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    nama_organisasi     VARCHAR(255)        NOT NULL,
    kontak              VARCHAR(255),
    alamat              VARCHAR(255),
    status_verifikasi   verifikasi_status_enum NOT NULL DEFAULT 'pending'
);

COMMENT ON TABLE pendonor IS 'Profil lembaga / organisasi pendonor beasiswa.';


-- ----------------------------------------------------------
-- 3.5  wilayah
-- Master wilayah untuk filter beasiswa berdasarkan lokasi
-- ----------------------------------------------------------
CREATE TABLE wilayah (
    id          SERIAL       PRIMARY KEY,
    nama        VARCHAR(255) NOT NULL,
    tipe        VARCHAR(255) NOT NULL,   -- contoh: 'provinsi', 'kabupaten', 'kota'
    provinsi    VARCHAR(255),            -- hanya terisi jika tipe bukan provinsi
    is_afirmasi BOOLEAN      NOT NULL DEFAULT FALSE,
    is_3t       BOOLEAN      NOT NULL DEFAULT FALSE  -- Terdepan, Terluar, Tertinggal
);

COMMENT ON TABLE wilayah IS 'Master data wilayah Indonesia untuk pembatasan beasiswa.';


-- ----------------------------------------------------------
-- 3.6  beasiswa
-- Data utama beasiswa yang diposting oleh pendonor
-- ----------------------------------------------------------
CREATE TABLE beasiswa (
    id          SERIAL               PRIMARY KEY,
    pendonor_id INT                  NOT NULL REFERENCES pendonor(id) ON DELETE CASCADE,
    admin_id    INT                  NULL     REFERENCES admin(id)    ON DELETE SET NULL,
    judul       VARCHAR(255)         NOT NULL,
    deskripsi   TEXT,
    syarat      TEXT,
    nominal     INT,                           -- nilai nominal beasiswa dalam rupiah
    kuota       INT,                           -- jumlah penerima yang dibuka
    deadline    TIMESTAMPTZ,
    status      beasiswa_status_enum NOT NULL DEFAULT 'draft',
    created_at  TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  beasiswa          IS 'Data beasiswa yang ditawarkan oleh pendonor.';
COMMENT ON COLUMN beasiswa.admin_id IS 'Admin yang me-review / menyetujui beasiswa. NULL jika belum ditugaskan.';
COMMENT ON COLUMN beasiswa.nominal  IS 'Nilai beasiswa per penerima dalam Rupiah.';


-- ----------------------------------------------------------
-- 3.7  beasiswa_wilayah  (junction table)
-- Menghubungkan beasiswa dengan satu atau lebih wilayah target
-- ----------------------------------------------------------
CREATE TABLE beasiswa_wilayah (
    beasiswa_id INT          NOT NULL REFERENCES beasiswa(id) ON DELETE CASCADE,
    wilayah_id  INT          NOT NULL REFERENCES wilayah(id)  ON DELETE CASCADE,
    keterangan  VARCHAR(255),
    PRIMARY KEY (beasiswa_id, wilayah_id)
);

COMMENT ON TABLE beasiswa_wilayah IS 'Relasi M-N antara beasiswa dan wilayah target.';


-- ----------------------------------------------------------
-- 3.8  pendaftaran
-- Rekam jejak pendaftaran mahasiswa ke suatu beasiswa
-- ----------------------------------------------------------
CREATE TABLE pendaftaran (
    id          SERIAL                  PRIMARY KEY,
    user_id     INT                     NOT NULL REFERENCES "user"(id)    ON DELETE CASCADE,
    beasiswa_id INT                     NOT NULL REFERENCES beasiswa(id)  ON DELETE CASCADE,
    status      pendaftaran_status_enum NOT NULL DEFAULT 'TERDAFTAR',
    created_at  TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, beasiswa_id)  -- satu mahasiswa hanya bisa daftar sekali per beasiswa
);

COMMENT ON TABLE pendaftaran IS 'Pendaftaran mahasiswa ke beasiswa. Status mengikuti alur seleksi.';


-- ----------------------------------------------------------
-- 3.9  dokumen
-- Dokumen persyaratan yang diupload per pendaftaran
-- ----------------------------------------------------------
CREATE TABLE dokumen (
    id               SERIAL       PRIMARY KEY,
    pendaftaran_id   INT          NOT NULL REFERENCES pendaftaran(id) ON DELETE CASCADE,
    jenis            VARCHAR(255) NOT NULL,  -- contoh: 'KTP', 'Transkrip', 'Surat Rekomendasi'
    file_url         TEXT,                   -- URL file di Supabase Storage
    status_dokumen   VARCHAR(20)  NOT NULL DEFAULT 'MENUNGGU'
                         CHECK (status_dokumen IN ('MENUNGGU', 'DISETUJUI', 'DITOLAK')),
    rejection_reason TEXT                    -- alasan penolakan, diisi admin
);

COMMENT ON TABLE  dokumen              IS 'Dokumen persyaratan yang diunggah oleh mahasiswa.';
COMMENT ON COLUMN dokumen.file_url     IS 'Path/URL file di Supabase Storage bucket.';
COMMENT ON COLUMN dokumen.rejection_reason IS 'Diisi admin jika status_dokumen = DITOLAK.';


-- ----------------------------------------------------------
-- 3.10 rekening
-- Data rekening bank mahasiswa untuk pencairan dana
-- ----------------------------------------------------------
CREATE TABLE rekening (
    id              SERIAL              PRIMARY KEY,
    user_id         INT                 NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    nama_bank       VARCHAR(255)        NOT NULL,
    nama_pemilik    VARCHAR(255)        NOT NULL,
    nomor_rekening  VARCHAR(255)        NOT NULL,
    foto_buku_url   TEXT                NULL,   -- foto buku tabungan di Supabase Storage
    status          rekening_status_enum NOT NULL DEFAULT 'pending'
);

COMMENT ON TABLE rekening IS 'Data rekening bank mahasiswa untuk pencairan beasiswa.';


-- ----------------------------------------------------------
-- 3.11 favorit
-- Daftar beasiswa yang di-bookmark oleh mahasiswa
-- ----------------------------------------------------------
CREATE TABLE favorit (
    id          SERIAL      PRIMARY KEY,
    user_id     INT         NOT NULL REFERENCES "user"(id)    ON DELETE CASCADE,
    beasiswa_id INT         NOT NULL REFERENCES beasiswa(id)  ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, beasiswa_id)
);

COMMENT ON TABLE favorit IS 'Beasiswa yang ditandai sebagai favorit oleh mahasiswa.';


-- ----------------------------------------------------------
-- 3.12 laporan_link_rusak
-- Laporan dari mahasiswa jika link/info beasiswa tidak valid
-- ----------------------------------------------------------
CREATE TABLE laporan_link_rusak (
    id            SERIAL               PRIMARY KEY,
    user_id       INT                  NOT NULL REFERENCES "user"(id)    ON DELETE CASCADE,
    beasiswa_id   INT                  NOT NULL REFERENCES beasiswa(id)  ON DELETE CASCADE,
    deskripsi     TEXT,
    tanggal_lapor TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    status        laporan_status_enum  NOT NULL DEFAULT 'open',
    catatan_admin TEXT                 NULL
);

COMMENT ON TABLE laporan_link_rusak IS 'Laporan kerusakan link atau info beasiswa yang dikirim mahasiswa.';


-- ----------------------------------------------------------
-- 3.13 tutorial
-- Artikel / panduan untuk mahasiswa dan pendonor
-- ----------------------------------------------------------
CREATE TABLE tutorial (
    id        SERIAL       PRIMARY KEY,
    judul     VARCHAR(255) NOT NULL,
    konten    TEXT         NOT NULL,
    kategori  VARCHAR(50)
);

COMMENT ON TABLE tutorial IS 'Artikel panduan / tutorial penggunaan platform.';


-- ----------------------------------------------------------
-- 3.14 penyaluran_dana
-- Rekap pencairan dana dari pendonor ke penerima beasiswa
-- ----------------------------------------------------------
CREATE TABLE penyaluran_dana (
    id                 SERIAL                  PRIMARY KEY,
    pendonor_id        INT                     NOT NULL REFERENCES pendonor(id) ON DELETE CASCADE,
    beasiswa_id        INT                     NOT NULL REFERENCES beasiswa(id) ON DELETE CASCADE,
    pendaftaran_id     INT                     REFERENCES pendaftaran(id) ON DELETE CASCADE,
    jumlah_dana        BIGINT                  NOT NULL DEFAULT 0,
    jumlah_penerima    INT                     NOT NULL DEFAULT 0,
    tanggal_penyaluran DATE                    NULL,
    status             penyaluran_status_enum  NOT NULL DEFAULT 'pending',
    bukti_transfer_url TEXT                    NULL,
    id_transaksi       VARCHAR(255)            NULL
);

COMMENT ON TABLE penyaluran_dana IS 'Rekap realisasi penyaluran dana beasiswa oleh pendonor.';


-- ----------------------------------------------------------
-- 3.15 notifikasi
-- Notifikasi in-app untuk mahasiswa
-- ----------------------------------------------------------
CREATE TABLE notifikasi (
    id         SERIAL      PRIMARY KEY,
    user_id    INT         NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    pesan      TEXT        NOT NULL,
    is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifikasi IS 'Notifikasi in-app. Dibuat otomatis saat status pendaftaran berubah.';


-- ============================================================
-- SECTION 4: INDEXES
-- Index tambahan pada kolom yang sering dipakai untuk
-- WHERE / JOIN / ORDER BY agar query lebih cepat
-- ============================================================

-- account
CREATE INDEX idx_account_email  ON account(email);
CREATE INDEX idx_account_role   ON account(role);

-- user
CREATE INDEX idx_user_account_id ON "user"(account_id);
CREATE INDEX idx_user_email      ON "user"(email);

-- admin
CREATE INDEX idx_admin_account_id ON admin(account_id);

-- pendonor
CREATE INDEX idx_pendonor_account_id        ON pendonor(account_id);
CREATE INDEX idx_pendonor_status_verifikasi ON pendonor(status_verifikasi);

-- beasiswa
CREATE INDEX idx_beasiswa_pendonor_id ON beasiswa(pendonor_id);
CREATE INDEX idx_beasiswa_admin_id    ON beasiswa(admin_id);
CREATE INDEX idx_beasiswa_status      ON beasiswa(status);
CREATE INDEX idx_beasiswa_deadline    ON beasiswa(deadline);

-- beasiswa_wilayah
CREATE INDEX idx_bw_wilayah_id ON beasiswa_wilayah(wilayah_id);

-- pendaftaran
CREATE INDEX idx_pendaftaran_user_id     ON pendaftaran(user_id);
CREATE INDEX idx_pendaftaran_beasiswa_id ON pendaftaran(beasiswa_id);
CREATE INDEX idx_pendaftaran_status      ON pendaftaran(status);

-- dokumen
CREATE INDEX idx_dokumen_pendaftaran_id ON dokumen(pendaftaran_id);
CREATE INDEX idx_dokumen_status         ON dokumen(status_dokumen);

-- rekening
CREATE INDEX idx_rekening_user_id ON rekening(user_id);
CREATE INDEX idx_rekening_status  ON rekening(status);

-- favorit
CREATE INDEX idx_favorit_user_id     ON favorit(user_id);
CREATE INDEX idx_favorit_beasiswa_id ON favorit(beasiswa_id);

-- laporan_link_rusak
CREATE INDEX idx_laporan_user_id     ON laporan_link_rusak(user_id);
CREATE INDEX idx_laporan_beasiswa_id ON laporan_link_rusak(beasiswa_id);
CREATE INDEX idx_laporan_status      ON laporan_link_rusak(status);

-- penyaluran_dana
CREATE INDEX idx_penyaluran_pendonor_id ON penyaluran_dana(pendonor_id);
CREATE INDEX idx_penyaluran_beasiswa_id ON penyaluran_dana(beasiswa_id);
CREATE INDEX idx_penyaluran_pendaftaran_id ON penyaluran_dana(pendaftaran_id);
CREATE INDEX idx_penyaluran_status      ON penyaluran_dana(status);

-- notifikasi
CREATE INDEX idx_notifikasi_user_id  ON notifikasi(user_id);
CREATE INDEX idx_notifikasi_is_read  ON notifikasi(is_read);


-- ============================================================
-- SECTION 5: SEED DATA
-- Data contoh untuk keperluan development & testing
-- PENTING: kata_sandi di bawah adalah PLACEHOLDER.
--          Ganti dengan hash bcrypt asli sebelum deploy ke prod!
-- ============================================================

-- 5.1 account  (6 baris: 2 admin, 2 mahasiswa, 2 pendonor)
INSERT INTO account (email, kata_sandi, role) VALUES
    ('admin1@bantubeasiswa.id',  '$2b$10$REPLACE_WITH_REAL_HASH_ADMIN1',   'admin'),
    ('admin2@bantubeasiswa.id',  '$2b$10$REPLACE_WITH_REAL_HASH_ADMIN2',   'admin'),
    ('budi@mahasiswa.id',        '$2b$10$REPLACE_WITH_REAL_HASH_USER1',    'mahasiswa'),
    ('siti@mahasiswa.id',        '$2b$10$REPLACE_WITH_REAL_HASH_USER2',    'mahasiswa'),
    ('yayasan@nusantara.id',     '$2b$10$REPLACE_WITH_REAL_HASH_DONOR1',   'pendonor'),
    ('csr@inovasibangsa.id',     '$2b$10$REPLACE_WITH_REAL_HASH_DONOR2',   'pendonor');

-- 5.2 user (mahasiswa) – account_id 3 & 4
INSERT INTO "user" (account_id, nama, email, ukuran_font, mode_kontras) VALUES
    (3, 'Budi Santoso', 'budi@mahasiswa.id', 3, FALSE),
    (4, 'Siti Rahayu',  'siti@mahasiswa.id', 3, TRUE);

-- 5.3 admin – account_id 1 & 2
INSERT INTO admin (account_id, nama, email) VALUES
    (1, 'Admin Utama',  'admin1@bantubeasiswa.id'),
    (2, 'Admin Kedua',  'admin2@bantubeasiswa.id');

-- 5.4 pendonor – account_id 5 & 6
INSERT INTO pendonor (account_id, nama_organisasi, kontak, alamat, status_verifikasi) VALUES
    (5, 'Yayasan Pendidikan Nusantara', '021-12345678', 'Jl. Merdeka No. 1, Jakarta Pusat', 'terverifikasi'),
    (6, 'PT Inovasi Bangsa Tbk.',       '031-87654321', 'Jl. Pemuda No. 45, Surabaya',      'terverifikasi');

-- 5.5 wilayah
INSERT INTO wilayah (nama, tipe, provinsi, is_afirmasi, is_3t) VALUES
    ('Jawa Barat',             'provinsi',  NULL,          FALSE, FALSE),
    ('Jawa Timur',             'provinsi',  NULL,          FALSE, FALSE),
    ('Papua',                  'provinsi',  NULL,          TRUE,  TRUE),
    ('Nusa Tenggara Timur',    'provinsi',  NULL,          TRUE,  TRUE),
    ('Bandung',                'kota',      'Jawa Barat',  FALSE, FALSE),
    ('Surabaya',               'kota',      'Jawa Timur',  FALSE, FALSE);

-- 5.6 beasiswa  (pendonor_id 1 & 2, admin_id 1)
INSERT INTO beasiswa (pendonor_id, admin_id, judul, deskripsi, syarat, nominal, kuota, deadline, status) VALUES
    (1, 1,
     'Beasiswa Prestasi Nusantara 2026',
     'Beasiswa penuh untuk mahasiswa berprestasi di seluruh Indonesia dari Yayasan Pendidikan Nusantara.',
     'IPK minimal 3.5, aktif berorganisasi, tidak sedang menerima beasiswa lain.',
     5000000, 100,
     '2026-07-31 23:59:59+07',
     'aktif'),
    (1, 1,
     'Beasiswa Afirmasi Papua 2026',
     'Beasiswa khusus mahasiswa asal Papua untuk mendukung pemerataan pendidikan tinggi.',
     'Berasal dari Papua, IPK minimal 2.75, surat keterangan domisili.',
     4000000, 50,
     '2026-06-30 23:59:59+07',
     'aktif'),
    (2, NULL,
     'Beasiswa Inovasi Digital 2026',
     'Beasiswa untuk mahasiswa jurusan teknologi informasi yang berminat di bidang startup.',
     'Jurusan TI/Informatika, IPK minimal 3.0, portofolio proyek digital.',
     6000000, 30,
     '2026-08-15 23:59:59+07',
     'draft');

-- 5.7 beasiswa_wilayah
INSERT INTO beasiswa_wilayah (beasiswa_id, wilayah_id, keterangan) VALUES
    (1, 1, 'Kuota 50 penerima dari Jawa Barat'),
    (1, 2, 'Kuota 50 penerima dari Jawa Timur'),
    (2, 3, 'Khusus mahasiswa asal Papua'),
    (2, 4, 'Khusus mahasiswa asal NTT'),
    (3, 1, 'Berlaku untuk seluruh wilayah Jawa Barat');

-- 5.8 pendaftaran  (user_id 1 & 2)
INSERT INTO pendaftaran (user_id, beasiswa_id, status) VALUES
    (1, 1, 'TERDAFTAR'),
    (1, 2, 'REVIEW'),
    (2, 1, 'EXAM');

-- 5.9 dokumen
INSERT INTO dokumen (pendaftaran_id, jenis, file_url, status_dokumen, rejection_reason) VALUES
    (1, 'KTP',              'storage/dokumen/budi_ktp.pdf',         'DISETUJUI', NULL),
    (1, 'Transkrip Nilai',  'storage/dokumen/budi_transkrip.pdf',   'MENUNGGU',  NULL),
    (2, 'KTP',              'storage/dokumen/budi_ktp2.pdf',        'DISETUJUI', NULL),
    (2, 'Surat Rekomendasi','storage/dokumen/budi_rekomendasi.pdf', 'DITOLAK',   'File tidak terbaca, harap upload ulang dalam format PDF.'),
    (3, 'KTP',              'storage/dokumen/siti_ktp.pdf',         'MENUNGGU',  NULL),
    (3, 'Transkrip Nilai',  'storage/dokumen/siti_transkrip.pdf',   'MENUNGGU',  NULL);

-- 5.10 rekening
INSERT INTO rekening (user_id, nama_bank, nama_pemilik, nomor_rekening, foto_buku_url, status) VALUES
    (1, 'Bank BCA',  'Budi Santoso', '1234567890', 'storage/rekening/budi_buku_tabungan.jpg', 'terverifikasi'),
    (2, 'Bank BNI',  'Siti Rahayu',  '0987654321', NULL,                                     'pending');

-- 5.11 favorit
INSERT INTO favorit (user_id, beasiswa_id) VALUES
    (1, 2),
    (1, 3),
    (2, 1),
    (2, 2);

-- 5.12 laporan_link_rusak
INSERT INTO laporan_link_rusak (user_id, beasiswa_id, deskripsi, status, catatan_admin) VALUES
    (1, 3, 'Link pendaftaran mengarah ke halaman 404.',                    'open',     NULL),
    (2, 1, 'Halaman pendaftaran tidak bisa diakses sejak kemarin.',        'diproses', 'Sudah dikonfirmasi ke pendonor, sedang diperbaiki.');

-- 5.13 tutorial
INSERT INTO tutorial (judul, konten, kategori) VALUES
    ('Cara Mendaftar Beasiswa',
     'Langkah 1: Buat akun mahasiswa. Langkah 2: Lengkapi profil dan data rekening. Langkah 3: Cari beasiswa yang sesuai. Langkah 4: Upload dokumen persyaratan. Langkah 5: Submit pendaftaran dan pantau status di halaman "Pendaftaran Saya".',
     'panduan'),
    ('Tips Menulis Esai Beasiswa',
     'Esai beasiswa yang baik harus mencerminkan cerita pribadi Anda, menjelaskan motivasi belajar, dan menghubungkan tujuan Anda dengan misi lembaga pemberi beasiswa. Gunakan bahasa yang jelas, lugas, dan hindari klise.',
     'tips'),
    ('Cara Upload Dokumen yang Benar',
     'Pastikan semua dokumen dalam format PDF ukuran maks 2MB. Scan dokumen dengan resolusi minimal 300 DPI. Pastikan teks terbaca jelas dan tidak terpotong. Beri nama file yang jelas sebelum diupload.',
     'panduan');

-- 5.14 penyaluran_dana
INSERT INTO penyaluran_dana (pendonor_id, beasiswa_id, jumlah_dana, jumlah_penerima, tanggal_penyaluran, status, bukti_transfer_url, id_transaksi) VALUES
    (1, 1, 500000000, 100, '2026-01-15', 'tersalurkan', 'storage/bukti/transfer_prestasi_jan2026.pdf', 'TRX-2026-001'),
    (1, 2, 200000000, 50,  '2026-02-01', 'tersalurkan', 'storage/bukti/transfer_papua_feb2026.pdf',   'TRX-2026-002'),
    (2, 3, 0,         0,   NULL,         'pending',     NULL,                                          NULL);

-- 5.15 notifikasi
INSERT INTO notifikasi (user_id, pesan, is_read) VALUES
    (1, 'Pendaftaran Anda untuk "Beasiswa Prestasi Nusantara 2026" berhasil dikirim.',  TRUE),
    (1, 'Status dokumen KTP Anda telah disetujui.',                                    FALSE),
    (2, 'Pendaftaran Anda untuk "Beasiswa Prestasi Nusantara 2026" sedang dalam tahap EXAM.', FALSE);


-- ============================================================
-- END OF SCRIPT
-- Cara menjalankan:
--   1. Buka Supabase Dashboard → SQL Editor
--   2. Paste seluruh isi file ini
--   3. Klik "Run" (atau tekan Ctrl+Enter)
-- ============================================================
