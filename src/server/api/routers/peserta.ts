import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { eq, desc, asc } from "drizzle-orm";
import { pesertaDidik, kelas, user } from "~/server/db/schema";
import { z } from "zod";

const insertPesertaSchema = z.object({
  nipd: z.string().min(1, "NIPD wajib diisi"),
  namaLengkap: z.string().min(1, "Nama wajib diisi"),
  kelasId: z.string().min(1, "Kelas wajib dipilih"),
  waliAsuhId: z.string().optional(),
  nisn: z.string().optional(),
  jenisKelamin: z.string().optional(),
  tempatLahir: z.string().optional(),
  tanggalLahir: z.string().optional(),
  agama: z.string().optional(),
  anakKe: z.string().optional(),
  sekolahAsal: z.string().optional(),
  noAkte: z.string().optional(),
  nik: z.string().optional(),
  noKk: z.string().optional(),
  alamat: z.string().optional(),
  rt: z.string().optional(),
  rw: z.string().optional(),
  kelurahan: z.string().optional(),
  kecamatan: z.string().optional(),
  kodePos: z.string().optional(),
  noTelp: z.string().optional(),
  namaIbu: z.string().optional(),
  tempatLahirIbu: z.string().optional(),
  tanggalLahirIbu: z.string().optional(),
  pendidikanIbu: z.string().optional(),
  pekerjaanIbu: z.string().optional(),
  penghasilanIbu: z.string().optional(),
  nikIbu: z.string().optional(),
  namaAyah: z.string().optional(),
  tempatLahirAyah: z.string().optional(),
  tanggalLahirAyah: z.string().optional(),
  pendidikanAyah: z.string().optional(),
  pekerjaanAyah: z.string().optional(),
  penghasilanAyah: z.string().optional(),
  nikAyah: z.string().optional(),
});

export type InsertPesertaType = z.infer<typeof insertPesertaSchema>;

