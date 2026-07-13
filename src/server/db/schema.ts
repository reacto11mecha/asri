import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// ==========================================
// ENUMS
// ==========================================
export const jenjangEnum = pgEnum("jenjang", ["SD", "SMP", "SMA"]);
export const statusWaktuEnum = pgEnum("status_waktu", ["TEPAT_WAKTU", "TELAT"]);
export const statusAbsenEnum = pgEnum("status_absen", [
  "HADIR",
  "TIDAK_HADIR",
  "IZIN",
  "SAKIT",
  "ALFA",
]);
export const tingkatPelanggaranEnum = pgEnum("tingkat_pelanggaran", [
  "TIDAK_ADA",
  "RINGAN",
  "SEDANG",
  "BERAT",
]);
export const statusPesertaEnum = pgEnum("status_peserta", [
  "AKTIF",
  "LULUS",
  "PINDAH",
  "KELUAR",
]);

// ==========================================
// BETTER AUTH TABLES
// ==========================================
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  accountApproved: boolean("account_approved").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

// ==========================================
// DOMAIN TABLES (MASTER DATA)
// ==========================================
export const kelas = pgTable("kelas", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  jenjang: jenjangEnum("jenjang").notNull(), // SD, SMP, SMA
  tingkat: text("tingkat").notNull(), // 1, 2, 3 (atau 10, 11, 12)
  namaKelas: text("nama_kelas").notNull(), // A, B, Reguler
});

export const kategoriAbsensi = pgTable("kategori_absensi", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  namaKategori: text("nama_kategori").notNull(), // Contoh: Solat, Makan, Kegiatan
  isActive: boolean("is_active").default(true).notNull(),
});

export const sesiAbsensi = pgTable("sesi_absensi", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  kategoriId: text("kategori_id")
    .notNull()
    .references(() => kategoriAbsensi.id, { onDelete: "restrict" }),

  namaSesi: text("nama_sesi").notNull(),
  waktuMulai: time("waktu_mulai"),
  waktuSelesai: time("waktu_selesai"),

  isMandatory: boolean("is_mandatory").default(true).notNull(),

  targetJenjang: jenjangEnum("target_jenjang").array().notNull(),

  poinTepatWaktu: integer("poin_tepat_waktu").notNull(),
  poinTelat: integer("poin_telat").notNull(),

  isActive: boolean("is_active").default(true).notNull(),
});

// ==========================================
// MASTER DATA: PELANGGARAN
// ==========================================
export const masterPelanggaran = pgTable("master_pelanggaran", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  namaPelanggaran: text("nama_pelanggaran").notNull(),
  tingkat: tingkatPelanggaranEnum("tingkat").notNull(), // RINGAN, SEDANG, BERAT
  poinMinus: integer("poin_minus").notNull(), // Bobot poin (biasanya negatif)
  isActive: boolean("is_active").default(true).notNull(),
});

