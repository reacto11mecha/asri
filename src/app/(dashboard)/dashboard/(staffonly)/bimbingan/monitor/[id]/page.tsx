// src/app/(dashboard)/dashboard/(staffonly)/bimbingan/monitor/[id]/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Badge } from "~/components/ui/badge";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
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
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  ArrowLeft,
  Plus,
  Pencil,
  User,
  IdCard,
  GraduationCap,
  MapPin,
  CalendarClock,
  ShieldCheck,
  Info,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function DetailMonitoringPage() {
  const params = useParams();
  const router = useRouter();
  const pesertaDidikId = params.id as string;

  // State untuk Filter
  const [filterBulan, setFilterBulan] = useState("all");
  const [filterTahun, setFilterTahun] = useState("all");

  const { data: profil } = api.peserta.getById.useQuery({ id: pesertaDidikId });
  const { data: riwayatRaw, isLoading } =
    api.bimbingan.getDetailRiwayat.useQuery({ pesertaDidikId });

  // 1. Pengurutan Absolut: Tahun -> Bulan -> Monev Ke (Semuanya Descending/Terbesar ke Terkecil)
  const riwayatSorted = useMemo(() => {
    if (!riwayatRaw) return [];
    return [...riwayatRaw].sort((a, b) => {
      // Prioritas 1: Tahun Terbesar
      if (b.periodeTahun !== a.periodeTahun)
        return Number(b.periodeTahun) - Number(a.periodeTahun);
      // Prioritas 2: Bulan Terbesar
      if (b.periodeBulan !== a.periodeBulan)
        return Number(b.periodeBulan) - Number(a.periodeBulan);
      // Prioritas 3: Monev Ke Terbesar
      return b.monevKe - a.monevKe;
    });
  }, [riwayatRaw]);

  // 2. Ekstraksi daftar tahun unik untuk dropdown filter
  const daftarTahun = useMemo(() => {
    const tahunSet = new Set(riwayatSorted.map((item) => item.periodeTahun));
    return Array.from(tahunSet);
  }, [riwayatSorted]);

  // 3. Logika Filtering Client-Side
  const filteredRiwayat = useMemo(() => {
    return riwayatSorted.filter((item) => {
      const matchBulan =
        filterBulan === "all" || item.periodeBulan === filterBulan;
      const matchTahun =
        filterTahun === "all" || item.periodeTahun === filterTahun;
      return matchBulan && matchTahun;
    });
  }, [riwayatSorted, filterBulan, filterTahun]);

  // 4. Data Chart (Di-reverse agar urutan waktu di grafik berjalan maju dari kiri ke kanan)
  const chartData = useMemo(() => {
    return [...filteredRiwayat].reverse().map((item) => ({
      name: `Monev ${item.monevKe} (${item.periodeBulan}/${item.periodeTahun})`,
      ADL: item.totalSkorAdl,
      Sosial: item.totalSkorSosial,
      Mental: item.totalSkorMental,
      Vokasional: item.totalSkorVokasional,
    }));
  }, [filteredRiwayat]);

  if (isLoading) return <div className="p-6">Memuat data monitoring...</div>;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* --- HEADER --- */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Detail Perkembangan
            </h1>
            <p className="text-muted-foreground">
              Visualisasi dan riwayat evaluasi peserta didik.
            </p>
          </div>
        </div>
        <Button
          render={
            <Link
              href={`/dashboard/bimbingan/monitor/${pesertaDidikId}/tambah`}
            >
              <Plus className="mr-2 h-4 w-4" /> Tambah Evaluasi (Monev)
            </Link>
          }
          nativeButton={false}
        />
      </div>

      {/* --- KARTU IDENTITAS --- */}
      {profil && (
        <Card className="bg-muted/40">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-full">
                <User className="h-8 w-8" />
              </div>
              <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                    <User className="h-3.5 w-3.5" /> Nama Lengkap
                  </p>
                  <p className="text-lg font-semibold">{profil.namaLengkap}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                    <IdCard className="h-3.5 w-3.5" /> NIPD / NISN
                  </p>
                  <p className="font-medium">
                    {profil.nipd} {profil.nisn ? `/ ${profil.nisn}` : ""}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                    <GraduationCap className="h-3.5 w-3.5" /> Kelas
                  </p>
                  <p className="font-medium">
                    {profil.kelas?.tingkat} {profil.kelas?.namaKelas} (
                    {profil.kelas?.jenjang})
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-3.5 w-3.5" /> Wali Asuh
                  </p>
                  <p className="text-primary font-medium">
                    {profil.waliAsuh?.name ?? "Belum Ditugaskan"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- FILTER CONTROL --- */}
      <div className="bg-muted/20 flex flex-col items-end gap-4 rounded-lg border p-4 sm:flex-row">
        {/* Filter Tahun */}
        <div className="w-full flex-1 space-y-1.5 sm:max-w-xs">
          <label className="text-sm font-medium">Filter Tahun</label>
          <Select
            value={filterTahun}
            onValueChange={(tahun) =>
              setFilterTahun(!tahun || tahun === "" ? "all" : tahun)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua">
                {filterTahun === "all" ? "Semua" : filterTahun}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {daftarTahun.map((tahun) => (
                <SelectItem key={tahun} value={tahun}>
                  {tahun}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter Bulan */}
        <div className="w-full flex-1 space-y-1.5 sm:max-w-xs">
          <label className="text-sm font-medium">Filter Bulan</label>
          <Select
            value={filterBulan}
            disabled={filterTahun === "all"}
            onValueChange={(bulan) =>
              setFilterBulan(!bulan || bulan === "" ? "all" : bulan)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua">
                {filterBulan === "all"
                  ? "Semua"
                  : new Date(0, parseInt(filterBulan) - 1).toLocaleString(
                      "id-ID",
                      {
                        month: "long",
                      },
                    )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {[
                "01",
                "02",
                "03",
                "04",
                "05",
                "06",
                "07",
                "08",
                "09",
                "10",
                "11",
                "12",
              ].map((b) => (
                <SelectItem key={b} value={b}>
                  {new Date(0, parseInt(b) - 1).toLocaleString("id-ID", {
                    month: "long",
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tombol Reset */}
        {(filterBulan !== "all" || filterTahun !== "all") && (
          <Button
            variant="ghost"
            onClick={() => {
              setFilterBulan("all");
              setFilterTahun("all");
            }}
          >
            Reset Filter
          </Button>
        )}
      </div>

      {/* --- GRAFIK TREN --- */}
      <Card>
        <CardHeader>
          <CardTitle>Tren Perkembangan Berdasarkan Aspek</CardTitle>
          <CardDescription>
            Melacak skor evaluasi berdasarkan rentang waktu yang difilter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    className="text-xs font-medium"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    className="text-xs font-medium"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Line
                    type="monotone"
                    dataKey="ADL"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Sosial"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Mental"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Vokasional"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-lg border-2 border-dashed">
              <p className="text-muted-foreground">
                Belum ada data evaluasi untuk filter ini.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- KETERANGAN KRITERIA NILAI (BARU) --- */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-primary flex items-center gap-2 text-sm">
            <Info className="h-4 w-4" /> Kriteria Rentang Penilaian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-1 text-xs">
              <p className="font-semibold">ADL (Maks. 45)</p>
              <ul className="text-muted-foreground space-y-0.5">
                <li>0 - 9: Sangat Kurang</li>
                <li>10 - 18: Kurang</li>
                <li>19 - 27: Cukup</li>
                <li>28 - 36: Baik</li>
                <li>37 - 45: Sangat Baik</li>
              </ul>
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-semibold">Sosial (Maks. 60)</p>
              <ul className="text-muted-foreground space-y-0.5">
                <li>0 - 12: Sangat Kurang</li>
                <li>13 - 24: Kurang</li>
                <li>25 - 36: Cukup</li>
                <li>37 - 48: Baik</li>
                <li>49 - 60: Sangat Baik</li>
              </ul>
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-semibold">Mental (Maks. 90)</p>
              <ul className="text-muted-foreground space-y-0.5">
                <li>0 - 18: Sangat Kurang</li>
                <li>19 - 36: Kurang</li>
                <li>37 - 54: Cukup</li>
                <li>55 - 72: Baik</li>
                <li>73 - 90: Sangat Baik</li>
              </ul>
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-semibold">Vokasional (Maks. 70)</p>
              <ul className="text-muted-foreground space-y-0.5">
                <li>0 - 14: Sangat Kurang</li>
                <li>15 - 28: Kurang</li>
                <li>29 - 42: Cukup</li>
                <li>43 - 56: Baik</li>
                <li>57 - 70: Sangat Baik</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- TABEL RIWAYAT EVALUASI --- */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Evaluasi (Monev)</CardTitle>
          <CardDescription>
            Daftar laporan perkembangan bulanan. Laporan disusun dari yang
            paling baru.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Periode Monev</TableHead>
                  <TableHead>Waktu Entri / Update</TableHead>
                  <TableHead>Pembuat / Penilai</TableHead>
                  <TableHead className="text-center">ADL</TableHead>
                  <TableHead className="text-center">Sosial</TableHead>
                  <TableHead className="text-center">Mental</TableHead>
                  <TableHead className="text-center">Vokas</TableHead>
                  <TableHead className="text-center font-bold">Total</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRiwayat.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      Belum ada catatan monev yang sesuai filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRiwayat.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        Monev {item.monevKe} <br />
                        <span className="text-muted-foreground text-xs">
                          {item.periodeBulan}/{item.periodeTahun}
                        </span>
                      </TableCell>

                      <TableCell className="text-sm whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <CalendarClock className="text-muted-foreground h-3.5 w-3.5" />
                            {format(
                              new Date(item.updatedAt ?? item.createdAt),
                              "dd MMM yyyy, HH:mm",
                              { locale: localeId },
                            )}
                          </div>
                          {item.createdAt.toISOString() !==
                          item.updatedAt.toISOString() ? (
                            <Badge variant="outline">Diupdate</Badge>
                          ) : null}
                        </div>
                      </TableCell>

                      {/* INFORMASI AUTHOR DENGAN AVATAR */}
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {item.author ? (
                            <>
                              <Avatar className="h-7 w-7 border">
                                <AvatarImage
                                  src={item.author.image ?? ""}
                                  alt={item.author.name ?? "Avatar"}
                                />
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                  {item.author.name
                                    ?.substring(0, 2)
                                    .toUpperCase() ?? "ST"}
                                </AvatarFallback>
                              </Avatar>
                              <span>{item.author.name}</span>
                            </>
                          ) : (
                            <>
                              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100">
                                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                              </div>
                              <span className="text-muted-foreground">
                                Sistem
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        {item.totalSkorAdl}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.totalSkorSosial}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.totalSkorMental}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.totalSkorVokasional}
                      </TableCell>
                      <TableCell className="text-primary text-center font-bold">
                        {item.totalSkorKeseluruhan}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          render={
                            <Link
                              href={`/dashboard/bimbingan/monitor/${pesertaDidikId}/edit/${item.id}`}
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                            </Link>
                          }
                          nativeButton={false}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
