"use client";

import { Search, Info } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
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
import type { useScannerSetup } from "~/hooks/use-scanner-setup";

interface ScannerSetupFormProps {
  setup: ReturnType<typeof useScannerSetup>;
  onStart: () => void;
  buttonText: string;
  extraTopContent?: React.ReactNode;
}

export function ScannerSetupForm({
  setup,
  onStart,
  buttonText,
  extraTopContent,
}: ScannerSetupFormProps) {
  const canStart =
    setup.tipeScan === "HAID" || (setup.tipeScan === "SESI" && !!setup.sesiId);

  if (setup.isLoading) {
    return (
      <p className="text-muted-foreground animate-pulse py-8 text-center">
        Memuat opsi kegiatan...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {extraTopContent}

      {/* Mode Switcher */}
      <div className="flex flex-col gap-1.5">
        <label className="text-foreground text-sm font-semibold">
          Mode Pemindaian
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`cursor-pointer rounded-xl border-2 p-3 transition-all ${setup.tipeScan === "SESI" ? "border-blue-500 bg-blue-50" : "border-border hover:bg-muted"}`}
          >
            <input
              type="radio"
              className="sr-only"
              checked={setup.tipeScan === "SESI"}
              onChange={() => setup.setTipeScan("SESI")}
            />
            <span
              className={`block font-semibold ${setup.tipeScan === "SESI" ? "text-blue-700" : ""}`}
            >
              Absensi Sesi
            </span>
            <span className="text-muted-foreground text-xs">
              Kehadiran rutin
            </span>
          </label>
          <label
            className={`cursor-pointer rounded-xl border-2 p-3 transition-all ${setup.tipeScan === "HAID" ? "border-pink-500 bg-pink-50" : "border-border hover:bg-muted"}`}
          >
            <input
              type="radio"
              className="sr-only"
              checked={setup.tipeScan === "HAID"}
              onChange={() => setup.setTipeScan("HAID")}
            />
            <span
              className={`block font-semibold ${setup.tipeScan === "HAID" ? "text-pink-700" : ""}`}
            >
              Lapor Haid
            </span>
            <span className="text-muted-foreground text-xs">
              Keringanan wajib
            </span>
          </label>
        </div>
      </div>

      {/* Konten Berdasarkan Mode */}
      {setup.tipeScan === "SESI" ? (
        <div className="animate-in fade-in slide-in-from-top-2 flex flex-col gap-3 duration-300">
          <label className="text-sm font-semibold">Sesi Kegiatan</label>
          <Select
            value={setup.sesiId}
            onValueChange={(val) => val && setup.setSesiId(val)}
          >
            <SelectTrigger className="h-12 w-full">
              <SelectValue placeholder="Cari dan pilih sesi...">
                {setup.selectedSesi
                  ? `[${setup.selectedSesi.namaKategori}] ${setup.selectedSesi.namaSesi} (${setup.selectedSesi.waktuMulai ?? ""} - ${setup.selectedSesi.waktuSelesai ?? ""})`
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[350px]">
              <div className="bg-popover sticky top-0 z-10 border-b p-2 shadow-sm">
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                  <Input
                    placeholder="Cari sesi atau kategori..."
                    value={setup.searchSesi}
                    onChange={(e) => setup.setSearchSesi(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="h-9 pl-9"
                  />
                </div>
              </div>
              {setup.groupedSesi.length > 0 ? (
                setup.groupedSesi.map((group) => (
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
                          {s.namaSesi} ({s.waktuMulai} - {s.waktuSelesai})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectSeparator />
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground py-6 text-center text-sm">
                  Tidak ada sesi yang tersedia saat ini
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="animate-in fade-in zoom-in-95 flex gap-3 rounded-xl border border-pink-100 bg-pink-50/50 p-4 text-sm text-pink-800 duration-300">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="leading-relaxed">
            Dalam mode ini, kartu yang dipindai akan menandai peserta didik
            sedang HAID secara massal di hari ini.{" "}
            <strong>Tidak perlu memilih sesi spesifik.</strong>
          </p>
        </div>
      )}

      <Button
        className="mt-2 h-12 w-full text-base font-semibold"
        disabled={!canStart}
        onClick={onStart}
      >
        {buttonText}
      </Button>
    </div>
  );
}
