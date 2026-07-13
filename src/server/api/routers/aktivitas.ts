// src/server/api/routers/aktivitas.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { desc, eq, asc } from "drizzle-orm";
import {
  logAbsensi,
  pesertaDidik,
  kategoriAbsensi,
  sesiAbsensi,
  masterPelanggaran,
} from "~/server/db/schema";

export const aktivitasRouter = createTRPCRouter({
  // --------------------------------------------------------
  // 1. GET RECENT LOGS (Tabel Riwayat)
  // --------------------------------------------------------
  getRecentLogs: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.logAbsensi.findMany({
      with: {
        pesertaDidik: {
          with: { kelas: true },
        },
        sesi: {
          with: { kategori: true }, // Ambil kategori (Solat, Makan, dll) melalui relasi sesi
        },
        pelanggaran: true, // Data master pelanggaran jika tipe log adalah pelanggaran
        waliAsuh: true,
      },
      orderBy: [desc(logAbsensi.waktuScan)],
      limit: 100,
    });
  }),

  // --------------------------------------------------------
  // 2. GET FORM OPTIONS (Data Dropdown untuk Form Manual)
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

    // Tambahan: Ambil data master pelanggaran untuk form dropdown
    const pelanggaran = await ctx.db.query.masterPelanggaran.findMany({
      where: eq(masterPelanggaran.isActive, true),
      orderBy: [asc(masterPelanggaran.tingkat)],
    });

    return { peserta, kategori, pelanggaran };
  }),

  // --------------------------------------------------------
  // 3. CREATE LOG MANUAL (Input dari Dashboard)
  // --------------------------------------------------------
  createLogManual: protectedProcedure
    .input(
      z.object({
        pesertaDidikId: z.string(),
        tipeLog: z.enum(["SESI", "PELANGGARAN"]), // Menentukan cabang logika
        sesiId: z.string().optional().nullable(),
        pelanggaranId: z.string().optional().nullable(),
        statusKehadiran: z
          .enum(["HADIR", "TIDAK_HADIR", "IZIN", "SAKIT", "ALFA"])
          .default("HADIR"),
        keterangan: z.string().optional(),
        tanggal: z.string(), // Format YYYY-MM-DD
        poinOverride: z.number().optional().nullable(), // Input opsional jika Wali Asuh mengedit poin default
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let poinDidapat = 0;
      let isPoinManual = false;
      let statusWaktu: "TEPAT_WAKTU" | "TELAT" | null = null;

      // Logika Penentuan Poin Default
      if (input.tipeLog === "SESI") {
        if (!input.sesiId) throw new Error("Sesi jadwal wajib dipilih!");

        const sesi = await ctx.db.query.sesiAbsensi.findFirst({
          where: eq(sesiAbsensi.id, input.sesiId),
        });
        if (!sesi) throw new Error("Sesi tidak ditemukan di database.");

        // Jika manual input "HADIR", asumsikan tepat waktu.
        // Jika Sakit/Izin/Alfa, poin = 0 (netral).
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

      // Logika Override (Data Immutability Audit)
      // Jika Wali Asuh memasukkan angka custom di form, timpa poin default & nyalakan flag
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
  // 4. SCAN QR CODE (Khusus Absensi Rutin via Kamera)
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
      const isTargeted = sesi.targetJenjang.includes(peserta.kelas.jenjang);
      if (!isTargeted) {
        throw new Error(
          `Siswa jenjang ${peserta.kelas.jenjang} tidak ditugaskan untuk absen pada sesi ini.`,
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
