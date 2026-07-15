"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Download, Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { generateLaporanSesiPdf } from "~/lib/generate-pdf";
import { toast } from "sonner";
import { format } from "date-fns";

export default function RekapPage() {
  const utils = api.useUtils();

  const [excelJenjang, setExcelJenjang] = useState<"SD" | "SMP" | "SMA">("SMP");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [pdfJenjang, setPdfJenjang] = useState<"SD" | "SMP" | "SMA">("SMP");
  const [pdfKelasId, setPdfKelasId] = useState<string>("ALL"); // <--- STATE BARU
  const [pdfTanggal, setPdfTanggal] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [pdfSesiId, setPdfSesiId] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Tarik data Sesi
  const { data: formOptions, isLoading: loadingOptions } =
    api.aktivitas.getFormOptions.useQuery();
  const daftarSesi = formOptions?.kategori.flatMap((k) => k.sesi) || [];

  // Tarik data Kelas berdasarkan Jenjang PDF
  const { data: filterOptions } = api.insight.getFilterOptions.useQuery({
    jenjang: pdfJenjang,
  });
  const daftarKelas = filterOptions?.kelasData || [];

  // Reset kelas jika jenjang diubah
  useEffect(() => {
    setPdfKelasId("ALL");
  }, [pdfJenjang]);

  const excelMutation = api.rekap.generateExcel.useMutation({
    onSuccess: (base64, variables) => {
      try {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Rekap_Presensi_${variables.jenjang}_${variables.startDate}_${variables.endDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success("File Excel berhasil diunduh");
      } catch {
        toast.error("Gagal memproses file Excel");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleDownloadExcel = (e: React.SubmitEvent) => {
    e.preventDefault();
    excelMutation.mutate({ jenjang: excelJenjang, startDate, endDate });
  };

  const handleDownloadPdf = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!pdfSesiId)
      return toast.error("Silakan pilih sesi kegiatan terlebih dahulu!");

    try {
      setIsGeneratingPdf(true);
      toast.loading("Mempersiapkan dokumen PDF...", { id: "pdf-toast" });

      // Cek label target (Semua Jenjang vs Kelas Spesifik)
      const isSemuaKelas = pdfKelasId === "ALL";
      let targetLabel = `Jenjang ${pdfJenjang}`;
      if (!isSemuaKelas) {
        const kelasTerpilih = daftarKelas.find((k) => k.id === pdfKelasId);
        if (kelasTerpilih) {
          targetLabel = `Kelas ${kelasTerpilih.tingkat} ${kelasTerpilih.namaKelas}`;
        }
      }

      const pdfData = await utils.rekap.getDataPdfSesi.fetch({
        tanggal: pdfTanggal,
        jenjang: pdfJenjang,
        sesiId: pdfSesiId,
        kelasId: isSemuaKelas ? undefined : pdfKelasId,
      });

      await generateLaporanSesiPdf({
        tanggal: pdfTanggal,
        targetLabel: targetLabel,
        sesiInfo: pdfData.sesiInfo,
        studentsData: pdfData.studentsData,
        isSpecificKelas: pdfKelasId !== "ALL",
      });

      toast.success("File PDF berhasil diunduh!", { id: "pdf-toast" });
    } catch (error) {
      console.error(error);
      toast.error("Gagal membuat PDF. Pastikan data tersedia.", {
        id: "pdf-toast",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Rekap & Laporan Absensi</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Unduh rekap data mentah (Excel) untuk keperluan inspeksi atau cetak
          dokumen pengesahan (PDF).
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
        {/* CARD EXCEL (Sama seperti sebelumnya) */}
        <Card className="border-t-4 border-t-emerald-500 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-emerald-700">
              <FileSpreadsheet className="h-5 w-5" /> Rekap Berkala (Excel)
            </CardTitle>
            <CardDescription>
              Menghasilkan matriks harian per anak. Cocok untuk inspeksi
              mingguan/bulanan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDownloadExcel} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="excelJenjang">Jenjang</Label>
                <Select
                  value={excelJenjang}
                  onValueChange={(val) =>
                    setExcelJenjang(val as typeof excelJenjang)
                  }
                >
                  <SelectTrigger id="excelJenjang" className="w-full">
                    <SelectValue placeholder="Pilih Jenjang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SD">SD</SelectItem>
                    <SelectItem value="SMP">SMP</SelectItem>
                    <SelectItem value="SMA">SMA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Tanggal Mulai</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Tanggal Selesai</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={excelMutation.isPending}
              >
                {excelMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {excelMutation.isPending
                  ? "Mengekspor..."
                  : "Unduh Rekap Excel"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* CARD PDF DENGAN TAMBAHAN DROPDOWN KELAS */}
        <Card className="border-t-4 border-t-rose-500 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-rose-700">
              <FileText className="h-5 w-5" /> Dokumen Pengesahan (PDF)
            </CardTitle>
            <CardDescription>
              Laporan spesifik satu sesi kegiatan untuk ditandatangani Kepala
              Sekolah.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDownloadPdf} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pdfJenjang">Jenjang Target</Label>
                  <Select
                    value={pdfJenjang}
                    onValueChange={(val) =>
                      setPdfJenjang(val as typeof pdfJenjang)
                    }
                  >
                    <SelectTrigger id="pdfJenjang" className="w-full">
                      <SelectValue placeholder="Pilih Jenjang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SD">SD</SelectItem>
                      <SelectItem value="SMP">SMP</SelectItem>
                      <SelectItem value="SMA">SMA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* TAMBAHAN DROPDOWN KELAS */}
                <div className="space-y-2">
                  <Label htmlFor="pdfKelas">Target Kelas</Label>
                  <Select
                    value={pdfKelasId}
                    onValueChange={(val) => setPdfKelasId(val ?? "ALL")}
                  >
                    <SelectTrigger id="pdfKelas" className="w-full">
                      <SelectValue>
                        {pdfKelasId === "ALL"
                          ? `Semua Kelas (${pdfJenjang})`
                          : daftarKelas.find((k) => k.id === pdfKelasId)
                            ? `Kelas ${daftarKelas.find((k) => k.id === pdfKelasId)!.tingkat} ${daftarKelas.find((k) => k.id === pdfKelasId)!.namaKelas}`
                            : "Pilih Kelas"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">
                        Semua Kelas ({pdfJenjang})
                      </SelectItem>
                      {daftarKelas.map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          Kelas {k.tingkat} {k.namaKelas}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pdfTanggal">Tanggal Aktivitas</Label>
                  <Input
                    id="pdfTanggal"
                    type="date"
                    value={pdfTanggal}
                    onChange={(e) => setPdfTanggal(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pdfSesi">Sesi Kegiatan</Label>
                  <Select
                    value={pdfSesiId}
                    onValueChange={(val) => setPdfSesiId(val ?? "")}
                  >
                    <SelectTrigger id="pdfSesi" className="w-full">
                      <SelectValue>
                        {pdfSesiId
                          ? (daftarSesi.find((s) => s.id === pdfSesiId)
                              ?.namaSesi ?? "Pilih Sesi")
                          : loadingOptions
                            ? "Memuat..."
                            : "Pilih Sesi"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {daftarSesi.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.namaSesi}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                className="mt-2 w-full bg-rose-600 hover:bg-rose-700"
                disabled={isGeneratingPdf || loadingOptions}
              >
                {isGeneratingPdf ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isGeneratingPdf ? "Menyusun Dokumen..." : "Buat Dokumen PDF"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
