CREATE TYPE "public"."agama" AS ENUM('ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDHA', 'KONGHUCU', 'LAINNYA');--> statement-breakpoint
CREATE TYPE "public"."jenjang" AS ENUM('SD', 'SMP', 'SMA');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('SUPERADMIN', 'STAFF', 'SUPPORTER');--> statement-breakpoint
CREATE TYPE "public"."status_absen" AS ENUM('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT', 'ALFA', 'LAINNYA');--> statement-breakpoint
CREATE TYPE "public"."status_peserta" AS ENUM('AKTIF', 'LULUS', 'PINDAH', 'KELUAR');--> statement-breakpoint
CREATE TYPE "public"."status_waktu" AS ENUM('TEPAT_WAKTU', 'TELAT');--> statement-breakpoint
CREATE TYPE "public"."tingkat_pelanggaran" AS ENUM('TIDAK_ADA', 'RINGAN', 'SEDANG', 'BERAT');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hari_libur" (
	"id" text PRIMARY KEY NOT NULL,
	"nama_libur" text NOT NULL,
	"tanggal_mulai" date NOT NULL,
	"tanggal_selesai" date NOT NULL,
	"target_jenjang" "jenjang"[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"deskripsi" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kategori_absensi" (
	"id" text PRIMARY KEY NOT NULL,
	"nama_kategori" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kelas" (
	"id" text PRIMARY KEY NOT NULL,
	"jenjang" "jenjang" NOT NULL,
	"tingkat" text NOT NULL,
	"nama_kelas" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_absensi" (
	"id" text PRIMARY KEY NOT NULL,
	"peserta_didik_id" text NOT NULL,
	"wali_asuh_id" text,
	"sesi_id" text,
	"pelanggaran_id" text,
	"tanggal" date NOT NULL,
	"waktu_scan" timestamp NOT NULL,
	"status_kehadiran" "status_absen" DEFAULT 'HADIR' NOT NULL,
	"status_waktu" "status_waktu",
	"is_poin_manual" boolean DEFAULT false NOT NULL,
	"poin_didapat" integer NOT NULL,
	"keterangan" text,
	CONSTRAINT "unique_scan_per_day_session" UNIQUE("tanggal","sesi_id","peserta_didik_id")
);
--> statement-breakpoint
CREATE TABLE "master_jabatan" (
	"id" text PRIMARY KEY NOT NULL,
	"nama_jabatan" text NOT NULL,
	"role" "role" DEFAULT 'STAFF' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "master_jabatan_nama_jabatan_unique" UNIQUE("nama_jabatan")
);
--> statement-breakpoint
CREATE TABLE "master_pelanggaran" (
	"id" text PRIMARY KEY NOT NULL,
	"nama_pelanggaran" text NOT NULL,
	"tingkat" "tingkat_pelanggaran" NOT NULL,
	"poin_minus" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peserta_didik" (
	"id" text PRIMARY KEY NOT NULL,
	"wali_asuh_id" text,
	"kelas_id" text NOT NULL,
	"nipd" text NOT NULL,
	"uid_kartu" text,
	"nisn" text,
	"nama_lengkap" text NOT NULL,
	"status" "status_peserta" DEFAULT 'AKTIF' NOT NULL,
	"tahun_masuk" integer,
	"jenis_kelamin" text,
	"tempat_lahir" text,
	"tanggal_lahir" date,
	"no_akte" text,
	"nik" text,
	"no_kk" text,
	"agama" "agama" DEFAULT 'ISLAM' NOT NULL,
	"alamat" text,
	"rt" text,
	"rw" text,
	"kelurahan" text,
	"kecamatan" text,
	"kode_pos" text,
	"no_telp" text,
	"sekolah_asal" text,
	"anak_ke" text,
	"nama_ibu" text,
	"tempat_lahir_ibu" text,
	"tanggal_lahir_ibu" date,
	"pendidikan_ibu" text,
	"pekerjaan_ibu" text,
	"penghasilan_ibu" text,
	"nik_ibu" text,
	"nama_ayah" text,
	"tempat_lahir_ayah" text,
	"tanggal_lahir_ayah" date,
	"pendidikan_ayah" text,
	"pekerjaan_ayah" text,
	"penghasilan_ayah" text,
	"nik_ayah" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "peserta_didik_nipd_unique" UNIQUE("nipd"),
	CONSTRAINT "peserta_didik_uid_kartu_unique" UNIQUE("uid_kartu"),
	CONSTRAINT "peserta_didik_nisn_unique" UNIQUE("nisn")
);
--> statement-breakpoint
CREATE TABLE "sesi_absensi" (
	"id" text PRIMARY KEY NOT NULL,
	"kategori_id" text NOT NULL,
	"nama_sesi" text NOT NULL,
	"waktu_mulai" time,
	"waktu_selesai" time,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"target_agama" "agama"[] DEFAULT '{"ISLAM","KRISTEN","KATOLIK","HINDU","BUDHA","KONGHUCU","LAINNYA"}' NOT NULL,
	"target_jenjang" "jenjang"[] NOT NULL,
	"poin_tepat_waktu" integer NOT NULL,
	"poin_telat" integer NOT NULL,
	"poin_alfa" integer DEFAULT -20 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"account_approved" boolean DEFAULT false NOT NULL,
	"jabatan_id" text,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_absensi" ADD CONSTRAINT "log_absensi_peserta_didik_id_peserta_didik_id_fk" FOREIGN KEY ("peserta_didik_id") REFERENCES "public"."peserta_didik"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_absensi" ADD CONSTRAINT "log_absensi_wali_asuh_id_user_id_fk" FOREIGN KEY ("wali_asuh_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_absensi" ADD CONSTRAINT "log_absensi_sesi_id_sesi_absensi_id_fk" FOREIGN KEY ("sesi_id") REFERENCES "public"."sesi_absensi"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_absensi" ADD CONSTRAINT "log_absensi_pelanggaran_id_master_pelanggaran_id_fk" FOREIGN KEY ("pelanggaran_id") REFERENCES "public"."master_pelanggaran"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peserta_didik" ADD CONSTRAINT "peserta_didik_wali_asuh_id_user_id_fk" FOREIGN KEY ("wali_asuh_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peserta_didik" ADD CONSTRAINT "peserta_didik_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesi_absensi" ADD CONSTRAINT "sesi_absensi_kategori_id_kategori_absensi_id_fk" FOREIGN KEY ("kategori_id") REFERENCES "public"."kategori_absensi"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_jabatan_id_master_jabatan_id_fk" FOREIGN KEY ("jabatan_id") REFERENCES "public"."master_jabatan"("id") ON DELETE set null ON UPDATE no action;