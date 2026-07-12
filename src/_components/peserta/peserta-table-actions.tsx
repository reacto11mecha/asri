"use client";

import { useState, useRef } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Plus, Upload, Download, Loader2 } from "lucide-react";
import Link from "next/link";
import type { InsertPesertaType } from "~/server/api/routers/peserta";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

const columnOrder = [
  "nipd",
  "namaLengkap",
  "kelasId",
  "nisn",
  "jenisKelamin",
  "tempatLahir",
  "tanggalLahir",
  "agama",
  "anakKe",
  "noAkte",
  "nik",
  "noKk",
  "alamat",
  "rt",
  "rw",
  "kelurahan",
  "kecamatan",
  "kodePos",
  "noTelp",
  "sekolahAsal",
  "namaIbu",
  "tempatLahirIbu",
  "tanggalLahirIbu",
  "pendidikanIbu",
  "pekerjaanIbu",
  "penghasilanIbu",
  "nikIbu",
  "namaAyah",
  "tempatLahirAyah",
  "tanggalLahirAyah",
  "pendidikanAyah",
  "pekerjaanAyah",
  "penghasilanAyah",
  "nikAyah",
] as const;

export function PesertaTableActions() {
  const utils = api.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewData, setPreviewData] = useState<InsertPesertaType[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // Ambil data kelas khusus untuk kebutuhan pembuatan Template Excel
  const { data: daftarKelas = [] } = api.peserta.getAllKelas.useQuery();

  const createBanyakPesertaMutation =
    api.peserta.createBanyakPeserta.useMutation({
      onSuccess: () => {
        utils.peserta.getAll.invalidate();
        setIsPreviewOpen(false);
        setPreviewData([]);
        alert("Berhasil mengunggah data peserta!");
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      onError: (error) =>
        alert("Gagal mengunggah data massal: " + error.message),
    });

  const handleDownloadTemplate = async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();

      // --- SHEET 1: PETUNJUK PENGISIAN ---
      const sheetPetunjuk = workbook.addWorksheet("1. Petunjuk Pengisian");
      sheetPetunjuk.columns = [
        { header: "KOLOM / ATURAN", key: "aturan", width: 35 },
        { header: "PENJELASAN & CONTOH", key: "penjelasan", width: 90 },
      ];
      sheetPetunjuk.getRow(1).font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      sheetPetunjuk.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" },
      };

      const petunjukData = [
        ["--- ATURAN UMUM ---", "MOHON BACA DENGAN SEKSAMA"],
        [
          "Lokasi Pengisian",
          "Isi data HANYA pada sheet '2. Formulir Peserta'. Mulai dari baris ke-2 ke bawah.",
        ],
        [
          "Kolom Wajib",
          "Kolom dengan label (WAJIB) tidak boleh dibiarkan kosong karena akan ditolak oleh sistem.",
        ],
        [
          "Jangan Ubah Header",
          "JANGAN merubah, menghapus, atau menukar urutan baris pertama (judul kolom) di sheet Formulir.",
        ],
        ["", ""],
        [
          "--- KAMUS DATA / PENJELASAN KOLOM ---",
          "KETERANGAN DAN CARA PENGISIAN",
        ],
        [
          "NIPD (WAJIB)",
          "Nomor Induk lokal peserta didik. Angka ini harus UNIK (tidak boleh ada NIPD yang sama antar anak).",
        ],
        [
          "Nama_Lengkap (WAJIB)",
          "Nama lengkap peserta didik sesuai Akta Kelahiran atau KK.",
        ],
        [
          "ID_Kelas (WAJIB)",
          "JANGAN ketik nama kelas (seperti 10 A). Buka sheet '3. Referensi Kelas', COPY kode ID kelas yang sesuai, lalu PASTE di kolom ini.",
        ],
        [
          "Jenis_Kelamin",
          "Isi dengan huruf kapital 'L' untuk Laki-laki atau 'P' untuk Perempuan.",
        ],
        [
          "Tanggal_Lahir",
          "Semua kolom yang mengandung unsur tanggal HARUS menggunakan format YYYY-MM-DD. (Contoh: 2012-05-24)",
        ],
        [
          "No_Telp",
          "Nomor telepon/WA. Gunakan awalan angka biasa, contoh: 08123456789.",
        ],
        [
          "Data Lainnya (Agama, NIK, dll)",
          "Bersifat opsional. Jika datanya tidak ada, biarkan sel tersebut kosong (jangan diisi tanda strip/dll).",
        ],
      ];

      petunjukData.forEach((row) => {
        const r = sheetPetunjuk.addRow(row);
        r.alignment = { wrapText: true, vertical: "top" };
        if (row[0].startsWith("---")) {
          r.font = { bold: true };
          r.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE2E8F0" },
          };
        }
      });
      await sheetPetunjuk.protect("sekolahrakyat", { selectLockedCells: true });

      // --- SHEET 2: FORMULIR PESERTA ---
      const sheetForm = workbook.addWorksheet("2. Formulir Peserta", {
        views: [{ state: "frozen", ySplit: 1 }],
      });
      const formHeaders = [
        "NIPD (WAJIB)",
        "Nama_Lengkap (WAJIB)",
        "ID_Kelas (WAJIB - Lihat Sheet Referensi)",
        "NISN",
        "Jenis_Kelamin",
        "Tempat_Lahir",
        "Tanggal_Lahir",
        "Agama",
        "Anak_Ke",
        "No_Akte",
        "NIK",
        "No_KK",
        "Alamat",
        "RT",
        "RW",
        "Kelurahan",
        "Kecamatan",
        "Kode_POS",
        "No_Telp",
        "Sekolah_Asal",
        "Nama_Ibu",
        "Tempat_Lahir_Ibu",
        "Tanggal_Lahir_Ibu",
        "Pendidikan_Ibu",
        "Pekerjaan_Ibu",
        "Penghasilan_Ibu",
        "NIK_Ibu",
        "Nama_Ayah",
        "Tempat_Lahir_Ayah",
        "Tanggal_Lahir_Ayah",
        "Pendidikan_Ayah",
        "Pekerjaan_Ayah",
        "Penghasilan_Ayah",
        "NIK_Ayah",
      ];

      sheetForm.addRow(formHeaders);
      sheetForm.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheetForm.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F172A" },
      };
      sheetForm.columns.forEach((column) => {
        column.width = 25;
      });
      sheetForm.getColumn(3).width = 45;

      // --- SHEET 3: REFERENSI KELAS ---
      const sheetKelas = workbook.addWorksheet("3. Referensi Kelas", {
        views: [{ state: "frozen", ySplit: 1 }],
      });
      sheetKelas.columns = [
        { header: "COPY ID INI KE SHEET FORMULIR", key: "id", width: 45 },
        { header: "Jenjang", key: "jenjang", width: 15 },
        { header: "Tingkat", key: "tingkat", width: 15 },
        { header: "Nama Kelas", key: "namaKelas", width: 25 },
      ];
      sheetKelas.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheetKelas.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF16A34A" },
      };

      daftarKelas.forEach((k) => {
        sheetKelas.addRow({
          id: k.id,
          jenjang: k.jenjang,
          tingkat: k.tingkat,
          namaKelas: k.namaKelas,
        });
      });
      await sheetKelas.protect("sekolahrakyat", { selectLockedCells: true });

      // --- PROSES UNDUH ---
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Template_Import_Peserta.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Gagal membuat Excel:", error);
      alert("Terjadi kesalahan saat membuat file Excel.");
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.getWorksheet("2. Formulir Peserta");
      if (!worksheet) {
        throw new Error(
          "Sheet '2. Formulir Peserta' tidak ditemukan. Pastikan Anda menggunakan template resmi.",
        );
      }

      const parsedData: InsertPesertaType[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const nipd = row.getCell(1).text?.trim();
        const namaLengkap = row.getCell(2).text?.trim();
        const kelasId = row.getCell(3).text?.trim();

        if (!nipd || !namaLengkap || !kelasId) return;

        const result = Object.fromEntries(
          columnOrder.map((key, index) => {
            const cellValue = row.getCell(index + 1).text?.trim();
            if (
              key === "tanggalLahir" ||
              key === "tanggalLahirAyah" ||
              key === "tanggalLahirIbu"
            ) {
              if (cellValue) return [key, new Date(cellValue).toISOString()];
              return [key, undefined];
            }
            return [key, cellValue || undefined];
          }),
        ) as InsertPesertaType;

        parsedData.push(result);
      });

      setPreviewData(parsedData);
      setIsPreviewOpen(true);
    } catch (error: any) {
      alert("Gagal membaca file: " + error.message);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="text-muted-foreground hidden text-sm sm:block">
        Gunakan template Excel untuk memastikan struktur kolom sesuai.
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <input
          type="file"
          accept=".xlsx"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />

        <Button variant="outline" onClick={handleDownloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Template Excel
        </Button>

        <Button
          variant="outline"
          className="border-primary/50 text-primary hover:bg-primary/10"
          onClick={() => fileInputRef.current?.click()}
          disabled={isParsing}
        >
          {isParsing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Import Excel
        </Button>

        <Button
          render={
            <Link href="/dashboard/peserta/tambah">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Manual
            </Link>
          }
          nativeButton={false}
        />
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Preview Data Import</DialogTitle>
            <DialogDescription>
              Ditemukan <strong>{previewData.length}</strong> data peserta yang
              siap dimasukkan ke sistem. Sistem akan otomatis mengabaikan data
              jika NIPD sudah ada di database.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader className="bg-muted sticky top-0">
                <TableRow>
                  <TableHead>NIPD</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>ID Kelas</TableHead>
                  <TableHead>L/P</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 50).map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">
                      {p.nipd}
                    </TableCell>
                    <TableCell>{p.namaLengkap}</TableCell>
                    <TableCell className="max-w-[150px] truncate font-mono text-xs">
                      {p.kelasId}
                    </TableCell>
                    <TableCell>{p.jenisKelamin}</TableCell>
                  </TableRow>
                ))}
                {previewData.length > 50 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground h-12 text-center text-sm"
                    >
                      ... dan {previewData.length - 50} data lainnya.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsPreviewOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() =>
                createBanyakPesertaMutation.mutate(previewData as any)
              }
              disabled={createBanyakPesertaMutation.isPending}
            >
              {createBanyakPesertaMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Unggah {previewData.length} Data Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