// ==========================================
// DOMAIN TABLES (TRANSAKSIONAL)
// ==========================================
export const pesertaDidik = pgTable("peserta_didik", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  waliAsuhId: text("wali_asuh_id").references(() => user.id, {
    onDelete: "set null",
  }),
  kelasId: text("kelas_id")
    .notNull()
    .references(() => kelas.id, { onDelete: "restrict" }),

  // Identitas Utama (NIPD digunakan untuk generate/scan QR Code)
  nipd: text("nipd").notNull().unique(),
  // Future feature, contoh isi: "A1B2C3D4" (Hex UID Mifare)
  uidKartu: text("uid_kartu").unique(),
  nisn: text("nisn").unique(),
  namaLengkap: text("nama_lengkap").notNull(),

  // Status & Akademik
  status: statusPesertaEnum("status").default("AKTIF").notNull(),
  tahunMasuk: integer("tahun_masuk"),

  // Data Demografi & Alamat
  jenisKelamin: text("jenis_kelamin"),
  tempatLahir: text("tempat_lahir"),
  tanggalLahir: date("tanggal_lahir"),
  noAkte: text("no_akte"),
  nik: text("nik"),
  noKk: text("no_kk"),
  agama: text("agama"),
  alamat: text("alamat"),
  rt: text("rt"),
  rw: text("rw"),
  kelurahan: text("kelurahan"),
  kecamatan: text("kecamatan"),
  kodePos: text("kode_pos"),
  noTelp: text("no_telp"),
  sekolahAsal: text("sekolah_asal"),
  anakKe: text("anak_ke"),

  // Data Ibu
  namaIbu: text("nama_ibu"),
  tempatLahirIbu: text("tempat_lahir_ibu"),
  tanggalLahirIbu: date("tanggal_lahir_ibu"),
  pendidikanIbu: text("pendidikan_ibu"),
  pekerjaanIbu: text("pekerjaan_ibu"),
  penghasilanIbu: text("penghasilan_ibu"),
  nikIbu: text("nik_ibu"),

  // Data Ayah
  namaAyah: text("nama_ayah"),
  tempatLahirAyah: text("tempat_lahir_ayah"),
  tanggalLahirAyah: date("tanggal_lahir_ayah"),
  pendidikanAyah: text("pendidikan_ayah"),
  pekerjaanAyah: text("pekerjaan_ayah"),
  penghasilanAyah: text("penghasilan_ayah"),
  nikAyah: text("nik_ayah"),

  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const logAbsensi = pgTable(
  "log_absensi",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pesertaDidikId: text("peserta_didik_id")
      .notNull()
      .references(() => pesertaDidik.id, { onDelete: "cascade" }),
    waliAsuhId: text("wali_asuh_id").references(() => user.id, {
      onDelete: "set null",
    }),

    // RELASI FLEKSIBEL (Hanya salah satu yang terisi)
    sesiId: text("sesi_id").references(() => sesiAbsensi.id, {
      onDelete: "restrict",
    }),
    pelanggaranId: text("pelanggaran_id").references(
      () => masterPelanggaran.id,
      { onDelete: "restrict" },
    ),

    tanggal: date("tanggal").notNull(),
    waktuScan: timestamp("waktu_scan").notNull(),

    // STATUS (Untuk absensi rutin)
    statusKehadiran: statusAbsenEnum("status_kehadiran")
      .default("HADIR")
      .notNull(),
    statusWaktu: statusWaktuEnum("status_waktu"), // Terisi 'TEPAT_WAKTU' atau 'TELAT' jika HADIR

    // Penanda apakah poin ini hasil ketetapan sistem atau diedit manual oleh Wali Asuh
    isPoinManual: boolean("is_poin_manual").default(false).notNull(),

    // HASIL POIN
    poinDidapat: integer("poin_didapat").notNull(),
    keterangan: text("keterangan"), // Kronologi pelanggaran / Alasan Sakit
  },
  (table) => [
    // Mencegah duplikasi absen rutin pada sesi yang sama di hari yang sama
    // Null pada pelanggaranId tidak akan memicu konflik unique constraint
    unique("unique_scan_per_day_session").on(
      table.tanggal,
      table.sesiId,
      table.pesertaDidikId,
    ),
  ],
);

// ==========================================
// DRIZZLE RELATIONS (Untuk mempermudah query .with())
// ==========================================
export const userRelations = relations(user, ({ many }) => ({
  account: many(account),
  session: many(session),
  anakAsuh: many(pesertaDidik),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const kelasRelations = relations(kelas, ({ many }) => ({
  pesertaDidik: many(pesertaDidik),
}));

export const kategoriAbsensiRelations = relations(
  kategoriAbsensi,
  ({ many }) => ({
    sesi: many(sesiAbsensi),
  }),
);

export const sesiAbsensiRelations = relations(sesiAbsensi, ({ one, many }) => ({
  kategori: one(kategoriAbsensi, {
    fields: [sesiAbsensi.kategoriId],
    references: [kategoriAbsensi.id],
  }),
  logAbsensi: many(logAbsensi),
}));

export const masterPelanggaranRelations = relations(
  masterPelanggaran,
  ({ many }) => ({
    logAbsensi: many(logAbsensi),
  }),
);

export const logAbsensiRelations = relations(logAbsensi, ({ one }) => ({
  pesertaDidik: one(pesertaDidik, {
    fields: [logAbsensi.pesertaDidikId],
    references: [pesertaDidik.id],
  }),
  waliAsuh: one(user, {
    fields: [logAbsensi.waliAsuhId],
    references: [user.id],
  }),
  sesi: one(sesiAbsensi, {
    fields: [logAbsensi.sesiId],
    references: [sesiAbsensi.id],
  }),
  pelanggaran: one(masterPelanggaran, {
    fields: [logAbsensi.pelanggaranId],
    references: [masterPelanggaran.id],
  }),
}));

export const pesertaDidikRelations = relations(
  pesertaDidik,
  ({ one, many }) => ({
    waliAsuh: one(user, {
      fields: [pesertaDidik.waliAsuhId],
      references: [user.id],
    }),
    kelas: one(kelas, {
      fields: [pesertaDidik.kelasId],
      references: [kelas.id],
    }),
    logAbsensi: many(logAbsensi),
  }),
);
