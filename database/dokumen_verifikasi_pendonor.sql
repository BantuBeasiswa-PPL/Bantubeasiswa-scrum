-- CATATAN: Aplikasi menyimpan metadata dokumen verifikasi pendonor di Supabase Storage
-- (file: pendonor-verifikasi/{pendonorId}/_meta.json). Tabel di bawah OPSIONAL.

-- Jalankan di Supabase SQL Editor jika ingin memakai tabel terpisah (legacy)
CREATE TABLE IF NOT EXISTS "dokumenVerifikasiPendonor" (
    "dokumenVerifikasiId" BIGSERIAL PRIMARY KEY,
    "pendonorId"          BIGINT      NOT NULL REFERENCES pendonor("pendonorId") ON DELETE CASCADE,
    jenis                 TEXT        NOT NULL,
    "fileUrl"             TEXT        NOT NULL,
    "statusDokumen"       TEXT        NOT NULL DEFAULT 'MENUNGGU'
                              CHECK ("statusDokumen" IN ('MENUNGGU', 'DISETUJUI', 'DITOLAK')),
    "rejectionReason"     TEXT,
    "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE ("pendonorId", jenis)
);

CREATE INDEX IF NOT EXISTS idx_dokverif_pendonor ON "dokumenVerifikasiPendonor"("pendonorId");

-- Kolom verifikasi pendonor (jika belum ada)
ALTER TABLE pendonor
  ADD COLUMN IF NOT EXISTS "statusVerifikasi" TEXT NOT NULL DEFAULT 'pending';
