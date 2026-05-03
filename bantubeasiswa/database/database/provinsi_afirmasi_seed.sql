-- Kolom: nama TEXT, tipe TEXT, kode TEXT, "isAfirmasi" BOOL, "is3T" BOOL
-- Tipe  : 'Afirmasi' untuk seluruh provinsi afirmasi
-- ============================================================

INSERT INTO wilayah (nama, tipe, kode, "isAfirmasi", "is3T") VALUES
  ('Provinsi Jambi',              'Afirmasi', 'afirmasi', TRUE, FALSE),
  ('Provinsi Bengkulu',           'Afirmasi', 'afirmasi', TRUE, FALSE),
  ('Provinsi Kalimantan Utara',   'Afirmasi', 'afirmasi', TRUE, FALSE),
  ('Provinsi Sulawesi Utara',     'Afirmasi', 'afirmasi', TRUE, FALSE),
  ('Provinsi Sulawesi Tengah',    'Afirmasi', 'afirmasi', TRUE, FALSE),
  ('Provinsi Gorontalo',          'Afirmasi', 'afirmasi', TRUE, FALSE),
  ('Provinsi Sulawesi Barat',     'Afirmasi', 'afirmasi', TRUE, FALSE),
  ('Provinsi Sulawesi Tenggara',  'Afirmasi', 'afirmasi', TRUE, FALSE),
  ('Provinsi Maluku',             'Afirmasi', 'afirmasi', TRUE, FALSE),
  ('Provinsi Maluku Utara',       'Afirmasi', 'afirmasi', TRUE, FALSE),
  ('Provinsi Papua',              'Afirmasi', 'afirmasi', TRUE, FALSE),
  ('Provinsi Papua Barat',        'Afirmasi', 'afirmasi', TRUE, FALSE),
  ('Provinsi Papua Barat Daya',   'Afirmasi', 'afirmasi', TRUE, FALSE),
  ('Provinsi Papua Pegunungan',   'Afirmasi', 'afirmasi', TRUE, FALSE),
  ('Provinsi Papua Tengah',       'Afirmasi', 'afirmasi', TRUE, FALSE),
  ('Provinsi Papua Selatan',      'Afirmasi', 'afirmasi', TRUE, FALSE);

-- ============================================================
-- Verifikasi setelah INSERT:
-- 1. Cek semua provinsi afirmasi berhasil masuk:
SELECT nama, tipe FROM wilayah
WHERE "isAfirmasi" = TRUE
ORDER BY nama;

-- 2. Cek jumlah (harus = 16):
-- SELECT COUNT(*) FROM wilayah WHERE "isAfirmasi" = TRUE;

-- 3. Cek overlap: wilayah yang sekaligus masuk 3T DAN Afirmasi
--    (berdasarkan nama yang mengandung provinsi yang sama):
-- SELECT nama FROM wilayah WHERE "is3T" = TRUE AND "isAfirmasi" = TRUE;
