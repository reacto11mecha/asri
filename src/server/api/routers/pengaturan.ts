// src/server/api/routers/pengaturan.ts
import { z } from "zod";
import { createTRPCRouter, superAdminProcedure } from "~/server/api/trpc";
import {
  user,
  kategoriAbsensi,
  sesiAbsensi,
  masterPelanggaran,
  masterJabatan,
  hariLibur,
} from "~/server/db/schema";
import { eq, asc, not, and } from "drizzle-orm";

const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

const formatTime = (timeStr?: string | null) => {
  if (!timeStr || timeStr.trim() === "") return null;

  const passed = regex.test(timeStr);
  if (!passed) throw new Error("Format waktu tidak valid");

  return timeStr.length === 5 ? `${timeStr}:00` : timeStr;
};

export const pengaturanRouter = createTRPCRouter({
  // ====================================================================
  // A. KELOLA MASTER JABATAN (ROLE & LABEL)
  // ====================================================================
  getJabatans: superAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.masterJabatan.findMany({
      orderBy: (j, { asc }) => [asc(j.namaJabatan)],
    });
  }),

  createJabatan: superAdminProcedure
    .input(
      z.object({
        namaJabatan: z.string().min(1, "Nama Jabatan wajib diisi"),
        role: z.enum(["SUPERADMIN", "STAFF", "SUPPORTER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(masterJabatan).values({
        namaJabatan: input.namaJabatan,
        role: input.role,
      });
    }),

  updateJabatan: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        namaJabatan: z.string().min(1, "Nama Jabatan wajib diisi"),
        role: z.enum(["SUPERADMIN", "STAFF", "SUPPORTER"]),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(masterJabatan)
        .set({
          namaJabatan: input.namaJabatan,
          role: input.role,
          isActive: input.isActive,
        })
        .where(eq(masterJabatan.id, input.id));
    }),

  deleteJabatan: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(masterJabatan).where(eq(masterJabatan.id, input.id));
    }),

  // ====================================================================
  // B. MANAJEMEN PEGAWAI (APPROVAL & PENUGASAN JABATAN)
  // ====================================================================

  // 1. Ambil daftar pegawai yang baru login dan menunggu di-approve
  getPendingUsers: superAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.user.findMany({
      where: eq(user.accountApproved, false),
      orderBy: (u, { desc }) => [desc(u.createdAt)],
    });
  }),

  // 2. Ambil daftar pegawai yang sudah di-approve (beserta nama jabatannya)
  getApprovedUsers: superAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.user.findMany({
      where: and(
        eq(user.accountApproved, true),
        not(eq(user.id, ctx.session.user.id)),
      ),
      with: {
        jabatan: true, // Menarik relasi dari masterJabatan
      },
      orderBy: (u, { desc }) => [desc(u.createdAt)],
    });
  }),

  // 3. Approve pegawai baru (Berikan akses masuk & pasangkan jabatannya)
  approveUser: superAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        jabatanId: z.string().min(1, "Jabatan wajib dipilih saat approve"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(user)
        .set({
          accountApproved: true,
          jabatanId: input.jabatanId,
        })
        .where(eq(user.id, input.userId));
    }),

  // 4. Tolak/Hapus pegawai yang tidak dikenal
  rejectUser: superAdminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Hapus permanen user dari database agar tidak membebani sistem
      await ctx.db.delete(user).where(eq(user.id, input.userId));
    }),

  // 5. Update/Pindahkan jabatan pegawai yang sudah aktif
  updateUserJabatan: superAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        jabatanId: z.string().min(1, "Jabatan wajib dipilih"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(user)
        .set({ jabatanId: input.jabatanId })
        .where(eq(user.id, input.userId));
    }),

  // ==========================================
  // READ DATA (Untuk ditampilkan di tabel Pengaturan)
  // ==========================================
  getKategoriWithSesi: superAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.kategoriAbsensi.findMany({
      with: {
        sesi: {
          orderBy: (sesi, { asc }) => [asc(sesi.waktuMulai)],
        },
      },
      orderBy: [asc(kategoriAbsensi.namaKategori)],
    });
  }),

  getMasterPelanggaran: superAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.masterPelanggaran.findMany({
      orderBy: [
        asc(masterPelanggaran.tingkat),
        asc(masterPelanggaran.namaPelanggaran),
      ],
    });
  }),

  // ==========================================
  // CRUD KATEGORI ABSENSI (Induk)
  // ==========================================
  createKategori: superAdminProcedure
    .input(
      z.object({
        namaKategori: z.string().min(1, "Nama Kategori wajib diisi"),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(kategoriAbsensi).values({
        namaKategori: input.namaKategori,
        isActive: input.isActive,
      });
    }),

  updateKategori: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        namaKategori: z.string().min(1, "Nama Kategori wajib diisi"),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(kategoriAbsensi)
        .set({
          namaKategori: input.namaKategori,
          isActive: input.isActive,
        })
        .where(eq(kategoriAbsensi.id, input.id));
    }),

  deleteKategori: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(kategoriAbsensi)
        .where(eq(kategoriAbsensi.id, input.id));
    }),

  // ==========================================
  // CRUD SESI ABSENSI (Anak dari Kategori)
  // ==========================================
  createSesi: superAdminProcedure
    .input(
      z.object({
        kategoriId: z.string(),
        namaSesi: z.string().min(1, "Nama Sesi wajib diisi"),
        waktuMulai: z.string().optional().nullable(),
        waktuSelesai: z.string().optional().nullable(),
        isMandatory: z.boolean(),
        targetJenjang: z
          .array(z.enum(["SD", "SMP", "SMA"]))
          .min(1, "Pilih minimal 1 jenjang"),
        targetAgama: z
          .array(
            z.enum([
              "ISLAM",
              "KRISTEN",
              "KATOLIK",
              "HINDU",
              "BUDHA",
              "KONGHUCU",
              "LAINNYA",
            ]),
          )
          .min(1, "Pilih minimal 1 agama"),
        poinTepatWaktu: z.number(),
        poinTelat: z.number(),
        poinAlfa: z.number(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(sesiAbsensi).values({
        kategoriId: input.kategoriId,
        namaSesi: input.namaSesi,
        waktuMulai: formatTime(input.waktuMulai),
        waktuSelesai: formatTime(input.waktuSelesai),
        isMandatory: input.isMandatory,
        targetJenjang: input.targetJenjang,
        targetAgama: input.targetAgama,
        poinTepatWaktu: input.poinTepatWaktu,
        poinTelat: input.poinTelat,
        poinAlfa: input.poinAlfa,
        isActive: input.isActive,
      });
    }),

  updateSesi: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        namaSesi: z.string().min(1, "Nama Sesi wajib diisi"),
        waktuMulai: z.string().optional().nullable(),
        waktuSelesai: z.string().optional().nullable(),
        isMandatory: z.boolean(),
        targetJenjang: z
          .array(z.enum(["SD", "SMP", "SMA"]))
          .min(1, "Pilih minimal 1 jenjang"),
        targetAgama: z
          .array(
            z.enum([
              "ISLAM",
              "KRISTEN",
              "KATOLIK",
              "HINDU",
              "BUDHA",
              "KONGHUCU",
              "LAINNYA",
            ]),
          )
          .min(1, "Pilih minimal 1 agama"),
        poinTepatWaktu: z.number(),
        poinTelat: z.number(),
        poinAlfa: z.number(),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(sesiAbsensi)
        .set({
          namaSesi: input.namaSesi,
          waktuMulai: formatTime(input.waktuMulai),
          waktuSelesai: formatTime(input.waktuSelesai),
          isMandatory: input.isMandatory,
          targetJenjang: input.targetJenjang,
          targetAgama: input.targetAgama,
          poinTepatWaktu: input.poinTepatWaktu,
          poinTelat: input.poinTelat,
          poinAlfa: input.poinAlfa,
          isActive: input.isActive,
        })
        .where(eq(sesiAbsensi.id, input.id));
    }),

  deleteSesi: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(sesiAbsensi).where(eq(sesiAbsensi.id, input.id));
    }),

  // ==========================================
  // CRUD MASTER PELANGGARAN
  // ==========================================
  createPelanggaran: superAdminProcedure
    .input(
      z.object({
        namaPelanggaran: z.string().min(1, "Nama Pelanggaran wajib diisi"),
        tingkat: z.enum(["RINGAN", "SEDANG", "BERAT"]),
        poinMinus: z.number(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(masterPelanggaran).values({
        namaPelanggaran: input.namaPelanggaran,
        tingkat: input.tingkat,
        poinMinus: input.poinMinus,
        isActive: input.isActive,
      });
    }),

  updatePelanggaran: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        namaPelanggaran: z.string().min(1, "Nama Pelanggaran wajib diisi"),
        tingkat: z.enum(["RINGAN", "SEDANG", "BERAT"]),
        poinMinus: z.number(),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(masterPelanggaran)
        .set({
          namaPelanggaran: input.namaPelanggaran,
          tingkat: input.tingkat,
          poinMinus: input.poinMinus,
          isActive: input.isActive,
        })
        .where(eq(masterPelanggaran.id, input.id));
    }),

  deletePelanggaran: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(masterPelanggaran)
        .where(eq(masterPelanggaran.id, input.id));
    }),

  // ==========================================
  // CRUD HARI LIBUR
  // ==========================================
  getHariLibur: superAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.hariLibur.findMany({
      orderBy: [asc(hariLibur.tanggalMulai)],
    });
  }),

  createHariLibur: superAdminProcedure
    .input(
      z.object({
        namaLibur: z.string().min(1, "Nama libur wajib diisi"),
        tanggalMulai: z.string(),
        tanggalSelesai: z.string(),
        targetJenjang: z
          .array(z.enum(["SD", "SMP", "SMA"]))
          .min(1, "Pilih minimal 1 jenjang"),
        deskripsi: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(hariLibur).values({
        namaLibur: input.namaLibur,
        tanggalMulai: input.tanggalMulai,
        tanggalSelesai: input.tanggalSelesai,
        targetJenjang: input.targetJenjang,
        deskripsi: input.deskripsi,
        isActive: true,
      });
    }),

  updateHariLibur: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        namaLibur: z.string().min(1, "Nama libur wajib diisi"),
        tanggalMulai: z.string(),
        tanggalSelesai: z.string(),
        targetJenjang: z
          .array(z.enum(["SD", "SMP", "SMA"]))
          .min(1, "Pilih minimal 1 jenjang"),
        deskripsi: z.string().optional(),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(hariLibur)
        .set({
          namaLibur: input.namaLibur,
          tanggalMulai: input.tanggalMulai,
          tanggalSelesai: input.tanggalSelesai,
          targetJenjang: input.targetJenjang,
          deskripsi: input.deskripsi,
          isActive: input.isActive,
        })
        .where(eq(hariLibur.id, input.id));
    }),

  deleteHariLibur: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(hariLibur).where(eq(hariLibur.id, input.id));
    }),
});
