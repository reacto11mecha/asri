// src/server/api/routers/insight.ts
import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "~/server/api/trpc";
import { and, eq, inArray, isNotNull, desc, sql } from "drizzle-orm";
import {
  logAbsensi,
  pesertaDidik,
  sesiAbsensi,
  masterPelanggaran,
  kelas,
  kategoriAbsensi,
} from "~/server/db/schema";

// 1. SCHEMA FILTER STANDAR
const insightFilterSchema = z.object({
  tanggal: z.string(), // Format YYYY-MM-DD
  jenjang: z.enum(["SD", "SMP", "SMA"]),
  tingkat: z.string().optional().nullable(),
  kelasId: z.string().optional().nullable(),
});

export const insightRouter = createTRPCRouter({
  // --------------------------------------------------------
  // A. HELPER UI: GET KELAS OPTIONS
  // --------------------------------------------------------
  getFilterOptions: staffProcedure
    .input(z.object({ jenjang: z.enum(["SD", "SMP", "SMA"]) }))
    .query(async ({ ctx, input }) => {
      const kelasData = await ctx.db.query.kelas.findMany({
        where: eq(kelas.jenjang, input.jenjang),
        orderBy: (k, { asc }) => [asc(k.tingkat), asc(k.namaKelas)],
      });

      // Ambil nilai tingkat yang unik (Contoh: ["7", "8", "9"])
      const tingkatList = Array.from(new Set(kelasData.map((k) => k.tingkat)));

      return { tingkatList, kelasData };
    }),

  // --------------------------------------------------------
  // B. RADAR STATISTIK (Hadir, Telat, Alfa, Sakit/Izin, Lainnya)
  // --------------------------------------------------------
  getStatistikHarian: staffProcedure
    .input(insightFilterSchema)
    .query(async ({ ctx, input }) => {
      // 1. Ambil peserta aktif sesuai filter
      const pesertaList = await ctx.db
        .select({
          id: pesertaDidik.id,
          agama: pesertaDidik.agama,
        })
        .from(pesertaDidik)
        .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
        .where(
          and(
            eq(pesertaDidik.status, "AKTIF"),
            eq(kelas.jenjang, input.jenjang),
            input.tingkat ? eq(kelas.tingkat, input.tingkat) : undefined,
            input.kelasId ? eq(kelas.id, input.kelasId) : undefined,
          ),
        );

      // 2. Ambil sesi yang relevan (hanya wajib)
      const sesiList = await ctx.db
        .select({
          id: sesiAbsensi.id,
          targetJenjang: sesiAbsensi.targetJenjang,
          targetAgama: sesiAbsensi.targetAgama,
        })
        .from(sesiAbsensi)
        .where(
          and(
            eq(sesiAbsensi.isActive, true),
            eq(sesiAbsensi.isMandatory, true),
            sql`${sesiAbsensi.targetJenjang} && ARRAY[${input.jenjang}]::jenjang[]`,
          ),
        );

      // 3. Hitung total slot (peserta * sesi yang agamanya cocok)
      let totalSlot = 0;
      const pasanganValid: { pesertaId: string; sesiId: string }[] = [];
      for (const sesi of sesiList) {
        for (const p of pesertaList) {
          if (sesi.targetAgama.includes(p.agama)) {
            totalSlot++;
            pasanganValid.push({ pesertaId: p.id, sesiId: sesi.id });
          }
        }
      }

      // 4. Ambil log yang terkait dengan pasangan di atas (hanya yang ada log-nya)
      const logs = await ctx.db
        .select({
          pesertaDidikId: logAbsensi.pesertaDidikId,
          sesiId: logAbsensi.sesiId,
          statusKehadiran: logAbsensi.statusKehadiran,
          statusWaktu: logAbsensi.statusWaktu,
        })
        .from(logAbsensi)
        .where(
          and(
            eq(logAbsensi.tanggal, input.tanggal),
            inArray(
              logAbsensi.pesertaDidikId,
              pesertaList.map((p) => p.id),
            ),
            inArray(
              logAbsensi.sesiId,
              sesiList.map((s) => s.id),
            ),
          ),
        );

      // 5. Aggregate dari log
      let tepatWaktu = 0,
        telat = 0,
        sakitIzinLainnya = 0;
      for (const log of logs) {
        if (
          log.statusKehadiran === "HADIR" &&
          log.statusWaktu === "TEPAT_WAKTU"
        ) {
          tepatWaktu++;
        } else if (
          log.statusKehadiran === "HADIR" &&
          log.statusWaktu === "TELAT"
        ) {
          telat++;
        } else if (["SAKIT", "IZIN", "LAINNYA"].includes(log.statusKehadiran)) {
          sakitIzinLainnya++;
        }
        // Status ALFA/TIDAK_HADIR yang eksplisit juga akan diabaikan di sini,
        // karena nanti akan masuk ke perhitungan alfa sebagai sisa.
      }

      // 6. Hitung alfa dari selisih
      const alfa = totalSlot - (tepatWaktu + telat + sakitIzinLainnya);

      return {
        tepatWaktu,
        telat,
        sakitIzinLainnya,
        alfa,
        totalAktivitas: totalSlot,
      };
    }),

  // --------------------------------------------------------
  // C. SOROTAN KEDISIPLINAN: SESI BERMASALAH (Accordion)
  // --------------------------------------------------------
  getEvaluasiSesi: staffProcedure
    .input(insightFilterSchema)
    .query(async ({ ctx, input }) => {
      // Ambil semua peserta didik aktif sesuai filter
      const pesertaList = await ctx.db
        .select({
          id: pesertaDidik.id,
          namaLengkap: pesertaDidik.namaLengkap,
          agama: pesertaDidik.agama,
          kelas: {
            tingkat: kelas.tingkat,
            namaKelas: kelas.namaKelas,
            jenjang: kelas.jenjang,
          },
        })
        .from(pesertaDidik)
        .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
        .where(
          and(
            eq(pesertaDidik.status, "AKTIF"),
            eq(kelas.jenjang, input.jenjang),
            input.tingkat ? eq(kelas.tingkat, input.tingkat) : undefined,
            input.kelasId ? eq(kelas.id, input.kelasId) : undefined,
          ),
        );

      // Ambil semua sesi wajib yang relevan (targetJenjang overlap dengan input.jenjang)
      const sesiList = await ctx.db
        .select({
          id: sesiAbsensi.id,
          namaSesi: sesiAbsensi.namaSesi,
          waktuMulai: sesiAbsensi.waktuMulai,
          kategori: {
            namaKategori: kategoriAbsensi.namaKategori,
          },
          targetJenjang: sesiAbsensi.targetJenjang,
          targetAgama: sesiAbsensi.targetAgama,
          poinAlfa: sesiAbsensi.poinAlfa, // ← ambil poin alfa
        })
        .from(sesiAbsensi)
        .innerJoin(
          kategoriAbsensi,
          eq(sesiAbsensi.kategoriId, kategoriAbsensi.id),
        )
        .where(
          and(
            eq(sesiAbsensi.isActive, true),
            eq(sesiAbsensi.isMandatory, true), // ← hanya sesi wajib
            sql`${sesiAbsensi.targetJenjang} && ARRAY[${input.jenjang}]::jenjang[]`,
          ),
        );

      // Untuk setiap sesi, kita perlu mencocokkan dengan peserta yang memenuhi target
      const grouped = sesiList.map((sesi) => {
        const pesertaSesi = pesertaList.filter((p) =>
          sesi.targetAgama.includes(p.agama),
        );
        return { sesi, pesertaSesi };
      });

      // Ambil logAbsensi untuk semua peserta-sesi pada tanggal tsb
      const allLogs = await ctx.db
        .select({
          sesiId: logAbsensi.sesiId,
          pesertaDidikId: logAbsensi.pesertaDidikId,
          statusKehadiran: logAbsensi.statusKehadiran,
          statusWaktu: logAbsensi.statusWaktu,
          poinDidapat: logAbsensi.poinDidapat,
          keterangan: logAbsensi.keterangan,
          id: logAbsensi.id,
        })
        .from(logAbsensi)
        .where(
          and(
            eq(logAbsensi.tanggal, input.tanggal),
            inArray(
              logAbsensi.sesiId,
              sesiList.map((s) => s.id),
            ),
            inArray(
              logAbsensi.pesertaDidikId,
              pesertaList.map((p) => p.id),
            ),
          ),
        );

      // Struktur hasil: per sesi, siswa bermasalah
      const hasilAkhir = grouped
        .map(({ sesi, pesertaSesi }) => {
          const siswaBermasalah: any[] = [];

          for (const peserta of pesertaSesi) {
            const log = allLogs.find(
              (l) => l.sesiId === sesi.id && l.pesertaDidikId === peserta.id,
            );

            let statusKehadiran = log?.statusKehadiran ?? "ALFA";
            const statusWaktu = log?.statusWaktu;
            let poin: number;
            let isMasalah = false;

            if (!log) {
              // Tidak ada log → alfa dengan poinAlfa sesi
              isMasalah = true;
              statusKehadiran = "ALFA";
              poin = sesi.poinAlfa;
            } else {
              // Gunakan poin dari log (sudah sesuai, termasuk poinAlfa jika statusnya ALFA/TIDAK_HADIR)
              poin = log.poinDidapat;
              if (
                log.statusKehadiran !== "HADIR" ||
                log.statusWaktu === "TELAT"
              ) {
                isMasalah = true;
              }
            }

            if (isMasalah) {
              siswaBermasalah.push({
                logId: log?.id ?? `missing-${peserta.id}-${sesi.id}`,
                peserta: {
                  id: peserta.id,
                  namaLengkap: peserta.namaLengkap,
                },
                kelas: peserta.kelas,
                statusKehadiran,
                statusWaktu,
                poinDidapat: poin,
                keterangan: log?.keterangan ?? "Tidak melakukan absensi",
              });
            }
          }

          return {
            sesiDetail: {
              id: sesi.id,
              namaSesi: sesi.namaSesi,
              waktuMulai: sesi.waktuMulai,
            },
            kategoriDetail: sesi.kategori,
            siswaBermasalah,
          };
        })
        .filter((grup) => grup.siswaBermasalah.length > 0);

      return hasilAkhir;
    }),

  // --------------------------------------------------------
  // D. SOROTAN KEDISIPLINAN: PELANGGARAN MANUAL
  // --------------------------------------------------------
  getDaftarPelanggaran: staffProcedure
    .input(insightFilterSchema)
    .query(async ({ ctx, input }) => {
      const pelanggaranHariIni = await ctx.db
        .select({
          logId: logAbsensi.id,
          waktuScan: logAbsensi.waktuScan,
          poinDidapat: logAbsensi.poinDidapat,
          keterangan: logAbsensi.keterangan,
          peserta: {
            namaLengkap: pesertaDidik.namaLengkap,
          },
          kelas: {
            tingkat: kelas.tingkat,
            namaKelas: kelas.namaKelas,
          },
          pelanggaran: {
            namaPelanggaran: masterPelanggaran.namaPelanggaran,
            tingkat: masterPelanggaran.tingkat,
          },
        })
        .from(logAbsensi)
        .innerJoin(pesertaDidik, eq(logAbsensi.pesertaDidikId, pesertaDidik.id))
        .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
        .innerJoin(
          masterPelanggaran,
          eq(logAbsensi.pelanggaranId, masterPelanggaran.id),
        )
        .where(
          and(
            eq(logAbsensi.tanggal, input.tanggal),
            eq(kelas.jenjang, input.jenjang),
            input.tingkat ? eq(kelas.tingkat, input.tingkat) : undefined,
            input.kelasId ? eq(kelas.id, input.kelasId) : undefined,
            isNotNull(logAbsensi.pelanggaranId),
          ),
        )
        .orderBy(desc(logAbsensi.waktuScan));

      return pelanggaranHariIni;
    }),

  // --------------------------------------------------------
  // E. WALL OF FAME (Top Poin Positif)
  // --------------------------------------------------------
  getWallOfFame: staffProcedure
    .input(
      insightFilterSchema.extend({
        limit: z.number().default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const topStudents = await ctx.db
        .select({
          pesertaId: pesertaDidik.id,
          namaLengkap: pesertaDidik.namaLengkap,
          kelasTingkat: kelas.tingkat,
          kelasNama: kelas.namaKelas,
          totalPoin: sql<number>`sum(${logAbsensi.poinDidapat})`.mapWith(
            Number,
          ),
        })
        .from(logAbsensi)
        .innerJoin(pesertaDidik, eq(logAbsensi.pesertaDidikId, pesertaDidik.id))
        .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
        .where(
          and(
            eq(logAbsensi.tanggal, input.tanggal),
            eq(kelas.jenjang, input.jenjang),
            input.tingkat ? eq(kelas.tingkat, input.tingkat) : undefined,
            input.kelasId ? eq(kelas.id, input.kelasId) : undefined,
          ),
        )
        .groupBy(pesertaDidik.id, kelas.id)
        .orderBy(desc(sql`sum(${logAbsensi.poinDidapat})`))
        .limit(input.limit);

      return topStudents;
    }),
});
