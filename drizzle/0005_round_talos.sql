ALTER TYPE "public"."status_absen" ADD VALUE 'HAID';--> statement-breakpoint
ALTER TABLE "sesi_absensi" ADD COLUMN "is_haid_exempt" boolean DEFAULT false NOT NULL;