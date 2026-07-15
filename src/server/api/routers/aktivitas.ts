// src/server/api/routers/aktivitas.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { desc, eq, asc, and, gte, lte, like, isNotNull } from "drizzle-orm";
import {
  logAbsensi,
  pesertaDidik,
  kategoriAbsensi,
  sesiAbsensi,
  masterPelanggaran,
  kelas,
  user,
} from "~/server/db/schema";

// Enum untuk opsi filter
const statusKehadiranEnum = z.enum([
  "HADIR",
  "TIDAK_HADIR",
  "IZIN",
  "SAKIT",
  "ALFA",
  "LAINNYA",
]);

const tipeLogEnum = z.enum(["SESI", "PELANGGARAN"]);

export const aktivitasRouter = createTRPCRouter({
  // --------------------------------------------------------
  // 1. GET RECENT LOGS (Dengan Filter & Pencarian)
  // --------------------------------------------------------
  getRecentLogs: protectedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          jenjang: z.enum(["SD", "SMP", "SMA"]).optional(),
          tingkat: z.string().optional(),
          kelasId: z.string().optional(),
          sesiId: z.string().optional(),
          namaSiswa: z.string().optional(),
          statusKehadiran: statusKehadiranEnum.optional(),
          tipeLog: tipeLogEnum.optional(),
          limit: z.number().min(1).max(200).default(100),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input?.startDate) {
        conditions.push(gte(logAbsensi.tanggal, input.startDate));
      }
      if (input?.endDate) {
        conditions.push(lte(logAbsensi.tanggal, input.endDate));
      }
      if (input?.sesiId) {
        conditions.push(eq(logAbsensi.sesiId, input.sesiId));
      }
      if (input?.statusKehadiran) {
        conditions.push(eq(logAbsensi.statusKehadiran, input.statusKehadiran));
      }
      if (input?.tipeLog === "SESI") {
        conditions.push(isNotNull(logAbsensi.sesiId));
      } else if (input?.tipeLog === "PELANGGARAN") {
        conditions.push(isNotNull(logAbsensi.pelanggaranId));
      }

      // Query dengan kolom flat
      const rows = await ctx.db
        .select({
          // Log Absensi
          id: logAbsensi.id,
          tanggal: logAbsensi.tanggal,
          waktuScan: logAbsensi.waktuScan,
          statusKehadiran: logAbsensi.statusKehadiran,
          statusWaktu: logAbsensi.statusWaktu,
          poinDidapat: logAbsensi.poinDidapat,
          isPoinManual: logAbsensi.isPoinManual,
          keterangan: logAbsensi.keterangan,

          // Peserta Didik
          pesertaId: pesertaDidik.id,
          pesertaNama: pesertaDidik.namaLengkap,

          // Kelas
          kelasId: kelas.id,
          kelasJenjang: kelas.jenjang,
          kelasTingkat: kelas.tingkat,
          kelasNama: kelas.namaKelas,

          // Sesi Absensi (nullable)
          sesiId: sesiAbsensi.id,
          sesiNama: sesiAbsensi.namaSesi,

          // Kategori Absensi (nullable)
          kategoriId: kategoriAbsensi.id,
          kategoriNama: kategoriAbsensi.namaKategori,

          // Master Pelanggaran (nullable)
          pelanggaranId: masterPelanggaran.id,
          pelanggaranNama: masterPelanggaran.namaPelanggaran,
          pelanggaranTingkat: masterPelanggaran.tingkat,

          // User (wali asuh)
          waliAsuhId: user.id,
          waliAsuhName: user.name,
        })
        .from(logAbsensi)
        .innerJoin(pesertaDidik, eq(logAbsensi.pesertaDidikId, pesertaDidik.id))
        .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
        .leftJoin(sesiAbsensi, eq(logAbsensi.sesiId, sesiAbsensi.id))
        .leftJoin(
          kategoriAbsensi,
          eq(sesiAbsensi.kategoriId, kategoriAbsensi.id),
        )
        .leftJoin(
          masterPelanggaran,
          eq(logAbsensi.pelanggaranId, masterPelanggaran.id),
        )
        .leftJoin(user, eq(logAbsensi.waliAsuhId, user.id))
        .where(
          and(
            ...conditions,
            input?.jenjang ? eq(kelas.jenjang, input.jenjang) : undefined,
            input?.tingkat ? eq(kelas.tingkat, input.tingkat) : undefined,
            input?.kelasId ? eq(kelas.id, input.kelasId) : undefined,
            input?.namaSiswa
              ? like(pesertaDidik.namaLengkap, `%${input.namaSiswa}%`)
              : undefined,
          ),
        )
        .orderBy(desc(logAbsensi.waktuScan))
        .limit(input?.limit ?? 100);

      // Mapping ke bentuk nested yang diharapkan frontend
      const results = rows.map((row) => ({
        id: row.id,
        tanggal: row.tanggal,
        waktuScan: row.waktuScan,
        statusKehadiran: row.statusKehadiran,
        statusWaktu: row.statusWaktu,
        poinDidapat: row.poinDidapat,
        isPoinManual: row.isPoinManual,
        keterangan: row.keterangan,
        pesertaDidik: {
          id: row.pesertaId,
          namaLengkap: row.pesertaNama,
          kelas: {
            jenjang: row.kelasJenjang,
            tingkat: row.kelasTingkat,
            namaKelas: row.kelasNama,
          },
        },
        sesi: row.sesiId
          ? {
              id: row.sesiId,
              namaSesi: row.sesiNama,
              kategori: row.kategoriId
                ? { namaKategori: row.kategoriNama }
                : null,
            }
          : null,
        pelanggaran: row.pelanggaranId
          ? {
              id: row.pelanggaranId,
              namaPelanggaran: row.pelanggaranNama,
              tingkat: row.pelanggaranTingkat,
            }
          : null,
        waliAsuh: row.waliAsuhId
          ? {
              id: row.waliAsuhId,
              name: row.waliAsuhName,
            }
          : null,
      }));

      return results;
    }),

  // --------------------------------------------------------
  // 2. GET FORM OPTIONS (untuk dropdown filter & form manual)
  // --------------------------------------------------------
  getFormOptions: protectedProcedure.query(async ({ ctx }) => {
    const peserta = await ctx.db.query.pesertaDidik.findMany({
      where: eq(pesertaDidik.status, "AKTIF"),
      orderBy: [asc(pesertaDidik.namaLengkap)],
      with: { kelas: true },
    });

    const kategori = await ctx.db.query.kategoriAbsensi.findMany({
      where: eq(kategoriAbsensi.isActive, true),
      with: { sesi: true },
      orderBy: [asc(kategoriAbsensi.namaKategori)],
    });

    const pelanggaran = await ctx.db.query.masterPelanggaran.findMany({
      where: eq(masterPelanggaran.isActive, true),
      orderBy: [asc(masterPelanggaran.tingkat)],
    });

    // Kembalikan juga daftar kelas untuk filter
    const semuaKelas = await ctx.db.query.kelas.findMany({
      orderBy: [asc(kelas.jenjang), asc(kelas.tingkat), asc(kelas.namaKelas)],
    });

    return { peserta, kategori, pelanggaran, semuaKelas };
  }),

  // --------------------------------------------------------
  // 3. CREATE LOG MANUAL (tidak berubah)
  // --------------------------------------------------------
  createLogManual: protectedProcedure
    .input(
      z.object({
        pesertaDidikId: z.string(),
        tipeLog: z.enum(["SESI", "PELANGGARAN"]),
        sesiId: z.string().optional().nullable(),
        pelanggaranId: z.string().optional().nullable(),
        statusKehadiran: z
          .enum(["HADIR", "TIDAK_HADIR", "IZIN", "SAKIT", "ALFA", "LAINNYA"])
          .default("HADIR"),
        keterangan: z.string().optional(),
        tanggal: z.string(),
        poinOverride: z.number().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let poinDidapat = 0;
      let isPoinManual = false;
      let statusWaktu: "TEPAT_WAKTU" | "TELAT" | null = null;

      if (input.tipeLog === "SESI") {
        if (!input.sesiId) throw new Error("Sesi jadwal wajib dipilih!");

        const sesi = await ctx.db.query.sesiAbsensi.findFirst({
          where: eq(sesiAbsensi.id, input.sesiId),
        });
        if (!sesi) throw new Error("Sesi tidak ditemukan di database.");

        if (input.statusKehadiran === "HADIR") {
          poinDidapat = sesi.poinTepatWaktu;
          statusWaktu = "TEPAT_WAKTU";
        } else {
          poinDidapat = 0;
        }
      } else if (input.tipeLog === "PELANGGARAN") {
        if (!input.pelanggaranId)
          throw new Error("Jenis pelanggaran wajib dipilih!");

        const pelanggaran = await ctx.db.query.masterPelanggaran.findFirst({
          where: eq(masterPelanggaran.id, input.pelanggaranId),
        });
        if (!pelanggaran)
          throw new Error("Master pelanggaran tidak ditemukan.");

        poinDidapat = pelanggaran.poinMinus;
      }

      if (input.poinOverride !== undefined && input.poinOverride !== null) {
        poinDidapat = input.poinOverride;
        isPoinManual = true;
      }

      await ctx.db.insert(logAbsensi).values({
        pesertaDidikId: input.pesertaDidikId,
        sesiId: input.tipeLog === "SESI" ? input.sesiId : null,
        pelanggaranId:
          input.tipeLog === "PELANGGARAN" ? input.pelanggaranId : null,
        waliAsuhId: ctx.session.user.id,
        tanggal: input.tanggal,
        waktuScan: new Date(),
        statusKehadiran:
          input.tipeLog === "SESI" ? input.statusKehadiran : "HADIR",
        statusWaktu: statusWaktu,
        poinDidapat: poinDidapat,
        isPoinManual: isPoinManual,
        keterangan: input.keterangan,
      });
    }),

  // --------------------------------------------------------
  // 4. UPDATE LOG MANUAL (Edit)
  // --------------------------------------------------------
  updateLogManual: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        statusKehadiran: z
          .enum(["HADIR", "TIDAK_HADIR", "IZIN", "SAKIT", "ALFA", "LAINNYA"])
          .optional(),
        statusWaktu: z.enum(["TEPAT_WAKTU", "TELAT"]).optional().nullable(),
        poinDidapat: z.number().optional(),
        keterangan: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const log = await ctx.db.query.logAbsensi.findFirst({
        where: eq(logAbsensi.id, input.id),
      });
      if (!log) throw new Error("Log tidak ditemukan.");

      // Update field yang disediakan
      const updateData: any = {};
      if (input.statusKehadiran !== undefined)
        updateData.statusKehadiran = input.statusKehadiran;
      if (input.statusWaktu !== undefined)
        updateData.statusWaktu = input.statusWaktu;
      if (input.poinDidapat !== undefined) {
        updateData.poinDidapat = input.poinDidapat;
        updateData.isPoinManual = true; // Tandai bahwa poin diubah manual
      }
      if (input.keterangan !== undefined)
        updateData.keterangan = input.keterangan;

      await ctx.db
        .update(logAbsensi)
        .set(updateData)
        .where(eq(logAbsensi.id, input.id));

      return { success: true };
    }),

  // --------------------------------------------------------
  // 5. SCAN QR CODE (Khusus Absensi Rutin via Kamera)
  // --------------------------------------------------------
  scanQr: protectedProcedure
    .input(
      z.object({
        nipd: z.string(),
        sesiId: z.string(), // KategoriId dihapus karena kita hanya butuh ID Sesi-nya saja
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Cari Siswa
      const peserta = await ctx.db.query.pesertaDidik.findFirst({
        where: eq(pesertaDidik.nipd, input.nipd),
        with: { kelas: true },
      });

      if (!peserta) {
        throw new Error(`NIPD ${input.nipd} tidak terdaftar di sistem.`);
      }

      // 2. Cari Sesi
      const sesi = await ctx.db.query.sesiAbsensi.findFirst({
        where: eq(sesiAbsensi.id, input.sesiId),
      });

      if (!sesi) throw new Error("Sesi jadwal tidak valid.");

      // 3. Validasi Target Jenjang Sesi
      const isTargetedJenjang = sesi.targetJenjang.includes(
        peserta.kelas.jenjang,
      );
      if (!isTargetedJenjang) {
        throw new Error(
          `Siswa jenjang ${peserta.kelas.jenjang} tidak ditugaskan untuk sesi ini.`,
        );
      }

      // TAMBAHAN BARU: Validasi Agama Peserta
      // Memastikan anak Non-Is tidak bisa absen di kegiatan Islam, dan sebaliknya
      const isTargetedAgama = sesi.targetAgama.includes(peserta.agama as any);
      if (!isTargetedAgama) {
        throw new Error(
          `Sesi ini tidak diperuntukkan bagi peserta didik beragama ${peserta.agama}.`,
        );
      }

      // 4. Kalkulasi Waktu (Tepat Waktu vs Telat)
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, "0");
      const currentMinutes = now.getMinutes().toString().padStart(2, "0");
      const currentSeconds = now.getSeconds().toString().padStart(2, "0");
      const currentTimeString = `${currentHours}:${currentMinutes}:${currentSeconds}`;

      let statusWaktu: "TEPAT_WAKTU" | "TELAT" = "TEPAT_WAKTU";
      let poin = sesi.poinTepatWaktu;

      if (sesi.waktuSelesai && currentTimeString > sesi.waktuSelesai) {
        statusWaktu = "TELAT";
        poin = sesi.poinTelat; // Poin minus atau 0 yang sudah diset di database
      }

      // 5. Penanganan Tanggal Crossover (Tengah Malam)
      const businessDate = new Date(now);
      if (now.getHours() < 3) {
        businessDate.setDate(businessDate.getDate() - 1);
      }

      // Memastikan tipe data kembalian string yang valid
      const tanggalFormat = businessDate.toISOString().split("T")[0] as string;

      try {
        // 6. Simpan Log Transaksi
        await ctx.db.insert(logAbsensi).values({
          pesertaDidikId: peserta.id,
          sesiId: sesi.id,
          pelanggaranId: null, // Scanner bukan untuk pelanggaran
          waliAsuhId: ctx.session.user.id,
          tanggal: tanggalFormat,
          waktuScan: now,
          statusKehadiran: "HADIR",
          statusWaktu: statusWaktu,
          poinDidapat: poin,
          isPoinManual: false, // Otomatis murni dari sistem
        });
      } catch (error: any) {
        if (error.code === "23505") {
          throw new Error(
            `Siswa atas nama ${peserta.namaLengkap} sudah diabsen untuk kegiatan ini.`,
          );
        }
        throw new Error(
          "Terjadi kesalahan sistem saat menyimpan data absensi.",
        );
      }

      return peserta;
    }),
});
