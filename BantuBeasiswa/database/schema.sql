 9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999-- ============================================================
-- BantuBeasiswa – PostgreSQL Schema for Supabase
-- Platform Beasiswa Wilayah 3T dan Afirmasi
-- Updated: 2026-05-31 (Adhering to requested specs)
-- ============================================================

-- Bersihkan tabel jika ada untuk fresh install
DROP TABLE IF EXISTS notifikasi CASCADE;
DROP TABLE IF EXISTS penyaluran_dana CASCADE;
DROP TABLE IF EXISTS tutorial CASCADE;
DROP TABLE IF EXISTS laporan_link_rusak CASCADE;
DROP TABLE IF EXISTS favorit CASCADE;
DROP TABLE IF EXISTS rekening CASCADE;
DROP TABLE IF EXISTS dokumen CASCADE;
DROP TABLE IF EXISTS pendaftaran CASCADE;
DROP TABLE IF EXISTS beasiswa_wilayah CASCADE;
DROP TABLE IF EXISTS beasiswa CASCADE;
DROP TABLE IF EXISTS wilayah CASCADE;
DROP TABLE IF EXISTS pendonor CASCADE;
DROP TABLE IF EXISTS admin CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
DROP TABLE IF EXISTS account CASCADE;

-- 1. account
CREATE TABLE account (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    kata_sandi VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin','mahasiswa','pendonor')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. user
CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    ukuran_font INT DEFAULT 3,
    mode_kontras BOOLEAN DEFAULT false
);

-- 3. admin
CREATE TABLE admin (
    id SERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL
);

-- 4. pendonor
CREATE TABLE pendonor (
    id SERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    nama_organisasi VARCHAR(255) NOT NULL,
    kontak VARCHAR(255),
    alamat VARCHAR(255),
    status_verifikasi VARCHAR(20) DEFAULT 'pending'
);

-- 5. wilayah
CREATE TABLE wilayah (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    tipe VARCHAR(100),
    provinsi VARCHAR(255),
    is_3t BOOLEAN DEFAULT false,
    is_afirmasi BOOLEAN DEFAULT false
);

-- 6. beasiswa
CREATE TABLE beasiswa (
    id SERIAL PRIMARY KEY,
    pendonor_id INT NOT NULL REFERENCES pendonor(id) ON DELETE CASCADE,
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    syarat TEXT,
    nominal BIGINT,
    kuota INT,
    deadline TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. beasiswa_wilayah
CREATE TABLE beasiswa_wilayah (
    beasiswa_id INT NOT NULL REFERENCES beasiswa(id) ON DELETE CASCADE,
    wilayah_id INT NOT NULL REFERENCES wilayah(id) ON DELETE CASCADE,
    keterangan VARCHAR(255),
    PRIMARY KEY(beasiswa_id, wilayah_id)
);

-- 8. pendaftaran
CREATE TABLE pendaftaran (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    beasiswa_id INT NOT NULL REFERENCES beasiswa(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'TERDAFTAR',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. dokumen
CREATE TABLE dokumen (
    id SERIAL PRIMARY KEY,
    pendaftaran_id INT NOT NULL REFERENCES pendaftaran(id) ON DELETE CASCADE,
    jenis VARCHAR(100) NOT NULL,
    file_url TEXT,
    status_dokumen VARCHAR(20) DEFAULT 'MENUNGGU',
    rejection_reason TEXT NULL
);

-- 10. rekening
CREATE TABLE rekening (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    nama_bank VARCHAR(100) NOT NULL,
    nama_pemilik VARCHAR(255) NOT NULL,
    nomor_rekening VARCHAR(50) NOT NULL,
    foto_buku_url TEXT NULL,
    status VARCHAR(20) DEFAULT 'pending'
);

-- 11. favorit
CREATE TABLE favorit (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    beasiswa_id INT NOT NULL REFERENCES beasiswa(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, beasiswa_id)
);

-- 12. laporan_link_rusak
CREATE TABLE laporan_link_rusak (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    beasiswa_id INT NOT NULL REFERENCES beasiswa(id) ON DELETE CASCADE,
    deskripsi TEXT,
    tanggal_lapor TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'open',
    catatan_admin TEXT NULL
);

-- 13. tutorial
CREATE TABLE tutorial (
    id SERIAL PRIMARY KEY,
    judul VARCHAR(255) NOT NULL,
    konten TEXT NOT NULL,
    kategori VARCHAR(100)
);

-- 14. penyaluran_dana
CREATE TABLE penyaluran_dana (
    id                 SERIAL                  PRIMARY KEY,
    pendonor_id        INT                     NOT NULL REFERENCES pendonor(id) ON DELETE CASCADE,
    beasiswa_id        INT                     NOT NULL REFERENCES beasiswa(id) ON DELETE CASCADE,
    pendaftaran_id     INT                     REFERENCES pendaftaran(id) ON DELETE CASCADE,
    jumlah_dana        BIGINT                  NOT NULL DEFAULT 0,
    jumlah_penerima    INT                     NOT NULL DEFAULT 0,
    tanggal_penyaluran DATE                    NULL,
    status             VARCHAR(20)             NOT NULL DEFAULT 'pending',
    bukti_transfer_url TEXT                    NULL,
    id_transaksi       VARCHAR(255)            NULL
);

-- 15. notifikasi
CREATE TABLE notifikasi (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    pesan TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_pendaftaran_user_id ON pendaftaran(user_id);
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

CREATE INDEX idx_beasiswa_status ON beasiswa(status);

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO account (email, kata_sandi, role) VALUES 
('admin1@bantubeasiswa.id', 'hashed_pass', 'admin'),
('budi@mahasiswa.id', 'hashed_pass', 'mahasiswa'),
('yayasan@pendidikan.org', 'hashed_pass', 'pendonor');

INSERT INTO "user" (account_id, nama, email) VALUES 
(2, 'Budi Santoso', 'budi@mahasiswa.id');

INSERT INTO pendonor (account_id, nama_organisasi, kontak) VALUES 
(3, 'Yayasan Pendidikan Nusantara', '08123456789');

INSERT INTO beasiswa (pendonor_id, judul, nominal, kuota, status) VALUES 
(1, 'Beasiswa Unggulan Afirmasi 2024', 12000000, 100, 'aktif');

INSERT INTO wilayah (nama, tipe, is_3t, is_afirmasi) VALUES 
('Papua Barat', 'Provinsi', true, true),
('Maluku', 'Provinsi', true, true);
