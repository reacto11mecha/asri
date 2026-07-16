import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// Tipe untuk satu baris di tabel
type TableRow = (
  | string
  | number
  | { content: string; colSpan: number; styles: Record<string, unknown> }
)[];

interface PdfDataPayload {
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

export async function generateLaporanSesiPdf(data: PdfDataPayload) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  const tambahanJarakDariLogo = 8;
  const centerX = pageWidth / 2 + tambahanJarakDariLogo;

  doc.setTextColor(0, 0, 0);

  // 1. KOP SURAT
  try {
    const logoKiri = await getBase64ImageFromUrl("/logo-kemensos.png");
    doc.addImage(logoKiri, "PNG", 15, 10, 25, 25);
  } catch (e) {
    console.warn("Gagal memuat gambar logo, melanjutkan tanpa logo.");
  }

  // Baris 1: KEMENTERIAN... (Font 16)
  // Baseline referensi awal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("KEMENTERIAN SOSIAL REPUBLIK INDONESIA", centerX, 15, {
    align: "center",
  });

  // Baris 2: PUSAT PENDIDIKAN... (Font 12)
  // Jarak +5.5 dari baris sebelumnya
  doc.setFontSize(12);
  doc.text(
    "PUSAT PENDIDIKAN, PELATIHAN DAN PENGEMBANGAN PROFESI",
    centerX,
    20.5,
    { align: "center" },
  );

  // Baris 3: SEKOLAH RAKYAT... (Font 12)
  // Jarak +5.0 (didekatkan sedikit agar padat seperti gambar)
  doc.setFontSize(12);
  doc.text("SEKOLAH RAKYAT TERINTEGRASI 1 KABUPATEN BEKASI", centerX, 25.5, {
    align: "center",
  });

  // Baris 4: Alamat atas (Font 9)
  // Jarak +4.5 (font mengecil menjadi 9, jadi lompatan Y harus dikurangi agar tidak ada ruang kosong)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Alamat: Komplek Perkantoran Pemerintah Kabupaten Bekasi, Desa Sukamahi, Kecamatan Cikarang",
    centerX,
    30,
    { align: "center" },
  );

  // Baris 5: Alamat bawah / Email (Font 9, Email Biru & Underline)
  // Memecah string menjadi dua bagian
  const text1 = "Pusat, Kabupaten Bekasi, Jawa Barat 17531 - Email: ";
  const textEmail = "srt43kotabekasi@gmail.com";

  // Mengukur lebar masing-masing string di jsPDF
  const w1 = doc.getTextWidth(text1);
  const wEmail = doc.getTextWidth(textEmail);
  const totalWidth = w1 + wEmail;

  // Menghitung koordinat X awal agar total gabungan teks ini tepat berada di tengah (centerX)
  const startX = centerX - totalWidth / 2;

  // Cetak teks bagian pertama (Hitam)
  doc.setTextColor(0, 0, 0);
  doc.text(text1, startX, 34);

  // Cetak teks bagian email (Biru Link)
  doc.setTextColor(17, 85, 204); // Warna biru khas hyperlink Google
  doc.text(textEmail, startX + w1, 34);

  // Cetak garis bawah (Underline) untuk email
  doc.setDrawColor(17, 85, 204);
  doc.setLineWidth(0.2); // Garis tipis
  doc.line(startX + w1, 34.5, startX + totalWidth, 34.5); // Y diset 34.5 agar berada tepat di bawah teks

  // Garis Pembatas (Dikembalikan ke warna Hitam)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.0);
  doc.line(15, 37, pageWidth - 15, 37);

  // (PENTING) Kembalikan teks ke warna hitam pekat untuk tabel di bawahnya
  doc.setTextColor(0, 0, 0);

  // 2. METADATA LAPORAN
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("LAPORAN PRESENSI KEGIATAN SISWA", pageWidth / 2, 45, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const formattedDate = format(new Date(data.tanggal), "dd MMMM yyyy", {
    locale: localeId,
  });
  doc.text(
    `Target: ${data.targetLabel}  |  Kegiatan: ${data.sesiInfo.namaSesi} (${data.sesiInfo.kategori.namaKategori})  |  Tanggal Aktivitas: ${formattedDate}`,
    pageWidth / 2,
    51,
    { align: "center" },
  );

  // 3. TABEL DATA (tanpa NIPD, Jam Absen sebelum Status)
  const tableBody: TableRow[] = [];
  let currentTingkat = "";
  let counter = 1;

  data.studentsData.forEach((student) => {
    if (!data.isSpecificKelas && student.tingkat !== currentTingkat) {
      currentTingkat = student.tingkat;
      tableBody.push([
        {
          content: `--- KELAS / TINGKAT ${currentTingkat} ---`,
          colSpan: 6, // ⬅️ sesuaikan dengan jumlah kolom (6)
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
    if (statusDisplay === "HADIR" && student.statusWaktu === "TELAT") {
      statusDisplay = "TELAT";
    } else if (statusDisplay === "TIDAK_HADIR") {
      statusDisplay = "ALFA";
    }

    let jamAbsenDisplay = "-";
    if (
      student.waktuScan &&
      (statusDisplay === "HADIR" || statusDisplay === "TELAT")
    ) {
      jamAbsenDisplay = format(new Date(student.waktuScan), "HH:mm");
    }

    // Kolom: No, Nama, Kelas, Jam Absen, Status, Keterangan
    tableBody.push([
      counter++,
      student.namaLengkap,
      `${student.tingkat} ${student.namaKelas}`,
      jamAbsenDisplay,
      statusDisplay,
      student.keterangan || "-",
    ]);
  });

  // 4. HEADER TABEL DISESUAIKAN (6 kolom)
  autoTable(doc, {
    startY: 56,
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
    bodyStyles: {
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 }, // No
      1: { cellWidth: 50 }, // Nama Peserta (lebar untuk nama panjang)
      2: { halign: "center", cellWidth: 22 }, // Kelas
      3: { halign: "center", cellWidth: 22 }, // Jam Absen
      4: { halign: "center", cellWidth: 22 }, // Status
      5: { cellWidth: "auto" }, // Keterangan (menyesuaikan sisa)
    },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  // 5. BLOK PENGESAHAN
  let finalY =
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 15;

  if (finalY > 240) {
    doc.addPage();
    finalY = 30;
  }

  const signX = pageWidth - 75;

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const currentDate = format(new Date(), "dd MMMM yyyy", { locale: localeId });
  doc.text(`Bekasi, ${currentDate}`, signX, finalY);

  doc.text("Mengetahui,", signX, finalY + 5);
  doc.text("Kepala Sekolah", signX, finalY + 10);

  doc.setFont("helvetica", "bold");
  doc.text("Nilam Andini", signX, finalY + 30);

  doc.setFont("helvetica", "normal");
  doc.text("NIP. 198005232006042039", signX, finalY + 35);

  const safeLabel = data.targetLabel.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Laporan_Presensi_${safeLabel}_${data.tanggal}.pdf`);
}
