-- ============================================================
-- BantuBeasiswa – PostgreSQL Schema for Supabase
-- Generated: 2026-04-15
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- SECTION 1: CLEANUP (safe to re-run)
-- ============================================================
DROP TABLE IF EXISTS penyaluran_dana   CASCADE;
DROP TABLE IF EXISTS tutorial          CASCADE;
DROP TABLE IF EXISTS laporan_link_rusak CASCADE;
DROP TABLE IF EXISTS favorit           CASCADE;
DROP TABLE IF EXISTS rekening          CASCADE;
DROP TABLE IF EXISTS dokumen           CASCADE;
DROP TABLE IF EXISTS pendaftaran       CASCADE;
DROP TABLE IF EXISTS beasiswa_wilayah  CASCADE;
DROP TABLE IF EXISTS beasiswa          CASCADE;
DROP TABLE IF EXISTS wilayah           CASCADE;
DROP TABLE IF EXISTS pendonor          CASCADE;
DROP TABLE IF EXISTS admin             CASCADE;
DROP TABLE IF EXISTS "user"            CASCADE;
DROP TABLE IF EXISTS account           CASCADE;

DROP TYPE IF EXISTS role_enum           CASCADE;
DROP TYPE IF EXISTS pendaftaran_status_enum CASCADE;
DROP TYPE IF EXISTS dokumen_status_enum    CASCADE;


-- ============================================================
-- SECTION 2: CUSTOM ENUM TYPES
-- ============================================================

-- Role untuk account
CREATE TYPE role_enum AS ENUM ('admin', 'mahasiswa', 'pendonor');

-- Status pendaftaran beasiswa
CREATE TYPE pendaftaran_status_enum AS ENUM (
    'TERDAFTAR',
    'EXAM',
    'REVIEW',
    'TOLAK',
    'DITERIMA',
    'DITOLAK',
    'LULUS'
);

-- Status dokumen
CREATE TYPE dokumen_status_enum AS ENUM (
    'FALSE',
    'TRUE',
    'EXAM',
    'NILAI',
    'MENUNGGU'
);


-- ============================================================
-- SECTION 3: TABLES
-- ============================================================

