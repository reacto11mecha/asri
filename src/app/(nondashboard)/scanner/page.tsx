"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { ArrowLeft, CheckCircle2, AlertCircle, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import { toast } from "sonner";
import { useBeep } from "~/hooks/use-beep";
import QrScanner from "qr-scanner";

const ScannerClient = dynamic(
  () => import("~/_components/scanner/scanner-client"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full animate-pulse items-center justify-center bg-white/10 text-white/50">
        Memuat Kamera...
      </div>
    ),
  },
);

export default function ScannerPage() {
  const router = useRouter();
  const utils = api.useUtils();

  const { playSuccess, playError, prewarm } = useBeep();

  const [lastFailedNipd, setLastFailedNipd] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);

  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("default");

  const [kategoriId, setKategoriId] = useState<string>("");
  const [sesiId, setSesiId] = useState<string>("");
  const [isConfigured, setIsConfigured] = useState(false);

  const [isPaused, setIsPaused] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [scanData, setScanData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchSesi, setSearchSesi] = useState("");

  const { data: options, isLoading } = api.aktivitas.getFormOptions.useQuery();

  const groupedSesi = useMemo(() => {
    if (!options?.kategori) return [];
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return options.kategori
      .map((k) => ({
        kategoriId: k.id,
        namaKategori: k.namaKategori,
        sesi: k.sesi.filter((s) => {
          // Jika tidak ada waktu, lewati filter waktu
          if (!s.waktuMulai || !s.waktuSelesai) {
            if (!searchSesi) return true;
            const keyword = searchSesi.toLowerCase();
            return (
              s.namaSesi.toLowerCase().includes(keyword) ||
              k.namaKategori.toLowerCase().includes(keyword)
            );
          }

          const [startH = 0, startM = 0] = s.waktuMulai.split(":").map(Number);
          const [endH = 0, endM = 0] = s.waktuSelesai.split(":").map(Number);

          if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM))
            return false;

          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;

          // Rentang waktu yang diizinkan
          if (currentMinutes < startMinutes - 30) return false;
          if (currentMinutes > endMinutes + 60) return false;

          if (!searchSesi) return true;
          const keyword = searchSesi.toLowerCase();
          return (
            s.namaSesi.toLowerCase().includes(keyword) ||
            k.namaKategori.toLowerCase().includes(keyword) ||
            `${s.waktuMulai} ${s.waktuSelesai}`.includes(keyword)
          );
        }),
      }))
      .filter((g) => g.sesi.length > 0);
  }, [options, searchSesi]);

  const selectedSesi = useMemo(() => {
    if (!sesiId) return null;
    for (const g of groupedSesi) {
      const found = g.sesi.find((s) => s.id === sesiId);
      if (found) return { ...found, namaKategori: g.namaKategori };
    }
    return null;
  }, [groupedSesi, sesiId]);

  const scanMutation = api.aktivitas.scanQr.useMutation({
    onSuccess: (data) => {
      setScanStatus("success");
      playSuccess();
      setScanData(data);
      utils.aktivitas.getRecentLogs.invalidate();
      setTimeout(() => {
        setScanStatus("idle");
        setScanData(null);
        setIsPaused(false);
      }, 1500);
    },
    onError: (error, variables) => {
      setScanStatus("error");
      playError();
      setErrorMessage(error.message);
      setLastFailedNipd(variables.nipd);
      setCooldownUntil(Date.now() + 5000);
    },
  });

  useEffect(() => {
    QrScanner.listCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setCameras(
            devices.map((d) => ({
              id: d.id,
              label: d.label || `Kamera ${d.id.slice(0, 8)}...`,
            })),
          );
        }
      })
      .catch((err) => {
        console.error("Gagal mendapatkan daftar kamera:", err);
        toast.error("Tidak dapat mengakses kamera");
      });
  }, []);

  const handleScan = (decodedText: string) => {
    if (isPaused || scanStatus !== "idle" || !kategoriId) return;
    if (decodedText === lastFailedNipd && Date.now() < cooldownUntil) return;

    if (decodedText !== "") {
      setIsPaused(true);
      scanMutation.mutate({
        nipd: decodedText,
        sesiId,
      });
    }
  };

  const resetError = () => {
    setScanStatus("idle");
    setErrorMessage("");
    setIsPaused(false);
  };

  const handleBackToSetup = () => {
    setIsConfigured(false);
    setLastFailedNipd(null);
    setCooldownUntil(0);
    setIsPaused(false);
    setSearchSesi("");
  };

  const cameraConfig =
    selectedCameraId === "default"
      ? { facingMode: "environment" }
      : { deviceId: { exact: selectedCameraId } };

  if (!isConfigured) {
    return (
      <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md shadow-lg md:max-w-lg">
          <CardContent className="flex flex-col gap-8 p-4 sm:p-8">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard/aktivitas")}
                className="text-muted-foreground hover:text-foreground mb-6 -ml-3"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dashboard
              </Button>
              <h1 className="mb-2 text-2xl font-bold">Persiapan Scanner</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Pilih sesi kegiatan dan perangkat kamera sebelum memulai.
              </p>
            </div>

            {isLoading ? (
              <p className="text-muted-foreground animate-pulse py-8 text-center">
                Memuat opsi kegiatan...
              </p>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-blue-600">
                    Pilih Kamera
                  </label>
                  <Select
                    value={selectedCameraId}
                    onValueChange={(val) => val && setSelectedCameraId(val)}
                  >
                    <SelectTrigger className="h-12 w-full border-blue-200 bg-blue-50/30">
                      <SelectValue placeholder="Pilih Kamera yang Digunakan">
                        {selectedCameraId === "default"
                          ? "Kamera Utama (Default)"
                          : cameras.find((c) => c.id === selectedCameraId)
                              ?.label || "Kamera Default"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default" className="py-3">
                        Kamera Utama (Default)
                      </SelectItem>
                      {cameras.map((cam) => (
                        <SelectItem
                          key={cam.id}
                          value={cam.id}
                          className="py-3"
                        >
                          {cam.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold">Sesi Kegiatan</label>
                  <Select
                    value={sesiId}
                    onValueChange={(val) => {
                      if (val) {
                        setSesiId(val);
                        for (const g of groupedSesi) {
                          const found = g.sesi.find((s) => s.id === val);
                          if (found) {
                            setKategoriId(g.kategoriId);
                            break;
                          }
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-12 w-full">
                      <SelectValue placeholder="Cari dan pilih sesi...">
                        {selectedSesi
                          ? `[${selectedSesi.namaKategori}] ${selectedSesi.namaSesi} (${selectedSesi.waktuMulai} - ${selectedSesi.waktuSelesai})`
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[350px]">
                      <div className="bg-popover sticky top-0 z-10 border-b p-2 shadow-sm">
                        <div className="relative">
                          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                          <Input
                            placeholder="Cari sesi atau kategori..."
                            value={searchSesi}
                            onChange={(e) => setSearchSesi(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="h-9 pl-9"
                          />
                        </div>
                      </div>
                      {groupedSesi.length > 0 ? (
                        groupedSesi.map((group) => (
                          <div key={group.kategoriId}>
                            <SelectGroup>
                              <SelectLabel className="text-muted-foreground text-xs font-semibold">
                                {group.namaKategori}
                              </SelectLabel>
                              {group.sesi.map((s) => (
                                <SelectItem
                                  key={s.id}
                                  value={s.id}
                                  className="py-3 pl-6"
                                >
                                  {s.namaSesi} ({s.waktuMulai} -{" "}
                                  {s.waktuSelesai})
                                </SelectItem>
                              ))}
                            </SelectGroup>
                            <SelectSeparator />
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground py-6 text-center text-sm">
                          Tidak ada sesi yang tersedia saat ini
                          {searchSesi ? ` untuk pencarian "${searchSesi}"` : ""}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="h-12 w-full text-base font-semibold"
                  disabled={!sesiId}
                  onClick={() => {
                    setIsConfigured(true);
                    prewarm();
                  }}
                >
                  Mulai Scanner
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tampilan scanner
  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-black p-4 pb-12">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 px-2 pt-4 text-white">
        <Button
          variant="ghost"
          className="text-white hover:bg-white/20 hover:text-white"
          onClick={handleBackToSetup}
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> Ganti Sesi
        </Button>
        <div className="text-right">
          <p className="text-lg font-bold">
            {selectedSesi
              ? `${selectedSesi.namaKategori} - ${selectedSesi.namaSesi}`
              : ""}
          </p>
          <p className="text-sm text-green-400 opacity-80">Siap memindai...</p>
        </div>
      </div>

      <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl border-2 border-white/20 bg-gray-900 shadow-[0_0_40px_rgba(255,255,255,0.1)] sm:max-w-sm md:max-w-md lg:max-w-lg">
        <ScannerClient
          cameraConfig={cameraConfig}
          onScan={handleScan}
          isPaused={isPaused}
          onError={(msg) => {
            console.error("Kamera Error:", msg);
            toast.error("Akses Kamera Gagal", { description: msg });
          }}
        />

        {scanStatus === "success" && (
          <div className="animate-in zoom-in-95 absolute inset-0 z-10 flex flex-col items-center justify-center bg-green-600/95 text-white duration-200">
            <CheckCircle2 className="mb-6 h-24 w-24 text-green-100" />
            <p className="px-4 text-center text-2xl leading-tight font-bold">
              {scanData?.namaLengkap}
            </p>
            <p className="mt-2 text-lg opacity-90">
              {scanData?.kelas?.tingkat} {scanData?.kelas?.namaKelas} ({scanData?.kelas?.jenjang})
            </p>
          </div>
        )}

        {scanStatus === "error" && (
          <div className="animate-in zoom-in-95 absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-600/95 px-6 text-center text-white duration-200">
            <AlertCircle className="mb-4 h-20 w-20 text-red-200" />
            <p className="mb-3 text-xl font-bold">Gagal Memindai</p>
            <p className="mb-8 rounded-lg bg-black/20 p-3 text-base leading-relaxed opacity-90">
              {errorMessage}
            </p>
            <Button
              variant="secondary"
              onClick={resetError}
              className="h-12 w-full font-bold text-red-700 hover:bg-white"
            >
              Tutup & Lanjut Scan
            </Button>
          </div>
        )}

        {scanMutation.isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-white backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
              <p className="font-medium tracking-wide">Memverifikasi NIPD...</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 px-6 text-center text-white">
        <p className="text-base font-medium tracking-wide opacity-90">
          Arahkan NIPD (QR Code) ke dalam bingkai kamera.
        </p>
        <p className="mt-2 text-sm opacity-50">
          Sistem akan otomatis menyimpan saat terbaca.
        </p>
      </div>
    </div>
  );
}
