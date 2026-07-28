// src/server/api/routers/bimbingan.ts
import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "~/server/api/trpc";
import {
  monitoringPerkembangan,
  penangananKasus,
  pesertaDidik,
  kelas,
  user,
} from "~/server/db/schema";
import {
  eq,
  desc,
  asc,
  and,
  ilike,
  gte,
  lte,
  count,
  inArray,
  sql,
} from "drizzle-orm";

export const bimbinganRouter = createTRPCRouter({
  // ==========================================
  // MONITORING PERKEMBANGAN
  // ==========================================
  getOverviewMonitoring: staffProcedure
    .input(
      z.object({
        jenjang: z.enum(["SD", "SMP", "SMA"]).optional(),
        tingkat: z.string().optional(),
        kelasId: z.string().optional(),
        search: z.string().optional(),
        statusEvaluasi: z
          .enum(["semua", "sudah", "belum"])
          .optional()
          .default("semua"),
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(5).max(100).optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(pesertaDidik.status, "AKTIF")];

      if (input.kelasId) {
        conditions.push(eq(pesertaDidik.kelasId, input.kelasId));
      }
      if (input.jenjang) {
        conditions.push(eq(kelas.jenjang, input.jenjang));
      }
      if (input.tingkat) {
        conditions.push(eq(kelas.tingkat, input.tingkat));
      }

      if (input.search) {
        conditions.push(ilike(pesertaDidik.namaLengkap, `%${input.search}%`));
      }

      const daftarSiswa = await ctx.db
        .select({
          id: pesertaDidik.id,
          namaLengkap: pesertaDidik.namaLengkap,
          kelas: {
            tingkat: kelas.tingkat,
            namaKelas: kelas.namaKelas,
            jenjang: kelas.jenjang,
          },
        })
        .from(pesertaDidik)
        .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
        .where(and(...conditions))
        .orderBy(
          asc(kelas.jenjang),
          asc(kelas.tingkat),
          asc(kelas.namaKelas),
          asc(pesertaDidik.namaLengkap),
        );

      // Ambil rapor terakhir untuk setiap siswa
      const siswaIds = daftarSiswa.map((s) => s.id);
      const raporTerakhir = await ctx.db
        .selectDistinctOn([monitoringPerkembangan.pesertaDidikId], {
          pesertaDidikId: monitoringPerkembangan.pesertaDidikId,
          totalSkorAdl: monitoringPerkembangan.totalSkorAdl,
          totalSkorSosial: monitoringPerkembangan.totalSkorSosial,
          totalSkorMental: monitoringPerkembangan.totalSkorMental,
          totalSkorVokasional: monitoringPerkembangan.totalSkorVokasional,
          totalSkorKeseluruhan: monitoringPerkembangan.totalSkorKeseluruhan,
          periodeBulan: monitoringPerkembangan.periodeBulan,
          periodeTahun: monitoringPerkembangan.periodeTahun,
          createdAt: monitoringPerkembangan.createdAt,
        })
        .from(monitoringPerkembangan)
        .where(inArray(monitoringPerkembangan.pesertaDidikId, siswaIds))
        .orderBy(
          monitoringPerkembangan.pesertaDidikId,
          desc(monitoringPerkembangan.createdAt),
        );

      const raporMap = new Map(raporTerakhir.map((r) => [r.pesertaDidikId, r]));

      const currentMonth = (new Date().getMonth() + 1)
        .toString()
        .padStart(2, "0");
      const currentYear = new Date().getFullYear().toString();

      const insightKritis: Array<{
        pesertaDidikId: string;
        nama: string;
        peringatan: string[];
      }> = [];

      // 1. Definisikan tipe data secara ketat (Strict Type)
      type TabelDataRow = {
        id: string;
        namaLengkap: string;
        kelas: string;
        statusEvaluasi: string;
        skorTerakhir: number | null;
        periodeTerakhir: string;
      };

      // 2. Gunakan tipe tersebut pada parameter generik reduce
      const allData = daftarSiswa.reduce<TabelDataRow[]>((acc, siswa) => {
        const rapor = raporMap.get(siswa.id);
        let statusEvaluasi = "Belum Dievaluasi";

        if (
          rapor &&
          rapor.periodeBulan === currentMonth &&
          rapor.periodeTahun === currentYear
        ) {
          statusEvaluasi = "Sudah Dievaluasi";
        }

        // Terapkan filter status
        if (
          input.statusEvaluasi === "sudah" &&
          statusEvaluasi !== "Sudah Dievaluasi"
        )
          return acc;
        if (
          input.statusEvaluasi === "belum" &&
          statusEvaluasi !== "Belum Dievaluasi"
        )
          return acc;

        if (rapor) {
          const peringatan: string[] = [];
          if (rapor.totalSkorAdl <= 18)
            peringatan.push(`ADL (${rapor.totalSkorAdl})`);
          if (rapor.totalSkorSosial <= 24)
            peringatan.push(`Sosial (${rapor.totalSkorSosial})`);
          if (rapor.totalSkorMental <= 36)
            peringatan.push(`Mental (${rapor.totalSkorMental})`);
          if (rapor.totalSkorVokasional <= 28)
            peringatan.push(`Vokasional (${rapor.totalSkorVokasional})`);

          if (peringatan.length > 0) {
            insightKritis.push({
              pesertaDidikId: siswa.id,
              nama: siswa.namaLengkap,
              peringatan,
            });
          }
        }

        acc.push({
          id: siswa.id,
          namaLengkap: siswa.namaLengkap,
          kelas: `${siswa.kelas.tingkat} ${siswa.kelas.namaKelas} (${siswa.kelas.jenjang})`,
          statusEvaluasi,
          skorTerakhir: rapor?.totalSkorKeseluruhan ?? null,
          periodeTerakhir: rapor
            ? `${rapor.periodeBulan}/${rapor.periodeTahun}`
            : "-",
        });

        return acc;
      }, []);

      // 3. Hitung pagination
      const totalCount = allData.length;
      const totalPages = Math.ceil(totalCount / input.limit);
      const offset = (input.page - 1) * input.limit;
      const tabelData = allData.slice(offset, offset + input.limit);

      return { tabelData, insightKritis, totalCount, totalPages };
    }),

  // ==========================================
  // DAFTAR KASUS (dengan filter & pagination)
  // ==========================================
  getDaftarKasus: staffProcedure
    .input(
      z.object({
        status: z
          .enum(["aktif", "selesai", "semua"])
          .optional()
          .default("semua"),
        search: z.string().optional(),
        tanggalMulai: z.string().optional(),
        tanggalSelesai: z.string().optional(),
        waliAsuhId: z.string().optional(),
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(5).max(100).optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.status === "aktif") {
        conditions.push(sql`${penangananKasus.tanggalTutup} IS NULL`);
      } else if (input.status === "selesai") {
        conditions.push(sql`${penangananKasus.tanggalTutup} IS NOT NULL`);
      }

      if (input.search) {
        conditions.push(ilike(pesertaDidik.namaLengkap, `%${input.search}%`));
      }

      if (input.tanggalMulai) {
        conditions.push(gte(penangananKasus.tanggalBuka, input.tanggalMulai));
      }
      if (input.tanggalSelesai) {
        conditions.push(lte(penangananKasus.tanggalBuka, input.tanggalSelesai));
      }

      if (input.waliAsuhId) {
        conditions.push(eq(pesertaDidik.waliAsuhId, input.waliAsuhId));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const baseQuery = ctx.db
        .select({ count: count() })
        .from(penangananKasus)
        .innerJoin(
          pesertaDidik,
          eq(penangananKasus.pesertaDidikId, pesertaDidik.id),
        )
        .where(where);

      const [totalResult] = await baseQuery;
      const totalCount = totalResult?.count ?? 0;
      const totalPages = Math.ceil(totalCount / input.limit);
      const offset = (input.page - 1) * input.limit;

      const kasusList = await ctx.db
        .select({
          id: penangananKasus.id,
          tanggalBuka: penangananKasus.tanggalBuka,
          tanggalTutup: penangananKasus.tanggalTutup,
          masalahUtama: penangananKasus.masalahUtama,
          pesertaDidikId: pesertaDidik.id,
          namaPeserta: pesertaDidik.namaLengkap,
          tingkatKelas: kelas.tingkat,
          namaKelas: kelas.namaKelas,
          namaWaliAsuh: user.name,
        })
        .from(penangananKasus)
        .innerJoin(
          pesertaDidik,
          eq(penangananKasus.pesertaDidikId, pesertaDidik.id),
        )
        .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
        .leftJoin(user, eq(pesertaDidik.waliAsuhId, user.id))
        .where(where)
        .orderBy(desc(penangananKasus.tanggalBuka))
        .limit(input.limit)
        .offset(offset);

      return {
        data: kasusList,
        totalCount,
        totalPages,
        page: input.page,
        limit: input.limit,
      };
    }),

  // ==========================================
  // CRUD & DETAIL (sama seperti sebelumnya, hanya ubah prosedur)
  // ==========================================
  getDetailRiwayat: staffProcedure
    .input(z.object({ pesertaDidikId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.monitoringPerkembangan.findMany({
        where: eq(monitoringPerkembangan.pesertaDidikId, input.pesertaDidikId),
        orderBy: [asc(monitoringPerkembangan.monevKe)],
        with: {
          author: {
            columns: {
              name: true,
              image: true,
            },
          },
        },
      });
    }),

  createPerkembangan: staffProcedure
    .input(
      z.object({
        pesertaDidikId: z.string(),
        monevKe: z.number().min(1),
        periodeBulan: z.string().length(2),
        periodeTahun: z.string().length(4),
        skorAdl: z.record(z.string(), z.number()).optional(),
        skorSosial: z.record(z.string(), z.number()).optional(),
        skorMental: z.record(z.string(), z.number()).optional(),
        skorVokasional: z.record(z.string(), z.number()).optional(),
        masalahKasus: z.string().optional(),
        penyebabKasus: z.string().optional(),
        akibatKasus: z.string().optional(),
        langkahKasus: z.string().optional(),
        rencanaTindakLanjut: z.string().optional(),
        kegiatanPositif: z.string().optional(),
        pelanggaranSanksi: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const authorId = ctx.session.user.id;
      const sumRecord = (rec?: Record<string, number>) =>
        rec ? Object.values(rec).reduce((a, b) => a + b, 0) : 0;

      const totalSkorAdl = sumRecord(input.skorAdl);
      const totalSkorSosial = sumRecord(input.skorSosial);
      const totalSkorMental = sumRecord(input.skorMental);
      const totalSkorVokasional = sumRecord(input.skorVokasional);
      const totalSkorKeseluruhan =
        totalSkorAdl + totalSkorSosial + totalSkorMental + totalSkorVokasional;

      const [newRapor] = await ctx.db
        .insert(monitoringPerkembangan)
        .values({
          ...input,
          authorId,
          totalSkorAdl,
          totalSkorSosial,
          totalSkorMental,
          totalSkorVokasional,
          totalSkorKeseluruhan,
        })
        .returning();

      return newRapor;
    }),

  updatePerkembangan: staffProcedure
    .input(
      z.object({
        id: z.string(),
        monevKe: z.number().min(1),
        periodeBulan: z.string().length(2),
        periodeTahun: z.string().length(4),
        skorAdl: z.record(z.string(), z.number()).optional(),
        skorSosial: z.record(z.string(), z.number()).optional(),
        skorMental: z.record(z.string(), z.number()).optional(),
        skorVokasional: z.record(z.string(), z.number()).optional(),
        masalahKasus: z.string().optional(),
        penyebabKasus: z.string().optional(),
        akibatKasus: z.string().optional(),
        langkahKasus: z.string().optional(),
        rencanaTindakLanjut: z.string().optional(),
        kegiatanPositif: z.string().optional(),
        pelanggaranSanksi: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const existingData = await ctx.db.query.monitoringPerkembangan.findFirst({
        where: eq(monitoringPerkembangan.id, id),
      });
      if (!existingData) throw new Error("Rapor tidak ditemukan");

      const mergedAdl =
        updateData.skorAdl ??
        (existingData.skorAdl as Record<string, number> | undefined);
      const mergedSosial =
        updateData.skorSosial ??
        (existingData.skorSosial as Record<string, number> | undefined);
      const mergedMental =
        updateData.skorMental ??
        (existingData.skorMental as Record<string, number> | undefined);
      const mergedVokasional =
        updateData.skorVokasional ??
        (existingData.skorVokasional as Record<string, number> | undefined);

      const sumRecord = (rec?: Record<string, number>) =>
        rec ? Object.values(rec).reduce((a, b) => a + b, 0) : 0;

      const totalSkorAdl = sumRecord(mergedAdl);
      const totalSkorSosial = sumRecord(mergedSosial);
      const totalSkorMental = sumRecord(mergedMental);
      const totalSkorVokasional = sumRecord(mergedVokasional);
      const totalSkorKeseluruhan =
        totalSkorAdl + totalSkorSosial + totalSkorMental + totalSkorVokasional;

      const [updated] = await ctx.db
        .update(monitoringPerkembangan)
        .set({
          ...updateData,
          totalSkorAdl,
          totalSkorSosial,
          totalSkorMental,
          totalSkorVokasional,
          totalSkorKeseluruhan,
        })
        .where(eq(monitoringPerkembangan.id, id))
        .returning();

      return updated;
    }),

  getDetailKasus: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const kasus = await ctx.db.query.penangananKasus.findFirst({
        where: eq(penangananKasus.id, input.id),
        with: {
          pesertaDidik: {
            with: {
              kelas: true,
              waliAsuh: { columns: { name: true } },
            },
          },
        },
      });
      if (!kasus) throw new Error("Kasus tidak ditemukan");

      const tindakLanjut = (kasus.intervensi || []).map((item) => {
        const match = item.deskripsi.match(/^\[(.*?)\]\s(.*)$/);
        return {
          id: item.aktivitasKe.toString(),
          tanggalTindakan: match ? match[1] : kasus.tanggalBuka,
          deskripsi: match ? match[2] : item.deskripsi,
        };
      });

      return { ...kasus, tindakLanjut };
    }),

  createKasus: staffProcedure
    .input(
      z.object({
        pesertaDidikId: z.string().min(1, "Siswa harus dipilih"),
        tanggalBuka: z.string(),
        masalahUtama: z.string().optional(),
        penyebabMasalah: z.string().optional(),
        dampakBiologis: z.string().optional(),
        dampakPsikologis: z.string().optional(),
        dampakSosial: z.string().optional(),
        dampakSpiritual: z.string().optional(),
        tujuanUmum: z.string().optional(),
        tujuanKhusus: z.array(z.string()).optional(),
        rencanaKegiatan: z.array(z.string()).optional(),
        intervensiAwal: z
          .array(z.object({ aktivitasKe: z.number(), deskripsi: z.string() }))
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const authorId = ctx.session.user.id;
      const [newKasus] = await ctx.db
        .insert(penangananKasus)
        .values({
          ...input,
          authorId,
          tanggalTutup: null,
          intervensi: input.intervensiAwal || [],
          hasilMonev: [],
          metodeMonev: [],
        })
        .returning();
      return newKasus;
    }),

  updateKasus: staffProcedure
    .input(
      z.object({
        id: z.string(),
        masalahUtama: z.string().optional(),
        penyebabMasalah: z.string().optional(),
        dampakBiologis: z.string().optional(),
        dampakPsikologis: z.string().optional(),
        dampakSosial: z.string().optional(),
        dampakSpiritual: z.string().optional(),
        tujuanUmum: z.string().optional(),
        tujuanKhusus: z.array(z.string()).optional(),
        rencanaKegiatan: z.array(z.string()).optional(),
        intervensi: z
          .array(z.object({ aktivitasKe: z.number(), deskripsi: z.string() }))
          .optional(),
        metodeMonev: z.array(z.string()).optional(),
        hasilMonev: z
          .array(z.object({ mingguKe: z.number(), deskripsi: z.string() }))
          .optional(),
        terminasiBiologis: z.string().optional(),
        terminasiPsikologis: z.string().optional(),
        terminasiSosial: z.string().optional(),
        terminasiSpiritual: z.string().optional(),
        kesimpulan: z.string().optional(),
        tanggalTutup: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const [updated] = await ctx.db
        .update(penangananKasus)
        .set(updateData)
        .where(eq(penangananKasus.id, id))
        .returning();
      return updated;
    }),

  addIntervensiKasus: staffProcedure
    .input(
      z.object({
        kasusId: z.string(),
        aktivitasKe: z.number(),
        deskripsi: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const kasus = await ctx.db.query.penangananKasus.findFirst({
        where: eq(penangananKasus.id, input.kasusId),
      });
      if (!kasus) throw new Error("Kasus tidak ditemukan");

      const existing = kasus.intervensi || [];
      const filtered = existing.filter(
        (i) => i.aktivitasKe !== input.aktivitasKe,
      );
      filtered.push({
        aktivitasKe: input.aktivitasKe,
        deskripsi: input.deskripsi,
      });
      filtered.sort((a, b) => a.aktivitasKe - b.aktivitasKe);

      await ctx.db
        .update(penangananKasus)
        .set({ intervensi: filtered })
        .where(eq(penangananKasus.id, input.kasusId));

      return { success: true };
    }),

  addHasilMonev: staffProcedure
    .input(
      z.object({
        kasusId: z.string(),
        mingguKe: z.number().min(1).max(5),
        deskripsi: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const kasus = await ctx.db.query.penangananKasus.findFirst({
        where: eq(penangananKasus.id, input.kasusId),
      });
      if (!kasus) throw new Error("Kasus tidak ditemukan");

      const existing = kasus.hasilMonev || [];
      const filtered = existing.filter((m) => m.mingguKe !== input.mingguKe);
      filtered.push({ mingguKe: input.mingguKe, deskripsi: input.deskripsi });
      filtered.sort((a, b) => a.mingguKe - b.mingguKe);

      await ctx.db
        .update(penangananKasus)
        .set({ hasilMonev: filtered })
        .where(eq(penangananKasus.id, input.kasusId));

      return { success: true };
    }),

  tambahTindakLanjut: staffProcedure
    .input(
      z.object({
        kasusId: z.string(),
        tanggalTindakan: z.string(),
        deskripsi: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const kasus = await ctx.db.query.penangananKasus.findFirst({
        where: eq(penangananKasus.id, input.kasusId),
      });
      if (!kasus) throw new Error("Kasus tidak ditemukan");

      const existing = kasus.intervensi || [];
      const nextAktivitasKe =
        existing.length > 0
          ? Math.max(...existing.map((i) => i.aktivitasKe)) + 1
          : 1;
      const combined = `[${input.tanggalTindakan}] ${input.deskripsi}`;
      existing.push({ aktivitasKe: nextAktivitasKe, deskripsi: combined });

      await ctx.db
        .update(penangananKasus)
        .set({ intervensi: existing })
        .where(eq(penangananKasus.id, input.kasusId));

      return { success: true };
    }),

  tutupKasus: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const today = new Date().toISOString().split("T")[0];
      await ctx.db
        .update(penangananKasus)
        .set({ tanggalTutup: today })
        .where(eq(penangananKasus.id, input.id));

      return { success: true };
    }),
});
