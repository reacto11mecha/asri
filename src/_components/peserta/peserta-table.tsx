// src/_components/peserta/peserta-table.tsx
"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { DataTable } from "~/_components/data-table";
import { getPesertaColumns } from "./columns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PesertaTableActions } from "./peserta-table-actions";
import { toast } from "sonner";

export function PesertaTable() {
  const utils = api.useUtils();

  // State filter
  const [jenjangFilter, setJenjangFilter] = useState<
    "SD" | "SMP" | "SMA" | "all"
  >("all");
  const [tingkatFilter, setTingkatFilter] = useState<string>("all");
  const [kelasFilter, setKelasFilter] = useState<string>("all");

  const { data: daftarKelas = [] } = api.peserta.getAllKelas.useQuery();

  const filters = {
    jenjang: jenjangFilter === "all" ? undefined : jenjangFilter,
    tingkat:
      tingkatFilter === "all" || tingkatFilter === ""
        ? undefined
        : tingkatFilter,
    kelasId:
      kelasFilter === "all" || kelasFilter === "" ? undefined : kelasFilter,
  };

  const { data: daftarPeserta = [], isLoading } =
    api.peserta.getAll.useQuery(filters);
  const { data: daftarWali = [], isLoading: loadWali } =
    api.peserta.getWaliAsuh.useQuery();

  const assignWaliMutation = api.peserta.assignWaliAsuh.useMutation({
    onSuccess: () => {
      void utils.peserta.getAll.invalidate();
      toast.success("Berhasil menetapkan Wali Asuh!");
    },
    onError: (error) =>
      toast.error("Gagal menugaskan Wali Asuh", { description: error.message }),
  });

  const deletePesertaMutation = api.peserta.deletePeserta.useMutation({
    onSuccess: () => {
      void utils.peserta.getAll.invalidate();
      toast.success("Berhasil menghapus peserta!");
    },
    onError: (error) =>
      toast.error("Gagal menghapus peserta", { description: error.message }),
  });

  const handleAssignWali = (pesertaId: string, waliAsuhId: string | null) => {
    if (waliAsuhId) {
      const finalId = waliAsuhId === "unassigned" ? null : waliAsuhId;
      assignWaliMutation.mutate({ pesertaId, waliAsuhId: finalId });
    }
  };

  const handleDelete = (id: string) => {
    if (
      confirm(
        "Yakin ingin menghapus data peserta didik ini? Tindakan ini tidak dapat dibatalkan.",
      )
    ) {
      deletePesertaMutation.mutate({ id });
    }
  };

  const columns = useMemo(
    () =>
      getPesertaColumns({
        daftarWali,
        loadWali,
        isAssigningWali: assignWaliMutation.isPending,
        onAssignWali: handleAssignWali,
        onDelete: handleDelete,
      }),
    [daftarWali, loadWali, assignWaliMutation.isPending],
  );

  // Statistik
  const total = daftarPeserta.length;
  const laki = daftarPeserta.filter((p) => p.jenisKelamin === "L").length;
  const perempuan = daftarPeserta.filter((p) => p.jenisKelamin === "P").length;

  // Label untuk dropdown kelas
  const selectedKelasLabel =
    kelasFilter === "all"
      ? "Semua"
      : (daftarKelas.find((k) => k.id === kelasFilter)?.namaKelas ??
        "Pilih Kelas");

  return (
    <div className="mt-4 space-y-4">
      {/* Filter + Insight dalam satu baris di desktop */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {/* Filter */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Jenjang</label>
            <Select
              value={jenjangFilter}
              onValueChange={(v) => setJenjangFilter(v as typeof jenjangFilter)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue>
                  {jenjangFilter === "all" ? "Semua" : jenjangFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="SD">SD</SelectItem>
                <SelectItem value="SMP">SMP</SelectItem>
                <SelectItem value="SMA">SMA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tingkat</label>
            <Select
              value={tingkatFilter}
              onValueChange={(v) => setTingkatFilter(v ?? "all")}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue>
                  {tingkatFilter === "all" ? "Semua" : tingkatFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {[
                  ...new Set(
                    daftarKelas
                      .filter((k) => k.jenjang === jenjangFilter)
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

          <div>
            <label className="mb-1 block text-sm font-medium">Kelas</label>
            <Select
              value={kelasFilter}
              onValueChange={(v) => setKelasFilter(v ?? "all")}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue>
                  {/* Tampilkan nama kelas yang dipilih */}
                  {selectedKelasLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                {daftarKelas
                  .filter(
                    (k) =>
                      k.jenjang === jenjangFilter &&
                      (tingkatFilter === "all" || k.tingkat === tingkatFilter),
                  )
                  .map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.namaKelas}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Insight cards */}
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border bg-white px-4 py-3 shadow-sm">
            <p className="text-muted-foreground text-xs">Total Peserta</p>
            <p className="text-2xl font-semibold">{total}</p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3 shadow-sm">
            <p className="text-muted-foreground text-xs">Laki-laki</p>
            <p className="text-2xl font-semibold text-blue-600">{laki}</p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3 shadow-sm">
            <p className="text-muted-foreground text-xs">Perempuan</p>
            <p className="text-2xl font-semibold text-pink-600">{perempuan}</p>
          </div>
        </div>
      </div>

      <PesertaTableActions />
      <DataTable
        columns={columns}
        data={daftarPeserta}
        isLoading={isLoading}
        searchKey="namaLengkap"
        searchPlaceholder="Cari nama peserta..."
        initialColumnVisibility={{
          status: false,
          nisn: false,
          tempatLahir: false,
          tanggalLahir: false,
          alamat: false,
          noTelp: false,
          namaIbu: false,
          namaAyah: false,
        }}
      />
    </div>
  );
}
