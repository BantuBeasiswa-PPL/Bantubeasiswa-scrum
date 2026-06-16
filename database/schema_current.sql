


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."dokumen_status_enum" AS ENUM (
    'FALSE',
    'TRUE',
    'EXAM',
    'NILAI',
    'MENUNGGU'
);


ALTER TYPE "public"."dokumen_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."pendaftaran_status_enum" AS ENUM (
    'TERDAFTAR',
    'EXAM',
    'REVIEW',
    'TOLAK',
    'DITERIMA',
    'DITOLAK',
    'LULUS'
);


ALTER TYPE "public"."pendaftaran_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."role_enum" AS ENUM (
    'admin',
    'mahasiswa',
    'pendonor'
);


ALTER TYPE "public"."role_enum" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."account" (
    "accountId" bigint NOT NULL,
    "email" "text" NOT NULL,
    "kataKunci" "text" NOT NULL,
    "role" "public"."role_enum" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."account" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."account_accountId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."account_accountId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."account_accountId_seq" OWNED BY "public"."account"."accountId";



CREATE TABLE IF NOT EXISTS "public"."admin" (
    "adminId" bigint NOT NULL,
    "accountId" bigint NOT NULL,
    "nama" "text" NOT NULL,
    "email" "text" NOT NULL,
    "kataSandi" "text" NOT NULL,
    "ukuranFont" integer DEFAULT 16 NOT NULL,
    "modeKontras" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."admin_adminId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."admin_adminId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."admin_adminId_seq" OWNED BY "public"."admin"."adminId";



CREATE TABLE IF NOT EXISTS "public"."beasiswa" (
    "beasiswaId" bigint NOT NULL,
    "pendonorId" bigint NOT NULL,
    "judul" "text" NOT NULL,
    "jalur" "text",
    "deadline" "date",
    "deskripsi" "text",
    "syarat" "text",
    "linkPendaftaran" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nominal" bigint,
    "kuota" bigint,
    "alasanPenolakan" "text"
);


ALTER TABLE "public"."beasiswa" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."beasiswa_beasiswaId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."beasiswa_beasiswaId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."beasiswa_beasiswaId_seq" OWNED BY "public"."beasiswa"."beasiswaId";



CREATE TABLE IF NOT EXISTS "public"."beasiswa_provinsi" (
    "beasiswaId" bigint NOT NULL,
    "provinsiId" bigint NOT NULL,
    "keterangan" "text",
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."beasiswa_provinsi" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."beasiswa_wilayah" (
    "beasiswaId" bigint NOT NULL,
    "wilayahId" bigint NOT NULL,
    "keterangan" "text",
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."beasiswa_wilayah" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dokumen" (
    "dokumenId" bigint NOT NULL,
    "pendaftaranId" bigint NOT NULL,
    "jenis" "text" NOT NULL,
    "error" "text",
    "statusDokumen" "public"."dokumen_status_enum" DEFAULT 'MENUNGGU'::"public"."dokumen_status_enum" NOT NULL,
    "rejectionReason" "text",
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dokumen" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."dokumen_dokumenId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."dokumen_dokumenId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."dokumen_dokumenId_seq" OWNED BY "public"."dokumen"."dokumenId";



CREATE TABLE IF NOT EXISTS "public"."favorit" (
    "favoritId" bigint NOT NULL,
    "userId" bigint NOT NULL,
    "beasiswaId" bigint NOT NULL,
    "tanggalDitambahkan" "date" DEFAULT CURRENT_DATE NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."favorit" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."favorit_favoritId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."favorit_favoritId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."favorit_favoritId_seq" OWNED BY "public"."favorit"."favoritId";



CREATE TABLE IF NOT EXISTS "public"."laporan_link_rusak" (
    "laporanId" bigint NOT NULL,
    "userId" bigint NOT NULL,
    "beasiswaId" bigint NOT NULL,
    "deskripsi" "text",
    "tanggalLapor" "date" DEFAULT CURRENT_DATE NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."laporan_link_rusak" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."laporan_link_rusak_laporanId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."laporan_link_rusak_laporanId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."laporan_link_rusak_laporanId_seq" OWNED BY "public"."laporan_link_rusak"."laporanId";



CREATE TABLE IF NOT EXISTS "public"."notifikasi" (
    "notifikasiId" bigint NOT NULL,
    "userId" bigint NOT NULL,
    "pesan" "text" NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifikasi" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."notifikasi_notifikasiId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."notifikasi_notifikasiId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."notifikasi_notifikasiId_seq" OWNED BY "public"."notifikasi"."notifikasiId";



CREATE TABLE IF NOT EXISTS "public"."pendaftaran" (
    "pendaftaranId" bigint NOT NULL,
    "userId" bigint NOT NULL,
    "beasiswaId" bigint NOT NULL,
    "status" "public"."pendaftaran_status_enum" DEFAULT 'TERDAFTAR'::"public"."pendaftaran_status_enum" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pendaftaran" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."pendaftaran_pendaftaranId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pendaftaran_pendaftaranId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pendaftaran_pendaftaranId_seq" OWNED BY "public"."pendaftaran"."pendaftaranId";



CREATE TABLE IF NOT EXISTS "public"."pendonor" (
    "pendonorId" bigint NOT NULL,
    "accountId" bigint NOT NULL,
    "statusOrganisasi" "text",
    "kontak" "text",
    "alamat" "text",
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "statusVerifikasi" character varying(50) DEFAULT 'pending'::character varying NOT NULL
);


ALTER TABLE "public"."pendonor" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."pendonor_pendonorId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pendonor_pendonorId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pendonor_pendonorId_seq" OWNED BY "public"."pendonor"."pendonorId";



CREATE TABLE IF NOT EXISTS "public"."penyaluran_dana" (
    "penyaluranId" bigint NOT NULL,
    "pendonorId" bigint NOT NULL,
    "beasiswaId" bigint NOT NULL,
    "jumlahDana" integer DEFAULT 0 NOT NULL,
    "jumlahPenerima" integer DEFAULT 0 NOT NULL,
    "tanggalPenyaluran" "date" DEFAULT CURRENT_DATE NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "laporanFile" "text",
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "buktiTransferUrl" "text",
    "idTransaksi" character varying(255),
    "pendaftaranId" bigint
);


ALTER TABLE "public"."penyaluran_dana" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."penyaluran_dana_penyaluranId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."penyaluran_dana_penyaluranId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."penyaluran_dana_penyaluranId_seq" OWNED BY "public"."penyaluran_dana"."penyaluranId";



CREATE TABLE IF NOT EXISTS "public"."provinsi" (
    "provinsiId" bigint NOT NULL,
    "nama" "text" NOT NULL,
    "isAfirmasi" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."provinsi" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."provinsi_provinsiId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."provinsi_provinsiId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."provinsi_provinsiId_seq" OWNED BY "public"."provinsi"."provinsiId";



CREATE TABLE IF NOT EXISTS "public"."rekening" (
    "rekeningId" bigint NOT NULL,
    "userId" bigint NOT NULL,
    "namRekening" "text" NOT NULL,
    "nomorRekening" "text" NOT NULL,
    "status" "text" DEFAULT 'aktif'::"text" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "namaBank" "text",
    "namaPemilik" "text",
    "fotoBukuUrl" "text"
);


ALTER TABLE "public"."rekening" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."rekening_rekeningId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."rekening_rekeningId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."rekening_rekeningId_seq" OWNED BY "public"."rekening"."rekeningId";



CREATE TABLE IF NOT EXISTS "public"."tutorial" (
    "tutorialId" bigint NOT NULL,
    "judul" "text" NOT NULL,
    "konten" "text" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tutorial" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."tutorial_tutorialId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tutorial_tutorialId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tutorial_tutorialId_seq" OWNED BY "public"."tutorial"."tutorialId";



CREATE TABLE IF NOT EXISTS "public"."user" (
    "userId" bigint NOT NULL,
    "accountId" bigint NOT NULL,
    "nama" "text" NOT NULL,
    "email" "text" NOT NULL,
    "kataSandi" "text" NOT NULL,
    "ukuranFont" integer DEFAULT 16 NOT NULL,
    "modeKontras" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tentangSaya" "text",
    "nik" character varying(16),
    "jenisKelamin" character varying(20),
    "provinsiLahirId" integer,
    "kotaLahirWilayahId" integer,
    "tanggalLahir" "date",
    "noHandphone" character varying(20),
    "provinsiKtpId" integer,
    "kabupatenKtpId" integer,
    "alamatKtp" "text",
    "namaUniversitas" "text",
    "jurusan" "text",
    "semesterAktif" integer,
    "ipk" numeric(4,2),
    "namaAyah" "text",
    "pekerjaanAyah" "text",
    "namaIbu" "text",
    "pekerjaanIbu" "text",
    "penghasilanOrangTua" "text",
    "fileTranskrip" "text",
    "fileKk" "text",
    "fileKtp" "text"
);


ALTER TABLE "public"."user" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_userId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_userId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_userId_seq" OWNED BY "public"."user"."userId";



CREATE TABLE IF NOT EXISTS "public"."wilayah" (
    "wilayahId" bigint NOT NULL,
    "provinsiId" bigint NOT NULL,
    "nama" "text" NOT NULL,
    "tipe" "text" NOT NULL,
    "mode" "text",
    "isAfirmasi" boolean DEFAULT false NOT NULL,
    "is3T" boolean DEFAULT false NOT NULL,
    "jenis_3t" "text",
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."wilayah" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."wilayah_wilayahId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."wilayah_wilayahId_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."wilayah_wilayahId_seq" OWNED BY "public"."wilayah"."wilayahId";



ALTER TABLE ONLY "public"."account" ALTER COLUMN "accountId" SET DEFAULT "nextval"('"public"."account_accountId_seq"'::"regclass");



ALTER TABLE ONLY "public"."admin" ALTER COLUMN "adminId" SET DEFAULT "nextval"('"public"."admin_adminId_seq"'::"regclass");



ALTER TABLE ONLY "public"."beasiswa" ALTER COLUMN "beasiswaId" SET DEFAULT "nextval"('"public"."beasiswa_beasiswaId_seq"'::"regclass");



ALTER TABLE ONLY "public"."dokumen" ALTER COLUMN "dokumenId" SET DEFAULT "nextval"('"public"."dokumen_dokumenId_seq"'::"regclass");



ALTER TABLE ONLY "public"."favorit" ALTER COLUMN "favoritId" SET DEFAULT "nextval"('"public"."favorit_favoritId_seq"'::"regclass");



ALTER TABLE ONLY "public"."laporan_link_rusak" ALTER COLUMN "laporanId" SET DEFAULT "nextval"('"public"."laporan_link_rusak_laporanId_seq"'::"regclass");



ALTER TABLE ONLY "public"."notifikasi" ALTER COLUMN "notifikasiId" SET DEFAULT "nextval"('"public"."notifikasi_notifikasiId_seq"'::"regclass");



ALTER TABLE ONLY "public"."pendaftaran" ALTER COLUMN "pendaftaranId" SET DEFAULT "nextval"('"public"."pendaftaran_pendaftaranId_seq"'::"regclass");



ALTER TABLE ONLY "public"."pendonor" ALTER COLUMN "pendonorId" SET DEFAULT "nextval"('"public"."pendonor_pendonorId_seq"'::"regclass");



ALTER TABLE ONLY "public"."penyaluran_dana" ALTER COLUMN "penyaluranId" SET DEFAULT "nextval"('"public"."penyaluran_dana_penyaluranId_seq"'::"regclass");



ALTER TABLE ONLY "public"."provinsi" ALTER COLUMN "provinsiId" SET DEFAULT "nextval"('"public"."provinsi_provinsiId_seq"'::"regclass");



ALTER TABLE ONLY "public"."rekening" ALTER COLUMN "rekeningId" SET DEFAULT "nextval"('"public"."rekening_rekeningId_seq"'::"regclass");



ALTER TABLE ONLY "public"."tutorial" ALTER COLUMN "tutorialId" SET DEFAULT "nextval"('"public"."tutorial_tutorialId_seq"'::"regclass");



ALTER TABLE ONLY "public"."user" ALTER COLUMN "userId" SET DEFAULT "nextval"('"public"."user_userId_seq"'::"regclass");



ALTER TABLE ONLY "public"."wilayah" ALTER COLUMN "wilayahId" SET DEFAULT "nextval"('"public"."wilayah_wilayahId_seq"'::"regclass");



ALTER TABLE ONLY "public"."account"
    ADD CONSTRAINT "account_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."account"
    ADD CONSTRAINT "account_pkey" PRIMARY KEY ("accountId");



ALTER TABLE ONLY "public"."admin"
    ADD CONSTRAINT "admin_pkey" PRIMARY KEY ("adminId");



ALTER TABLE ONLY "public"."beasiswa"
    ADD CONSTRAINT "beasiswa_pkey" PRIMARY KEY ("beasiswaId");



ALTER TABLE ONLY "public"."beasiswa_provinsi"
    ADD CONSTRAINT "beasiswa_provinsi_pkey" PRIMARY KEY ("beasiswaId", "provinsiId");



ALTER TABLE ONLY "public"."beasiswa_wilayah"
    ADD CONSTRAINT "beasiswa_wilayah_pkey" PRIMARY KEY ("beasiswaId", "wilayahId");



ALTER TABLE ONLY "public"."dokumen"
    ADD CONSTRAINT "dokumen_pkey" PRIMARY KEY ("dokumenId");



ALTER TABLE ONLY "public"."favorit"
    ADD CONSTRAINT "favorit_pkey" PRIMARY KEY ("favoritId");



ALTER TABLE ONLY "public"."favorit"
    ADD CONSTRAINT "favorit_userId_beasiswaId_key" UNIQUE ("userId", "beasiswaId");



ALTER TABLE ONLY "public"."laporan_link_rusak"
    ADD CONSTRAINT "laporan_link_rusak_pkey" PRIMARY KEY ("laporanId");



ALTER TABLE ONLY "public"."notifikasi"
    ADD CONSTRAINT "notifikasi_pkey" PRIMARY KEY ("notifikasiId");



ALTER TABLE ONLY "public"."pendaftaran"
    ADD CONSTRAINT "pendaftaran_pkey" PRIMARY KEY ("pendaftaranId");



ALTER TABLE ONLY "public"."pendonor"
    ADD CONSTRAINT "pendonor_pkey" PRIMARY KEY ("pendonorId");



ALTER TABLE ONLY "public"."penyaluran_dana"
    ADD CONSTRAINT "penyaluran_dana_pkey" PRIMARY KEY ("penyaluranId");



ALTER TABLE ONLY "public"."provinsi"
    ADD CONSTRAINT "provinsi_pkey" PRIMARY KEY ("provinsiId");



ALTER TABLE ONLY "public"."rekening"
    ADD CONSTRAINT "rekening_nomorRekening_key" UNIQUE ("nomorRekening");



ALTER TABLE ONLY "public"."rekening"
    ADD CONSTRAINT "rekening_pkey" PRIMARY KEY ("rekeningId");



ALTER TABLE ONLY "public"."tutorial"
    ADD CONSTRAINT "tutorial_pkey" PRIMARY KEY ("tutorialId");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_pkey" PRIMARY KEY ("userId");



ALTER TABLE ONLY "public"."wilayah"
    ADD CONSTRAINT "wilayah_pkey" PRIMARY KEY ("wilayahId");



CREATE INDEX "idx_account_email" ON "public"."account" USING "btree" ("email");



CREATE INDEX "idx_account_role" ON "public"."account" USING "btree" ("role");



CREATE INDEX "idx_admin_account" ON "public"."admin" USING "btree" ("accountId");



CREATE INDEX "idx_beasiswa_deadline" ON "public"."beasiswa" USING "btree" ("deadline");



CREATE INDEX "idx_beasiswa_pendonor" ON "public"."beasiswa" USING "btree" ("pendonorId");



CREATE INDEX "idx_beasiswa_status" ON "public"."beasiswa" USING "btree" ("status");



CREATE INDEX "idx_bw_wilayah" ON "public"."beasiswa_wilayah" USING "btree" ("wilayahId");



CREATE INDEX "idx_dokumen_pendaftaran" ON "public"."dokumen" USING "btree" ("pendaftaranId");



CREATE INDEX "idx_dokumen_status" ON "public"."dokumen" USING "btree" ("statusDokumen");



CREATE INDEX "idx_favorit_beasiswa" ON "public"."favorit" USING "btree" ("beasiswaId");



CREATE INDEX "idx_favorit_user" ON "public"."favorit" USING "btree" ("userId");



CREATE INDEX "idx_laporan_beasiswa" ON "public"."laporan_link_rusak" USING "btree" ("beasiswaId");



CREATE INDEX "idx_laporan_status" ON "public"."laporan_link_rusak" USING "btree" ("status");



CREATE INDEX "idx_laporan_user" ON "public"."laporan_link_rusak" USING "btree" ("userId");



CREATE INDEX "idx_notifikasi_is_read" ON "public"."notifikasi" USING "btree" ("isRead");



CREATE INDEX "idx_notifikasi_user" ON "public"."notifikasi" USING "btree" ("userId");



CREATE INDEX "idx_pendaftaran_beasiswa" ON "public"."pendaftaran" USING "btree" ("beasiswaId");



CREATE INDEX "idx_pendaftaran_status" ON "public"."pendaftaran" USING "btree" ("status");



CREATE INDEX "idx_pendaftaran_user" ON "public"."pendaftaran" USING "btree" ("userId");



CREATE INDEX "idx_pendonor_account" ON "public"."pendonor" USING "btree" ("accountId");



CREATE INDEX "idx_penyaluran_beasiswa" ON "public"."penyaluran_dana" USING "btree" ("beasiswaId");



CREATE INDEX "idx_penyaluran_pendaftaran" ON "public"."penyaluran_dana" USING "btree" ("pendaftaranId");



CREATE INDEX "idx_penyaluran_pendonor" ON "public"."penyaluran_dana" USING "btree" ("pendonorId");



CREATE INDEX "idx_penyaluran_status" ON "public"."penyaluran_dana" USING "btree" ("status");



CREATE INDEX "idx_rekening_status" ON "public"."rekening" USING "btree" ("status");



CREATE INDEX "idx_rekening_user" ON "public"."rekening" USING "btree" ("userId");



CREATE INDEX "idx_user_account" ON "public"."user" USING "btree" ("accountId");



CREATE INDEX "idx_user_email" ON "public"."user" USING "btree" ("email");



ALTER TABLE ONLY "public"."admin"
    ADD CONSTRAINT "admin_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."account"("accountId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."beasiswa"
    ADD CONSTRAINT "beasiswa_pendonorId_fkey" FOREIGN KEY ("pendonorId") REFERENCES "public"."pendonor"("pendonorId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."beasiswa_provinsi"
    ADD CONSTRAINT "beasiswa_provinsi_beasiswaId_fkey" FOREIGN KEY ("beasiswaId") REFERENCES "public"."beasiswa"("beasiswaId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."beasiswa_provinsi"
    ADD CONSTRAINT "beasiswa_provinsi_provinsiId_fkey" FOREIGN KEY ("provinsiId") REFERENCES "public"."provinsi"("provinsiId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."beasiswa_wilayah"
    ADD CONSTRAINT "beasiswa_wilayah_beasiswaId_fkey" FOREIGN KEY ("beasiswaId") REFERENCES "public"."beasiswa"("beasiswaId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."beasiswa_wilayah"
    ADD CONSTRAINT "beasiswa_wilayah_wilayahId_fkey" FOREIGN KEY ("wilayahId") REFERENCES "public"."wilayah"("wilayahId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dokumen"
    ADD CONSTRAINT "dokumen_pendaftaranId_fkey" FOREIGN KEY ("pendaftaranId") REFERENCES "public"."pendaftaran"("pendaftaranId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorit"
    ADD CONSTRAINT "favorit_beasiswaId_fkey" FOREIGN KEY ("beasiswaId") REFERENCES "public"."beasiswa"("beasiswaId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorit"
    ADD CONSTRAINT "favorit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("userId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."laporan_link_rusak"
    ADD CONSTRAINT "laporan_link_rusak_beasiswaId_fkey" FOREIGN KEY ("beasiswaId") REFERENCES "public"."beasiswa"("beasiswaId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."laporan_link_rusak"
    ADD CONSTRAINT "laporan_link_rusak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("userId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifikasi"
    ADD CONSTRAINT "notifikasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("userId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pendaftaran"
    ADD CONSTRAINT "pendaftaran_beasiswaId_fkey" FOREIGN KEY ("beasiswaId") REFERENCES "public"."beasiswa"("beasiswaId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pendaftaran"
    ADD CONSTRAINT "pendaftaran_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("userId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pendonor"
    ADD CONSTRAINT "pendonor_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."account"("accountId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."penyaluran_dana"
    ADD CONSTRAINT "penyaluran_dana_beasiswaId_fkey" FOREIGN KEY ("beasiswaId") REFERENCES "public"."beasiswa"("beasiswaId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."penyaluran_dana"
    ADD CONSTRAINT "penyaluran_dana_pendaftaranId_fkey" FOREIGN KEY ("pendaftaranId") REFERENCES "public"."pendaftaran"("pendaftaranId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."penyaluran_dana"
    ADD CONSTRAINT "penyaluran_dana_pendonorId_fkey" FOREIGN KEY ("pendonorId") REFERENCES "public"."pendonor"("pendonorId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rekening"
    ADD CONSTRAINT "rekening_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("userId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."account"("accountId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_kabupaten_ktp_fk" FOREIGN KEY ("kabupatenKtpId") REFERENCES "public"."wilayah"("wilayahId");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_kota_lahir_wilayah_fk" FOREIGN KEY ("kotaLahirWilayahId") REFERENCES "public"."wilayah"("wilayahId");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_provinsi_ktp_fk" FOREIGN KEY ("provinsiKtpId") REFERENCES "public"."provinsi"("provinsiId");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_provinsi_lahir_fk" FOREIGN KEY ("provinsiLahirId") REFERENCES "public"."provinsi"("provinsiId");



ALTER TABLE ONLY "public"."wilayah"
    ADD CONSTRAINT "wilayah_provinsiId_fkey" FOREIGN KEY ("provinsiId") REFERENCES "public"."provinsi"("provinsiId") ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."account" TO "anon";
GRANT ALL ON TABLE "public"."account" TO "authenticated";
GRANT ALL ON TABLE "public"."account" TO "service_role";



GRANT ALL ON SEQUENCE "public"."account_accountId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."account_accountId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."account_accountId_seq" TO "service_role";



GRANT ALL ON TABLE "public"."admin" TO "anon";
GRANT ALL ON TABLE "public"."admin" TO "authenticated";
GRANT ALL ON TABLE "public"."admin" TO "service_role";



GRANT ALL ON SEQUENCE "public"."admin_adminId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."admin_adminId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."admin_adminId_seq" TO "service_role";



GRANT ALL ON TABLE "public"."beasiswa" TO "anon";
GRANT ALL ON TABLE "public"."beasiswa" TO "authenticated";
GRANT ALL ON TABLE "public"."beasiswa" TO "service_role";



GRANT ALL ON SEQUENCE "public"."beasiswa_beasiswaId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."beasiswa_beasiswaId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."beasiswa_beasiswaId_seq" TO "service_role";



GRANT ALL ON TABLE "public"."beasiswa_provinsi" TO "anon";
GRANT ALL ON TABLE "public"."beasiswa_provinsi" TO "authenticated";
GRANT ALL ON TABLE "public"."beasiswa_provinsi" TO "service_role";



GRANT ALL ON TABLE "public"."beasiswa_wilayah" TO "anon";
GRANT ALL ON TABLE "public"."beasiswa_wilayah" TO "authenticated";
GRANT ALL ON TABLE "public"."beasiswa_wilayah" TO "service_role";



GRANT ALL ON TABLE "public"."dokumen" TO "anon";
GRANT ALL ON TABLE "public"."dokumen" TO "authenticated";
GRANT ALL ON TABLE "public"."dokumen" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dokumen_dokumenId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dokumen_dokumenId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dokumen_dokumenId_seq" TO "service_role";



GRANT ALL ON TABLE "public"."favorit" TO "anon";
GRANT ALL ON TABLE "public"."favorit" TO "authenticated";
GRANT ALL ON TABLE "public"."favorit" TO "service_role";



GRANT ALL ON SEQUENCE "public"."favorit_favoritId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."favorit_favoritId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."favorit_favoritId_seq" TO "service_role";



GRANT ALL ON TABLE "public"."laporan_link_rusak" TO "anon";
GRANT ALL ON TABLE "public"."laporan_link_rusak" TO "authenticated";
GRANT ALL ON TABLE "public"."laporan_link_rusak" TO "service_role";



GRANT ALL ON SEQUENCE "public"."laporan_link_rusak_laporanId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."laporan_link_rusak_laporanId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."laporan_link_rusak_laporanId_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notifikasi" TO "anon";
GRANT ALL ON TABLE "public"."notifikasi" TO "authenticated";
GRANT ALL ON TABLE "public"."notifikasi" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notifikasi_notifikasiId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifikasi_notifikasiId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifikasi_notifikasiId_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pendaftaran" TO "anon";
GRANT ALL ON TABLE "public"."pendaftaran" TO "authenticated";
GRANT ALL ON TABLE "public"."pendaftaran" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pendaftaran_pendaftaranId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pendaftaran_pendaftaranId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pendaftaran_pendaftaranId_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pendonor" TO "anon";
GRANT ALL ON TABLE "public"."pendonor" TO "authenticated";
GRANT ALL ON TABLE "public"."pendonor" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pendonor_pendonorId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pendonor_pendonorId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pendonor_pendonorId_seq" TO "service_role";



GRANT ALL ON TABLE "public"."penyaluran_dana" TO "anon";
GRANT ALL ON TABLE "public"."penyaluran_dana" TO "authenticated";
GRANT ALL ON TABLE "public"."penyaluran_dana" TO "service_role";



GRANT ALL ON SEQUENCE "public"."penyaluran_dana_penyaluranId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."penyaluran_dana_penyaluranId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."penyaluran_dana_penyaluranId_seq" TO "service_role";



GRANT ALL ON TABLE "public"."provinsi" TO "anon";
GRANT ALL ON TABLE "public"."provinsi" TO "authenticated";
GRANT ALL ON TABLE "public"."provinsi" TO "service_role";



GRANT ALL ON SEQUENCE "public"."provinsi_provinsiId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."provinsi_provinsiId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."provinsi_provinsiId_seq" TO "service_role";



GRANT ALL ON TABLE "public"."rekening" TO "anon";
GRANT ALL ON TABLE "public"."rekening" TO "authenticated";
GRANT ALL ON TABLE "public"."rekening" TO "service_role";



GRANT ALL ON SEQUENCE "public"."rekening_rekeningId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."rekening_rekeningId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."rekening_rekeningId_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tutorial" TO "anon";
GRANT ALL ON TABLE "public"."tutorial" TO "authenticated";
GRANT ALL ON TABLE "public"."tutorial" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tutorial_tutorialId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tutorial_tutorialId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tutorial_tutorialId_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user" TO "anon";
GRANT ALL ON TABLE "public"."user" TO "authenticated";
GRANT ALL ON TABLE "public"."user" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_userId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_userId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_userId_seq" TO "service_role";



GRANT ALL ON TABLE "public"."wilayah" TO "anon";
GRANT ALL ON TABLE "public"."wilayah" TO "authenticated";
GRANT ALL ON TABLE "public"."wilayah" TO "service_role";



GRANT ALL ON SEQUENCE "public"."wilayah_wilayahId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."wilayah_wilayahId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."wilayah_wilayahId_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































