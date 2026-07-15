// src/app/(dashboard)/dashboard/aktivitas/page.tsx
"use client";

import { useState, useMemo } from "react";
import { api, type RouterOutputs } from "~/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ManualLogFormDialog } from "~/_components/aktivitas/manual-log-form-dialog";
import { EditLogDialog } from "~/_components/aktivitas/edit-log-dialog";
import { RotateCcw } from "lucide-react";

type LogEntry = RouterOutputs["aktivitas"]["getRecentLogs"][number];

function getStatusBadge(log: LogEntry) {
  if (log.statusKehadiran === "HADIR" && log.statusWaktu === "TELAT") {
    return (
      <Badge
        variant="outline"
        className="border-amber-400 bg-amber-50 text-amber-600"
      >
        TELAT
      </Badge>
    );
  }
  switch (log.statusKehadiran) {
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
    case "LAINNYA":
      return (
        <Badge
          variant="outline"
          className="border-purple-300 bg-purple-50 text-purple-600"
        >
          LAIN-LAIN
        </Badge>
      );
    case "ALFA":
    case "TIDAK_HADIR":
      return <Badge variant="destructive">{log.statusKehadiran}</Badge>;
    default:
      return <Badge variant="default">HADIR</Badge>;
  }
}

export default function AktivitasPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [jenjang, setJenjang] = useState<"SD" | "SMP" | "SMA" | "">("");
  const [tingkat, setTingkat] = useState("");
  const [kelasId, setKelasId] = useState("");
  const [sesiId, setSesiId] = useState("");
  const [namaSiswa, setNamaSiswa] = useState("");
  const [statusKehadiran, setStatusKehadiran] = useState("");
  const [tipeLog, setTipeLog] = useState<"SESI" | "PELANGGARAN" | "">("");

  const { data: options } = api.aktivitas.getFormOptions.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const semuaSesi = useMemo(() => {
    if (!options?.kategori) return [];
    return options.kategori.flatMap((k) => k.sesi);
  }, [options]);

  const tingkatOptions = useMemo(() => {
    if (!options?.semuaKelas || !jenjang) return [];
    const tingkatSet = new Set(
      options.semuaKelas
        .filter((k) => k.jenjang === jenjang)
        .map((k) => k.tingkat),
    );
    return Array.from(tingkatSet).sort((a, b) => Number(a) - Number(b));
  }, [options, jenjang]);

  const kelasOptions = useMemo(() => {
    if (!options?.semuaKelas || !jenjang || !tingkat) return [];
    return options.semuaKelas.filter(
      (k) => k.jenjang === jenjang && k.tingkat === tingkat,
    );
  }, [options, jenjang, tingkat]);

  const selectedKelas = useMemo(() => {
    if (!kelasId) return null;
    return kelasOptions.find((k) => k.id === kelasId);
  }, [kelasId, kelasOptions]);

  const selectedSesi = useMemo(() => {
    if (!sesiId) return null;
    return semuaSesi.find((s) => s.id === sesiId);
  }, [sesiId, semuaSesi]);

  const filterPayload = useMemo(() => {
    const payload: Record<string, unknown> = {};
    if (startDate) payload.startDate = startDate;
    if (endDate) payload.endDate = endDate;
    if (jenjang) payload.jenjang = jenjang;
    if (tingkat) payload.tingkat = tingkat;
    if (kelasId) payload.kelasId = kelasId;
    if (sesiId) payload.sesiId = sesiId;
    if (namaSiswa) payload.namaSiswa = namaSiswa;
    if (statusKehadiran) payload.statusKehadiran = statusKehadiran;
    if (tipeLog) payload.tipeLog = tipeLog;
    return Object.keys(payload).length > 0 ? payload : undefined;
  }, [
    startDate,
    endDate,
    jenjang,
    tingkat,
    kelasId,
    sesiId,
    namaSiswa,
    statusKehadiran,
    tipeLog,
  ]);

  const { data: logs, isLoading } = api.aktivitas.getRecentLogs.useQuery(
    filterPayload ?? {},
    { enabled: true },
  );

  const resetFilter = () => {
    setStartDate("");
    setEndDate("");
    setJenjang("");
    setTingkat("");
    setKelasId("");
    setSesiId("");
    setNamaSiswa("");
    setStatusKehadiran("");
    setTipeLog("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Aktivitas Absensi & Kedisiplinan
          </h1>
          <p className="text-muted-foreground">
            Riwayat log absensi, kegiatan, dan pelanggaran.
          </p>
        </div>
        <ManualLogFormDialog />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter & Pencarian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium">Dari Tgl</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium">Sampai Tgl</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium">Jenjang</label>
              <Select
                value={jenjang || "SEMUA"}
                onValueChange={(v) => {
                  setJenjang(v === "SEMUA" ? "" : (v as "SD" | "SMP" | "SMA"));
                  setTingkat("");
                  setKelasId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMUA">Semua</SelectItem>
                  <SelectItem value="SD">SD</SelectItem>
                  <SelectItem value="SMP">SMP</SelectItem>
                  <SelectItem value="SMA">SMA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium">Tingkat</label>
              <Select
                value={tingkat || "SEMUA"}
                disabled={!jenjang}
                onValueChange={(v) => {
                  setTingkat(v === "SEMUA" ? "" : (v ?? ""));
                  setKelasId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMUA">Semua</SelectItem>
                  {tingkatOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium">Kelas</label>
              <Select
                value={kelasId || "SEMUA"}
                disabled={!tingkat}
                onValueChange={(v) =>
                  setKelasId(v === "SEMUA" ? "" : (v ?? ""))
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {selectedKelas
                      ? `${selectedKelas.tingkat} ${selectedKelas.namaKelas}`
                      : "Semua"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMUA">Semua</SelectItem>
                  {kelasOptions.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.tingkat} {k.namaKelas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium">Sesi</label>
              <Select
                value={sesiId || "SEMUA"}
                onValueChange={(v) => setSesiId(v === "SEMUA" ? "" : (v ?? ""))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {selectedSesi ? selectedSesi.namaSesi : "Semua Sesi"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMUA">Semua</SelectItem>
                  {semuaSesi.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.namaSesi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium">Nama Siswa</label>
              <Input
                placeholder="Cari nama..."
                value={namaSiswa}
                onChange={(e) => setNamaSiswa(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium">Status</label>
              <Select
                value={statusKehadiran || "SEMUA"}
                onValueChange={(v) =>
                  setStatusKehadiran(v === "SEMUA" ? "" : (v ?? ""))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMUA">Semua</SelectItem>
                  <SelectItem value="HADIR">Hadir</SelectItem>
                  <SelectItem value="IZIN">Izin</SelectItem>
                  <SelectItem value="SAKIT">Sakit</SelectItem>
                  <SelectItem value="ALFA">Alfa</SelectItem>
                  <SelectItem value="LAINNYA">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium">Tipe Log</label>
              <Select
                value={tipeLog || "SEMUA"}
                onValueChange={(v) =>
                  setTipeLog(
                    v === "SEMUA" ? "" : ((v as "SESI" | "PELANGGARAN") ?? ""),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMUA">Semua</SelectItem>
                  <SelectItem value="SESI">Sesi Rutin</SelectItem>
                  <SelectItem value="PELANGGARAN">Pelanggaran</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={resetFilter}>
                <RotateCcw className="mr-1 h-4 w-4" /> Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabel log */}
      <Card>
        <CardHeader>
          <CardTitle>Data Log</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Memuat data...</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu & Tanggal</TableHead>
                    <TableHead>Siswa</TableHead>
                    <TableHead>Aktivitas / Pelanggaran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Poin</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Pencatat</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="font-medium">
                          {format(new Date(log.waktuScan), "HH:mm:ss")}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {format(new Date(log.tanggal), "dd MMM yyyy", {
                            locale: id,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {log.pesertaDidik.namaLengkap}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {log.pesertaDidik.kelas.jenjang}{" "}
                          {log.pesertaDidik.kelas.tingkat}{" "}
                          {log.pesertaDidik.kelas.namaKelas}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.sesi ? (
                          <div>
                            <span className="font-medium">
                              {log.sesi.kategori?.namaKategori}
                            </span>
                            <span className="text-muted-foreground mx-1">
                              •
                            </span>
                            <span>{log.sesi.namaSesi}</span>
                          </div>
                        ) : log.pelanggaran ? (
                          <div className="flex items-center gap-2 font-medium text-red-600">
                            {log.pelanggaran.namaPelanggaran}
                            <Badge
                              variant="destructive"
                              className="h-4 px-1 py-0 text-[10px]"
                            >
                              {log.pelanggaran.tingkat}
                            </Badge>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(log)}</TableCell>
                      <TableCell className="text-right font-mono">
                        <div
                          className={`font-bold ${
                            log.poinDidapat > 0
                              ? "text-green-600"
                              : log.poinDidapat < 0
                                ? "text-red-600"
                                : "text-gray-500"
                          }`}
                        >
                          {log.poinDidapat > 0
                            ? `+${log.poinDidapat}`
                            : log.poinDidapat}
                        </div>
                        {log.isPoinManual && (
                          <div className="text-[10px] text-orange-500 italic">
                            Diedit Manual
                          </div>
                        )}
                      </TableCell>
                      <TableCell
                        className="max-w-[150px] truncate"
                        title={log.keterangan || "-"}
                      >
                        {log.keterangan || (
                          <span className="text-muted-foreground italic">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.waliAsuh?.name || "Sistem"}
                      </TableCell>
                      <TableCell>
                        <EditLogDialog log={log} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs?.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-muted-foreground py-8 text-center"
                      >
                        Tidak ada data yang sesuai filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
