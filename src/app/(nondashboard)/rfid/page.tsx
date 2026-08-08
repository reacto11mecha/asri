// src/app/(nondashboard)/rfid/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Radio,
  Wrench,
} from "lucide-react";
import { useBeep } from "~/hooks/use-beep";
import { useRfidScanner } from "~/hooks/useRfidScanner";
import { useNativeMessage } from "~/hooks/useNativeMessage";
import type { ScanResult } from "~/types/scan";

import { useScannerSetup } from "~/hooks/use-scanner-setup";
import { ScannerSetupForm } from "~/_components/scanner/setup-form";

export default function RfidPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const { playSuccess, playError, prewarm } = useBeep();
  const [showDevTools, setShowDevTools] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const setup = useScannerSetup();

  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [scanData, setScanData] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

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
    if (scanStatus !== "idle" || (!setup.sesiId && setup.tipeScan === "SESI"))
      return;

    scanRfidMutation.mutate({
      uidKartu: uid.toUpperCase(),
      sesiId: setup.tipeScan === "HAID" ? undefined : setup.sesiId, // Sesuaikan payload TRPC
      tipeScan: setup.tipeScan,
    });
  };

  const simulateTap = (uid: string) => handleScan(uid);
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
    setup.resetSetup();
  };

  if (!isConfigured) {
    return (
      <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <Card className="border-t-primary w-full max-w-md border-t-4 shadow-lg md:max-w-lg">
          <CardContent className="flex flex-col gap-6 p-4 sm:p-8">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="text-muted-foreground hover:text-foreground mb-4 -ml-3"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dashboard
              </Button>
              <h1 className="mb-1 text-2xl font-bold">Persiapan Tap RFID</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Pilih mode dan sesi sebelum menempelkan kartu.
              </p>
            </div>
            <ScannerSetupForm
              setup={setup}
              onStart={() => {
                setIsConfigured(true);
                prewarm();
              }}
              buttonText="Mulai Tap RFID"
            />
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
          <ArrowLeft className="mr-2 h-5 w-5" /> Pengaturan
        </Button>
        <div className="text-right">
          <p
            className={`text-lg font-bold ${setup.tipeScan === "HAID" ? "text-pink-400" : ""}`}
          >
            {setup.tipeScan === "HAID"
              ? "Pelaporan Haid Massal"
              : setup.selectedSesi
                ? `${setup.selectedSesi.namaKategori} - ${setup.selectedSesi.namaSesi}`
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
          Tempelkan kartu RFID ke pembaca.
        </p>
        <p className="mt-2 text-sm opacity-50">
          UID kartu akan otomatis terbaca.
        </p>
      </div>
    </div>
  );
}
