// src/lib/generate-monev-pdf.ts
import jsPDF from "jspdf";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export interface ProfilPeserta {
  namaLengkap: string;
  nipd: string | null;
  nisn: string | null;
  kelas: { tingkat: string; namaKelas: string; jenjang: string } | null;
  waliAsuh: { name: string | null } | null;
}

export interface LaporanMonev {
  monevKe: number;
  periodeBulan: string;
  periodeTahun: string;
  totalSkorAdl: number;
  totalSkorSosial: number;
  totalSkorMental: number;
  totalSkorVokasional: number;
  totalSkorKeseluruhan: number;
  masalahKasus: string | null;
  penyebabKasus: string | null;
  akibatKasus: string | null;
  langkahKasus: string | null;
  rencanaTindakLanjut: string | null;
  kegiatanPositif: string | null;
  pelanggaranSanksi: string | null;
  author?: { name: string | null } | null;
}

export const generateMonevPDF = (item: LaporanMonev, profil: ProfilPeserta) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 20;

  // --- Helper Functions ---
  const printHeader = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, 20, currentY);
    currentY += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };

  const printAligned = (label: string, value: string, labelWidth = 65) => {
    doc.text(label, 20, currentY);
    doc.text(": " + (value || "-"), labelWidth, currentY);
    currentY += 6;
  };

  const printMultiLine = (text: string, indent = 20) => {
    if (!text) text = "-";
    const lines = doc.splitTextToSize(text, pageWidth - 20 - indent);
    doc.text(lines, indent, currentY);
    currentY += lines.length * 5 + 2;
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
  };

  const getKategori = (
    skor: number,
    thresholds: [number, number, number, number],
  ) => {
    if (skor <= thresholds[0]) return "Sangat Kurang";
    if (skor <= thresholds[1]) return "Kurang";
    if (skor <= thresholds[2]) return "Cukup";
    if (skor <= thresholds[3]) return "Baik";
    return "Sangat Baik";
  };

  // --- 1. Judul Dokumen ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(
    "FORMULIR MONITORING PERKEMBANGAN ANAK ASUH",
    pageWidth / 2,
    currentY,
    {
      align: "center",
    },
  );
  currentY += 12;

  // --- 2. Identitas ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  printAligned("Nama Anak", profil.namaLengkap, 50);
  printAligned(
    "NIPD / NISN",
    `${profil.nipd} ${profil.nisn ? `/ ${profil.nisn}` : ""}`,
    50,
  );
  printAligned(
    "Kelas",
    `${profil.kelas?.tingkat || ""} ${profil.kelas?.namaKelas || ""}`,
    50,
  );
  printAligned("Monev Ke", item.monevKe.toString(), 50);

  const namaBulan = new Date(0, parseInt(item.periodeBulan) - 1).toLocaleString(
    "id-ID",
    { month: "long" },
  );
  printAligned("Bulan / Tahun", `${namaBulan} ${item.periodeTahun}`, 50);
  currentY += 5;

  // --- 3. Rekapitulasi Skor ---
  printHeader("REKAPITULASI SKOR PERKEMBANGAN (Bagian A - D)");
  const katAdl = getKategori(item.totalSkorAdl, [9, 18, 27, 36]);
  printAligned(
    "A. ADL (Activities Daily Living)",
    `${item.totalSkorAdl} / 45 (${katAdl})`,
    75,
  );

  const katSosial = getKategori(item.totalSkorSosial, [12, 24, 36, 48]);
  printAligned(
    "B. Aspek Sosial",
    `${item.totalSkorSosial} / 60 (${katSosial})`,
    75,
  );

  const katMental = getKategori(item.totalSkorMental, [18, 36, 54, 72]);
  printAligned(
    "C. Aspek Mental",
    `${item.totalSkorMental} / 90 (${katMental})`,
    75,
  );

  const katVokasional = getKategori(item.totalSkorVokasional, [14, 28, 42, 56]);
  printAligned(
    "D. Aspek Vokasional",
    `${item.totalSkorVokasional} / 70 (${katVokasional})`,
    75,
  );

  doc.setFont("helvetica", "bold");
  printAligned("TOTAL KESELURUHAN", item.totalSkorKeseluruhan.toString(), 75);
  doc.setFont("helvetica", "normal");
  currentY += 5;

  // --- 4. Bagian E ---
  printHeader("E. PERKEMBANGAN PEMECAHAN (MASALAH / KASUS)");
  doc.text("1. Permasalahan:", 20, currentY);
  currentY += 5;
  printMultiLine(item.masalahKasus || "-", 25);

  doc.text("2. Penyebab:", 20, currentY);
  currentY += 5;
  printMultiLine(item.penyebabKasus || "-", 25);

  doc.text("3. Akibat:", 20, currentY);
  currentY += 5;
  printMultiLine(item.akibatKasus || "-", 25);

  doc.text("4. Langkah-langkah yang telah Dilakukan:", 20, currentY);
  currentY += 5;
  printMultiLine(item.langkahKasus || "-", 25);

  doc.text("5. Rencana Tindak Lanjut:", 20, currentY);
  currentY += 5;
  printMultiLine(item.rencanaTindakLanjut || "-", 25);
  currentY += 5;

  // --- 5. Bagian F ---
  printHeader("F. PENILAIAN SECARA UMUM");
  doc.text(
    "1. Kegiatan positif yang pernah dilakukan dan hadiah yang diperoleh:",
    20,
    currentY,
  );
  currentY += 5;
  printMultiLine(item.kegiatanPositif || "-", 25);

  doc.text(
    "2. Pelanggaran yang pernah dilakukan dan sanksi yang diperoleh:",
    20,
    currentY,
  );
  currentY += 5;
  printMultiLine(item.pelanggaranSanksi || "-", 25);
  currentY += 10;

  // --- 6. Tanda Tangan ---
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  const signRightX = pageWidth - 80;
  const dateStr = format(new Date(), "dd MMMM yyyy", { locale: localeId });

  // Titi mangsa
  doc.text(`Bekasi, ${dateStr}`, signRightX, currentY);
  currentY += 6;

  // Jabatan Penandatangan
  doc.text("Wali Asuh,", signRightX, currentY);

  // Spasi untuk tanda tangan
  currentY += 25;

  // Nama Terang
  doc.setFont("helvetica", "bold");
  doc.text(
    `(${profil.waliAsuh?.name || "...................................."})`,
    signRightX,
    currentY,
  );

  // --- 7. Simpan File ---
  doc.save(
    `Monev_${item.monevKe}_${profil.namaLengkap.replace(/\s+/g, "_")}.pdf`,
  );
};
