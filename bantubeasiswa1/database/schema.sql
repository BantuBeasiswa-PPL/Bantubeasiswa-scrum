-- ============================================================
-- BantuBeasiswa - MySQL Schema
-- Generated: 2026-04-13
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- ============================================================
-- DROP TABLES (safe re-run order — children first)
-- ============================================================
DROP TABLE IF EXISTS laporan_link_rusak;
DROP TABLE IF EXISTS favorit;
DROP TABLE IF EXISTS rekening;
DROP TABLE IF EXISTS dokumen;
DROP TABLE IF EXISTS pendaftaran;
DROP TABLE IF EXISTS beasiswa_wilayah;
DROP TABLE IF EXISTS penyaluran_dana;
DROP TABLE IF EXISTS beasiswa;
DROP TABLE IF EXISTS wilayah;
DROP TABLE IF EXISTS tutorial;
DROP TABLE IF EXISTS pendonor;
DROP TABLE IF EXISTS `user`;
DROP TABLE IF EXISTS admin;
DROP TABLE IF EXISTS account;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. account
-- ============================================================
CREATE TABLE account (
    accountId   INT           NOT NULL AUTO_INCREMENT,
    email       VARCHAR(255)  NOT NULL,
    kataKunci   VARCHAR(255)  NOT NULL,
    role        ENUM('admin','mahasiswa','pendonor') NOT NULL DEFAULT 'mahasiswa',
    createdAt   DATE          NOT NULL DEFAULT (CURRENT_DATE),
    updatedAt   DATE          NOT NULL DEFAULT (CURRENT_DATE),

    PRIMARY KEY (accountId),
    UNIQUE KEY uq_account_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. user  (mahasiswa)
-- ============================================================
CREATE TABLE `user` (
    userId      INT           NOT NULL,
    accountId   INT           NOT NULL,
    nama        VARCHAR(255)  NOT NULL,
    email       VARCHAR(255)  NOT NULL,
    kataSandi   VARCHAR(255)  NOT NULL,
    ukuranFont  INT           NOT NULL DEFAULT 14,
    modeKontras INT           NOT NULL DEFAULT 0,

    PRIMARY KEY (userId),
    UNIQUE KEY uq_user_accountId (accountId),
    KEY idx_user_email (email),

    CONSTRAINT fk_user_account
        FOREIGN KEY (accountId) REFERENCES account (accountId)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. admin
-- ============================================================
CREATE TABLE admin (
    adminId     INT           NOT NULL,
    accountId   INT           NOT NULL,
    nama        VARCHAR(255)  NOT NULL,
    email       VARCHAR(255)  NOT NULL,
    kataSandi   VARCHAR(255)  NOT NULL,
    ukuranFont  INT           NOT NULL DEFAULT 14,
    modeKontras INT           NOT NULL DEFAULT 0,

    PRIMARY KEY (adminId),
    UNIQUE KEY uq_admin_accountId (accountId),
    KEY idx_admin_email (email),

    CONSTRAINT fk_admin_account
        FOREIGN KEY (accountId) REFERENCES account (accountId)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. pendonor
-- ============================================================
CREATE TABLE pendonor (
    pendonorId      INT           NOT NULL,
    accountId       INT           NOT NULL,
    statusOrganisasi VARCHAR(255) NULL,
    kontak          VARCHAR(255)  NULL,
    alamat          VARCHAR(255)  NULL,

    PRIMARY KEY (pendonorId),
    UNIQUE KEY uq_pendonor_accountId (accountId),

    CONSTRAINT fk_pendonor_account
        FOREIGN KEY (accountId) REFERENCES account (accountId)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. wilayah
-- ============================================================
CREATE TABLE wilayah (
    wilayahId   INT           NOT NULL AUTO_INCREMENT,
    nama        VARCHAR(255)  NOT NULL,
    tipe        VARCHAR(255)  NOT NULL,
    mode        VARCHAR(255)  NULL,
    isAfirmasi  TINYINT       NOT NULL DEFAULT 0,
    is3T        TINYINT       NOT NULL DEFAULT 0,

    PRIMARY KEY (wilayahId),
    KEY idx_wilayah_tipe (tipe),
    KEY idx_wilayah_isAfirmasi (isAfirmasi),
    KEY idx_wilayah_is3T (is3T)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. beasiswa
-- ============================================================
CREATE TABLE beasiswa (
    beasiswaId      INT           NOT NULL AUTO_INCREMENT,
    pendonorId      INT           NOT NULL,
    judul           VARCHAR(255)  NOT NULL,
    jalur           VARCHAR(255)  NULL,
    deadline        VARCHAR(255)  NULL,
    deskripsi       VARCHAR(255)  NULL,
    syarat          VARCHAR(255)  NULL,
    linkPendaftaran VARCHAR(255)  NULL,
    status          VARCHAR(255)  NOT NULL DEFAULT 'draft',
    createdAt       DATE          NOT NULL DEFAULT (CURRENT_DATE),
    updatedAt       DATE          NOT NULL DEFAULT (CURRENT_DATE),

    PRIMARY KEY (beasiswaId),
    KEY idx_beasiswa_pendonorId (pendonorId),
    KEY idx_beasiswa_status (status),
    KEY idx_beasiswa_deadline (deadline),

    CONSTRAINT fk_beasiswa_pendonor
        FOREIGN KEY (pendonorId) REFERENCES pendonor (pendonorId)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. beasiswa_wilayah  (junction / composite PK)
-- ============================================================
CREATE TABLE beasiswa_wilayah (
    beasiswaId  INT           NOT NULL,
    wilayahId   INT           NOT NULL,
    keterangan  VARCHAR(255)  NULL,

    PRIMARY KEY (beasiswaId, wilayahId),
    KEY idx_bw_wilayahId (wilayahId),

    CONSTRAINT fk_bw_beasiswa
        FOREIGN KEY (beasiswaId) REFERENCES beasiswa (beasiswaId)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_bw_wilayah
        FOREIGN KEY (wilayahId) REFERENCES wilayah (wilayahId)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. pendaftaran
-- ============================================================
CREATE TABLE pendaftaran (
    pendaftaranId   INT     NOT NULL AUTO_INCREMENT,
    userId          INT     NOT NULL,
    beasiswaId      INT     NOT NULL,
    status          ENUM('TERDAFTAR','EXAM','REVIEW','TOLAK','DITERIMA','DITOLAK','LULUS')
                            NOT NULL DEFAULT 'TERDAFTAR',

    PRIMARY KEY (pendaftaranId),
    KEY idx_pendaftaran_userId   (userId),
    KEY idx_pendaftaran_beasiswaId (beasiswaId),
    KEY idx_pendaftaran_status   (status),

    CONSTRAINT fk_pendaftaran_user
        FOREIGN KEY (userId) REFERENCES `user` (userId)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_pendaftaran_beasiswa
        FOREIGN KEY (beasiswaId) REFERENCES beasiswa (beasiswaId)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. dokumen
-- ============================================================
CREATE TABLE dokumen (
    dokumenId       INT           NOT NULL AUTO_INCREMENT,
    pendaftaranId   INT           NOT NULL,
    jenis           VARCHAR(255)  NOT NULL,
    error           VARCHAR(255)  NULL,
    statusDokumen   ENUM('FALSE','TRUE','EXAM','NILAI','MENUNGGU')
                                  NOT NULL DEFAULT 'MENUNGGU',
    rejectionReason VARCHAR(255)  NULL,

    PRIMARY KEY (dokumenId),
    KEY idx_dokumen_pendaftaranId (pendaftaranId),
    KEY idx_dokumen_statusDokumen (statusDokumen),

    CONSTRAINT fk_dokumen_pendaftaran
        FOREIGN KEY (pendaftaranId) REFERENCES pendaftaran (pendaftaranId)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. rekening
-- ============================================================
CREATE TABLE rekening (
    rekeningId      INT           NOT NULL AUTO_INCREMENT,
    userId          INT           NOT NULL,
    namRekening     VARCHAR(255)  NOT NULL,
    nomorRekening   VARCHAR(255)  NOT NULL,
    status          VARCHAR(255)  NOT NULL DEFAULT 'aktif',

    PRIMARY KEY (rekeningId),
    KEY idx_rekening_userId (userId),
    KEY idx_rekening_status (status),

    CONSTRAINT fk_rekening_user
        FOREIGN KEY (userId) REFERENCES `user` (userId)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. favorit
-- ============================================================
CREATE TABLE favorit (
    favoritId           INT   NOT NULL AUTO_INCREMENT,
    userId              INT   NOT NULL,
    beasiswaId          INT   NOT NULL,
    tanggalDitambahkan  DATE  NOT NULL DEFAULT (CURRENT_DATE),

    PRIMARY KEY (favoritId),
    UNIQUE KEY uq_favorit_user_beasiswa (userId, beasiswaId),
    KEY idx_favorit_userId     (userId),
    KEY idx_favorit_beasiswaId (beasiswaId),

    CONSTRAINT fk_favorit_user
        FOREIGN KEY (userId) REFERENCES `user` (userId)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_favorit_beasiswa
        FOREIGN KEY (beasiswaId) REFERENCES beasiswa (beasiswaId)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. laporan_link_rusak
-- ============================================================
CREATE TABLE laporan_link_rusak (
    laporanId   INT           NOT NULL AUTO_INCREMENT,
    userId      INT           NOT NULL,
    beasiswaId  INT           NOT NULL,
    deskripsi   VARCHAR(255)  NULL,
    tanggalLapor DATE         NOT NULL DEFAULT (CURRENT_DATE),
    status      VARCHAR(255)  NOT NULL DEFAULT 'menunggu',

    PRIMARY KEY (laporanId),
    KEY idx_laporan_userId     (userId),
    KEY idx_laporan_beasiswaId (beasiswaId),
    KEY idx_laporan_status     (status),

    CONSTRAINT fk_laporan_user
        FOREIGN KEY (userId) REFERENCES `user` (userId)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_laporan_beasiswa
        FOREIGN KEY (beasiswaId) REFERENCES beasiswa (beasiswaId)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 13. tutorial
-- ============================================================
CREATE TABLE tutorial (
    tutorialId  INT             NOT NULL AUTO_INCREMENT,
    judul       VARCHAR(255)    NOT NULL,
    konten      VARCHAR(10000)  NOT NULL,

    PRIMARY KEY (tutorialId),
    FULLTEXT KEY ft_tutorial_judul_konten (judul, konten)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 14. penyaluran_dana
-- ============================================================
CREATE TABLE penyaluran_dana (
    penyaluranId        INT           NOT NULL AUTO_INCREMENT,
    pendonorId          INT           NOT NULL,
    beasiswaId          INT           NOT NULL,
    jumlahDana          INT           NOT NULL DEFAULT 0,
    jumlahPenerima      INT           NOT NULL DEFAULT 0,
    tanggalPenyaluran   DATE          NOT NULL,
    status              VARCHAR(255)  NOT NULL DEFAULT 'proses',
    laporanFile         VARCHAR(255)  NULL,

    PRIMARY KEY (penyaluranId),
    KEY idx_penyaluran_pendonorId  (pendonorId),
    KEY idx_penyaluran_beasiswaId  (beasiswaId),
    KEY idx_penyaluran_status      (status),

    CONSTRAINT fk_penyaluran_pendonor
        FOREIGN KEY (pendonorId) REFERENCES pendonor (pendonorId)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_penyaluran_beasiswa
        FOREIGN KEY (beasiswaId) REFERENCES beasiswa (beasiswaId)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- SEED DATA
-- Order: parents before children
-- ============================================================

-- ── account ──────────────────────────────────────────────────
INSERT INTO account (email, kataKunci, role, createdAt, updatedAt) VALUES
('admin@bantubeasiswa.id',       '$2b$12$adminHashedPass001',    'admin',     '2025-01-01', '2025-01-01'),
('budi.santoso@gmail.com',       '$2b$12$userHashedPass001',     'mahasiswa', '2025-01-05', '2025-01-05'),
('siti.rahayu@gmail.com',        '$2b$12$userHashedPass002',     'mahasiswa', '2025-01-06', '2025-01-06'),
('ahmad.fauzi@gmail.com',        '$2b$12$userHashedPass003',     'mahasiswa', '2025-01-07', '2025-01-07'),
('yayasan.cerdas@org.id',        '$2b$12$donorHashedPass001',    'pendonor',  '2025-01-10', '2025-01-10'),
('beasiswanusantara@perusahaan.id','$2b$12$donorHashedPass002',  'pendonor',  '2025-01-11', '2025-01-11');
-- accountId: 1=admin, 2=budi, 3=siti, 4=ahmad, 5=yayasan, 6=perusahaan

-- ── admin ────────────────────────────────────────────────────
INSERT INTO admin (adminId, accountId, nama, email, kataSandi, ukuranFont, modeKontras) VALUES
(1, 1, 'Super Admin', 'admin@bantubeasiswa.id', '$2b$12$adminHashedPass001', 14, 0);

-- ── user ─────────────────────────────────────────────────────
INSERT INTO `user` (userId, accountId, nama, email, kataSandi, ukuranFont, modeKontras) VALUES
(1, 2, 'Budi Santoso',  'budi.santoso@gmail.com', '$2b$12$userHashedPass001', 14, 0),
(2, 3, 'Siti Rahayu',   'siti.rahayu@gmail.com',  '$2b$12$userHashedPass002', 16, 1),
(3, 4, 'Ahmad Fauzi',   'ahmad.fauzi@gmail.com',  '$2b$12$userHashedPass003', 14, 0);

-- ── pendonor ─────────────────────────────────────────────────
INSERT INTO pendonor (pendonorId, accountId, statusOrganisasi, kontak, alamat) VALUES
(1, 5, 'Yayasan Nirlaba',  '08111222333', 'Jl. Pendidikan No. 1, Jakarta'),
(2, 6, 'Perusahaan Swasta','08222333444', 'Jl. Industri No. 45, Surabaya');

-- ── wilayah ──────────────────────────────────────────────────
INSERT INTO wilayah (nama, tipe, mode, isAfirmasi, is3T) VALUES
('DKI Jakarta',   'Provinsi', 'nasional', 0, 0),
('Jawa Barat',    'Provinsi', 'nasional', 0, 0),
('Papua',         'Provinsi', 'afirmasi', 1, 1),
('NTT',           'Provinsi', 'afirmasi', 1, 1),
('Kalimantan Utara','Provinsi','3T',      0, 1);

-- ── beasiswa ─────────────────────────────────────────────────
INSERT INTO beasiswa (pendonorId, judul, jalur, deadline, deskripsi, syarat, linkPendaftaran, status, createdAt, updatedAt) VALUES
(1, 'Beasiswa Cerdas Nusantara 2025',
    'Prestasi', '2025-06-30',
    'Beasiswa penuh untuk mahasiswa berprestasi dari keluarga kurang mampu.',
    'IPK minimal 3.5, tidak sedang menerima beasiswa lain',
    'https://yayasancerdas.org/daftar', 'aktif', '2025-02-01', '2025-02-01'),
(1, 'Beasiswa Afirmasi Daerah 3T',
    'Afirmasi', '2025-07-31',
    'Mendukung mahasiswa dari daerah terdepan, terluar, dan tertinggal.',
    'Berasal dari daerah 3T, melampirkan KTP dan KK',
    'https://yayasancerdas.org/3t',    'aktif', '2025-02-15', '2025-02-15'),
(2, 'Beasiswa Nusantara Tech 2025',
    'Prestasi', '2025-08-15',
    'Beasiswa khusus mahasiswa jurusan teknologi informasi dan teknik.',
    'IPK minimal 3.0, jurusan TI atau Teknik',
    'https://nusantaratech.id/beasiswa','draft','2025-03-01', '2025-03-01');

-- ── beasiswa_wilayah ─────────────────────────────────────────
INSERT INTO beasiswa_wilayah (beasiswaId, wilayahId, keterangan) VALUES
(1, 1, 'Berlaku untuk mahasiswa asal DKI Jakarta'),
(1, 2, 'Berlaku untuk mahasiswa asal Jawa Barat'),
(2, 3, 'Khusus mahasiswa Papua'),
(2, 4, 'Khusus mahasiswa NTT'),
(2, 5, 'Khusus mahasiswa Kalimantan Utara'),
(3, 1, 'Berlaku nasional – prioritas DKI Jakarta');

-- ── pendaftaran ──────────────────────────────────────────────
INSERT INTO pendaftaran (userId, beasiswaId, status) VALUES
(1, 1, 'REVIEW'),
(2, 1, 'TERDAFTAR'),
(3, 2, 'DITERIMA');

-- ── dokumen ──────────────────────────────────────────────────
INSERT INTO dokumen (pendaftaranId, jenis, error, statusDokumen, rejectionReason) VALUES
(1, 'KTP',             NULL,                   'TRUE',     NULL),
(1, 'Transkrip Nilai', NULL,                   'MENUNGGU', NULL),
(1, 'Surat Keterangan Tidak Mampu', NULL,      'NILAI',    NULL),
(2, 'KTP',             NULL,                   'TRUE',     NULL),
(2, 'Transkrip Nilai', 'File tidak terbaca',   'FALSE',    'Format file tidak sesuai, harap upload ulang PDF'),
(3, 'KTP',             NULL,                   'TRUE',     NULL),
(3, 'Surat Domisili',  NULL,                   'TRUE',     NULL);

-- ── rekening ─────────────────────────────────────────────────
INSERT INTO rekening (userId, namRekening, nomorRekening, status) VALUES
(1, 'Budi Santoso',  '1234567890', 'aktif'),
(2, 'Siti Rahayu',   '0987654321', 'aktif'),
(3, 'Ahmad Fauzi',   '1122334455', 'nonaktif');

-- ── favorit ──────────────────────────────────────────────────
INSERT INTO favorit (userId, beasiswaId, tanggalDitambahkan) VALUES
(1, 2, '2025-03-01'),
(2, 1, '2025-03-02'),
(3, 3, '2025-03-03');

-- ── laporan_link_rusak ───────────────────────────────────────
INSERT INTO laporan_link_rusak (userId, beasiswaId, deskripsi, tanggalLapor, status) VALUES
(1, 3, 'Link pendaftaran mengarah ke halaman 404',    '2025-03-10', 'menunggu'),
(2, 2, 'Tombol daftar tidak bisa diklik di mobile',  '2025-03-11', 'diproses'),
(3, 1, 'Link PDF syarat tidak bisa diunduh',          '2025-03-12', 'selesai');

-- ── tutorial ─────────────────────────────────────────────────
INSERT INTO tutorial (judul, konten) VALUES
('Cara Mendaftar Beasiswa di BantuBeasiswa',
 'Langkah 1: Buat akun atau login.\nLangkah 2: Cari beasiswa yang sesuai dengan profil Anda.\nLangkah 3: Klik tombol "Daftar" pada halaman detail beasiswa.\nLangkah 4: Isi formulir pendaftaran dan upload dokumen yang diminta.\nLangkah 5: Submit pendaftaran dan tunggu notifikasi dari pendonor.'),
('Cara Upload Dokumen yang Benar',
 'Pastikan dokumen dalam format PDF atau JPG dengan ukuran maksimal 2MB.\nNama file tidak boleh mengandung spasi atau karakter khusus.\nPastikan scan dokumen jelas dan tidak terpotong.\nJika dokumen ditolak, periksa alasan penolakan dan upload ulang dokumen yang sudah diperbaiki.'),
('Tips Memenangkan Beasiswa Prestasi',
 'Jaga IPK di atas nilai minimum yang disyaratkan.\nAktif di organisasi kampus dan catat semua prestasi.\nTulis esai motivasi yang kuat dan personal.\nMinta surat rekomendasi dari dosen pembimbing yang mengenal Anda dengan baik.\nDaftar sebelum batas waktu agar terkesan serius dan terorganisir.');

-- ── penyaluran_dana ──────────────────────────────────────────
INSERT INTO penyaluran_dana (pendonorId, beasiswaId, jumlahDana, jumlahPenerima, tanggalPenyaluran, status, laporanFile) VALUES
(1, 1, 50000000, 10, '2025-09-01', 'selesai',  'laporan_beasiswa_cerdas_2025.pdf'),
(1, 2, 30000000,  6, '2025-09-15', 'proses',    NULL),
(2, 3, 75000000, 15, '2025-10-01', 'menunggu',  NULL);


-- ============================================================
-- END OF SCHEMA
-- ============================================================
