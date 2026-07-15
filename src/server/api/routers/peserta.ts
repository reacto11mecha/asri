// src/server/api/routers/peserta.ts
import { createTRPCRouter, staffProcedure } from "~/server/api/trpc";
import { eq, desc, asc, and } from "drizzle-orm";
import { pesertaDidik, kelas, user } from "~/server/db/schema";
import JSZip from "jszip";
import QRCode from "qrcode";
import { z } from "zod";

// Zod enum untuk agama, sesuai dengan database
const agamaEnumZod = z.enum([
  "ISLAM",
  "KRISTEN",
  "KATOLIK",
  "HINDU",
  "BUDHA",
  "KONGHUCU",
  "LAINNYA",
]);

const insertPesertaSchema = z.object({
  nipd: z.string().min(1, "NIPD wajib diisi"),
  namaLengkap: z.string().min(1, "Nama wajib diisi"),
  kelasId: z.string().min(1, "Kelas wajib dipilih"),
  waliAsuhId: z.string().optional(),
  nisn: z.string().optional(),
  jenisKelamin: z.string().optional(),
  tempatLahir: z.string().optional(),
  tanggalLahir: z.string().optional(),
  agama: agamaEnumZod.optional(),
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
  getAll: staffProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.pesertaDidik.findMany({
      with: {
        kelas: true,
        waliAsuh: true,
      },
      orderBy: [desc(pesertaDidik.createdAt)],
    });
  }),

  assignWaliAsuh: staffProcedure
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

  getWaliAsuh: staffProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.user.findMany({
      columns: { id: true, name: true, email: true, image: true },
      orderBy: [asc(user.name)],
    });
  }),

  createPeserta: staffProcedure
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

  createBanyakPeserta: staffProcedure
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

  updatePeserta: staffProcedure
    .input(
      insertPesertaSchema.extend({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.pesertaDidik.findFirst({
        where: (pd, { and, eq, ne }) =>
          and(eq(pd.nipd, input.nipd), ne(pd.id, input.id)),
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
          agama: input.agama,
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

  deletePeserta: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db
        .delete(pesertaDidik)
        .where(eq(pesertaDidik.id, input.id));
    }),

  getAllKelas: staffProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.kelas.findMany({
      orderBy: [asc(kelas.jenjang), asc(kelas.tingkat), asc(kelas.namaKelas)],
    });
  }),

  downloadExcel: staffProcedure.mutation(async ({ ctx }) => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const jenjangList = ["SD", "SMP", "SMA"] as const;

    for (const jenjang of jenjangList) {
      const pesertaList = await ctx.db
        .select({
          nipd: pesertaDidik.nipd,
          namaLengkap: pesertaDidik.namaLengkap,
          agama: pesertaDidik.agama,
          tingkat: kelas.tingkat,
          namaKelas: kelas.namaKelas,
          jenisKelamin: pesertaDidik.jenisKelamin,
          tempatLahir: pesertaDidik.tempatLahir,
          tanggalLahir: pesertaDidik.tanggalLahir,
          // field lainnya
          status: pesertaDidik.status,
          tahunMasuk: pesertaDidik.tahunMasuk,
          nisn: pesertaDidik.nisn,
          noAkte: pesertaDidik.noAkte,
          nik: pesertaDidik.nik,
          noKk: pesertaDidik.noKk,
          alamat: pesertaDidik.alamat,
          rt: pesertaDidik.rt,
          rw: pesertaDidik.rw,
          kelurahan: pesertaDidik.kelurahan,
          kecamatan: pesertaDidik.kecamatan,
          kodePos: pesertaDidik.kodePos,
          noTelp: pesertaDidik.noTelp,
          sekolahAsal: pesertaDidik.sekolahAsal,
          anakKe: pesertaDidik.anakKe,
          namaIbu: pesertaDidik.namaIbu,
          tempatLahirIbu: pesertaDidik.tempatLahirIbu,
          tanggalLahirIbu: pesertaDidik.tanggalLahirIbu,
          pendidikanIbu: pesertaDidik.pendidikanIbu,
          pekerjaanIbu: pesertaDidik.pekerjaanIbu,
          penghasilanIbu: pesertaDidik.penghasilanIbu,
          nikIbu: pesertaDidik.nikIbu,
          namaAyah: pesertaDidik.namaAyah,
          tempatLahirAyah: pesertaDidik.tempatLahirAyah,
          tanggalLahirAyah: pesertaDidik.tanggalLahirAyah,
          pendidikanAyah: pesertaDidik.pendidikanAyah,
          pekerjaanAyah: pesertaDidik.pekerjaanAyah,
          penghasilanAyah: pesertaDidik.penghasilanAyah,
          nikAyah: pesertaDidik.nikAyah,
          uidKartu: pesertaDidik.uidKartu,
        })
        .from(pesertaDidik)
        .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
        .where(
          and(eq(pesertaDidik.status, "AKTIF"), eq(kelas.jenjang, jenjang)),
        )
        .orderBy(kelas.tingkat, kelas.namaKelas, pesertaDidik.namaLengkap);

      const sheet = workbook.addWorksheet(jenjang);
      // Definisikan kolom dengan urutan yang diinginkan
      sheet.columns = [
        { header: "NIPD", key: "nipd", width: 15 },
        { header: "Nama Lengkap", key: "namaLengkap", width: 30 },
        { header: "Agama", key: "agama", width: 12 },
        { header: "Tingkat", key: "tingkat", width: 10 },
        { header: "Kelas", key: "namaKelas", width: 10 },
        { header: "Jenis Kelamin", key: "jenisKelamin", width: 12 },
        { header: "Tempat Lahir", key: "tempatLahir", width: 20 },
        { header: "Tanggal Lahir", key: "tanggalLahir", width: 15 },
        // sisanya
        { header: "Status", key: "status", width: 12 },
        { header: "Tahun Masuk", key: "tahunMasuk", width: 12 },
        { header: "NISN", key: "nisn", width: 15 },
        { header: "No Akte", key: "noAkte", width: 15 },
        { header: "NIK", key: "nik", width: 20 },
        { header: "No KK", key: "noKk", width: 20 },
        { header: "Alamat", key: "alamat", width: 30 },
        { header: "RT", key: "rt", width: 6 },
        { header: "RW", key: "rw", width: 6 },
        { header: "Kelurahan", key: "kelurahan", width: 20 },
        { header: "Kecamatan", key: "kecamatan", width: 20 },
        { header: "Kode Pos", key: "kodePos", width: 10 },
        { header: "No Telp", key: "noTelp", width: 15 },
        { header: "Sekolah Asal", key: "sekolahAsal", width: 20 },
        { header: "Anak Ke", key: "anakKe", width: 8 },
        { header: "Nama Ibu", key: "namaIbu", width: 25 },
        { header: "Tempat Lahir Ibu", key: "tempatLahirIbu", width: 20 },
        { header: "Tanggal Lahir Ibu", key: "tanggalLahirIbu", width: 15 },
        { header: "Pendidikan Ibu", key: "pendidikanIbu", width: 15 },
        { header: "Pekerjaan Ibu", key: "pekerjaanIbu", width: 20 },
        { header: "Penghasilan Ibu", key: "penghasilanIbu", width: 15 },
        { header: "NIK Ibu", key: "nikIbu", width: 20 },
        { header: "Nama Ayah", key: "namaAyah", width: 25 },
        { header: "Tempat Lahir Ayah", key: "tempatLahirAyah", width: 20 },
        { header: "Tanggal Lahir Ayah", key: "tanggalLahirAyah", width: 15 },
        { header: "Pendidikan Ayah", key: "pendidikanAyah", width: 15 },
        { header: "Pekerjaan Ayah", key: "pekerjaanAyah", width: 20 },
        { header: "Penghasilan Ayah", key: "penghasilanAyah", width: 15 },
        { header: "NIK Ayah", key: "nikAyah", width: 20 },
        { header: "UID Kartu", key: "uidKartu", width: 15 },
      ];

      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F172A" },
      };

      for (const p of pesertaList) {
        sheet.addRow({
          nipd: p.nipd,
          namaLengkap: p.namaLengkap,
          agama: p.agama,
          tingkat: p.tingkat,
          namaKelas: p.namaKelas,
          jenisKelamin: p.jenisKelamin ?? "",
          tempatLahir: p.tempatLahir ?? "",
          tanggalLahir: p.tanggalLahir
            ? new Date(p.tanggalLahir).toLocaleDateString("id-ID")
            : "",
          status: p.status ?? "",
          tahunMasuk: p.tahunMasuk?.toString() ?? "",
          nisn: p.nisn ?? "",
          noAkte: p.noAkte ?? "",
          nik: p.nik ?? "",
          noKk: p.noKk ?? "",
          alamat: p.alamat ?? "",
          rt: p.rt ?? "",
          rw: p.rw ?? "",
          kelurahan: p.kelurahan ?? "",
          kecamatan: p.kecamatan ?? "",
          kodePos: p.kodePos ?? "",
          noTelp: p.noTelp ?? "",
          sekolahAsal: p.sekolahAsal ?? "",
          anakKe: p.anakKe ?? "",
          namaIbu: p.namaIbu ?? "",
          tempatLahirIbu: p.tempatLahirIbu ?? "",
          tanggalLahirIbu: p.tanggalLahirIbu
            ? new Date(p.tanggalLahirIbu).toLocaleDateString("id-ID")
            : "",
          pendidikanIbu: p.pendidikanIbu ?? "",
          pekerjaanIbu: p.pekerjaanIbu ?? "",
          penghasilanIbu: p.penghasilanIbu ?? "",
          nikIbu: p.nikIbu ?? "",
          namaAyah: p.namaAyah ?? "",
          tempatLahirAyah: p.tempatLahirAyah ?? "",
          tanggalLahirAyah: p.tanggalLahirAyah
            ? new Date(p.tanggalLahirAyah).toLocaleDateString("id-ID")
            : "",
          pendidikanAyah: p.pendidikanAyah ?? "",
          pekerjaanAyah: p.pekerjaanAyah ?? "",
          penghasilanAyah: p.penghasilanAyah ?? "",
          nikAyah: p.nikAyah ?? "",
          uidKartu: p.uidKartu ?? "",
        });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer).toString("base64");
  }),

  downloadQrZip: staffProcedure.mutation(async ({ ctx }) => {
    const allPeserta = await ctx.db
      .select({
        nipd: pesertaDidik.nipd,
        namaLengkap: pesertaDidik.namaLengkap,
        jenjang: kelas.jenjang,
        tingkat: kelas.tingkat,
        namaKelas: kelas.namaKelas,
      })
      .from(pesertaDidik)
      .innerJoin(kelas, eq(pesertaDidik.kelasId, kelas.id))
      .where(eq(pesertaDidik.status, "AKTIF"))
      .orderBy(
        kelas.jenjang,
        kelas.tingkat,
        kelas.namaKelas,
        pesertaDidik.namaLengkap,
      );

    const zip = new JSZip();

    const grouped = new Map<string, Map<string, typeof allPeserta>>();
    for (const p of allPeserta) {
      const j = p.jenjang ?? "Tanpa Jenjang";
      const t = p.tingkat ?? "Tanpa Tingkat";
      if (!grouped.has(j)) grouped.set(j, new Map());
      const tMap = grouped.get(j)!;
      if (!tMap.has(t)) tMap.set(t, []);
      tMap.get(t)!.push(p);
    }

    for (const [jenjang, tMap] of grouped) {
      for (const [tingkat, siswaList] of tMap) {
        const folder = `${jenjang}/${tingkat}`;
        for (const siswa of siswaList) {
          const dataUrl = await QRCode.toDataURL(siswa.nipd, {
            width: 500,
            margin: 1,
          });
          const base64 = dataUrl.replace("data:image/png;base64,", "");
          const fileName = `${siswa.namaLengkap} - ${siswa.nipd} - ${siswa.namaKelas}.png`;
          zip.folder(folder)?.file(fileName, base64, { base64: true });
        }
      }
    }

    const content = await zip.generateAsync({ type: "nodebuffer" });
    return content.toString("base64");
  }),

  createKelas: staffProcedure
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

  updateKelas: staffProcedure
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

  deleteKelas: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.delete(kelas).where(eq(kelas.id, input.id));
    }),
});