-- ----------------------------------------------------------
-- 3.1 account
-- Menyimpan kredensial login untuk semua tipe pengguna
-- ----------------------------------------------------------
CREATE TABLE account (
    "accountId"   BIGSERIAL PRIMARY KEY,
    email         TEXT        NOT NULL UNIQUE,
    "kataKunci"   TEXT        NOT NULL,
    role          role_enum   NOT NULL,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- 3.2 user (mahasiswa)
-- ----------------------------------------------------------
CREATE TABLE "user" (
    "userId"       BIGSERIAL PRIMARY KEY,
    "accountId"    BIGINT      NOT NULL REFERENCES account("accountId") ON DELETE CASCADE,
    nama           TEXT        NOT NULL,
    email          TEXT        NOT NULL,
    "kataSandi"    TEXT        NOT NULL,
    "ukuranFont"   INT         NOT NULL DEFAULT 16,
    "modeKontras"  INT         NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- 3.3 admin
-- ----------------------------------------------------------
CREATE TABLE admin (
    "adminId"      BIGSERIAL PRIMARY KEY,
    "accountId"    BIGINT      NOT NULL REFERENCES account("accountId") ON DELETE CASCADE,
    nama           TEXT        NOT NULL,
    email          TEXT        NOT NULL,
    "kataSandi"    TEXT        NOT NULL,
    "ukuranFont"   INT         NOT NULL DEFAULT 16,
    "modeKontras"  INT         NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- 3.4 pendonor
-- ----------------------------------------------------------
CREATE TABLE pendonor (
    "pendonorId"        BIGSERIAL PRIMARY KEY,
    "accountId"         BIGINT  NOT NULL REFERENCES account("accountId") ON DELETE CASCADE,
    "statusOrganisasi"  TEXT,
    kontak              TEXT,
    alamat              TEXT,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- 3.5 wilayah
-- ----------------------------------------------------------
CREATE TABLE wilayah (
    "wilayahId"  BIGSERIAL PRIMARY KEY,
    nama         TEXT        NOT NULL,
    tipe         TEXT        NOT NULL,   -- contoh: 'provinsi', 'kabupaten', 'kota'
    mode         TEXT,
    "isAfirmasi" BOOLEAN     NOT NULL DEFAULT FALSE,
    "is3T"       BOOLEAN     NOT NULL DEFAULT FALSE,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- 3.6 beasiswa
-- ----------------------------------------------------------
CREATE TABLE beasiswa (
    "beasiswaId"      BIGSERIAL PRIMARY KEY,
    "pendonorId"      BIGINT  NOT NULL REFERENCES pendonor("pendonorId") ON DELETE CASCADE,
    judul             TEXT    NOT NULL,
    jalur             TEXT,
    deadline          DATE,
    deskripsi         TEXT,
    syarat            TEXT,
    "linkPendaftaran" TEXT,
    status            TEXT    NOT NULL DEFAULT 'draft',
    "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- 3.7 beasiswa_wilayah  (junction table, composite PK)
-- ----------------------------------------------------------
CREATE TABLE beasiswa_wilayah (
    "beasiswaId"  BIGINT NOT NULL REFERENCES beasiswa("beasiswaId") ON DELETE CASCADE,
    "wilayahId"   BIGINT NOT NULL REFERENCES wilayah("wilayahId")   ON DELETE CASCADE,
    keterangan    TEXT,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY ("beasiswaId", "wilayahId")
);

-- ----------------------------------------------------------
-- 3.8 pendaftaran
-- ----------------------------------------------------------
CREATE TABLE pendaftaran (
    "pendaftaranId" BIGSERIAL              PRIMARY KEY,
    "userId"        BIGINT                 NOT NULL REFERENCES "user"("userId") ON DELETE CASCADE,
    "beasiswaId"    BIGINT                 NOT NULL REFERENCES beasiswa("beasiswaId") ON DELETE CASCADE,
    status          pendaftaran_status_enum NOT NULL DEFAULT 'TERDAFTAR',
    "createdAt"     TIMESTAMPTZ            NOT NULL DEFAULT now(),
    "updatedAt"     TIMESTAMPTZ            NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- 3.9 dokumen
-- ----------------------------------------------------------
CREATE TABLE dokumen (
    "dokumenId"       BIGSERIAL           PRIMARY KEY,
    "pendaftaranId"   BIGINT              NOT NULL REFERENCES pendaftaran("pendaftaranId") ON DELETE CASCADE,
    jenis             TEXT                NOT NULL,
    error             TEXT,
    "statusDokumen"   dokumen_status_enum NOT NULL DEFAULT 'MENUNGGU',
    "rejectionReason" TEXT,
    "createdAt"       TIMESTAMPTZ         NOT NULL DEFAULT now(),
    "updatedAt"       TIMESTAMPTZ         NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- 3.10 rekening
-- ----------------------------------------------------------
CREATE TABLE rekening (
    "rekeningId"     BIGSERIAL PRIMARY KEY,
    "userId"         BIGINT    NOT NULL REFERENCES "user"("userId") ON DELETE CASCADE,
    "namRekening"    TEXT      NOT NULL,
    "nomorRekening"  TEXT      NOT NULL UNIQUE,
    status           TEXT      NOT NULL DEFAULT 'aktif',
    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- 3.11 favorit
-- ----------------------------------------------------------
CREATE TABLE favorit (
    "favoritId"           BIGSERIAL PRIMARY KEY,
    "userId"              BIGINT    NOT NULL REFERENCES "user"("userId")    ON DELETE CASCADE,
    "beasiswaId"          BIGINT    NOT NULL REFERENCES beasiswa("beasiswaId") ON DELETE CASCADE,
    "tanggalDitambahkan"  DATE      NOT NULL DEFAULT CURRENT_DATE,
    "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE ("userId", "beasiswaId")   -- satu user tidak bisa favorit 2x beasiswa yg sama
);

-- ----------------------------------------------------------
-- 3.12 laporan_link_rusak
-- ----------------------------------------------------------
CREATE TABLE laporan_link_rusak (
    "laporanId"    BIGSERIAL PRIMARY KEY,
    "userId"       BIGINT    NOT NULL REFERENCES "user"("userId")    ON DELETE CASCADE,
    "beasiswaId"   BIGINT    NOT NULL REFERENCES beasiswa("beasiswaId") ON DELETE CASCADE,
    deskripsi      TEXT,
    "tanggalLapor" DATE      NOT NULL DEFAULT CURRENT_DATE,
    status         TEXT      NOT NULL DEFAULT 'pending',
    "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- 3.13 tutorial
-- ----------------------------------------------------------
CREATE TABLE tutorial (
    "tutorialId" BIGSERIAL PRIMARY KEY,
    judul        TEXT        NOT NULL,
    konten       TEXT        NOT NULL,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------
-- 3.14 penyaluran_dana
-- ----------------------------------------------------------
CREATE TABLE penyaluran_dana (
    "penyaluranId"      BIGSERIAL PRIMARY KEY,
    "pendonorId"        BIGINT    NOT NULL REFERENCES pendonor("pendonorId") ON DELETE CASCADE,
    "beasiswaId"        BIGINT    NOT NULL REFERENCES beasiswa("beasiswaId") ON DELETE CASCADE,
    "jumlahDana"        INT       NOT NULL DEFAULT 0,
    "jumlahPenerima"    INT       NOT NULL DEFAULT 0,
    "tanggalPenyaluran" DATE      NOT NULL DEFAULT CURRENT_DATE,
    status              TEXT      NOT NULL DEFAULT 'pending',
    "laporanFile"       TEXT,     -- nullable: path/URL file laporan
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- SECTION 4: INDEXES
-- Untuk kolom yang sering digunakan dalam WHERE / JOIN
-- ============================================================

-- account
CREATE INDEX idx_account_email  ON account(email);
CREATE INDEX idx_account_role   ON account(role);

-- user
CREATE INDEX idx_user_account   ON "user"("accountId");
CREATE INDEX idx_user_email     ON "user"(email);

-- admin
CREATE INDEX idx_admin_account  ON admin("accountId");

-- pendonor
CREATE INDEX idx_pendonor_account ON pendonor("accountId");

-- beasiswa
CREATE INDEX idx_beasiswa_pendonor ON beasiswa("pendonorId");
CREATE INDEX idx_beasiswa_status   ON beasiswa(status);
CREATE INDEX idx_beasiswa_deadline ON beasiswa(deadline);

-- beasiswa_wilayah
CREATE INDEX idx_bw_wilayah ON beasiswa_wilayah("wilayahId");

-- pendaftaran
CREATE INDEX idx_pendaftaran_user     ON pendaftaran("userId");
CREATE INDEX idx_pendaftaran_beasiswa ON pendaftaran("beasiswaId");
CREATE INDEX idx_pendaftaran_status   ON pendaftaran(status);

-- dokumen
CREATE INDEX idx_dokumen_pendaftaran ON dokumen("pendaftaranId");
CREATE INDEX idx_dokumen_status      ON dokumen("statusDokumen");

-- rekening
CREATE INDEX idx_rekening_user   ON rekening("userId");
CREATE INDEX idx_rekening_status ON rekening(status);

-- favorit
CREATE INDEX idx_favorit_user     ON favorit("userId");
CREATE INDEX idx_favorit_beasiswa ON favorit("beasiswaId");

-- laporan_link_rusak
CREATE INDEX idx_laporan_user     ON laporan_link_rusak("userId");
CREATE INDEX idx_laporan_beasiswa ON laporan_link_rusak("beasiswaId");
CREATE INDEX idx_laporan_status   ON laporan_link_rusak(status);

-- penyaluran_dana
CREATE INDEX idx_penyaluran_pendonor ON penyaluran_dana("pendonorId");
CREATE INDEX idx_penyaluran_beasiswa ON penyaluran_dana("beasiswaId");
CREATE INDEX idx_penyaluran_status   ON penyaluran_dana(status);


-- ============================================================
-- SECTION 5: SEED DATA (2+ rows per table)
-- Password dalam format bcrypt – ganti dengan hash asli di prod
-- ============================================================

-- 5.1 account
INSERT INTO account (email, "kataKunci", role) VALUES
    ('admin@bantubeasiswa.id',   '$2b$10$hashedPasswordAdmin1xxxx', 'admin'),
    ('admin2@bantubeasiswa.id',  '$2b$10$hashedPasswordAdmin2xxxx', 'admin'),
    ('mahasiswa1@email.com',     '$2b$10$hashedPasswordUser1xxxxx', 'mahasiswa'),
    ('mahasiswa2@email.com',     '$2b$10$hashedPasswordUser2xxxxx', 'mahasiswa'),
    ('pendonor1@yayasan.id',     '$2b$10$hashedPasswordDonor1xxxx', 'pendonor'),
    ('pendonor2@perusahaan.id',  '$2b$10$hashedPasswordDonor2xxxx', 'pendonor');

-- 5.2 user (mahasiswa) – accountId 3 & 4
INSERT INTO "user" ("accountId", nama, email, "kataSandi", "ukuranFont", "modeKontras") VALUES
    (3, 'Budi Santoso',   'mahasiswa1@email.com', '$2b$10$hashedPasswordUser1xxxxx', 16, 0),
    (4, 'Siti Rahayu',    'mahasiswa2@email.com', '$2b$10$hashedPasswordUser2xxxxx', 18, 1);

-- 5.3 admin – accountId 1 & 2
INSERT INTO admin ("accountId", nama, email, "kataSandi", "ukuranFont", "modeKontras") VALUES
    (1, 'Admin Utama',    'admin@bantubeasiswa.id',  '$2b$10$hashedPasswordAdmin1xxxx', 16, 0),
    (2, 'Admin Kedua',    'admin2@bantubeasiswa.id', '$2b$10$hashedPasswordAdmin2xxxx', 16, 0);

-- 5.4 pendonor – accountId 5 & 6
INSERT INTO pendonor ("accountId", "statusOrganisasi", kontak, alamat) VALUES
    (5, 'Yayasan Pendidikan Nusantara', '021-55512345', 'Jl. Merdeka No. 1, Jakarta Pusat'),
    (6, 'PT Inovasi Bangsa Tbk.',       '031-77789012', 'Jl. Pemuda No. 45, Surabaya');

-- 5.5 wilayah
INSERT INTO wilayah (nama, tipe, mode, "isAfirmasi", "is3T") VALUES
    ('Jawa Barat',        'provinsi',  'reguler',   FALSE, FALSE),
    ('Jawa Timur',        'provinsi',  'reguler',   FALSE, FALSE),
    ('Papua',             'provinsi',  'afirmasi',  TRUE,  TRUE),
    ('Nusa Tenggara Timur','provinsi', 'afirmasi',  TRUE,  TRUE),
    ('Bandung',           'kota',      'reguler',   FALSE, FALSE),
    ('Surabaya',          'kota',      'reguler',   FALSE, FALSE);

-- 5.6 beasiswa
INSERT INTO beasiswa ("pendonorId", judul, jalur, deadline, deskripsi, syarat, "linkPendaftaran", status) VALUES
    (1, 'Beasiswa Prestasi Nusantara 2026',
        'Reguler',
        '2026-07-31',
        'Beasiswa penuh untuk mahasiswa berprestasi di seluruh Indonesia.',
        'IPK minimal 3.5, aktif berorganisasi, tidak sedang menerima beasiswa lain.',
        'https://yayasan-nusantara.id/beasiswa/2026',
        'aktif'),
    (1, 'Beasiswa Afirmasi Papua 2026',
        'Afirmasi',
        '2026-06-30',
        'Beasiswa khusus mahasiswa asal Papua untuk mendukung pemerataan pendidikan.',
        'Berasal dari Papua, IPK minimal 2.75, surat keterangan domisili.',
        'https://yayasan-nusantara.id/afirmasi-papua/2026',
        'aktif'),
    (2, 'Beasiswa Inovasi Digital 2026',
        'Reguler',
        '2026-08-15',
        'Beasiswa untuk mahasiswa jurusan teknologi informasi yang berminat di bidang startup.',
        'Jurusan TI/Informatika, IPK minimal 3.0, portofolio proyek digital.',
        'https://inovasibangsa.co.id/beasiswa/digital/2026',
        'draft'),
    (2, 'Beasiswa Wirausaha Muda 2026',
        'Reguler',
        '2026-09-01',
        'Mendukung mahasiswa dengan jiwa wirausaha dan ide bisnis inovatif.',
        'Memiliki proposal bisnis, IPK minimal 2.75.',
        'https://inovasibangsa.co.id/beasiswa/wirausaha/2026',
        'aktif');

-- 5.7 beasiswa_wilayah
INSERT INTO beasiswa_wilayah ("beasiswaId", "wilayahId", keterangan) VALUES
    (1, 1, 'Kuota 50 penerima dari Jawa Barat'),
    (1, 2, 'Kuota 50 penerima dari Jawa Timur'),
    (2, 3, 'Khusus mahasiswa asal Papua'),
    (2, 4, 'Khusus mahasiswa asal NTT'),
    (3, 1, 'Berlaku untuk wilayah Jawa Barat'),
    (4, 2, 'Berlaku untuk wilayah Jawa Timur');

-- 5.8 pendaftaran
INSERT INTO pendaftaran ("userId", "beasiswaId", status) VALUES
    (1, 1, 'TERDAFTAR'),
    (1, 3, 'REVIEW'),
    (2, 1, 'EXAM'),
    (2, 4, 'DITERIMA');

-- 5.9 dokumen
INSERT INTO dokumen ("pendaftaranId", jenis, error, "statusDokumen", "rejectionReason") VALUES
    (1, 'KTP',             NULL,               'TRUE',    NULL),
    (1, 'Transkrip Nilai', NULL,               'MENUNGGU', NULL),
    (2, 'KTP',             NULL,               'TRUE',    NULL),
    (2, 'Surat Rekomendasi','Format tidak valid','FALSE',  'File tidak terbaca, harap upload ulang dalam format PDF.'),
    (3, 'KTP',             NULL,               'EXAM',    NULL),
    (4, 'KTP',             NULL,               'NILAI',   NULL);

-- 5.10 rekening
INSERT INTO rekening ("userId", "namRekening", "nomorRekening", status) VALUES
    (1, 'Budi Santoso', '1234567890', 'aktif'),
    (2, 'Siti Rahayu',  '0987654321', 'aktif');

-- 5.11 favorit
INSERT INTO favorit ("userId", "beasiswaId", "tanggalDitambahkan") VALUES
    (1, 2, '2026-04-01'),
    (1, 3, '2026-04-05'),
    (2, 1, '2026-04-10'),
    (2, 4, '2026-04-12');

-- 5.12 laporan_link_rusak
INSERT INTO laporan_link_rusak ("userId", "beasiswaId", deskripsi, "tanggalLapor", status) VALUES
    (1, 3, 'Link pendaftaran mengarah ke halaman 404.',   '2026-04-10', 'pending'),
    (2, 4, 'Halaman pendaftaran tidak bisa diakses sejak kemarin.', '2026-04-13', 'diproses');

-- 5.13 tutorial
INSERT INTO tutorial (judul, konten) VALUES
    ('Cara Mendaftar Beasiswa',
     'Langkah 1: Buat akun. Langkah 2: Lengkapi profil. Langkah 3: Pilih beasiswa yang sesuai. Langkah 4: Upload dokumen persyaratan. Langkah 5: Submit pendaftaran dan pantau status Anda.'),
    ('Tips Menulis Esai Beasiswa',
     'Esai beasiswa yang baik harus mencerminkan cerita pribadi Anda, menjelaskan motivasi belajar, dan menghubungkan tujuan Anda dengan misi lembaga pemberi beasiswa. Gunakan bahasa yang jelas, lugas, dan hindari klise.');

-- 5.14 penyaluran_dana
INSERT INTO penyaluran_dana ("pendonorId", "beasiswaId", "jumlahDana", "jumlahPenerima", "tanggalPenyaluran", status, "laporanFile") VALUES
    (1, 1, 500000000, 50, '2026-01-15', 'tersalurkan', 'laporan/penyaluran_prestasi_2026_jan.pdf'),
    (1, 2, 200000000, 20, '2026-02-01', 'tersalurkan', 'laporan/penyaluran_afirmasi_papua_2026.pdf'),
    (2, 4, 150000000, 30, '2026-03-10', 'pending',     NULL);


-- ============================================================
-- END OF SCRIPT
-- ============================================================
