"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { AlertCircle, Eye, Plus, FolderOpen } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export default function BimbinganPage() {
  // State filter untuk tab Monitoring
  const [jenjang, setJenjang] = useState<"SD" | "SMP" | "SMA" | undefined>();
  const [tingkat, setTingkat] = useState<string>("");

  // Fetch data Monitoring Perkembangan
  const { data: monitoringData, isLoading: isLoadingMonitoring } =
    api.bimbingan.getOverviewMonitoring.useQuery({
      jenjang: jenjang === "" ? undefined : jenjang,
      tingkat: tingkat === "" ? undefined : tingkat,
    });

  // Fetch data Penanganan Kasus
  const { data: kasusData, isLoading: isLoadingKasus } =
    api.bimbingan.getDaftarKasus.useQuery({});

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bimbingan & Konseling
          </h1>
          <p className="text-muted-foreground">
            Pantau perkembangan dan penanganan kasus peserta didik.
          </p>
        </div>
      </div>

      <Tabs defaultValue="monitoring" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="monitoring">Monitoring Perkembangan</TabsTrigger>
          <TabsTrigger value="kasus">Penanganan Kasus</TabsTrigger>
        </TabsList>

        {/* ========================================== */}
        {/* TAB 1: MONITORING PERKEMBANGAN             */}
        {/* ========================================== */}
        <TabsContent value="monitoring" className="space-y-6 m-0">
          {/* --- BAGIAN 1: INSIGHT KRITIS (EARLY WARNING SYSTEM) --- */}
          {monitoringData && monitoringData.insightKritis.length > 0 && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Perhatian Khusus (Bulan Ini)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {monitoringData.insightKritis.map((insight) => (
                  <Alert key={insight.pesertaDidikId} variant="destructive">
                    <AlertTitle className="font-semibold">
                      {insight.nama}
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                      Skor di bawah standar pada aspek:{" "}
                      <span className="font-bold">
                        {insight.peringatan.join(", ")}
                      </span>
                    </AlertDescription>
                    <div className="mt-3">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-7 border-destructive text-destructive hover:bg-destructive hover:text-white"
                      >
                        <Link href={`/dashboard/bimbingan/monitor/${insight.pesertaDidikId}`}>
                          Tindak Lanjuti
                        </Link>
                      </Button>
                    </div>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}

          {/* --- BAGIAN 2: FILTER & TABEL MONITORING --- */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Monitoring Perkembangan</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Baris Filter */}
              <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center">
                <div className="w-full md:w-48">
                  <Select
                    value={jenjang ?? ""}
                    onValueChange={(val) => setJenjang(val as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Jenjang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Semua Jenjang</SelectItem>
                      <SelectItem value="SD">SD</SelectItem>
                      <SelectItem value="SMP">SMP</SelectItem>
                      <SelectItem value="SMA">SMA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-48">
                  <Select value={tingkat} onValueChange={setTingkat}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Tingkat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Semua Tingkat</SelectItem>
                      <SelectItem value="1">Tingkat 1 / 7 / 10</SelectItem>
                      <SelectItem value="2">Tingkat 2 / 8 / 11</SelectItem>
                      <SelectItem value="3">Tingkat 3 / 9 / 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tabel Data */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Peserta</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Status Evaluasi</TableHead>
                      <TableHead className="text-center">Total Skor Terakhir</TableHead>
                      <TableHead className="text-center">Periode</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingMonitoring ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                          Memuat data...
                        </TableCell>
                      </TableRow>
                    ) : monitoringData?.tabelData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                          Tidak ada data siswa ditemukan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      monitoringData?.tabelData.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.namaLengkap}</TableCell>
                          <TableCell>{row.kelas}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                row.statusEvaluasi === "Sudah Dievaluasi"
                                  ? "default"
                                  : "secondary"
                              }
                              className={
                                row.statusEvaluasi === "Sudah Dievaluasi"
                                  ? "bg-emerald-500 hover:bg-emerald-600"
                                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                              }
                            >
                              {row.statusEvaluasi}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {row.skorTerakhir ?? "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {row.periodeTerakhir}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" render={
                              <Link href={`/dashboard/bimbingan/monitor/${row.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Detail
                              </Link>
                            } nativeButton={false} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================== */}
        {/* TAB 2: PENANGANAN KASUS                    */}
        {/* ========================================== */}
        <TabsContent value="kasus" className="m-0">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <CardTitle>Daftar Penanganan Kasus</CardTitle>
                <CardDescription>Catatan penanganan kasus anak di sekolah rakyat.</CardDescription>
              </div>
              <Button asChild>
                <Link href="/dashboard/bimbingan/kasus/tambah">
                  <Plus className="mr-2 h-4 w-4" /> Buka Kasus Baru
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal Buka</TableHead>
                      <TableHead>Nama Peserta</TableHead>
                      <TableHead>Masalah Utama</TableHead>
                      <TableHead>Wali Asuh</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingKasus ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                          Memuat data kasus...
                        </TableCell>
                      </TableRow>
                    ) : kasusData?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">
                          Belum ada kasus yang tercatat.
                        </TableCell>
                      </TableRow>
                    ) : (
                      kasusData?.map((kasus) => (
                        <TableRow key={kasus.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {format(new Date(kasus.tanggalBuka), "dd MMM yyyy", { locale: localeId })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {kasus.pesertaDidik.namaLengkap}
                            <div className="text-xs text-muted-foreground font-normal">
                              Kelas {kasus.pesertaDidik.kelas.tingkat} {kasus.pesertaDidik.kelas.namaKelas}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {kasus.masalahUtama || "-"}
                          </TableCell>
                          <TableCell>
                            {kasus.pesertaDidik.waliAsuh?.name || "Belum Ditugaskan"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={kasus.tanggalTutup ? "secondary" : "destructive"}
                              className={kasus.tanggalTutup ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : ""}
                            >
                              {kasus.tanggalTutup ? "Selesai" : "Aktif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="ghost">
                              <Link href={`/dashboard/bimbingan/kasus/${kasus.id}`}>
                                <FolderOpen className="mr-2 h-4 w-4" />
                                Kelola
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
