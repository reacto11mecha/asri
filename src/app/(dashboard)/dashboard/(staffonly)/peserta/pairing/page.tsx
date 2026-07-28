"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ArrowLeft, CheckCircle2, AlertCircle, Radio } from "lucide-react";
import { useBeep } from "~/hooks/use-beep";
import { useRfidScanner } from "~/hooks/useRfidScanner";
import { toast } from "sonner";

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

type PesertaInfo = {
  id: string;
  namaLengkap: string;
  nipd: string;
  uidKartu: string | null;
  kelas: {
    tingkat: string;
    namaKelas: string;
    jenjang: string;
  };
};

export default function PairingPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const { playSuccess, playError } = useBeep();

  const [isManualFocus, setIsManualFocus] = useState(false);
  const [scanStatus, setScanStatus] = useState<
    "idle" | "scanning" | "success" | "pairing" | "error"
  >("idle");
  const [peserta, setPeserta] = useState<PesertaInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [uidInput, setUidInput] = useState("");

  const normalizeUid = useCallback(
    (value: string) =>
      value
        .replace(/[^0-9A-Fa-f]/g, "")
        .toUpperCase()
        .slice(0, 8),
    [],
  );

  const cariPesertaMutation = api.peserta.getByNipd.useMutation({
    onSuccess: (data) => {
      if (!data) {
        setScanStatus("error");
        setErrorMessage("NIPD tidak ditemukan di database.");
        playError();
        return;
      }
      if (data.uidKartu) {
        const replace = window.confirm(
          `Peserta ini sudah memiliki kartu RFID (${data.uidKartu}). Ganti dengan yang baru?`,
        );
        if (!replace) {
          setScanStatus("idle");
          return;
        }
      }
      playSuccess();
      setPeserta(data);
      setScanStatus("success");
      setTimeout(() => setScanStatus("pairing"), 2000);
    },
    onError: (error) => {
      setScanStatus("error");
      setErrorMessage(error.message);
      playError();
    },
  });

  const pairMutation = api.peserta.pairRfid.useMutation({
    onSuccess: () => {
      toast.success("Kartu RFID berhasil dipasangkan!");
      utils.peserta.getAll.invalidate();
      router.push("/dashboard/peserta");
    },
    onError: (error) => {
      toast.error("Gagal memasangkan kartu", { description: error.message });
      setScanStatus("idle");
      setPeserta(null);
    },
  });

  const handleScan = (decodedText: string) => {
    if (scanStatus !== "idle") return;
    setScanStatus("scanning");
    cariPesertaMutation.mutate({ nipd: decodedText });
  };

  const handleRfidInput = (uid: string) => {
    if (!peserta) return;
    pairMutation.mutate({
      id: peserta.id,
      uidKartu: uid.toUpperCase(),
    });
  };

  const { inputRef, handleInput } = useRfidScanner({
    onScan: handleRfidInput,
    enabled: scanStatus === "pairing" && !isManualFocus,
  });

  const handleManualPair = () => {
    if (uidInput.length === 8 && peserta) {
      handleRfidInput(uidInput);
    }
  };

  const resetError = () => {
    setScanStatus("idle");
    setErrorMessage("");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 pb-12">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 px-2 pt-4 text-white">
        <Button
          variant="ghost"
          className="text-white hover:bg-white/20 hover:text-white"
          onClick={() => router.push("/dashboard/peserta")}
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> Kembali
        </Button>
        <div className="text-right">
          <p className="text-lg font-bold">Pairing Kartu RFID</p>
          <p className="text-sm text-green-400 opacity-80">
            {scanStatus === "pairing"
              ? "Tempelkan kartu..."
              : "Arahkan QR Code"}
          </p>
        </div>
      </div>

      {/* Kamera Scanner */}
      <div className="relative mt-8 aspect-square w-full max-w-sm overflow-hidden rounded-2xl border-2 border-white/20 bg-gray-900 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
        {scanStatus === "idle" || scanStatus === "scanning" ? (
          <ScannerClient
            cameraConfig={{ facingMode: "environment" }}
            onScan={handleScan}
            isPaused={scanStatus !== "idle"}
            onError={(msg) => {
              console.error("Kamera Error:", msg);
              toast.error("Akses Kamera Gagal", { description: msg });
            }}
          />
        ) : null}

        {/* Overlay Sukses */}
        {scanStatus === "success" && peserta && (
          <div className="animate-in zoom-in-95 absolute inset-0 z-10 flex flex-col items-center justify-center bg-green-600/95 text-white duration-200">
            <CheckCircle2 className="mb-6 h-24 w-24 text-green-100" />
            <p className="px-4 text-center text-2xl leading-tight font-bold">
              {peserta.namaLengkap}
            </p>
            <p className="mt-2 text-lg opacity-90">
              {peserta.kelas.tingkat} {peserta.kelas.namaKelas} (
              {peserta.kelas.jenjang})
            </p>
            <p className="mt-4 text-sm">Siapkan kartu RFID...</p>
          </div>
        )}

        {/* Overlay Pairing (input RFID) */}
        {scanStatus === "pairing" && peserta && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900/95 p-6 text-white">
            <Radio className="mb-4 h-16 w-16 animate-pulse text-blue-400" />
            <p className="mb-2 text-xl font-semibold">Tempelkan Kartu RFID</p>
            <p className="mb-6 text-sm text-gray-400">
              {peserta.namaLengkap} - {peserta.kelas.tingkat}{" "}
              {peserta.kelas.namaKelas}
            </p>
            {/* Input tersembunyi untuk reader */}
            <input
              ref={inputRef}
              type="text"
              className="absolute h-0 w-0 opacity-0"
              onInput={handleInput}
              autoComplete="off"
            />
            {/* Input manual dengan normalisasi langsung */}
            <div className="w-full max-w-xs space-y-3">
              <Input
                placeholder="Atau ketik UID manual"
                value={uidInput}
                onChange={(e) => setUidInput(normalizeUid(e.target.value))}
                onFocus={() => setIsManualFocus(true)}
                onBlur={() => setIsManualFocus(false)}
                className="border-gray-700 bg-gray-800 text-center text-white"
                maxLength={8}
              />
              <Button
                variant="outline"
                className="w-full border-blue-500 text-blue-400 hover:bg-blue-950"
                onClick={handleManualPair}
                disabled={uidInput.length < 8}
              >
                Simpan UID
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-400"
                onClick={() => router.push("/dashboard/peserta")}
              >
                Nanti saja
              </Button>
            </div>
          </div>
        )}

        {/* Overlay Error */}
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
              Coba Lagi
            </Button>
          </div>
        )}

        {/* Loading */}
        {cariPesertaMutation.isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-white backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
              <p className="font-medium tracking-wide">Mencari data...</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 px-6 text-center text-white">
        <p className="text-base font-medium tracking-wide opacity-90">
          {scanStatus === "pairing"
            ? "Tempelkan kartu RFID untuk menyimpan UID."
            : "Arahkan QR Code NIPD ke kamera."}
        </p>
      </div>
    </div>
  );
}
