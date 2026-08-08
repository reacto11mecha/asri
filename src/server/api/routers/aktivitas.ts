// src/server/api/routers/aktivitas.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  desc,
  eq,
  asc,
  and,
  gte,
  lte,
  like,
  isNotNull,
  sql,
} from "drizzle-orm";
import {
  logAbsensi,
  pesertaDidik,
  kategoriAbsensi,
  sesiAbsensi,
  masterPelanggaran,
  kelas,
  user,
} from "~/server/db/schema";
import {
  format,
  subDays,
  getHours,
  differenceInDays,
  parseISO,
} from "date-fns";
import { TRPCError } from "@trpc/server";
import type { ScanResult } from "~/types/scan";
import type { DBType } from "~/server/db";

const statusKehadiranEnum = z.enum([
  "HADIR",
  "TIDAK_HADIR",
  "IZIN",
  "HAID",
  "SAKIT",
  "ALFA",
  "LAINNYA",
]);

const tipeLogEnum = z.enum(["SESI", "PELANGGARAN"]);

type PesertaWithKelas = {
  id: string;
  namaLengkap: string;
  jenisKelamin: string | null;
  agama:
    | "ISLAM"
    | "KRISTEN"
    | "KATOLIK"
    | "HINDU"
    | "BUDHA"
    | "KONGHUCU"
    | "LAINNYA";
  kelas: {
    jenjang: "SD" | "SMP" | "SMA";
    tingkat: string;
    namaKelas: string;
  };
};

