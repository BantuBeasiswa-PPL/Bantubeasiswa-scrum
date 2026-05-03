-- ============================================================
-- BantuBeasiswa – Seed Data Wilayah 3T (PBI-01)
-- Sumber: Daftar Daerah Tertinggal, Terluar, dan Terpencil (3T)
--         SPMB SMA Pradita Dirgantara TA 2026/2027 (62 Kabupaten)
-- Jalankan di Supabase SQL Editor setelah schema.sql dieksekusi
-- ============================================================
-- Kolom: nama TEXT, tipe TEXT, kode TEXT, "isAfirmasi" BOOL, "is3T" BOOL
-- Tipe  : 'Terdepan' (perbatasan), 'Terluar' (pulau terluar),
--         'Tertinggal' (daerah tertinggal)
-- ============================================================

INSERT INTO wilayah (nama, tipe, kode, "isAfirmasi", "is3T") VALUES

  -- ── SUMATERA UTARA ─────────────────────────────────────────────────────
  ('Kab. Nias, Sumatera Utara',                 'Terluar',    '3T', FALSE, TRUE),
  ('Kab. Nias Selatan, Sumatera Utara',         'Terluar',    '3T', FALSE, TRUE),
  ('Kab. Nias Utara, Sumatera Utara',           'Terluar',    '3T', FALSE, TRUE),
  ('Kab. Nias Barat, Sumatera Utara',           'Terluar',    '3T', FALSE, TRUE),

  -- ── SUMATERA BARAT ──────────────────────────────────────────────────────
  ('Kab. Kepulauan Mentawai, Sumatera Barat',   'Terluar',    '3T', FALSE, TRUE),

  -- ── SUMATERA SELATAN ────────────────────────────────────────────────────
  ('Kab. Musi Rawas Utara, Sumatera Selatan',   'Tertinggal', '3T', FALSE, TRUE),

  -- ── LAMPUNG ─────────────────────────────────────────────────────────────
  ('Kab. Pesisir Barat, Lampung',               'Tertinggal', '3T', FALSE, TRUE),

  -- ── NUSA TENGGARA BARAT ─────────────────────────────────────────────────
  ('Kab. Lombok Utara, NTB',                    'Tertinggal', '3T', FALSE, TRUE),

  -- ── NUSA TENGGARA TIMUR ─────────────────────────────────────────────────
  ('Kab. Sumba Barat, NTT',                     'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Sumba Timur, NTT',                     'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Kupang, NTT',                          'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Timor Tengah Selatan, NTT',            'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Belu, NTT',                            'Terdepan',   '3T', FALSE, TRUE),
  ('Kab. Alor, NTT',                            'Terluar',    '3T', FALSE, TRUE),
  ('Kab. Lembata, NTT',                         'Terluar',    '3T', FALSE, TRUE),
  ('Kab. Rote Ndao, NTT',                       'Terluar',    '3T', FALSE, TRUE),
  ('Kab. Sumba Tengah, NTT',                    'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Sumba Barat Daya, NTT',                'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Manggarai Timur, NTT',                 'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Sabu Raijua, NTT',                     'Terluar',    '3T', FALSE, TRUE),
  ('Kab. Malaka, NTT',                          'Terdepan',   '3T', FALSE, TRUE),

  -- ── SULAWESI TENGAH ──────────────────────────────────────────────────────
  ('Kab. Donggala, Sulawesi Tengah',            'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Tojo Una-Una, Sulawesi Tengah',        'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Sigi, Sulawesi Tengah',                'Tertinggal', '3T', FALSE, TRUE),

  -- ── MALUKU ───────────────────────────────────────────────────────────────
  ('Kab. Maluku Tenggara Barat, Maluku',        'Terluar',    '3T', FALSE, TRUE),
  ('Kab. Kepulauan Aru, Maluku',                'Terluar',    '3T', FALSE, TRUE),
  ('Kab. Seram Bagian Barat, Maluku',           'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Seram Bagian Timur, Maluku',           'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Maluku Barat Daya, Maluku',            'Terluar',    '3T', FALSE, TRUE),
  ('Kab. Buru Selatan, Maluku',                 'Tertinggal', '3T', FALSE, TRUE),

  -- ── MALUKU UTARA ─────────────────────────────────────────────────────────
  ('Kab. Kepulauan Sula, Maluku Utara',         'Terluar',    '3T', FALSE, TRUE),
  ('Kab. Pulau Taliabu, Maluku Utara',          'Tertinggal', '3T', FALSE, TRUE),

  -- ── PAPUA BARAT ──────────────────────────────────────────────────────────
  ('Kab. Teluk Wondama, Papua Barat',           'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Teluk Bintuni, Papua Barat',           'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Sorong Selatan, Papua Barat',          'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Sorong, Papua Barat',                  'Terdepan',   '3T', FALSE, TRUE),
  ('Kab. Tambrauw, Papua Barat',                'Terdepan',   '3T', FALSE, TRUE),
  ('Kab. Maybrat, Papua Barat',                 'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Manokwari Selatan, Papua Barat',       'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Pegunungan Arfak, Papua Barat',        'Tertinggal', '3T', FALSE, TRUE),

  -- ── PAPUA ────────────────────────────────────────────────────────────────
  ('Kab. Jayawijaya, Papua',                    'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Nabire, Papua',                        'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Paniai, Papua',                        'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Puncak Jaya, Papua',                   'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Boven Digoel, Papua',                  'Terdepan',   '3T', FALSE, TRUE),
  ('Kab. Mappi, Papua',                         'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Asmat, Papua',                         'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Yahukimo, Papua',                      'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Pegunungan Bintang, Papua',            'Terdepan',   '3T', FALSE, TRUE),
  ('Kab. Tolikara, Papua',                      'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Keerom, Papua',                        'Terdepan',   '3T', FALSE, TRUE),
  ('Kab. Waropen, Papua',                       'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Supiori, Papua',                       'Terluar',    '3T', FALSE, TRUE),
  ('Kab. Mamberamo Raya, Papua',                'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Nduga, Papua',                         'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Lanny Jaya, Papua',                    'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Mamberamo Tengah, Papua',              'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Yalimo, Papua',                        'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Puncak, Papua',                        'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Dogiyai, Papua',                       'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Intan Jaya, Papua',                    'Tertinggal', '3T', FALSE, TRUE),
  ('Kab. Deiyai, Papua',                        'Tertinggal', '3T', FALSE, TRUE);

-- ============================================================
-- Total: 62 kabupaten
--
-- Verifikasi setelah INSERT:
--   SELECT COUNT(*) FROM wilayah WHERE "is3T" = TRUE;
--   SELECT nama, tipe FROM wilayah WHERE "is3T" = TRUE ORDER BY nama;
--
-- Cek per tipe:
--   SELECT tipe, COUNT(*) FROM wilayah WHERE "is3T" = TRUE GROUP BY tipe;
-- ============================================================
