// src/app/(dashboard)/dashboard/(staffonly)/bimbingan/monitor/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Button, buttonVariants } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  AlertCircle,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { cn } from "~/lib/utils";

export default function MonitorListPage() {
  const router = useRouter();

  const [jenjang, setJenjang] = useState<"SD" | "SMP" | "SMA" | "all">("all");
  const [tingkat, setTingkat] = useState<string>("all");
  const [kelasId, setKelasId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"semua" | "sudah" | "belum">(
    "semua",
  );

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10); // <- Limit diubah menjadi state

  // Implementasi Debounce Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: daftarKelas = [] } = api.peserta.getAllKelas.useQuery();

  const { data: monitoringData, isLoading } =
    api.bimbingan.getOverviewMonitoring.useQuery({
      jenjang: jenjang === "all" ? undefined : jenjang,
      tingkat: tingkat === "all" ? undefined : tingkat,
      kelasId: kelasId === "all" ? undefined : kelasId,
      search: debouncedSearch || undefined,
      statusEvaluasi: statusFilter === "semua" ? undefined : statusFilter,
      page,
      limit,
    });

  const totalPages = monitoringData?.totalPages ?? 1;

  const tingkatOptions = useMemo(
    () => [
      ...new Set(
        daftarKelas.filter((k) => k.jenjang === jenjang).map((k) => k.tingkat),
      ),
    ],
    [daftarKelas, jenjang],
  );

  const kelasOptions = useMemo(
    () =>
      daftarKelas.filter(
        (k) =>
          k.jenjang === jenjang && (tingkat === "all" || k.tingkat === tingkat),
      ),
    [daftarKelas, jenjang, tingkat],
  );

  const selectedKelasLabel =
    kelasId === "all"
      ? "Semua"
      : (daftarKelas.find((k) => k.id === kelasId)?.namaKelas ?? "Pilih Kelas");

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Monitoring Perkembangan
          </h1>
          <p className="text-muted-foreground">
            Pantau perkembangan peserta didik berdasarkan matriks evaluasi.
          </p>
        </div>
      </div>

      {monitoringData && monitoringData.insightKritis.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-destructive flex items-center gap-2">
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
                  <Link
                    href={`/dashboard/bimbingan/monitor/${insight.pesertaDidikId}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "border-destructive text-destructive hover:bg-destructive h-7 hover:text-white",
                    )}
                  >
                    Tindak Lanjuti
                  </Link>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Jenjang</label>
            <Select
              value={jenjang}
              onValueChange={(v) => {
                setJenjang(v as typeof jenjang);
                setTingkat("all");
                setKelasId("all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="SD">SD</SelectItem>
                <SelectItem value="SMP">SMP</SelectItem>
                <SelectItem value="SMA">SMA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {jenjang !== "all" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Tingkat
                </label>
                <Select
                  value={tingkat}
                  onValueChange={(v) => {
                    if (v) setTingkat(v);
                    setKelasId("all");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {tingkatOptions.map((t) => (
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
                  value={kelasId}
                  onValueChange={(v) => {
                    setKelasId(v ?? "all");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue>{selectedKelasLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {kelasOptions.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.namaKelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        <div className="flex flex-1 items-center justify-end gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Cari nama..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as typeof statusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Status</SelectItem>
              <SelectItem value="sudah">Sudah Dievaluasi</SelectItem>
              <SelectItem value="belum">Belum Dievaluasi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 py-3">Nama Peserta</TableHead>
                <TableHead className="px-6 py-3">Kelas</TableHead>
                <TableHead className="px-6 py-3">Status Evaluasi</TableHead>
                <TableHead className="px-6 py-3 text-center">
                  Total Skor Terakhir
                </TableHead>
                <TableHead className="px-6 py-3 text-center">Periode</TableHead>
                <TableHead className="px-6 py-3 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 px-6 text-center">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : monitoringData?.tabelData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 px-6 text-center">
                    Tidak ada data ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                monitoringData?.tabelData.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() =>
                      router.push(`/dashboard/bimbingan/monitor/${row.id}`)
                    }
                  >
                    <TableCell className="px-6 py-3 font-medium">
                      {row.namaLengkap}
                    </TableCell>
                    <TableCell className="px-6 py-3">{row.kelas}</TableCell>
                    <TableCell className="px-6 py-3">
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
                    <TableCell className="px-6 py-3 text-center">
                      {row.skorTerakhir ?? "-"}
                    </TableCell>
                    <TableCell className="px-6 py-3 text-center">
                      {row.periodeTerakhir}
                    </TableCell>
                    <TableCell className="px-6 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="pointer-events-auto gap-2"
                        onClick={(e) => e.stopPropagation()}
                        nativeButton={false}
                        render={
                          <Link href={`/dashboard/bimbingan/monitor/${row.id}`}>
                            <Eye className="h-4 w-4" /> Detail
                          </Link>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tampilan Pagination + Limit Control */}
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        {/* Bagian Limit Info & Control */}
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-sm">Menampilkan</p>
          <Select
            value={limit.toString()}
            onValueChange={(v) => {
              setLimit(Number(v));
              setPage(1); // Reset page jika limit berubah
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 25, 50, 100].map((val) => (
                <SelectItem key={val} value={val.toString()}>
                  {val}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-sm">
            dari {monitoringData?.totalCount ?? 0} data
          </p>
        </div>

        {/* Bagian Page Control */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" /> Sebelumnya
            </Button>
            <span className="px-2 text-sm">
              Halaman {page} dari {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Selanjutnya <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
