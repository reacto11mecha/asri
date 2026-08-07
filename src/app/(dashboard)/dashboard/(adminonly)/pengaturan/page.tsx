// src/app/(dashboard)/dashboard/pengaturan/page.tsx
"use client";

import { api } from "~/trpc/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { KategoriFormDialog } from "~/_components/pengaturan/kategori-form-dialog";
import { SesiFormDialog } from "~/_components/pengaturan/sesi-form-dialog";
import { PelanggaranFormDialog } from "~/_components/pengaturan/pelanggaran-form-dialog";
import { LiburTab } from "~/_components/pengaturan/libur-tab";
import { Trash2 } from "lucide-react";
import { PegawaiTab } from "~/_components/pengaturan/pegawai-tab";
import { AlertDialogTrigger } from "~/components/ui/alert-dialog";
import { ForceDeleteDialog } from "~/components/ui/force-delete-dialog";

export default function PengaturanPage() {
  const utils = api.useUtils();

  const { data: kategoriData, isLoading: isLoadingKategori } =
    api.pengaturan.getKategoriWithSesi.useQuery();
  const { data: pelanggaranData, isLoading: isLoadingPelanggaran } =
    api.pengaturan.getMasterPelanggaran.useQuery();

  const deleteKategoriMutation = api.pengaturan.deleteKategori.useMutation({
    onSuccess: () => {
      toast.success("Kategori berhasil dihapus");
      void utils.pengaturan.getKategoriWithSesi.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteSesiMutation = api.pengaturan.deleteSesi.useMutation({
    onSuccess: () => {
      toast.success("Sesi berhasil dihapus");
      void utils.pengaturan.getKategoriWithSesi.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan Sistem</h1>
        <p className="text-muted-foreground">
          Kelola kategori absensi, jadwal sesi, dan master pelanggaran.
        </p>
      </div>

      <Tabs defaultValue="kategori" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="kategori">Kategori & Sesi Rutin</TabsTrigger>
          <TabsTrigger value="pelanggaran">Master Pelanggaran</TabsTrigger>
          <TabsTrigger value="pegawai">Daftar Pengguna</TabsTrigger>
          <TabsTrigger value="libur">Kalender Libur</TabsTrigger>
        </TabsList>

        {/* TAB 1: KATEGORI & SESI */}
        <TabsContent value="kategori" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Daftar Kategori Absensi</h2>
            <KategoriFormDialog />
          </div>

          {isLoadingKategori ? (
            <p className="text-muted-foreground text-sm">Memuat data...</p>
          ) : (
            <div className="grid gap-6">
              {kategoriData?.map((kategori) => (
                <div
                  key={kategori.id}
                  className="bg-card rounded-lg border p-4"
                >
                  <div className="mb-4 flex items-center justify-between border-b pb-4">
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-bold">
                        {kategori.namaKategori}
                        {!kategori.isActive && (
                          <Badge variant="destructive">Nonaktif</Badge>
                        )}
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <SesiFormDialog kategoriId={kategori.id} />
                      <KategoriFormDialog initialData={kategori} />
                      <ForceDeleteDialog
                        title="Hapus Kategori Absensi?"
                        itemName={kategori.namaKategori} // Nama kategori akan muncul di dialog
                        onConfirm={() =>
                          deleteKategoriMutation.mutate({ id: kategori.id })
                        }
                      >
                        <AlertDialogTrigger
                          render={
                            <Button variant="destructive" size="sm">
                              <Trash2 className="mr-2 h-4 w-4" /> Hapus
                            </Button>
                          }
                        />
                      </ForceDeleteDialog>
                    </div>
                  </div>

                  {kategori.sesi.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic">
                      Belum ada sesi di kategori ini.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Sesi</TableHead>
                          <TableHead>Waktu</TableHead>
                          <TableHead>Aturan</TableHead>
                          <TableHead>Target Jenjang</TableHead>
                          <TableHead>Poin (Tepat / Telat / Alfa)</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kategori.sesi.map((sesi) => (
                          <TableRow key={sesi.id}>
                            <TableCell className="font-medium">
                              {sesi.namaSesi}{" "}
                              {!sesi.isActive && (
                                <Badge variant="outline">Nonaktif</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {sesi.waktuMulai} - {sesi.waktuSelesai}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1.5">
                                {sesi.isMandatory ? (
                                  <Badge>Wajib</Badge>
                                ) : (
                                  <Badge variant="secondary">Opsional</Badge>
                                )}
                                {!sesi.isLateEnabled && (
                                  <Badge
                                    variant="outline"
                                    className="border-amber-200 bg-amber-50 text-amber-600"
                                  >
                                    Bebas Telat
                                  </Badge>
                                )}
                                {sesi.isHaidExempt && (
                                  <Badge
                                    variant="outline"
                                    className="border-pink-200 bg-pink-50 text-pink-600"
                                  >
                                    Gugur Haid
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {sesi.targetJenjang.join(", ")}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              +{sesi.poinTepatWaktu} / {sesi.poinTelat} /{" "}
                              {sesi.poinAlfa}
                            </TableCell>
                            <TableCell className="text-right">
                              <SesiFormDialog
                                kategoriId={kategori.id}
                                initialData={sesi}
                              />
                              <ForceDeleteDialog
                                title="Hapus Sesi Absensi?"
                                itemName={sesi.namaSesi}
                                onConfirm={() =>
                                  deleteSesiMutation.mutate({ id: sesi.id })
                                }
                              >
                                <AlertDialogTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">
                                        Hapus Sesi
                                      </span>
                                    </Button>
                                  }
                                />
                              </ForceDeleteDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: MASTER PELANGGARAN */}
        <TabsContent value="pelanggaran" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Master Pelanggaran</h2>
              <p className="text-muted-foreground text-sm">
                Atur bobot poin untuk setiap tingkat pelanggaran.
              </p>
            </div>
            <PelanggaranFormDialog />
          </div>

          {isLoadingPelanggaran ? (
            <p className="text-muted-foreground text-sm">Memuat data...</p>
          ) : (
            <div className="bg-card rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Kategori Pelanggaran</TableHead>
                    <TableHead>Tingkat</TableHead>
                    <TableHead>Poin Minus</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pelanggaranData?.map((pelanggaran) => (
                    <TableRow key={pelanggaran.id}>
                      <TableCell className="font-medium">
                        {pelanggaran.namaPelanggaran}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pelanggaran.tingkat === "BERAT"
                              ? "destructive"
                              : pelanggaran.tingkat === "SEDANG"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {pelanggaran.tingkat}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-red-500">
                        {pelanggaran.poinMinus}
                      </TableCell>
                      <TableCell>
                        {pelanggaran.isActive ? (
                          <Badge
                            variant="outline"
                            className="border-green-600 text-green-600"
                          >
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <PelanggaranFormDialog initialData={pelanggaran} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {pelanggaranData?.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-muted-foreground py-8 text-center"
                      >
                        Belum ada data pelanggaran.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        <TabsContent value="pegawai">
          <PegawaiTab />
        </TabsContent>
        <TabsContent value="libur">
          <LiburTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
