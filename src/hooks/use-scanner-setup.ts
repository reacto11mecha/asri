"use client";

import { useState, useMemo } from "react";
import { api } from "~/trpc/react";

export function useScannerSetup() {
  const [tipeScan, setTipeScan] = useState<"SESI" | "HAID">("SESI");
  const [sesiId, setSesiId] = useState<string>("");
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
          if (!s.isActive) return false;
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
          if (currentMinutes > endMinutes + 15) return false;
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

  const resetSetup = () => {
    setSearchSesi("");
    // sesiId dan tipeScan tidak di-reset agar user tidak capek memilih ulang jika tidak sengaja menekan "Kembali"
  };

  return {
    tipeScan,
    setTipeScan,
    sesiId,
    setSesiId,
    searchSesi,
    setSearchSesi,
    options,
    isLoading,
    groupedSesi,
    selectedSesi,
    resetSetup,
  };
}
