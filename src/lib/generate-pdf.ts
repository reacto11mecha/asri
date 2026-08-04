// src/lib/generate-pdf.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// ==========================================
// 1. INTERFACES & TYPES
// ==========================================

type TableRow = (
  | string
  | number
  | { content: string; colSpan: number; styles: Record<string, unknown> }
)[];

export interface PdfDataPayload {
  tanggal: string;
  targetLabel: string;
  sesiInfo: {
    namaSesi: string;
    kategori: { namaKategori: string };
  };
  studentsData: Array<{
    namaLengkap: string;
    tingkat: string;
    namaKelas: string;
    statusKehadiran: string | null;
    statusWaktu: string | null;
    waktuScan: Date | string | null;
    keterangan: string | null;
  }>;
  isSpecificKelas?: boolean;
}

export interface ProfilPeserta {
  namaLengkap: string;
  nipd: string | null;
  nisn: string | null;
  kelas: { tingkat: string; namaKelas: string; jenjang: string } | null;
  waliAsuh: { name: string | null } | null;
  jenisKelamin?: string | null;
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

export interface FormKasusValues {
  masalahUtama?: string;
  penyebabMasalah?: string;
  dampakBiologis?: string;
  dampakPsikologis?: string;
  dampakSosial?: string;
  dampakSpiritual?: string;
  tujuanUmum?: string;
  tujuanKhusus?: { value: string }[];
  rencanaKegiatan?: { value: string }[];
  intervensi?: { deskripsi: string }[];
  metodeMonev?: string[];
  hasilMonev?: { mingguKe: number; deskripsi: string }[];
  terminasiBiologis?: string;
  terminasiPsikologis?: string;
  terminasiSosial?: string;
  terminasiSpiritual?: string;
  kesimpulan?: string;
  tanggalTutup?: string | Date | null;
}

export interface KasusPdfPayload {
  pesertaDidik: ProfilPeserta;
  tanggalBuka: string | Date;
  formValues: FormKasusValues;
}

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function addKopSurat(doc: jsPDF, pageWidth: number): Promise<number> {
  const tambahanJarakDariLogo = 15;
  const centerX = pageWidth / 2 + tambahanJarakDariLogo;

  doc.setTextColor(0, 0, 0);

  try {
    const logoKiri = await getBase64ImageFromUrl("/logo-kemensos.png");
    doc.addImage(logoKiri, "PNG", 15, 10, 25, 25);
  } catch (e) {
    console.warn("Gagal memuat gambar logo, melanjutkan tanpa logo.");
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("KEMENTERIAN SOSIAL REPUBLIK INDONESIA", centerX, 15, {
    align: "center",
  });

  doc.setFontSize(12);
  doc.text(
    "PUSAT PENDIDIKAN, PELATIHAN DAN PENGEMBANGAN PROFESI",
    centerX,
    20.5,
    { align: "center" },
  );

  doc.text("SEKOLAH RAKYAT TERINTEGRASI 1 KABUPATEN BEKASI", centerX, 25.5, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Alamat: Jalan Wibawa Mukti, Kelurahan Sukamahi, Cikarang Pusat, Kab. Bekasi, Jawa Barat",
    centerX,
    30,
    { align: "center" },
  );

  const text1 = "POS : 17530 Email: ";
  const textEmail = "srt1kab.bekasi@gmail.com";

  const w1 = doc.getTextWidth(text1);
  const wEmail = doc.getTextWidth(textEmail);
  const totalWidth = w1 + wEmail;
  const startX = centerX - totalWidth / 2;

  doc.setTextColor(0, 0, 0);
  doc.text(text1, startX, 34);

  doc.setTextColor(17, 85, 204);
  doc.text(textEmail, startX + w1, 34);

  doc.setDrawColor(17, 85, 204);
  doc.setLineWidth(0.2);
  doc.line(startX + w1, 34.5, startX + totalWidth, 34.5);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.0);
  doc.line(15, 37, pageWidth - 15, 37);

  doc.setTextColor(0, 0, 0);

  return 45;
}

const inisialNama = (nama: string) => {
  const parts = nama.trim().split(/\s+/);
  return parts.map((p) => p.charAt(0).toUpperCase() + ".").join(" ");
};

// ==========================================
// 3. EXPORT GENERATOR FUNCTIONS
// ==========================================

export async function generateLaporanSesiPdf(data: PdfDataPayload) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  const startY = await addKopSurat(doc, pageWidth);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("LAPORAN PRESENSI KEGIATAN SISWA", pageWidth / 2, startY, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const formattedDate = format(new Date(data.tanggal), "dd MMMM yyyy", {
    locale: localeId,
  });
  doc.text(
    `${data.targetLabel}  | Kegiatan: ${data.sesiInfo.namaSesi} |  Tanggal: ${formattedDate}`,
    pageWidth / 2,
    startY + 6,
    { align: "center" },
  );

  const tableBody: TableRow[] = [];
  let currentTingkat = "";
  let counter = 1;

  data.studentsData.forEach((student) => {
    if (!data.isSpecificKelas && student.tingkat !== currentTingkat) {
      currentTingkat = student.tingkat;
      tableBody.push([
        {
          content: `--- KELAS / TINGKAT ${currentTingkat} ---`,
          colSpan: 6,
          styles: {
            halign: "center",
            fillColor: [240, 240, 240],
            fontStyle: "bold",
            textColor: [0, 0, 0],
          },
        },
      ]);
      counter = 1;
    }

    let statusDisplay = student.statusKehadiran || "ALFA";
    if (statusDisplay === "HADIR" && student.statusWaktu === "TELAT")
      statusDisplay = "TELAT";
    else if (statusDisplay === "TIDAK_HADIR") statusDisplay = "ALFA";

    let jamAbsenDisplay = "-";
    if (
      student.waktuScan &&
      (statusDisplay === "HADIR" || statusDisplay === "TELAT")
    ) {
      jamAbsenDisplay = format(new Date(student.waktuScan), "HH:mm");
    }

    tableBody.push([
      counter++,
      student.namaLengkap,
      `${student.tingkat} ${student.namaKelas}`,
      jamAbsenDisplay,
      statusDisplay,
      student.keterangan || "-",
    ]);
  });

  autoTable(doc, {
    startY: startY + 11,
    head: [
      ["No", "Nama Peserta", "Kelas", "Jam Absen", "Status", "Keterangan"],
    ],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      halign: "center",
    },
    bodyStyles: { textColor: [0, 0, 0], lineColor: [0, 0, 0] },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      1: { cellWidth: 50 },
      2: { halign: "center", cellWidth: 22 },
      3: { halign: "center", cellWidth: 22 },
      4: { halign: "center", cellWidth: 22 },
      5: { cellWidth: "auto" },
    },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  let finalY =
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 15;
  if (finalY > 240) {
    doc.addPage();
    finalY = 30;
  }

  const currentDate = format(new Date(), "dd MMMM yyyy", { locale: localeId });

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // -- Blok Tanda Tangan Kiri (Kepala Sekolah) --
  const signLeftX = 20;
  doc.text("Mengetahui,", signLeftX, finalY);
  doc.text("Kepala Sekolah", signLeftX, finalY + 5);
  doc.setFont("helvetica", "bold");
  doc.text("Nilam Andini", signLeftX, finalY + 25);
  doc.setFont("helvetica", "normal");
  doc.text("NIP. 198005232006042039", signLeftX, finalY + 30);

  // -- Blok Tanda Tangan Kanan (Koordinator Asrama) --
  const signX = pageWidth - 75;
  doc.text(`Bekasi, ${currentDate}`, signX, finalY);
  doc.text("Koordinator Asrama", signX, finalY + 5);
  doc.setFont("helvetica", "bold");
  doc.text("Idwar Hamzah", signX, finalY + 25);
  doc.setFont("helvetica", "normal");
  doc.text("NIP. 198106062025211063", signX, finalY + 30);

  const safeLabel = data.targetLabel.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Laporan_Presensi_${safeLabel}_${data.tanggal}.pdf`);
}

export async function generateMonevPDF(
  item: LaporanMonev,
  profil: ProfilPeserta,
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  let currentY = await addKopSurat(doc, pageWidth);

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
    const lines = doc.splitTextToSize(text, pageWidth - 20 - indent);
    doc.text(lines, indent, currentY);
    currentY += lines.length * 5 + 2;
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
  };

  // Helper Dinamis untuk Indentasi Jawaban
  const printQA = (question: string, answer: string | null) => {
    const text = answer && answer.trim() !== "" ? answer.trim() : "-";
    if (text === "-") {
      // Jika kosong, gabungkan strip di baris yang sama untuk hemat ruang
      doc.text(`${question} -`, 20, currentY);
      currentY += 6;
    } else {
      // Jika ada catatan, cetak pertanyaan, lalu turun satu baris untuk jawaban (indent = 25)
      doc.text(question, 20, currentY);
      currentY += 5;
      printMultiLine(text, 25);
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(
    "FORMULIR MONITORING PERKEMBANGAN ANAK ASUH",
    pageWidth / 2,
    currentY,
    { align: "center" },
  );

  currentY += 8;

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

  // Render Bagian E dengan Indentasi Dinamis
  printHeader("E. PERKEMBANGAN PEMECAHAN (MASALAH / KASUS)");
  printQA("1. Permasalahan:", item.masalahKasus);
  printQA("2. Penyebab:", item.penyebabKasus);
  printQA("3. Akibat:", item.akibatKasus);
  printQA("4. Langkah-langkah yang telah Dilakukan:", item.langkahKasus);
  printQA("5. Rencana Tindak Lanjut:", item.rencanaTindakLanjut);
  currentY += 2;

  // Render Bagian F dengan Indentasi Dinamis
  printHeader("F. PENILAIAN SECARA UMUM");
  printQA(
    "1. Kegiatan positif yang pernah dilakukan dan hadiah yang diperoleh:",
    item.kegiatanPositif,
  );
  printQA(
    "2. Pelanggaran yang pernah dilakukan dan sanksi yang diperoleh:",
    item.pelanggaranSanksi,
  );

  // Tanda Tangan Wali Asuh
  currentY += 10;
  if (currentY > 230) {
    doc.addPage();
    currentY = 25;
  }

  const signRightX = pageWidth - 80;
  const dateStr = format(new Date(), "dd MMMM yyyy", { locale: localeId });
  doc.text(`Bekasi, ${dateStr}`, signRightX, currentY);
  currentY += 6;
  doc.text("Wali Asuh,", signRightX, currentY);

  currentY += 18;

  doc.setFont("helvetica", "bold");
  // Nama Terang Tanpa Tanda Kurung
  doc.text(
    profil.waliAsuh?.name || "....................................",
    signRightX,
    currentY,
  );

  doc.save(
    `Monev_${item.monevKe}_${profil.namaLengkap.replace(/\s+/g, "_")}.pdf`,
  );
}

export async function generateKasusPDF(data: KasusPdfPayload) {
  const { pesertaDidik, tanggalBuka, formValues: d } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  let currentY = await addKopSurat(doc, pageWidth);

  const printHeader = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, 20, currentY);
    currentY += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };

  const printText = (text: string, x = 20, indent = 0) => {
    if (!text) text = "-";
    const lines = doc.splitTextToSize(text, pageWidth - 40 - indent);
    doc.text(lines, x + indent, currentY);
    currentY += lines.length * 5 + 2;
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("CATATAN PENANGANAN KASUS ANAK", pageWidth / 2, currentY, {
    align: "center",
  });

  currentY += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const kelasLengkap = `${pesertaDidik.kelas?.jenjang ?? "-"} ${pesertaDidik.kelas?.tingkat ?? "-"} ${pesertaDidik.kelas?.namaKelas ?? "-"}`;
  const identitas = [
    `Nama Wali Asuh : ${pesertaDidik.waliAsuh?.name || "-"}`,
    `Tanggal Buka Kasus : ${format(new Date(tanggalBuka), "dd MMMM yyyy", { locale: localeId })}`,
    `Nama Anak : ${inisialNama(pesertaDidik.namaLengkap)} (${pesertaDidik.jenisKelamin || "-"})`,
    `Kelas : ${kelasLengkap}`,
  ];
  identitas.forEach((line) => printText(line));
  currentY += 5;

  printHeader("1. Gambaran Permasalahan:");
  printText(`a. Permasalahan Utama:`);
  printText(d.masalahUtama || "-", 20, 5);
  printText(`b. Penyebab Masalah:`);
  printText(d.penyebabMasalah || "-", 20, 5);
  printText(`c. Dampak terhadap Anak:`);
  printText(`- Biologis/Fisik: ${d.dampakBiologis || "-"}`, 20, 5);
  printText(`- Psikologis: ${d.dampakPsikologis || "-"}`, 20, 5);
  printText(`- Sosial: ${d.dampakSosial || "-"}`, 20, 5);
  printText(`- Spiritual: ${d.dampakSpiritual || "-"}`, 20, 5);
  currentY += 5;

  printHeader("2. Rencana Intervensi:");
  printText(`a. Tujuan Umum:`);
  printText(d.tujuanUmum || "-", 20, 5);
  printText(`b. Tujuan Khusus:`);
  (d.tujuanKhusus || []).forEach((t, i) => {
    if (t.value) printText(`${i + 1}. ${t.value}`, 20, 5);
  });
  printText(`c. Rencana Kegiatan:`);
  (d.rencanaKegiatan || []).forEach((r, i) => {
    if (r.value) printText(`${i + 1}. ${r.value}`, 20, 5);
  });
  currentY += 5;

  printHeader("3. Intervensi yang dilakukan:");
  (d.intervensi || []).forEach((int, i) => {
    if (int.deskripsi) printText(`Kegiatan/Aktivitas ${i + 1}:`);
    printText(int.deskripsi, 20, 5);
  });
  currentY += 5;

  printHeader("4. Monitoring dan Evaluasi (Monev):");
  printText(`a. Metode Monev: ${(d.metodeMonev || []).join(", ") || "-"}`);
  printText(`b. Hasil Monev:`);
  (d.hasilMonev || []).forEach((hm) => {
    printText(`Minggu ${hm.mingguKe}:`);
    printText(hm.deskripsi || "-", 20, 5);
  });
  currentY += 5;

  printHeader("5. Terminasi (Pengakhiran kasus):");
  printText(`a. Gambaran kondisi saat terminasi:`);
  printText(`- Biologis/Fisik: ${d.terminasiBiologis || "-"}`, 20, 5);
  printText(`- Psikologis: ${d.terminasiPsikologis || "-"}`, 20, 5);
  printText(`- Sosial: ${d.terminasiSosial || "-"}`, 20, 5);
  printText(`- Spiritual: ${d.terminasiSpiritual || "-"}`, 20, 5);
  printText(`b. Kesimpulan:`);
  printText(d.kesimpulan || "-", 20, 5);

  if (d.tanggalTutup) {
    printText(
      `Tanggal Penutupan Kasus: ${format(new Date(d.tanggalTutup), "dd MMMM yyyy", { locale: localeId })}`,
    );
  } else {
    printText(`Tanggal Penutupan Kasus: - (Masih Aktif)`);
  }

  currentY += 15;
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  }

  doc.text("Tanda Tangan Wali Asuh,", 20, currentY);
  currentY += 5;
  doc.text(
    `Bekasi, ${format(new Date(), "dd MMMM yyyy", { locale: localeId })}`,
    20,
    currentY,
  );

  // Memberikan ruang kosong untuk tanda tangan fisik (pengganti titik-titik)
  currentY += 20;

  // Mencetak nama wali asuh (dibuat bold agar seragam)
  doc.setFont("helvetica", "bold");
  doc.text(pesertaDidik.waliAsuh?.name || "Nama Wali", 20, currentY);

  doc.save(
    `Laporan_Kasus_${pesertaDidik.namaLengkap.replace(/\s+/g, "_")}.pdf`,
  );
}
