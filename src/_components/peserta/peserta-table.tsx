"use client";

import { useMemo } from "react";
import { api } from "~/trpc/react";
import { DataTable } from "~/_components/data-table";
import { getPesertaColumns } from "./columns";
import { PesertaTableActions } from "./peserta-table-actions";
import { toast } from "sonner";

export function PesertaTable() {
  const utils = api.useUtils();

  // Ambil data utama dari server
  const { data: daftarPeserta = [], isLoading } = api.peserta.getAll.useQuery();
  const { data: daftarWali = [], isLoading: loadWali } =
    api.peserta.getWaliAsuh.useQuery();

  // Mutasi untuk mengaitkan wali asuh langsung dari tabel
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

  // Memoize konfigurasi kolom agar tidak ter-render ulang kecuali data wali / status mutasi berubah
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

  return (
    <div className="mt-4 space-y-4">
      {/* Render komponen tombol-tombol dan Modal Import Excel */}
      <PesertaTableActions />

      {/* Render komponen tabel dengan kolom yang bisa di-toggle */}
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
          agama: false,
          alamat: false,
          noTelp: false,
          namaIbu: false,
          namaAyah: false,
        }}
      />
    </div>
  );
}