async function prosesLogikaScan(
  db: DBType, // Menggunakan any atau type DB Drizzle Anda
  waliAsuhId: string,
  peserta: PesertaWithKelas,
  sesiId: string | undefined,
  tipeScan: "SESI" | "HAID",
  timeZone: string,
): Promise<ScanResult> {
  // 1. Kalkulasi Waktu & Tanggal Bisnis (Lokal)
  const nowUtc = new Date();
  const localTime = new Date(nowUtc.toLocaleString("en-US", { timeZone }));

  const currentTimeString = format(localTime, "HH:mm:ss");
  let businessDate = localTime;
  if (getHours(localTime) < 3) {
    businessDate = subDays(localTime, 1);
  }
  const tanggalFormat = format(businessDate, "yyyy-MM-dd");

  // ==========================================
  // LOGIKA A: MODE SCAN HAID (BULK INSERT)
  // ==========================================
  if (tipeScan === "HAID") {
    if (peserta.jenisKelamin === "L") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Sistem menolak: Laki-laki tidak bisa dilaporkan Haid.",
      });
    }

    const recentHaidLogs = await db.query.logAbsensi.findMany({
      where: and(
        eq(logAbsensi.pesertaDidikId, peserta.id),
        eq(logAbsensi.statusKehadiran, "HAID"),
      ),
      orderBy: [desc(logAbsensi.tanggal)],
      limit: 50,
    });

    const uniqueDates = Array.from(
      new Set(recentHaidLogs.map((l) => l.tanggal)),
    );
    let hariKe = 1;

    if (uniqueDates.length > 0) {
      const todayParsed = parseISO(tanggalFormat);
      const mostRecentParsed = parseISO(uniqueDates[0] as string);
      const gapToLast = differenceInDays(todayParsed, mostRecentParsed);

      if (gapToLast >= 15) {
        hariKe = 1; // Siklus baru
      } else if (gapToLast >= 0) {
        let startDateParsed = mostRecentParsed;

        for (let i = 0; i < uniqueDates.length - 1; i++) {
          const currentD = parseISO(uniqueDates[i] as string);
          const prevD = parseISO(uniqueDates[i + 1] as string);

          if (differenceInDays(currentD, prevD) < 15) {
            startDateParsed = prevD;
          } else {
            break;
          }
        }

        hariKe = differenceInDays(todayParsed, startDateParsed) + 1;

        if (hariKe > 15) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Gagal: Telah melewati batas maksimal haid (15 hari). Darah dihukumi sebagai Istihadhah, wajib mengikuti kegiatan.",
          });
        }
      }
    }
    const keteranganHaid = `Sedang Haid (Hari ke-${hariKe})`;

    const sesiWajib = await db.query.sesiAbsensi.findMany({
      where: and(
        eq(sesiAbsensi.isActive, true),
        eq(sesiAbsensi.isMandatory, true),
        eq(sesiAbsensi.isHaidExempt, true),
      ),
    });

    const targetSesi = sesiWajib.filter(
      (s) =>
        s.targetJenjang.includes(peserta.kelas.jenjang) &&
        s.targetAgama.includes(peserta.agama),
    );

    if (targetSesi.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Tidak ada jadwal kegiatan yang membebaskan Haid untuk profil anak ini di hari ini.",
      });
    }

    await db.transaction(async (tx) => {
      for (const sesi of targetSesi) {
        await tx
          .insert(logAbsensi)
          .values({
            pesertaDidikId: peserta.id,
            sesiId: sesi.id,
            waliAsuhId: waliAsuhId,
            tanggal: tanggalFormat,
            waktuScan: nowUtc,
            statusKehadiran: "HAID",
            poinDidapat: 0,
            isPoinManual: false,
            keterangan: keteranganHaid,
          })
          .onConflictDoNothing({
            target: [
              logAbsensi.tanggal,
              logAbsensi.sesiId,
              logAbsensi.pesertaDidikId,
            ],
          });
      }
    });

    return {
      id: peserta.id,
      namaLengkap: peserta.namaLengkap,
      kelas: {
        tingkat: peserta.kelas.tingkat,
        namaKelas: peserta.kelas.namaKelas,
        jenjang: peserta.kelas.jenjang,
      },
    } satisfies ScanResult;
  }

  // ==========================================
  // LOGIKA B: MODE SCAN SESI RUTIN (NORMAL)
  // ==========================================
  if (!sesiId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Sesi ID wajib dikirim untuk absensi rutin.",
    });
  }

  const sesi = await db.query.sesiAbsensi.findFirst({
    where: eq(sesiAbsensi.id, sesiId),
  });

  if (!sesi)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Sesi tidak terdaftar.",
    });
  if (!sesi.isActive)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Sesi tidak aktif." });
  if (!sesi.targetJenjang.includes(peserta.kelas.jenjang))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Jenjang tidak sesuai.",
    });
  if (!sesi.targetAgama.includes(peserta.agama))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Agama tidak sesuai.",
    });

  let statusWaktu: "TEPAT_WAKTU" | "TELAT" = "TEPAT_WAKTU";
  let poin = sesi.poinTepatWaktu;

  if (
    sesi.isLateEnabled &&
    sesi.waktuSelesai &&
    currentTimeString > sesi.waktuSelesai
  ) {
    statusWaktu = "TELAT";
    poin = sesi.poinTelat;
  }

  const existing = await db.query.logAbsensi.findFirst({
    where: and(
      eq(logAbsensi.pesertaDidikId, peserta.id),
      eq(logAbsensi.sesiId, sesi.id),
      eq(logAbsensi.tanggal, tanggalFormat),
    ),
  });

  if (existing) {
    if (["SAKIT", "HAID"].includes(existing.statusKehadiran)) {
      await db
        .update(logAbsensi)
        .set({
          waktuScan: nowUtc,
          statusKehadiran: "HADIR",
          statusWaktu: statusWaktu,
          poinDidapat: poin,
          isPoinManual: false,
          keterangan: null,
          waliAsuhId: waliAsuhId,
        })
        .where(eq(logAbsensi.id, existing.id));
    } else {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Peserta didik ${peserta.namaLengkap} sudah tercatat ${existing.statusKehadiran.replace("_", " ")}.`,
      });
    }
  } else {
    await db.insert(logAbsensi).values({
      pesertaDidikId: peserta.id,
      sesiId: sesi.id,
      waliAsuhId: waliAsuhId,
      tanggal: tanggalFormat,
      waktuScan: nowUtc,
      statusKehadiran: "HADIR",
      statusWaktu,
      poinDidapat: poin,
      isPoinManual: false,
    });
  }

  return {
    id: peserta.id,
    namaLengkap: peserta.namaLengkap,
    kelas: {
      tingkat: peserta.kelas.tingkat,
      namaKelas: peserta.kelas.namaKelas,
      jenjang: peserta.kelas.jenjang,
    },
  } satisfies ScanResult;
}

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
          limit: z.number().min(1).max(200).default(20), // Default diubah menjadi 20 per halaman
          page: z.number().min(1).default(1), // Tambahan parameter halaman
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      // Setup Kalkulasi Paginasi
      const limit = input?.limit ?? 20;
      const page = input?.page ?? 1;
      const offset = (page - 1) * limit;

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

      // Kumpulkan semua klausa WHERE menjadi satu variabel (DRY)
      const whereClause = and(
        ...conditions,
        input?.jenjang ? eq(kelas.jenjang, input.jenjang) : undefined,
        input?.tingkat ? eq(kelas.tingkat, input.tingkat) : undefined,
        input?.kelasId ? eq(kelas.id, input.kelasId) : undefined,
        input?.namaSiswa
          ? like(pesertaDidik.namaLengkap, `%${input.namaSiswa}%`)
          : undefined,
      );

      // 1. Query Menghitung Total Keseluruhan Data
      const [totalCountResult] = await ctx.db
        .select({ total: sql<number>`count(${logAbsensi.id})`.mapWith(Number) })
        .from(logAbsensi)
        .innerJoin(pesertaDidik, eq(logAbsensi.pesertaDidikId, pesertaDidik.id))
        .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
        // Tidak perlu me-join tabel sesi dan pelanggaran untuk menghitung total,
        // karena filternya mengacu pada logAbsensi secara langsung
        .where(whereClause);

      const totalRecords = totalCountResult?.total ?? 0;

      // 2. Query Utama (Mengambil Potongan Data sesuai Paginasi)
      const rows = await ctx.db
        .select({
          id: logAbsensi.id,
          tanggal: logAbsensi.tanggal,
          waktuScan: logAbsensi.waktuScan,
          statusKehadiran: logAbsensi.statusKehadiran,
          statusWaktu: logAbsensi.statusWaktu,
          poinDidapat: logAbsensi.poinDidapat,
          isPoinManual: logAbsensi.isPoinManual,
          keterangan: logAbsensi.keterangan,

          pesertaId: pesertaDidik.id,
          pesertaNama: pesertaDidik.namaLengkap,

          kelasId: kelas.id,
          kelasJenjang: kelas.jenjang,
          kelasTingkat: kelas.tingkat,
          kelasNama: kelas.namaKelas,

          sesiId: sesiAbsensi.id,
          sesiNama: sesiAbsensi.namaSesi,

          kategoriId: kategoriAbsensi.id,
          kategoriNama: kategoriAbsensi.namaKategori,

          pelanggaranId: masterPelanggaran.id,
          pelanggaranNama: masterPelanggaran.namaPelanggaran,
          pelanggaranTingkat: masterPelanggaran.tingkat,

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
        .where(whereClause)
        .orderBy(desc(logAbsensi.waktuScan))
        .limit(limit)
        .offset(offset);

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

      // 3. Return Object yang Memuat Data dan Meta-Paginasi
      return {
        data: results,
        meta: {
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          currentPage: page,
        },
      };
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
          .enum([
            "HADIR",
            "TIDAK_HADIR",
            "IZIN",
            "HAID",
            "SAKIT",
            "ALFA",
            "LAINNYA",
          ])
          .default("HADIR"),
        keterangan: z.string().optional(),
        tanggal: z.string(),
        poinOverride: z.number().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Pastikan peserta didik ada (kita butuh data agama dan jenjangnya)
      const peserta = await ctx.db.query.pesertaDidik.findFirst({
        where: eq(pesertaDidik.id, input.pesertaDidikId),
        with: { kelas: true },
      });

      if (!peserta) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Data peserta didik tidak ditemukan.",
        });
      }

      const now = new Date();

      // ==========================================
      // LOGIKA A: BULK INSERT (Sakit / Haid Seharian)
      // ==========================================
      if (
        input.tipeLog === "SESI" &&
        ["SAKIT", "HAID"].includes(input.statusKehadiran)
      ) {
        if (input.statusKehadiran === "HAID" && peserta.jenisKelamin === "L")
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Laki-laki tidak bisa haid. Mungkin anda salah peserta didik.",
          });

        // 1. PENENTUAN KETERANGAN OTOMATIS OLEH SISTEM
        let finalKeterangan = input.keterangan || "";

        if (input.statusKehadiran === "SAKIT") {
          const baseDesc = "Sakit";
          finalKeterangan = input.keterangan
            ? `${baseDesc} - ${input.keterangan}`
            : baseDesc;
        } else if (input.statusKehadiran === "HAID") {
          // Cari riwayat haid sebelum atau sama dengan tanggal input
          const recentHaidLogs = await ctx.db.query.logAbsensi.findMany({
            where: and(
              eq(logAbsensi.pesertaDidikId, peserta.id),
              eq(logAbsensi.statusKehadiran, "HAID"),
              lte(logAbsensi.tanggal, input.tanggal),
            ),
            orderBy: [desc(logAbsensi.tanggal)],
            limit: 50,
          });

          const uniqueDates = Array.from(
            new Set(recentHaidLogs.map((l) => l.tanggal)),
          );
          let hariKe = 1;

          if (uniqueDates.length > 0) {
            const inputDateParsed = parseISO(input.tanggal);
            const mostRecentParsed = parseISO(uniqueDates[0] as string);
            const gapToLast = differenceInDays(
              inputDateParsed,
              mostRecentParsed,
            );

            if (gapToLast >= 15) {
              hariKe = 1; // Siklus baru
            } else if (gapToLast >= 0) {
              let startDateParsed = mostRecentParsed;
              for (let i = 0; i < uniqueDates.length - 1; i++) {
                const currentD = parseISO(uniqueDates[i] as string);
                const prevD = parseISO(uniqueDates[i + 1] as string);

                if (differenceInDays(currentD, prevD) < 15) {
                  startDateParsed = prevD;
                } else {
                  break;
                }
              }

              hariKe = differenceInDays(inputDateParsed, startDateParsed) + 1;

              if (hariKe > 15) {
                throw new TRPCError({
                  code: "FORBIDDEN",
                  message:
                    "Gagal: Telah melewati batas maksimal haid (15 hari). Darah dihukumi sebagai Istihadhah.",
                });
              }
            }
          }

          const baseDesc = `Sedang Haid (Hari ke-${hariKe})`;
          finalKeterangan = input.keterangan
            ? `${baseDesc} - ${input.keterangan}`
            : baseDesc;
        }

        // 2. Cari semua sesi wajib yang cocok dengan profil anak
        const sesiWajib = await ctx.db.query.sesiAbsensi.findMany({
          where: and(
            eq(sesiAbsensi.isActive, true),
            eq(sesiAbsensi.isMandatory, true),
          ),
        });

        let targetSesi = sesiWajib
          .filter((s) => s.targetJenjang.includes(peserta.kelas.jenjang))
          .filter((s) => s.targetAgama.includes(peserta.agama));

        if (input.statusKehadiran === "HAID") {
          targetSesi = targetSesi.filter((s) => s.isHaidExempt);
        }

        if (targetSesi.length === 0)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Tidak ada jadwal sesi wajib untuk anak ini.",
          });

        // 3. Insert semua sesi kegiatan yang valid
        await ctx.db.transaction(async (tx) => {
          for (const sesi of targetSesi) {
            await tx
              .insert(logAbsensi)
              .values({
                pesertaDidikId: peserta.id,
                sesiId: sesi.id,
                waliAsuhId: ctx.session.user.id,
                tanggal: input.tanggal,
                waktuScan: now,
                statusKehadiran: input.statusKehadiran,
                statusWaktu: null,
                poinDidapat: 0,
                isPoinManual: true, // Tercatat True karena dieksekusi dari form manual
                keterangan: finalKeterangan, // <--- Menggunakan keterangan yang di-generate sistem
              })
              .onConflictDoNothing({
                target: [
                  logAbsensi.tanggal,
                  logAbsensi.sesiId,
                  logAbsensi.pesertaDidikId,
                ],
              });
          }
        });

        return;
      }

      // ==========================================
      // LOGIKA B: SINGLE INSERT (Hadir, Izin, Telat, Pelanggaran)
      // (Ini adalah kode original Anda)
      // ==========================================
      let poinDidapat = 0;
      let isPoinManual = false;
      let statusWaktu: "TEPAT_WAKTU" | "TELAT" | null = null;

      if (input.tipeLog === "SESI") {
        if (!input.sesiId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Sesi jadwal wajib dipilih!",
          });

        const sesi = await ctx.db.query.sesiAbsensi.findFirst({
          where: eq(sesiAbsensi.id, input.sesiId),
        });
        if (!sesi)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Sesi tidak ditemukan di database.",
          });

        if (input.statusKehadiran === "HADIR") {
          poinDidapat = sesi.poinTepatWaktu;
          statusWaktu = "TEPAT_WAKTU";
        } else {
          poinDidapat = 0;
        }
      } else if (input.tipeLog === "PELANGGARAN") {
        if (!input.pelanggaranId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Jenis pelanggaran wajib dipilih!",
          });

        const pelanggaran = await ctx.db.query.masterPelanggaran.findFirst({
          where: eq(masterPelanggaran.id, input.pelanggaranId),
        });
        if (!pelanggaran)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Master pelanggaran tidak ditemukan.",
          });

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
          .enum([
            "HADIR",
            "TIDAK_HADIR",
            "IZIN",
            "HAID",
            "SAKIT",
            "ALFA",
            "LAINNYA",
          ])
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
      if (!log)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Log tidak ditemukan.",
        });

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
        sesiId: z.string().optional(),
        tipeScan: z.enum(["SESI", "HAID"]).default("SESI"),
        timeZone: z.string().default("Asia/Jakarta"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const peserta = await ctx.db.query.pesertaDidik.findFirst({
        where: eq(pesertaDidik.nipd, input.nipd),
        with: { kelas: true },
      });

      if (!peserta) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `NIPD ${input.nipd} tidak terdaftar di sistem.`,
        });
      }

      return await prosesLogikaScan(
        ctx.db,
        ctx.session.user.id,
        peserta,
        input.sesiId,
        input.tipeScan,
        input.timeZone,
      );
    }),

  // --------------------------------------------------------
  // 6. SCAN RFID
  // --------------------------------------------------------
  scanRfid: protectedProcedure
    .input(
      z.object({
        uidKartu: z.string().length(8),
        sesiId: z.string().optional(),
        tipeScan: z.enum(["SESI", "HAID"]).default("SESI"),
        timeZone: z.string().default("Asia/Jakarta"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const peserta = await ctx.db.query.pesertaDidik.findFirst({
        where: eq(pesertaDidik.uidKartu, input.uidKartu.toUpperCase()),
        with: { kelas: true },
      });

      if (!peserta) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Kartu tidak dikenali / belum terdaftar.",
        });
      }

      return await prosesLogikaScan(
        ctx.db,
        ctx.session.user.id,
        peserta,
        input.sesiId,
        input.tipeScan,
        input.timeZone,
      );
    }),
});
