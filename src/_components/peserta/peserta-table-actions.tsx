// src/_components/peserta/peserta-table-actions.tsx
"use client";

import { useState, useRef } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Plus,
  Upload,
  Download,
  Loader2,
  Trash2,
  FileSpreadsheet,
  QrCode,
} from "lucide-react";
import Link from "next/link";
import type { InsertPesertaType } from "~/server/api/routers/peserta";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { toast } from "sonner";

// ⬇️ URUTAN KOLOM BARU: agama dipindah tepat setelah kelasId
const columnOrder = [
  "nipd",
  "namaLengkap",
  "kelasId",
  "agama", // ← pindah ke sini
  "nisn",
  "jenisKelamin",
  "tempatLahir",
  "tanggalLahir",
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
  const [showQrDialog, setShowQrDialog] = useState(false);

  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [delJenjang, setDelJenjang] = useState("SD");
  const [delTingkat, setDelTingkat] = useState("");
  const [delKelasId, setDelKelasId] = useState<string | undefined>(undefined);
  const [delKonfirmasi, setDelKonfirmasi] = useState("");

  const { data: daftarKelas = [] } = api.peserta.getAllKelas.useQuery();

  const selectedBulkDeleteKelasLabel = delKelasId
    ? (daftarKelas.find((k) => k.id === delKelasId)?.namaKelas ?? "Pilih Kelas")
    : "Semua";

  const deleteBanyakPesertaMutation =
    api.peserta.deleteBanyakPeserta.useMutation({
      onSuccess: (data) => {
        utils.peserta.getAll.invalidate();
        setShowBulkDeleteDialog(false);
        toast.success(`Berhasil menghapus ${data.deletedCount} peserta.`);
      },
      onError: (error) =>
        toast.error("Gagal menghapus peserta", { description: error.message }),
    });

  const base64ToBlob = (base64: string, mime: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
  };

  const triggerDownload = (base64: string, fileName: string, mime: string) => {
    const blob = base64ToBlob(base64, mime);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Mutation Excel
  const excelMutation = api.peserta.downloadExcel.useMutation({
    onSuccess: (base64) => {
      triggerDownload(
        base64,
        "Data_Peserta_Per_Jenjang.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    },
    onError: () => alert("Gagal mengunduh Excel"),
  });

  // Mutation QR ZIP
  const qrZipMutation = api.peserta.downloadQrZip.useMutation({
    onSuccess: (base64) => {
      triggerDownload(base64, "QR_Code_Peserta.zip", "application/zip");
    },
    onError: () => alert("Gagal mengunduh QR Code"),
  });

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
          "Agama (WAJIB)",
          "Isi dengan salah satu pilihan: ISLAM, KRISTEN, KATOLIK, HINDU, BUDHA, KONGHUCU, LAINNYA. Jika tidak ada, gunakan ISLAM.",
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
          "Data Lainnya (NISN, NIK, dll)", // ⬅️ kata "Agama" dihapus dari sini
          "Bersifat opsional. Jika datanya tidak ada, biarkan sel tersebut kosong (jangan diisi tanda strip/dll).",
        ],
      ];

      petunjukData.forEach((row) => {
        const r = sheetPetunjuk.addRow(row);
        r.alignment = { wrapText: true, vertical: "top" };
        if (row[0]?.startsWith("---")) {
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
        "Agama (WAJIB)",
        "NISN",
        "Jenis_Kelamin",
        "Tempat_Lahir",
        "Tanggal_Lahir",
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
      sheetForm.getColumn(3).width = 45; // ID Kelas

      // --- SHEET 3: REFERENSI KELAS (tidak berubah) ---
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
            // Agama sekarang bisa dikirim apa adanya, validasi enum dilakukan oleh Zod di backend
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
        Gunakan template Excel untuk <i>bulk upload</i>.
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
          <Download className="mr-2 h-4 w-4" /> Template Excel
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
              <Plus className="mr-2 h-4 w-4" /> Tambah Manual
            </Link>
          }
          nativeButton={false}
        />

        {/* Tombol Unduh Excel */}
        <Button
          variant="outline"
          onClick={() => excelMutation.mutate()}
          disabled={excelMutation.isPending}
        >
          {excelMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-2 h-4 w-4" />
          )}
          Unduh Data Excel
        </Button>

        {/* Tombol Unduh QR ZIP */}
        <Button
          variant="outline"
          onClick={() => setShowQrDialog(true)}
          disabled={qrZipMutation.isPending}
        >
          {qrZipMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <QrCode className="mr-2 h-4 w-4" />
          )}
          Unduh QR Code (ZIP)
        </Button>
        <Button
          variant="outline"
          className="border-red-500 text-red-600 hover:bg-red-50"
          onClick={() => setShowBulkDeleteDialog(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Hapus Massal
        </Button>
      </div>

      {/* Dialog Konfirmasi QR */}
      <AlertDialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unduh QR Code Semua Peserta</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan mengunduh file ZIP berisi gambar QR untuk seluruh
              peserta aktif. Struktur folder: Jenjang → Tingkat → Kelas. Proses
              mungkin memerlukan beberapa saat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowQrDialog(false);
                qrZipMutation.mutate();
              }}
            >
              Unduh Sekarang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  <TableHead>Agama</TableHead>{" "}
                  {/* ⬅️ tambah kolom agama di preview */}
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
                    <TableCell>{p.agama}</TableCell> {/* ⬅️ tampilkan agama */}
                    <TableCell>{p.jenisKelamin}</TableCell>
                  </TableRow>
                ))}
                {previewData.length > 50 && (
                  <TableRow>
                    <TableCell
                      colSpan={5} // ⬅️ sesuaikan jumlah kolom
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
              onClick={() => createBanyakPesertaMutation.mutate(previewData)}
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

      <Dialog
        open={showBulkDeleteDialog}
        onOpenChange={(open) => {
          setShowBulkDeleteDialog(open);
          if (!open) {
            // Reset state saat dialog ditutup
            setDelJenjang("SD");
            setDelTingkat("");
            setDelKelasId(undefined);
            setDelKonfirmasi("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Hapus Massal Peserta</DialogTitle>
            <DialogDescription>
              Pilih kriteria peserta yang akan dihapus permanen. Data yang
              hilang akibat operasi ini tidak dapat dikembalikan lagi.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Jenjang */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Jenjang *
              </label>
              <Select
                value={delJenjang}
                onValueChange={(v) => {
                  if (v) setDelJenjang(v);
                  setDelTingkat("");
                  setDelKelasId(undefined);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SD">SD</SelectItem>
                  <SelectItem value="SMP">SMP</SelectItem>
                  <SelectItem value="SMA">SMA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tingkat */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Tingkat *
              </label>
              <Select
                value={delTingkat}
                onValueChange={(v) => {
                  if (v) setDelTingkat(v);
                  setDelKelasId(undefined);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tingkat" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ...new Set(
                      daftarKelas
                        .filter((k) => k.jenjang === delJenjang)
                        .map((k) => k.tingkat),
                    ),
                  ].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Kelas (opsional) */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Kelas (opsional)
              </label>
              <Select
                value={delKelasId ?? "all"}
                onValueChange={(v) =>
                  setDelKelasId(!v || v === "all" ? undefined : v)
                }
              >
                <SelectTrigger>
                  <SelectValue>{selectedBulkDeleteKelasLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {daftarKelas
                    .filter(
                      (k) =>
                        k.jenjang === delJenjang && k.tingkat === delTingkat,
                    )
                    .map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.namaKelas}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Konfirmasi */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Ketik{" "}
                <strong className="text-red-600">HAPUS PESERTA DIDIK</strong>{" "}
                untuk melanjutkan
              </label>
              <input
                type="text"
                className="border-input w-full rounded-md border px-3 py-2 text-sm"
                value={delKonfirmasi}
                onChange={(e) => setDelKonfirmasi(e.target.value)}
                placeholder="HAPUS"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowBulkDeleteDialog(false)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={
                delKonfirmasi !== "HAPUS PESERTA DIDIK" ||
                !delJenjang ||
                !delTingkat
              }
              onClick={() => {
                deleteBanyakPesertaMutation.mutate({
                  jenjang: delJenjang as "SD" | "SMP" | "SMA",
                  tingkat: delTingkat,
                  kelasId: delKelasId,
                  konfirmasi: "HAPUS PESERTA DIDIK",
                });
              }}
            >
              {deleteBanyakPesertaMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Hapus Permanen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
