import { db } from "./index";
import { kategoriAbsensi, sesiAbsensi, masterPelanggaran } from "./schema";
import crypto from "crypto";

async function main() {
  console.log("⏳ Memulai proses seeding database dengan skema baru...");

  try {
    // ==========================================
    // 1. SEEDING KATEGORI UTAMA
    // ==========================================
    console.log("Mempersiapkan data Kategori Absensi...");

    const katSolatId = crypto.randomUUID();
    const katMakanId = crypto.randomUUID();
    const katKegiatanId = crypto.randomUUID();

    const dataKategori = [
      { id: katSolatId, namaKategori: "Absen Solat", isActive: true },
      { id: katMakanId, namaKategori: "Absen Makan", isActive: true },
      { id: katKegiatanId, namaKategori: "Absen Kegiatan", isActive: true },
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
        poinMinus: -15, // Poin minus murni
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

    const dataSesi = [
      // --- KELOMPOK: ABSEN SOLAT (Wajib: Telat = Minus) ---
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Subuh",
        waktuMulai: "04:30:00",
        waktuSelesai: "05:15:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 25,
        poinTelat: -10, // Telat subuh dikurangi 10 poin
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Dhuha",
        waktuMulai: "06:30:00",
        waktuSelesai: "10:30:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 15,
        poinTelat: -5,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Zuhur",
        waktuMulai: "12:00:00",
        waktuSelesai: "13:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 15,
        poinTelat: -5,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Ashar",
        waktuMulai: "15:15:00",
        waktuSelesai: "16:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 15,
        poinTelat: -5,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Magrib",
        waktuMulai: "18:00:00",
        waktuSelesai: "18:45:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 15,
        poinTelat: -5,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katSolatId,
        namaSesi: "Isya",
        waktuMulai: "19:15:00",
        waktuSelesai: "20:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 15,
        poinTelat: -5,
      },

      // --- KELOMPOK: ABSEN MAKAN (Wajib: Telat = Minus) ---
      {
        id: crypto.randomUUID(),
        kategoriId: katMakanId,
        namaSesi: "Makan Pagi",
        waktuMulai: "05:30:00",
        waktuSelesai: "06:15:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 30,
        poinTelat: -10,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katMakanId,
        namaSesi: "Makan Siang",
        waktuMulai: "13:00:00",
        waktuSelesai: "14:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 30,
        poinTelat: -10,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katMakanId,
        namaSesi: "Makan Malam",
        waktuMulai: "18:45:00",
        waktuSelesai: "19:15:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 30,
        poinTelat: -10,
      },

      // --- KELOMPOK: ABSEN KEGIATAN (Wajib: Telat = Minus) ---
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Apel Pagi",
        waktuMulai: "06:15:00",
        waktuSelesai: "06:45:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 20,
        poinTelat: -10,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Apel Siang",
        waktuMulai: "14:00:00",
        waktuSelesai: "14:30:00",
        isMandatory: true,
        targetJenjang: ["SD"] as ("SD" | "SMP" | "SMA")[],
        poinTepatWaktu: 20,
        poinTelat: -10,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Apel Sore",
        waktuMulai: "16:00:00",
        waktuSelesai: "16:30:00",
        isMandatory: true,
        targetJenjang: ["SMP", "SMA"] as ("SD" | "SMP" | "SMA")[],
        poinTepatWaktu: 20,
        poinTelat: -10,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Mentoring",
        waktuMulai: "20:00:00",
        waktuSelesai: "21:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 25,
        poinTelat: -15, // Telat mentoring poin minus lebih besar
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Tidur",
        waktuMulai: "21:30:00",
        waktuSelesai: "22:00:00",
        isMandatory: true,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 85,
        poinTelat: -50, // Denda sangat besar jika keluyuran di jam tidur
      },

      // --- KELOMPOK: KEGIATAN LAINNYA (Tidak Wajib: Telat = 0) ---
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Kegiatan Tambahan 1",
        waktuMulai: null,
        waktuSelesai: null,
        isMandatory: false,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 10, // Tambahan poin murni
        poinTelat: 0, // Karena tidak wajib, telat tidak didenda
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Kegiatan Tambahan 2",
        waktuMulai: null,
        waktuSelesai: null,
        isMandatory: false,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 10,
        poinTelat: 0,
      },
      {
        id: crypto.randomUUID(),
        kategoriId: katKegiatanId,
        namaSesi: "Kegiatan Tambahan 3",
        waktuMulai: null,
        waktuSelesai: null,
        isMandatory: false,
        targetJenjang: semuaJenjang,
        poinTepatWaktu: 10,
        poinTelat: 0,
      },
    ];

    await db.insert(sesiAbsensi).values(dataSesi).onConflictDoNothing();
    console.log("✅ Data Sesi Jadwal berhasil dimasukkan.");

    console.log("🎉 Proses Seeding Selesai!");
    process.exit();
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat seeding:", error);
  }
}

main();
