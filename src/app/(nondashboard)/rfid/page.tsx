// src/app/(nondashboard)/rfid/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
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
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Search,
  Radio,
  Wrench,
} from "lucide-react";
import { useBeep } from "~/hooks/use-beep";
import { useRfidScanner } from "~/hooks/useRfidScanner";
import { useNativeMessage } from "~/hooks/useNativeMessage";
import type { ScanResult } from "~/types/scan";

type SesiPilihan = {
  id: string;
  namaSesi: string;
  waktuMulai: string | null;
  waktuSelesai: string | null;
  namaKategori: string;
};

export default function RfidPage() {
  const router = useRouter();
  const utils = api.useUtils();

  const { playSuccess, playError, prewarm } = useBeep();

  const [showDevTools, setShowDevTools] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [sesiId, setSesiId] = useState<string>("");
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [scanData, setScanData] = useState<ScanResult | null>(null);
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

  const selectedSesi: SesiPilihan | null = useMemo(() => {
    if (!sesiId) return null;
    for (const g of groupedSesi) {
      const found = g.sesi.find((s) => s.id === sesiId);
      if (found) return { ...found, namaKategori: g.namaKategori };
    }
    return null;
  }, [groupedSesi, sesiId]);

  const scanRfidMutation = api.aktivitas.scanRfid.useMutation({
    onSuccess: (data) => {
      setScanStatus("success");
      playSuccess();
      setScanData(data);
      utils.aktivitas.getRecentLogs.invalidate();
      setTimeout(() => {
        setScanStatus("idle");
        setScanData(null);
      }, 1500);
    },
    onError: (error) => {
      setScanStatus("error");
      playError();
      setErrorMessage(error.message);
    },
  });

  const handleScan = (uid: string) => {
    if (scanStatus !== "idle" || !sesiId) return;
    scanRfidMutation.mutate({ uidKartu: uid.toUpperCase(), sesiId });
  };

  const simulateTap = (uid: string) => {
    handleScan(uid);
  };

  useNativeMessage(handleScan);

  const { inputRef, handleInput } = useRfidScanner({
    onScan: handleScan,
    enabled: isConfigured && scanStatus === "idle",
  });

  const resetError = () => {
    setScanStatus("idle");
    setErrorMessage("");
  };

  const handleBackToSetup = () => {
    setIsConfigured(false);
    setSearchSesi("");
  };

  // ====================== SETUP VIEW ======================
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
              <h1 className="mb-2 text-2xl font-bold">Persiapan Tap RFID</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Pilih sesi kegiatan sebelum menempelkan kartu.
              </p>
            </div>

            {isLoading ? (
              <p className="text-muted-foreground animate-pulse py-8 text-center">
                Memuat opsi kegiatan...
              </p>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold">Sesi Kegiatan</label>
                  <Select
                    value={sesiId}
                    onValueChange={(val) => {
                      if (val) setSesiId(val);
                    }}
                  >
                    <SelectTrigger className="h-12 w-full">
                      <SelectValue placeholder="Cari dan pilih sesi...">
                        {selectedSesi
                          ? `[${selectedSesi.namaKategori}] ${selectedSesi.namaSesi} (${selectedSesi.waktuMulai ?? ""} - ${selectedSesi.waktuSelesai ?? ""})`
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
                  Mulai Tap RFID
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ====================== SCAN VIEW ======================
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 pb-12">
      {/* Tombol Dev Tools (hanya untuk development) */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute right-4 bottom-4 z-20">
          {!showDevTools ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-white/50 hover:text-white"
              onClick={() => setShowDevTools(true)}
              title="Dev Tools"
            >
              <Wrench className="h-5 w-5" />
            </Button>
          ) : (
            <div className="flex flex-col gap-2 rounded-lg bg-gray-800/90 p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70">Simulasi UID</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white/50"
                  onClick={() => setShowDevTools(false)}
                >
                  ✕
                </Button>
              </div>
              <div className="flex flex-col gap-1">
                {/* Tombol UID contoh - sesuaikan dengan data di database Anda */}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/20 text-xs text-white hover:bg-white/10 hover:text-white/90"
                  onClick={() => simulateTap("A1B2C3D4")}
                >
                  A1B2C3D4
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/20 text-xs text-white hover:bg-white/10 hover:text-white/90"
                  onClick={() => simulateTap("12345678")}
                >
                  12345678
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
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
          <p className="text-sm text-green-400 opacity-80">
            Tempelkan kartu...
          </p>
        </div>
      </div>

      <div className="relative mt-8 flex aspect-square w-full max-w-sm items-center justify-center rounded-2xl border-2 border-white/20 bg-gray-900 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
        {/* Input tersembunyi */}
        <input
          ref={inputRef}
          type="text"
          className="absolute inset-0 cursor-default opacity-0"
          onInput={handleInput}
          autoComplete="off"
          aria-hidden="true"
        />

        {/* Indikator tap */}
        <div className="flex flex-col items-center gap-4 text-white">
          <Radio className="h-16 w-16 animate-pulse text-blue-400" />
          <p className="text-xl font-semibold tracking-widest">TAP KARTU</p>
        </div>

        {/* Overlay sukses */}
        {scanStatus === "success" && scanData && (
          <div className="animate-in zoom-in-95 absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-green-600/95 text-white duration-200">
            <CheckCircle2 className="mb-6 h-24 w-24 text-green-100" />
            <p className="px-4 text-center text-2xl leading-tight font-bold">
              {scanData.namaLengkap}
            </p>
            <p className="mt-2 text-lg opacity-90">
              {scanData.kelas.tingkat} {scanData.kelas.namaKelas} (
              {scanData.kelas.jenjang})
            </p>
          </div>
        )}

        {/* Overlay error */}
        {scanStatus === "error" && (
          <div className="animate-in zoom-in-95 absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-red-600/95 px-6 text-center text-white duration-200">
            <AlertCircle className="mb-4 h-20 w-20 text-red-200" />
            <p className="mb-3 text-xl font-bold">Gagal</p>
            <p className="mb-8 rounded-lg bg-black/20 p-3 text-base leading-relaxed opacity-90">
              {errorMessage}
            </p>
            <Button
              variant="secondary"
              onClick={resetError}
              className="h-12 w-full font-bold text-red-700 hover:bg-white"
            >
              Tutup & Lanjut
            </Button>
          </div>
        )}

        {/* Loading */}
        {scanRfidMutation.isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/70 text-white backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
              <p className="font-medium tracking-wide">
                Memverifikasi kartu...
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 px-6 text-center text-white">
        <p className="text-base font-medium tracking-wide opacity-90">
          Tempelkan kartu RFID/NFC ke pembaca.
        </p>
        <p className="mt-2 text-sm opacity-50">
          UID kartu akan otomatis terbaca.
        </p>
      </div>
    </div>
  );
}
