import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  publicProcedure,
  parentProcedure,
} from "~/server/api/trpc";
import { pesertaDidik, logAbsensi } from "~/server/db/schema";

export const pantauanRouter = createTRPCRouter({
  // =====================================================================
  // 1. ENDPOINT LOGIN (Hanya dipanggil saat submit formulir login)
  // =====================================================================
  checkAnak: publicProcedure
    .input(
      z.object({
        nipd: z.string().min(1, "NIPD wajib diisi"),
        tanggalLahir: z.string().min(1, "Tanggal lahir wajib diisi"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Kita melakukan kueri yang mirip dengan middleware karena endpoint
      // ini dipakai khusus untuk merespons form login dan mengembalikan data awal
      const anak = await ctx.db.query.pesertaDidik.findFirst({
        where: and(
          eq(pesertaDidik.nipd, input.nipd),
          eq(pesertaDidik.tanggalLahir, input.tanggalLahir),
        ),
        columns: {
          id: true,
          nipd: true,
          namaLengkap: true,
          tanggalLahir: true,
        },
        with: {
          kelas: {
            columns: { namaKelas: true, jenjang: true },
          },
        },
      });

      if (!anak) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "NIPD atau Tanggal Lahir tidak sesuai.",
        });
      }

      return anak;
    }),

  // =====================================================================
  // 2. ENDPOINT DASHBOARD (Otomatis dilindungi oleh Headers)
  // =====================================================================

  // Mengambil profil anak (menggunakan data dari context tanpa hit DB lagi)
  getProfil: parentProcedure.query(({ ctx }) => {
    // Data ini sudah disiapkan oleh middleware parentProcedure!
    return ctx.parentAuth.student;
  }),

  // Mengambil riwayat absensi
  getRiwayatAbsensi: parentProcedure
    .input(
      z.object({
        limit: z.number().default(7),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Ambil ID anak langsung dari context hasil injeksi middleware
      const studentId = ctx.parentAuth.student.id;

      const absensi = await ctx.db.query.logAbsensi.findMany({
        where: eq(logAbsensi.pesertaDidikId, studentId),
        orderBy: [desc(logAbsensi.tanggal), desc(logAbsensi.waktuScan)],
        limit: input.limit,
        with: {
          sesi: {
            columns: { namaSesi: true, waktuMulai: true, waktuSelesai: true },
          },
          pelanggaran: {
            columns: { namaPelanggaran: true, poinMinus: true },
          },
        },
      });

      return absensi;
    }),
});
