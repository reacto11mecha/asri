// src/app/(dashboard)/dashboard/(staffonly)/bimbingan/monitor/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { api } from "~/trpc/react";
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
  ArrowLeft,
  Plus,
  Pencil,
  User,
  IdCard,
  GraduationCap,
  MapPin,
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

  // 1. Fetch Profil Identitas Siswa
  // (Pastikan endpoint ini mengembalikan relasi 'kelas' dan 'waliAsuh')
  const { data: profil } = api.peserta.getById.useQuery({
    id: pesertaDidikId,
  });

  // 2. Fetch riwayat monitoring
  const { data: riwayat, isLoading } = api.bimbingan.getDetailRiwayat.useQuery({
    pesertaDidikId,
  });

  const chartData =
    riwayat?.map((item) => ({
      name: `Monev ${item.monevKe} (${item.periodeBulan}/${item.periodeTahun})`,
      ADL: item.totalSkorAdl,
      Sosial: item.totalSkorSosial,
      Mental: item.totalSkorMental,
      Vokasional: item.totalSkorVokasional,
    })) || [];

  if (isLoading) {
    return <div className="p-6">Memuat data monitoring...</div>;
  }

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
              <Plus className="mr-2 h-4 w-4" />
              Tambah Evaluasi (Monev)
            </Link>
          }
          nativeButton={false}
        />
      </div>

      {/* --- KARTU IDENTITAS PESERTA DIDIK --- */}
      {profil && (
        <Card className="bg-muted/40">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-full">
                <User className="h-8 w-8" />
              </div>
              <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Info Utama */}
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                    <User className="h-3.5 w-3.5" /> Nama Lengkap
                  </p>
                  <p className="text-lg font-semibold">{profil.namaLengkap}</p>
                </div>

                {/* Info Akademik */}
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                    <IdCard className="h-3.5 w-3.5" /> NIPD / NISN
                  </p>
                  <p className="font-medium">
                    {profil.nipd} {profil.nisn ? `/ ${profil.nisn}` : ""}
                  </p>
                </div>

                {/* Info Kelas */}
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                    <GraduationCap className="h-3.5 w-3.5" /> Kelas
                  </p>
                  <p className="font-medium">
                    {profil.kelas?.tingkat} {profil.kelas?.namaKelas} (
                    {profil.kelas?.jenjang})
                  </p>
                </div>

                {/* Info Wali Asuh */}
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

      {/* --- GRAFIK TREN PERKEMBANGAN --- */}
      <Card>
        <CardHeader>
          <CardTitle>Tren Perkembangan Berdasarkan Aspek</CardTitle>
          <CardDescription>
            Melacak skor ADL, Sosial, Mental, dan Vokasional dari waktu ke
            waktu.
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
                Belum ada data evaluasi untuk ditampilkan.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- TABEL RIWAYAT EVALUASI --- */}
      <Card>
        {/* ... (Kode tabel sama persis seperti sebelumnya) ... */}
        <CardHeader>
          <CardTitle>Riwayat Evaluasi (Monev)</CardTitle>
          <CardDescription>
            Daftar seluruh laporan perkembangan bulanan yang telah dilakukan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Monev Ke</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-center">Skor ADL</TableHead>
                  <TableHead className="text-center">Skor Sosial</TableHead>
                  <TableHead className="text-center">Skor Mental</TableHead>
                  <TableHead className="text-center">Skor Vokasional</TableHead>
                  <TableHead className="text-center font-bold">Total</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riwayat?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Belum ada catatan monev.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...(riwayat || [])].reverse().map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        Monev {item.monevKe}
                      </TableCell>
                      <TableCell>
                        {item.periodeBulan}/{item.periodeTahun}
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
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            render={
                              <Link
                                href={`/dashboard/bimbingan/monitor/${pesertaDidikId}/edit/${item.id}`}
                              >
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                Edit
                              </Link>
                            }
                            nativeButton={false}
                          />
                        </div>
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