export const pesertaRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.pesertaDidik.findMany({
      with: {
        kelas: true,
        waliAsuh: true,
      },
      orderBy: [desc(pesertaDidik.createdAt)],
    });
  }),

  assignWaliAsuh: protectedProcedure
    .input(
      z.object({
        pesertaId: z.string(),
        waliAsuhId: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db
        .update(pesertaDidik)
        .set({ waliAsuhId: input.waliAsuhId })
        .where(eq(pesertaDidik.id, input.pesertaId));
    }),

  getWaliAsuh: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.user.findMany({
      columns: { id: true, name: true, email: true, image: true },
      orderBy: [asc(user.name)],
    });
  }),

  createPeserta: protectedProcedure
    .input(insertPesertaSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.pesertaDidik.findFirst({
        where: (pd, { eq }) => eq(pd.nipd, input.nipd),
      });

      if (existing) throw new Error("NIPD ini sudah terdaftar di sistem.");

      const parseDate = (val?: string) =>
        val && val.trim() !== "" ? val : undefined;
      const parseEmptyString = (val?: string) =>
        val && val.trim() !== "" ? val : undefined;
      const parseWali = (val?: string) =>
        val && val !== "unassigned" ? val : undefined;

      return await ctx.db.insert(pesertaDidik).values({
        ...input,

        nisn: parseEmptyString(input.nisn),
        nik: parseEmptyString(input.nik),
        noKk: parseEmptyString(input.noKk),
        nikIbu: parseEmptyString(input.nikIbu),
        nikAyah: parseEmptyString(input.nikAyah),

        tanggalLahir: parseDate(input.tanggalLahir),
        tanggalLahirIbu: parseDate(input.tanggalLahirIbu),
        tanggalLahirAyah: parseDate(input.tanggalLahirAyah),
        waliAsuhId: parseWali(input.waliAsuhId),
      });
    }),

  createBanyakPeserta: protectedProcedure
    .input(z.array(insertPesertaSchema))
    .mutation(async ({ ctx, input }) => {
      const parseDate = (val?: string) =>
        val && val.trim() !== "" ? val : undefined;
      const parseEmptyString = (val?: string) =>
        val && val.trim() !== "" ? val : undefined;

      const valuesToInsert = input.map((item) => ({
        ...item,

        nisn: parseEmptyString(item.nisn),
        nik: parseEmptyString(item.nik),
        noKk: parseEmptyString(item.noKk),
        nikIbu: parseEmptyString(item.nikIbu),
        nikAyah: parseEmptyString(item.nikAyah),

        tanggalLahir: parseDate(item.tanggalLahir),
        tanggalLahirIbu: parseDate(item.tanggalLahirIbu),
        tanggalLahirAyah: parseDate(item.tanggalLahirAyah),
        waliAsuhId:
          item.waliAsuhId && item.waliAsuhId !== "unassigned"
            ? item.waliAsuhId
            : null,
      }));

      return await ctx.db
        .insert(pesertaDidik)
        .values(valuesToInsert)
        .onConflictDoNothing({ target: pesertaDidik.nipd });
    }),

  updatePeserta: protectedProcedure
    .input(
      insertPesertaSchema.extend({
        id: z.string(), // ID wajib dikirim untuk update
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Pastikan NIPD baru tidak bertabrakan dengan peserta LAIN
      const existing = await ctx.db.query.pesertaDidik.findFirst({
        where: (pd, { and, eq, ne }) =>
          and(eq(pd.nipd, input.nipd), ne(pd.id, input.id)), // Cari NIPD yang sama, TAPI bukan milik anak ini sendiri
      });

      if (existing)
        throw new Error("NIPD ini sudah terdaftar pada peserta lain.");

      const parseDate = (val?: string) =>
        val && val.trim() !== "" ? val : undefined;
      const parseEmptyString = (val?: string) =>
        val && val.trim() !== "" ? val : undefined;
      const parseWali = (val?: string) =>
        val && val !== "unassigned" ? val : undefined;

      return await ctx.db
        .update(pesertaDidik)
        .set({
          nipd: input.nipd,
          namaLengkap: input.namaLengkap,
          kelasId: input.kelasId,
          nisn: parseEmptyString(input.nisn),
          jenisKelamin: parseEmptyString(input.jenisKelamin),
          tempatLahir: parseEmptyString(input.tempatLahir),
          tanggalLahir: parseDate(input.tanggalLahir),
          agama: parseEmptyString(input.agama),
          anakKe: parseEmptyString(input.anakKe),
          sekolahAsal: parseEmptyString(input.sekolahAsal),
          noAkte: parseEmptyString(input.noAkte),
          nik: parseEmptyString(input.nik),
          noKk: parseEmptyString(input.noKk),
          alamat: parseEmptyString(input.alamat),
          rt: parseEmptyString(input.rt),
          rw: parseEmptyString(input.rw),
          kelurahan: parseEmptyString(input.kelurahan),
          kecamatan: parseEmptyString(input.kecamatan),
          kodePos: parseEmptyString(input.kodePos),
          noTelp: parseEmptyString(input.noTelp),
          namaIbu: parseEmptyString(input.namaIbu),
          tempatLahirIbu: parseEmptyString(input.tempatLahirIbu),
          tanggalLahirIbu: parseDate(input.tanggalLahirIbu),
          pendidikanIbu: parseEmptyString(input.pendidikanIbu),
          pekerjaanIbu: parseEmptyString(input.pekerjaanIbu),
          penghasilanIbu: parseEmptyString(input.penghasilanIbu),
          nikIbu: parseEmptyString(input.nikIbu),
          namaAyah: parseEmptyString(input.namaAyah),
          tempatLahirAyah: parseEmptyString(input.tempatLahirAyah),
          tanggalLahirAyah: parseDate(input.tanggalLahirAyah),
          pendidikanAyah: parseEmptyString(input.pendidikanAyah),
          pekerjaanAyah: parseEmptyString(input.pekerjaanAyah),
          penghasilanAyah: parseEmptyString(input.penghasilanAyah),
          nikAyah: parseEmptyString(input.nikAyah),
          waliAsuhId: parseWali(input.waliAsuhId),
        })
        .where(eq(pesertaDidik.id, input.id));
    }),

  deletePeserta: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db
        .delete(pesertaDidik)
        .where(eq(pesertaDidik.id, input.id));
    }),

  getAllKelas: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.kelas.findMany({
      orderBy: [asc(kelas.jenjang), asc(kelas.tingkat), asc(kelas.namaKelas)],
    });
  }),

  createKelas: protectedProcedure
    .input(
      z.object({
        jenjang: z.enum(["SD", "SMP", "SMA"]),
        tingkat: z.string().min(1, "Tingkat wajib diisi"),
        namaKelas: z.string().min(1, "Nama kelas wajib diisi"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.insert(kelas).values({
        jenjang: input.jenjang,
        tingkat: input.tingkat,
        namaKelas: input.namaKelas,
      });
    }),

  updateKelas: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        jenjang: z.enum(["SD", "SMP", "SMA"]),
        tingkat: z.string().min(1),
        namaKelas: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db
        .update(kelas)
        .set({
          jenjang: input.jenjang,
          tingkat: input.tingkat,
          namaKelas: input.namaKelas,
        })
        .where(eq(kelas.id, input.id));
    }),

  deleteKelas: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.delete(kelas).where(eq(kelas.id, input.id));
    }),
});
