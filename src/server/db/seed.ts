import { db } from "./index";
import { kategoriAbsensi, sesiAbsensi } from "./schema";

async function main() {
  console.log("🌱 Memulai proses seeding data master...");

  const insertedKategori = await db
    .insert(kategoriAbsensi)
    .values([
      { namaKategori: "Absen Solat", isActive: true },
      { namaKategori: "Absen Makan", isActive: true },
      { namaKategori: "Absen Kegiatan", isActive: true },
    ])
    .returning();

  const idSolat = insertedKategori.find(
    (k) => k.namaKategori === "Absen Solat",
  )!.id;
  const idMakan = insertedKategori.find(
    (k) => k.namaKategori === "Absen Makan",
  )!.id;
  const idKegiatan = insertedKategori.find(
    (k) => k.namaKategori === "Absen Kegiatan",
  )!.id;

  // 3. Seed Data Sesi Absensi dengan Waktu Mulai & Selesai
  console.log("Menambahkan data Sesi Absensi...");
  await db.insert(sesiAbsensi).values([
    // === ABSEN SOLAT ===
    {
      kategoriId: idSolat,
      namaSesi: "Subuh",
      waktuMulai: "04:00:00",
      waktuSelesai: "06:00:00",
    },
    {
      kategoriId: idSolat,
      namaSesi: "Dhuha",
      waktuMulai: "07:00:00",
      waktuSelesai: "11:30:00",
    },
    {
      kategoriId: idSolat,
      namaSesi: "Dzuhur",
      waktuMulai: "12:00:00",
      waktuSelesai: "15:00:00",
    },
    {
      kategoriId: idSolat,
      namaSesi: "Ashar",
      waktuMulai: "15:30:00",
      waktuSelesai: "17:30:00",
    },
    {
      kategoriId: idSolat,
      namaSesi: "Magrib",
      waktuMulai: "18:00:00",
      waktuSelesai: "19:15:00",
    },
    {
      kategoriId: idSolat,
      namaSesi: "Isya",
      waktuMulai: "19:30:00",
      waktuSelesai: "21:00:00",
    },

    // === ABSEN MAKAN ===
    {
      kategoriId: idMakan,
      namaSesi: "Makan Pagi",
      waktuMulai: "05:30:00",
      waktuSelesai: "07:00:00",
    },
    {
      kategoriId: idMakan,
      namaSesi: "Makan Siang",
      waktuMulai: "12:30:00",
      waktuSelesai: "14:00:00",
    },
    {
      kategoriId: idMakan,
      namaSesi: "Makan Malam",
      waktuMulai: "18:30:00",
      waktuSelesai: "20:00:00",
    },

    // === ABSEN KEGIATAN ===
    {
      kategoriId: idKegiatan,
      namaSesi: "Absen Apel Pagi",
      waktuMulai: "06:45:00",
      waktuSelesai: "07:30:00",
    },
    {
      kategoriId: idKegiatan,
      namaSesi: "Absen Apel Sore",
      waktuMulai: "16:00:00",
      waktuSelesai: "17:00:00",
    },
    {
      kategoriId: idKegiatan,
      namaSesi: "Absen Mentoring",
      waktuMulai: "20:00:00",
      waktuSelesai: "21:30:00",
    },
    {
      kategoriId: idKegiatan,
      namaSesi: "Absen Tidur",
      waktuMulai: "21:30:00",
      waktuSelesai: "23:00:00",
    },

    // Untuk kegiatan insidental, biarkan null. Frontend akan menampilkannya sebagai opsi ekstra.
    {
      kategoriId: idKegiatan,
      namaSesi: "Absen Kegiatan Lainnya 1",
      waktuMulai: null,
      waktuSelesai: null,
    },
    {
      kategoriId: idKegiatan,
      namaSesi: "Absen Kegiatan Lainnya 2",
      waktuMulai: null,
      waktuSelesai: null,
    },
    {
      kategoriId: idKegiatan,
      namaSesi: "Absen Kegiatan Lainnya 3",
      waktuMulai: null,
      waktuSelesai: null,
    },
  ]);

  console.log("✅ Seeding data master selesai!");
  process.exit();
}

void main();
