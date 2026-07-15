// src/app/(dashboard)/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { api } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import {
  Trophy,
  AlertTriangle,
  UserX,
  Clock,
  CalendarDays,
  Medal,
} from "lucide-react";

const getStatusBadge = (status: string, isMissing?: boolean) => {
  if (isMissing)
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> BELUM ABSEN
      </Badge>
    );

  switch (status) {
    case "HADIR":
      return (
        <Badge
          variant="outline"
          className="border-amber-400 bg-amber-50 text-amber-600"
        >
          TELAT
        </Badge>
      );
    case "IZIN":
      return (
        <Badge
          variant="outline"
          className="border-blue-300 bg-blue-50 text-blue-600"
        >
          IZIN
        </Badge>
      );
    case "SAKIT":
      return (
        <Badge
          variant="outline"
          className="border-orange-300 bg-orange-50 text-orange-600"
        >
          SAKIT
        </Badge>
      );
    case "LAINNYA": // ---> TAMBAHAN BARU
      return (
        <Badge
          variant="outline"
          className="border-purple-300 bg-purple-50 text-purple-600"
        >
          LAIN-LAIN
        </Badge>
      );
    case "ALFA":
      return <Badge variant="destructive">ALFA</Badge>;
    case "TIDAK_HADIR":
      return <Badge variant="destructive">TIDAK HADIR</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function DashboardInsightPage() {
  // 1. STATE UNTUK FILTER (Cascading)
  const [tanggal, setTanggal] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [jenjang, setJenjang] = useState<"SD" | "SMP" | "SMA">("SMP"); // Default SMP
  const [tingkat, setTingkat] = useState<string>(""); // Kosong = Semua
  const [kelasId, setKelasId] = useState<string>(""); // Kosong = Semua

  // 2. QUERY DATA
  const { data: filterOptions } = api.insight.getFilterOptions.useQuery({
    jenjang,
  });

  // Filter payload
  const queryFilter = {
    tanggal,
    jenjang,
    tingkat: tingkat || undefined,
    kelasId: kelasId || undefined,
  };

  const { data: stats, isLoading: loadingStats } =
    api.insight.getStatistikHarian.useQuery(queryFilter);
  const { data: sesiBermasalah, isLoading: loadingSesi } =
    api.insight.getEvaluasiSesi.useQuery(queryFilter);
  const { data: pelanggaran, isLoading: loadingPelanggaran } =
    api.insight.getDaftarPelanggaran.useQuery(queryFilter);
  const { data: wallOfFame, isLoading: loadingWof } =
    api.insight.getWallOfFame.useQuery({ ...queryFilter, limit: 5 });

  // 3. EFEK SAMPING (Reset child filter jika parent filter diubah)
  useEffect(() => {
    setTingkat("");
    setKelasId("");
  }, [jenjang]);

  useEffect(() => {
    setKelasId("");
  }, [tingkat]);

  // Kalkulasi Persentase untuk Radar
  const total = stats?.totalAktivitas || 0;
  const persenTepat =
    total > 0 ? Math.round((stats!.tepatWaktu / total) * 100) : 0;
  const persenTelat = total > 0 ? Math.round((stats!.telat / total) * 100) : 0;
  const persenAlfa = total > 0 ? Math.round((stats!.alfa / total) * 100) : 0;

  // ---> UBAH NAMA VARIABEL DAN PROPERTI OBJEK STATS
  const persenSakitIzinLainnya =
    total > 0 ? Math.round((stats!.sakitIzinLainnya / total) * 100) : 0;

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER & FILTER BAR */}
      <div className="bg-card flex flex-col items-start justify-between gap-4 rounded-xl border p-6 shadow-sm md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Insight Mentoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Evaluasi kedisiplinan dan apresiasi prestasi siswa.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
          <div className="bg-muted/50 flex items-center gap-2 rounded-lg border p-1.5">
            <CalendarDays className="text-muted-foreground ml-2 h-5 w-5" />
            <Input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-[140px] border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
          </div>

          <Select value={jenjang} onValueChange={(val: any) => setJenjang(val)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SD">SD</SelectItem>
              <SelectItem value="SMP">SMP</SelectItem>
              <SelectItem value="SMA">SMA</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={tingkat || "SEMUA"}
            onValueChange={(val) =>
              setKelasId(val === "SEMUA" ? "" : (val ?? ""))
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Semua Tingkat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SEMUA">Semua Tingkat</SelectItem>
              {filterOptions?.tingkatList.map((t) => (
                <SelectItem key={t} value={t}>
                  Tingkat {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={kelasId || "SEMUA"}
            onValueChange={(val) =>
              setKelasId(val === "SEMUA" ? "" : (val ?? ""))
            }
            disabled={!tingkat}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Semua Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SEMUA">Semua Kelas</SelectItem>
              {filterOptions?.kelasData
                .filter((k) => k.tingkat === tingkat)
                .map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.tingkat} {k.namaKelas}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 1. RADAR STATISTIK HARI INI */}
      <Card className="border-t-primary border-t-4 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            📊 Radar Kehadiran Sesi Rutin
          </CardTitle>
          <CardDescription>
            Berdasarkan {total} aktivitas tercatat pada{" "}
            {format(new Date(tanggal), "dd MMMM yyyy", { locale: id })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingStats ? (
            <div className="bg-muted mt-4 h-12 animate-pulse rounded-full"></div>
          ) : total === 0 ? (
            <p className="text-muted-foreground py-6 text-center">
              Belum ada data absensi untuk hari ini.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {/* Progress Bar Gabungan */}
              <div className="flex h-8 w-full overflow-hidden rounded-full shadow-inner">
                <div
                  style={{ width: `${persenTepat}%` }}
                  className="bg-emerald-500 transition-all duration-500"
                  title="Tepat Waktu"
                ></div>
                <div
                  style={{ width: `${persenTelat}%` }}
                  className="bg-amber-400 transition-all duration-500"
                  title="Telat"
                ></div>
                <div
                  style={{ width: `${persenSakitIzinLainnya}%` }} // ---> DIUBAH
                  className="bg-blue-400 transition-all duration-500"
                  title="Sakit/Izin/Lainnya"
                ></div>
                <div
                  style={{ width: `${persenAlfa}%` }}
                  className="bg-rose-500 transition-all duration-500"
                  title="Alfa"
                ></div>
              </div>

              {/* Legend / Keterangan */}
              <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                  <p className="mb-1 text-sm font-medium text-emerald-700">
                    Hadir & Tepat
                  </p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {persenTepat}%{" "}
                    <span className="text-xs font-normal">
                      ({stats?.tepatWaktu})
                    </span>
                  </p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                  <p className="mb-1 text-sm font-medium text-amber-700">
                    Telat
                  </p>
                  <p className="text-2xl font-bold text-amber-600">
                    {persenTelat}%{" "}
                    <span className="text-xs font-normal">
                      ({stats?.telat})
                    </span>
                  </p>
                </div>
                {/* ---> KOTAK LEGENDA SAKIT/IZIN DIUBAH */}
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <p className="mb-1 text-sm font-medium text-blue-700">
                    Sakit/Izin/Lainnya
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {persenSakitIzinLainnya}%{" "}
                    <span className="text-xs font-normal">
                      ({stats?.sakitIzinLainnya})
                    </span>
                  </p>
                </div>
                <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
                  <p className="mb-1 text-sm font-medium text-rose-700">
                    Alfa / Membolos
                  </p>
                  <p className="text-2xl font-bold text-rose-600">
                    {persenAlfa}%{" "}
                    <span className="text-xs font-normal">({stats?.alfa})</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. SOROTAN KEDISIPLINAN (ACCORDION) & PELANGGARAN */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Kolom Kiri: Sesi Rutin Bermasalah */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-amber-500" /> Evaluasi Sesi Rutin
            </CardTitle>
            <CardDescription>
              Anak yang telat atau tidak hadir pada jadwal harian.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSesi ? (
              <p className="text-muted-foreground animate-pulse text-sm">
                Memuat data...
              </p>
            ) : sesiBermasalah?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <Medal className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-emerald-700">
                  Luar Biasa!
                </h3>
                <p className="text-muted-foreground">
                  Tidak ada satupun anak yang telat atau alfa di sesi wajib hari
                  ini.
                </p>
              </div>
            ) : (
              <Accordion multiple className="w-full">
                {sesiBermasalah?.map((grupSesi: any) => (
                  <AccordionItem
                    key={grupSesi.sesiDetail.id}
                    value={grupSesi.sesiDetail.id}
                    className="bg-muted/20 mb-3 rounded-lg border px-1"
                  >
                    <AccordionTrigger className="px-3 hover:no-underline">
                      <div className="flex w-full items-center justify-between pr-4">
                        <div className="flex flex-col items-start">
                          <span className="text-base font-bold">
                            {grupSesi.sesiDetail.namaSesi}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {grupSesi.kategoriDetail.namaKategori} •{" "}
                            {grupSesi.sesiDetail.waktuMulai?.substring(0, 5) ||
                              "Fleksibel"}
                          </span>
                        </div>
                        <Badge
                          variant="destructive"
                          className="ml-2 rounded-full px-2.5"
                        >
                          {grupSesi.siswaBermasalah.length} Anak
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-4">
                      <div className="mt-2 space-y-2">
                        {grupSesi.siswaBermasalah.map((siswa: any) => (
                          <div
                            key={siswa.logId}
                            className="bg-background flex items-center justify-between rounded-md border p-3 shadow-sm"
                          >
                            <div>
                              <p className="font-semibold">
                                {siswa.peserta.namaLengkap}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {siswa.kelas.tingkat} {siswa.kelas.namaKelas}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {siswa.logId.startsWith("missing-")
                                ? getStatusBadge("ALFA", true)
                                : getStatusBadge(siswa.statusKehadiran)}
                              <span
                                className={`font-mono text-xs font-bold ${siswa.poinDidapat < 0 ? "text-red-500" : "text-gray-700"}`}
                              >
                                {siswa.poinDidapat > 0
                                  ? `+${siswa.poinDidapat}`
                                  : siswa.poinDidapat}{" "}
                                Poin
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Kolom Kanan: Pelanggaran Manual */}
        <Card className="border-red-100 bg-red-50/10 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-red-700">
              <AlertTriangle className="h-5 w-5" /> Catatan Pelanggaran
            </CardTitle>
            <CardDescription>
              Pelanggaran aturan asrama/sekolah yang dicatat manual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPelanggaran ? (
              <p className="text-muted-foreground animate-pulse text-sm">
                Memuat data...
              </p>
            ) : pelanggaran?.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">
                Aman. Belum ada catatan pelanggaran hari ini.
              </p>
            ) : (
              <div className="space-y-3">
                {pelanggaran?.map((p: any) => (
                  <div
                    key={p.logId}
                    className="bg-background flex flex-col gap-2 rounded-lg border border-red-100 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-base font-bold">
                          {p.peserta.namaLengkap}
                        </p>
                        <p className="text-muted-foreground mb-1 text-xs">
                          {p.kelas.tingkat} {p.kelas.namaKelas}
                        </p>
                      </div>
                      <Badge
                        variant="destructive"
                        className="font-mono text-sm"
                      >
                        {p.poinDidapat} Poin
                      </Badge>
                    </div>

                    <div className="flex flex-col gap-1 rounded border border-red-100 bg-red-50 p-2 text-sm text-red-900">
                      <div className="flex items-center gap-2 font-semibold">
                        <UserX className="h-4 w-4" />{" "}
                        {p.pelanggaran.namaPelanggaran}
                        <Badge
                          variant="outline"
                          className="h-4 px-1 py-0 text-[10px]"
                        >
                          {p.pelanggaran.tingkat}
                        </Badge>
                      </div>
                      {p.keterangan && (
                        <p className="mt-1 text-xs text-red-700/80 italic">
                          "{p.keterangan}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. WALL OF FAME (Ditaruh di akhir sebagai Sandwich Method) */}
      <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-md">
        <CardHeader className="pb-2 text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full border border-yellow-200 bg-yellow-100 shadow-sm">
            <Trophy className="h-8 w-8 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl text-indigo-900">
            Wall of Fame
          </CardTitle>
          <CardDescription className="text-indigo-700/70">
            Top 5 Siswa dengan Akumulasi Poin Kedisiplinan Tertinggi
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {loadingWof ? (
            <p className="animate-pulse text-center text-sm text-indigo-400">
              Menghitung poin...
            </p>
          ) : wallOfFame?.length === 0 ? (
            <p className="py-4 text-center text-indigo-400">
              Belum ada perolehan poin positif yang signifikan hari ini.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              {wallOfFame?.map((siswa: any, index: number) => (
                <div
                  key={siswa.pesertaId}
                  className="relative flex transform flex-col items-center rounded-xl border border-indigo-100 bg-white p-5 text-center shadow-sm transition-transform hover:-translate-y-1"
                >
                  {/* Badge Juara */}
                  <div
                    className={`absolute -top-3 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white font-bold text-white shadow-md ${index === 0 ? "bg-yellow-400" : index === 1 ? "bg-slate-300" : index === 2 ? "bg-amber-600" : "bg-indigo-300"}`}
                  >
                    #{index + 1}
                  </div>

                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-xl font-bold text-indigo-700">
                    {siswa.namaLengkap.charAt(0)}
                  </div>
                  <h3
                    className="mb-1 w-full truncate text-sm leading-tight font-bold"
                    title={siswa.namaLengkap}
                  >
                    {siswa.namaLengkap}
                  </h3>
                  <p className="text-muted-foreground mb-3 text-xs">
                    {siswa.kelasTingkat} {siswa.kelasNama}
                  </p>

                  <div className="mt-auto rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1">
                    <span className="font-mono text-sm font-bold text-emerald-600">
                      +{siswa.totalPoin} Poin
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
