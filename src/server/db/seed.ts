import { db } from "./index";
import {
  kategoriAbsensi,
  sesiAbsensi,
  masterPelanggaran,
  masterJabatan,
  kelas,
  hariLibur,
  pesertaDidik,
  logAbsensi,
} from "./schema";
import { faker } from "@faker-js/faker/locale/id_ID";
import * as readline from "readline";
import crypto from "crypto";

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  console.log("⏳ Memulai proses seeding database dengan skema baru...");

  try {
    // ==========================================
    // 0. TANYAKAN PILIHAN SEBELUM SEEDING
    // ==========================================
    const pilihan = await askQuestion(
      "Pilih jenis seeding:\n" +
        "  [1] Hanya data utama (Kategori, Pelanggaran, Sesi)\n" +
        "  [2] Lengkap dengan data dummy (Kelas, Peserta, Log Absensi)\n" +
        "Masukkan angka (1 atau 2): ",
    );

    const isFull =
      pilihan === "2" || pilihan === "full" || pilihan === "lengkap";

    console.log("Mempersiapkan data Master Jabatan...");

    const dataJabatan = [
      {
        id: crypto.randomUUID(),
        namaJabatan: "Admin Wali Asrama",
        role: "SUPERADMIN" as const,
        isActive: true,
      },
      {
        id: crypto.randomUUID(),
        namaJabatan: "Admin Wali Asuh",
        role: "SUPERADMIN" as const,
        isActive: true,
      },
      {
        id: crypto.randomUUID(),
        namaJabatan: "Staff Wali Asuh",
        role: "STAFF" as const,
        isActive: true,
      },
      {
        id: crypto.randomUUID(),
        namaJabatan: "Guru",
        role: "SUPPORTER" as const,
        isActive: true,
      },
    ];

    await db.insert(masterJabatan).values(dataJabatan).onConflictDoNothing();
    console.log("✅ Data Master Jabatan berhasil dimasukkan.");

    // ==========================================
    // 1. SEEDING KATEGORI UTAMA
    // ==========================================
    console.log("Mempersiapkan data Kategori Absensi...");

    const katSolatId = crypto.randomUUID();
    const katMakanId = crypto.randomUUID();
    const katKegiatanId = crypto.randomUUID();
    const katIbadahNonIslamId = crypto.randomUUID();

    const dataKategori = [
      { id: katSolatId, namaKategori: "Absen Solat", isActive: true },
      { id: katMakanId, namaKategori: "Absen Makan", isActive: true },
      { id: katKegiatanId, namaKategori: "Absen Kegiatan", isActive: true },
      {
        id: katIbadahNonIslamId,
        namaKategori: "Ibadah Non-Islam",
        isActive: true,
      },
    ];

    await db.insert(kategoriAbsensi).values(dataKategori).onConflictDoNothing();
    console.log("✅ Data Kategori Induk berhasil dimasukkan.");

    // ==========================================
    // 2. SEEDING MASTER PELANGGARAN
    // ==========================================
    console.log("Mempersiapkan data Master Pelanggaran...");

    const dataPelanggaran = [
      {
        id: crypto.randomUUID(),
        namaPelanggaran: "Pelanggaran Ringan",
        tingkat: "RINGAN" as const,
        poinMinus: -15,
        isActive: true,
      },
      {
        id: crypto.randomUUID(),
        namaPelanggaran: "Pelanggaran Sedang",
        tingkat: "SEDANG" as const,
        poinMinus: -50,
        isActive: true,
      },
      {
        id: crypto.randomUUID(),
        namaPelanggaran: "Pelanggaran Berat",
        tingkat: "BERAT" as const,
        poinMinus: -150,
        isActive: true,
      },
    ];

    await db
      .insert(masterPelanggaran)
      .values(dataPelanggaran)
      .onConflictDoNothing();
    console.log("✅ Data Master Pelanggaran berhasil dimasukkan.");

    // ==========================================
    // 3. SEEDING SESI ABSENSI (JADWAL)
    // ==========================================
    console.log("Mempersiapkan data Sesi Jadwal...");

    const semuaJenjang = ["SD", "SMP", "SMA"] as ("SD" | "SMP" | "SMA")[];
    const islamOnly = ["ISLAM"] as Array<
      | "ISLAM"
      | "KRISTEN"
      | "KATOLIK"
      | "HINDU"
      | "BUDHA"
      | "KONGHUCU"
      | "LAINNYA"
    >;
    const nonIslam = [
      "KRISTEN",
      "KATOLIK",
      "HINDU",
      "BUDHA",
      "KONGHUCU",
      "LAINNYA",
    ] as typeof islamOnly;
    const semuaAgama = [
      "ISLAM",
      "KRISTEN",
      "KATOLIK",
      "HINDU",
      "BUDHA",
      "KONGHUCU",
      "LAINNYA",
    ] as typeof islamOnly;

    const dataSesi = [
      // --- SHOLAT (Islam only) ---
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Subuh",
        waktuMulai: "04:30:00",
        waktuSelesai: "05:15:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: islamOnly,
        poinTepatWaktu: 25,
        poinTelat: -10,
        poinAlfa: -25,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Dhuha",
        waktuMulai: "06:30:00",
        waktuSelesai: "10:30:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: islamOnly,
        poinTepatWaktu: 15,
        poinTelat: -5,
        poinAlfa: -15,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Zuhur",
        waktuMulai: "12:00:00",
        waktuSelesai: "13:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: islamOnly,
        poinTepatWaktu: 15,
        poinTelat: -5,
        poinAlfa: -15,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Ashar",
        waktuMulai: "15:15:00",
        waktuSelesai: "16:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: islamOnly,
        poinTepatWaktu: 15,
        poinTelat: -5,
        poinAlfa: -15,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Magrib",
        waktuMulai: "18:00:00",
        waktuSelesai: "18:45:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: islamOnly,
        poinTepatWaktu: 15,
        poinTelat: -5,
        poinAlfa: -15,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Isya",
        waktuMulai: "19:15:00",
        waktuSelesai: "20:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: islamOnly,
        poinTepatWaktu: 15,
        poinTelat: -5,
        poinAlfa: -15,
      },

      // --- IBADAH NON-ISLAM ---
      {
        id: crypto.randomUUID(),
        kategoriId: katIbadahNonIslamId,
        namaSesi: "Ibadah Harian",
        waktuMulai: "07:00:00",
        waktuSelesai: "08:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: nonIslam,
        poinTepatWaktu: 30,
        poinTelat: -10,
        poinAlfa: -25,
      },

      // --- MAKAN ---
      {
        id: crypto.randomUUID(),
        kategoriId: katMakanId,
        namaSesi: "Makan Pagi",
        waktuMulai: "05:30:00",
        waktuSelesai: "06:15:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: semuaAgama,
        poinTepatWaktu: 30,
        poinTelat: -10,
        poinAlfa: -20,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katMakanId,
        namaSesi: "Makan Siang",
        waktuMulai: "13:00:00",
        waktuSelesai: "14:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: semuaAgama,
        poinTepatWaktu: 30,
        poinTelat: -10,
        poinAlfa: -20,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katMakanId,
        namaSesi: "Makan Malam",
        waktuMulai: "18:45:00",
        waktuSelesai: "19:15:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: semuaAgama,
        poinTepatWaktu: 30,
        poinTelat: -10,
        poinAlfa: -20,
      },

      // --- KEGIATAN ---
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Apel Pagi",
        waktuMulai: "06:15:00",
        waktuSelesai: "06:45:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: semuaAgama,
        poinTepatWaktu: 20,
        poinTelat: -10,
        poinAlfa: -20,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Apel Siang",
        waktuMulai: "14:00:00",
        waktuSelesai: "14:30:00",
        isMandatory: true,
        targetJenjang: ["SD"] as ("SD" | "SMP" | "SMA")[],
        targetAgama: semuaAgama,
        poinTepatWaktu: 20,
        poinTelat: -10,
        poinAlfa: -20,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Apel Sore",
        waktuMulai: "16:00:00",
        waktuSelesai: "16:30:00",
        isMandatory: true,
        targetJenjang: ["SMP", "SMA"] as ("SD" | "SMP" | "SMA")[],
        targetAgama: semuaAgama,
        poinTepatWaktu: 20,
        poinTelat: -10,
        poinAlfa: -20,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Mentoring",
        waktuMulai: "20:00:00",
        waktuSelesai: "21:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: semuaAgama,
        poinTepatWaktu: 25,
        poinTelat: -15,
        poinAlfa: -30,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Tidur",
        waktuMulai: "21:30:00",
        waktuSelesai: "22:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        targetAgama: semuaAgama,
        poinTepatWaktu: 85,
        poinTelat: -50,
        poinAlfa: -100,
      },

      // --- TAMBAHAN NON-MANDATORY ---
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Kegiatan Tambahan 1",
        waktuMulai: null,
        waktuSelesai: null,
        isMandatory: false,
        targetJenjang: semuaJenjang,
        targetAgama: semuaAgama,
        poinTepatWaktu: 10,
        poinTelat: 0,
        poinAlfa: 0,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Kegiatan Tambahan 2",
        waktuMulai: null,
        waktuSelesai: null,
        isMandatory: false,
        targetJenjang: semuaJenjang,
        targetAgama: semuaAgama,
        poinTepatWaktu: 10,
        poinTelat: 0,
        poinAlfa: 0,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Kegiatan Tambahan 3",
        waktuMulai: null,
        waktuSelesai: null,
        isMandatory: false,
        targetJenjang: semuaJenjang,
        targetAgama: semuaAgama,
        poinTepatWaktu: 10,
        poinTelat: 0,
        poinAlfa: 0,
      },
    ];

    await db.insert(sesiAbsensi).values(dataSesi).onConflictDoNothing();
    console.log("✅ Data Sesi Jadwal berhasil dimasukkan.");

    if (isFull) {
      // ==========================================
      // 4. INPUT BESARAN DATA
      // ==========================================
      let jmlPesertaPerKelas = 0;
      let jmlHari = 7;

      const jmlInput = await askQuestion(
        "Jumlah peserta per kelas (default acak 5-8, ketik angka atau kosongkan): ",
      );
      if (jmlInput.trim() !== "") {
        const n = parseInt(jmlInput);
        if (!isNaN(n) && n > 0) jmlPesertaPerKelas = n;
        else console.log("Input tidak valid, akan menggunakan acak 5-8.");
      }

      const hariInput = await askQuestion(
        "Jumlah hari ke belakang untuk log absensi (default 7): ",
      );
      if (hariInput.trim() !== "") {
        const n = parseInt(hariInput);
        if (!isNaN(n) && n > 0) jmlHari = n;
        else console.log("Input tidak valid, akan menggunakan 7 hari.");
      }

      console.log("Mempersiapkan data libur...");
      const dataLibur = [
        {
          id: crypto.randomUUID(),
          namaLibur: "Libur Idul Fitri 1447 H",
          tanggalMulai: "2026-03-20",
          tanggalSelesai: "2026-03-22",
          targetJenjang: ["SD", "SMP", "SMA"] as ("SD" | "SMP" | "SMA")[],
          isActive: true,
          deskripsi: "Libur nasional Idul Fitri",
        },
        {
          id: crypto.randomUUID(),
          namaLibur: "Libur Idul Adha 1447 H",
          tanggalMulai: "2026-05-27",
          tanggalSelesai: "2026-05-27",
          targetJenjang: ["SD", "SMP", "SMA"] as ("SD" | "SMP" | "SMA")[],
          isActive: true,
          deskripsi: "Libur nasional Idul Adha",
        },
      ];
      await db.insert(hariLibur).values(dataLibur).onConflictDoNothing();
      console.log("✅ Data libur berhasil dimasukkan.");

      // ==========================================
      // 5. SEEDING KELAS
      // ==========================================
      console.log("Mempersiapkan data Kelas...");
      const kelasList: Array<{
        jenjang: "SD" | "SMP" | "SMA";
        tingkat: string;
        namaKelas: string;
      }> = [
        { jenjang: "SD", tingkat: "1", namaKelas: "A" },
        { jenjang: "SD", tingkat: "1", namaKelas: "B" },
        { jenjang: "SD", tingkat: "2", namaKelas: "A" },
        { jenjang: "SD", tingkat: "2", namaKelas: "B" },
        { jenjang: "SD", tingkat: "3", namaKelas: "A" },
        { jenjang: "SD", tingkat: "3", namaKelas: "B" },
        { jenjang: "SD", tingkat: "4", namaKelas: "A" },
        { jenjang: "SD", tingkat: "4", namaKelas: "B" },
        { jenjang: "SD", tingkat: "5", namaKelas: "A" },
        { jenjang: "SD", tingkat: "5", namaKelas: "B" },
        { jenjang: "SD", tingkat: "6", namaKelas: "A" },
        { jenjang: "SD", tingkat: "6", namaKelas: "B" },
        { jenjang: "SMP", tingkat: "7", namaKelas: "A" },
        { jenjang: "SMP", tingkat: "7", namaKelas: "B" },
        { jenjang: "SMP", tingkat: "8", namaKelas: "A" },
        { jenjang: "SMP", tingkat: "8", namaKelas: "B" },
        { jenjang: "SMP", tingkat: "9", namaKelas: "A" },
        { jenjang: "SMP", tingkat: "9", namaKelas: "B" },
        { jenjang: "SMA", tingkat: "10", namaKelas: "A" },
        { jenjang: "SMA", tingkat: "10", namaKelas: "B" },
        { jenjang: "SMA", tingkat: "11", namaKelas: "A" },
        { jenjang: "SMA", tingkat: "11", namaKelas: "B" },
        { jenjang: "SMA", tingkat: "12", namaKelas: "A" },
        { jenjang: "SMA", tingkat: "12", namaKelas: "B" },
      ];

      const dataKelas = kelasList.map((kls) => ({
        id: crypto.randomUUID(),
        ...kls,
      }));
      await db.insert(kelas).values(dataKelas).onConflictDoNothing();
      console.log("✅ Data Kelas berhasil dimasukkan.");
      const allKelas = await db.select().from(kelas);

      // ==========================================
      // 6. SEEDING PESERTA DIDIK
      // ==========================================
      console.log("Mempersiapkan data Peserta Didik...");

      const randomEl = <T>(arr: T[]): T => {
        if (arr.length === 0) throw new Error("Array kosong");
        return arr[Math.floor(Math.random() * arr.length)]!;
      };

      const getRandomAgama = () => {
        const r = Math.random();
        if (r < 0.6) return "ISLAM";
        if (r < 0.75) return "KRISTEN";
        if (r < 0.85) return "KATOLIK";
        if (r < 0.9) return "HINDU";
        if (r < 0.95) return "BUDHA";
        if (r < 0.97) return "KONGHUCU";
        return "LAINNYA";
      };

      const pesertaDummy: (typeof pesertaDidik.$inferInsert)[] = [];
      let counter = 0;

      allKelas.forEach((kls) => {
        const jumlah =
          jmlPesertaPerKelas > 0
            ? jmlPesertaPerKelas
            : 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < jumlah; i++) {
          const isMale = Math.random() > 0.5;
          const namaLengkap = faker.person.fullName({
            sex: isMale ? "male" : "female",
          });
          const nipd = `PD${String(counter + 1).padStart(5, "0")}`;
          const agama = getRandomAgama();

          const tahunLahir =
            2008 - Number(kls.tingkat) - Math.floor(Math.random() * 3);
          const bulan = Math.floor(Math.random() * 12);
          const hari = Math.floor(Math.random() * 28) + 1;
          const tanggalLahir = `${tahunLahir}-${String(bulan + 1).padStart(2, "0")}-${String(hari).padStart(2, "0")}`;

          pesertaDummy.push({
            id: crypto.randomUUID(),
            kelasId: kls.id,
            nipd,
            nisn: `${new Date().getFullYear()}${String(counter + 1).padStart(6, "0")}`,
            namaLengkap,
            jenisKelamin: isMale ? "L" : "P",
            tempatLahir: faker.location.city(),
            tanggalLahir,
            agama,
            alamat: faker.location.streetAddress(),
            tahunMasuk: 2023,
            status: "AKTIF",
          });
          counter++;
        }
      });

      await db.insert(pesertaDidik).values(pesertaDummy).onConflictDoNothing();
      console.log("✅ Data Peserta Didik berhasil dimasukkan.");
      const allPeserta = await db.select().from(pesertaDidik);
      console.log(`Total peserta: ${allPeserta.length}`);

      // ==========================================
      // 7. SEEDING LOG ABSENSI (dengan bolong & LAINNYA)
      // ==========================================
      console.log("Mempersiapkan data Log Absensi...");
      const allSesi = await db.select().from(sesiAbsensi);
      const allPelanggaran = await db.select().from(masterPelanggaran);

      const today = new Date();
      const tanggalList: string[] = [];
      for (let i = jmlHari - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        tanggalList.push(d.toISOString().split("T")[0]!);
      }

      const comboSet = new Set<string>();
      const logDummy: (typeof logAbsensi.$inferInsert)[] = [];
      const PROB_MISSING = 0.1; // 10% data bolong
      const PROB_HADIR = 0.75;
      const PROB_IZIN = 0.05;
      const PROB_SAKIT = 0.05;
      const PROB_ALFA = 0.05;
      const PROB_LAINNYA = 0.05; // sisanya TIDAK_HADIR

      allPeserta.forEach((peserta) => {
        const kls = allKelas.find((k) => k.id === peserta.kelasId);
        if (!kls) return;
        const sesiRelevan = allSesi.filter(
          (s) =>
            s.targetJenjang.includes(kls.jenjang) &&
            s.targetAgama.includes(peserta.agama),
        );

        tanggalList.forEach((tgl) => {
          sesiRelevan.forEach((sesi) => {
            const key = `${tgl}||${sesi.id}||${peserta.id}`;
            if (comboSet.has(key)) return;

            // Probabilitas bolong (tidak dibuat log)
            if (Math.random() < PROB_MISSING) {
              return;
            }

            // Tentukan status
            const rand = Math.random();
            let statusKehadiran: typeof logAbsensi.$inferInsert.statusKehadiran =
              "HADIR";
            let statusWaktu: "TEPAT_WAKTU" | "TELAT" | null = null;
            let poin = 0;
            let keterangan: string | null = null;

            if (rand < PROB_HADIR) {
              statusKehadiran = "HADIR";
              if (Math.random() < 0.7) {
                statusWaktu = "TEPAT_WAKTU";
                poin = sesi.poinTepatWaktu;
              } else {
                statusWaktu = "TELAT";
                poin = sesi.poinTelat;
              }
            } else if (rand < PROB_HADIR + PROB_IZIN) {
              statusKehadiran = "IZIN";
              keterangan = "Izin orang tua";
            } else if (rand < PROB_HADIR + PROB_IZIN + PROB_SAKIT) {
              statusKehadiran = "SAKIT";
              keterangan = "Surat dokter";
            } else if (rand < PROB_HADIR + PROB_IZIN + PROB_SAKIT + PROB_ALFA) {
              statusKehadiran = "ALFA";
              poin = sesi.poinAlfa;
            } else if (
              rand <
              PROB_HADIR + PROB_IZIN + PROB_SAKIT + PROB_ALFA + PROB_LAINNYA
            ) {
              statusKehadiran = "LAINNYA";
              keterangan = "Lainnya";
            } else {
              statusKehadiran = "TIDAK_HADIR";
              poin = sesi.poinAlfa;
            }

            const jamMulai = sesi.waktuMulai
              ? sesi.waktuMulai.split(":")
              : ["06", "00", "00"];
            const jamAcak =
              parseInt(jamMulai[0] ?? "0") + Math.floor(Math.random() * 2);
            const menitAcak = Math.floor(Math.random() * 60);
            const detikAcak = Math.floor(Math.random() * 60);
            const waktuScan = new Date(
              `${tgl}T${String(jamAcak).padStart(2, "0")}:${String(menitAcak).padStart(2, "0")}:${String(detikAcak).padStart(2, "0")}`,
            );

            logDummy.push({
              id: crypto.randomUUID(),
              pesertaDidikId: peserta.id,
              waliAsuhId: null,
              sesiId: sesi.id,
              pelanggaranId: null,
              tanggal: tgl,
              waktuScan,
              statusKehadiran,
              statusWaktu,
              isPoinManual: false,
              poinDidapat: poin,
              keterangan,
            });
            comboSet.add(key);
          });
        });

        // Log Pelanggaran (15% peserta)
        if (Math.random() < 0.15) {
          const pelanggaranAcak = randomEl(allPelanggaran);
          const tglAcak = randomEl(tanggalList);
          const jam = 8 + Math.floor(Math.random() * 12);
          const menit = Math.floor(Math.random() * 60);
          const waktu = new Date(
            `${tglAcak}T${String(jam).padStart(2, "0")}:${String(menit).padStart(2, "0")}:00`,
          );
          logDummy.push({
            id: crypto.randomUUID(),
            pesertaDidikId: peserta.id,
            waliAsuhId: null,
            sesiId: null,
            pelanggaranId: pelanggaranAcak.id,
            tanggal: tglAcak,
            waktuScan: waktu,
            statusKehadiran: "HADIR",
            statusWaktu: null,
            isPoinManual: false,
            poinDidapat: pelanggaranAcak.poinMinus,
            keterangan: `Melanggar: ${pelanggaranAcak.namaPelanggaran}`,
          });
        }
      });

      console.log(`Total entri log yang akan dimasukkan: ${logDummy.length}`);

      const CHUNK_SIZE = 200;
      for (let i = 0; i < logDummy.length; i += CHUNK_SIZE) {
        const chunk = logDummy.slice(i, i + CHUNK_SIZE);
        await db.insert(logAbsensi).values(chunk).onConflictDoNothing();
        console.log(
          `   ✔️ Chunk ${Math.floor(i / CHUNK_SIZE) + 1} selesai (${i + chunk.length}/${logDummy.length})`,
        );
      }

      console.log("✅ Data Log Absensi berhasil dimasukkan.");
    }

    console.log("🎉 Proses Seeding Selesai!");
    process.exit();
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat seeding:", error);
    process.exit(1);
  }
}

main();
