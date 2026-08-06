"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  LogOut,
  User,
  CalendarDays,
  Clock,
  AlertTriangle,
  BookOpen,
  Fingerprint,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface DasborMiniAnakProps {
  onLogout: () => void;
}

export default function DasborMiniAnak({ onLogout }: DasborMiniAnakProps) {
  // 1. Mengambil data profil yang disuntikkan via headers (parentProcedure)
  const { data: profil, isLoading: loadingProfil } =
    api.pantauan.getProfil.useQuery();

  // 2. Mengambil riwayat aktivitas (14 data terakhir)
  const { data: riwayat, isLoading: loadingRiwayat } =
    api.pantauan.getRiwayatAbsensi.useQuery({ limit: 14 });

  // Fungsi utilitas untuk memberikan warna badge berdasarkan status kehadiran
  const getStatusColor = (status: string, waktu?: string | null) => {
    if (status === "HADIR") {
      return waktu === "TELAT"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
    if (status === "IZIN" || status === "SAKIT")
      return "bg-blue-100 text-blue-800 border-blue-200";
    if (status === "ALFA" || status === "TIDAK_HADIR")
      return "bg-red-100 text-red-800 border-red-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Fungsi utilitas untuk merapikan teks status
  const getStatusText = (status: string, waktu?: string | null) => {
    if (status === "HADIR" && waktu === "TELAT") return "HADIR (TELAT)";
    if (status === "TIDAK_HADIR") return "ALFA";
    return status;
  };

  if (loadingProfil) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header Mobile: Latar belakang warna utama yang menyatu ke atas */}
      <div className="bg-primary px-4 pt-6 pb-24 shadow-md sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-primary-foreground text-xl font-bold tracking-tight">
              Aktivitas Peserta Didik
            </h1>
            <span className="text-primary-foreground/80 mt-1 text-sm font-medium">
              SRT 1 Kabupaten Bekasi
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-primary-foreground hover:bg-primary-foreground/20 hover:text-white"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Keluar
          </Button>
        </div>
      </div>

      {/* Konten Utama Dasbor */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* 1. Kartu Profil Siswa (Desain melayang di atas Header) */}
        <div className="-mt-16 mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full">
              <User className="text-primary h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold text-gray-900">
                {profil?.namaLengkap}
              </h2>
              <div className="mt-1 flex flex-col gap-1 text-sm text-gray-500 sm:flex-row sm:gap-4">
                <span className="flex items-center gap-1.5">
                  <Fingerprint className="h-4 w-4" /> NIPD: {profil?.nipd}
                </span>
                {profil?.kelas && (
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" /> Kelas:{" "}
                    {profil.kelas.tingkat} {profil.kelas.namaKelas} (
                    {profil.kelas.jenjang})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Riwayat Absensi & Pelanggaran */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Riwayat Aktivitas Terakhir
          </h3>

          {loadingRiwayat ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Memuat data absensi...
            </div>
          ) : !riwayat || riwayat.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <Clock className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500">
                Belum ada catatan aktivitas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {riwayat.map((absen) => (
                <div
                  key={absen.id}
                  className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-900/5 transition-all hover:shadow-md"
                >
                  {/* Judul Sesi & Badge Status */}
                  <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="font-medium text-gray-900">
                      {absen.sesi?.namaSesi || "Sesi Khusus"}
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(absen.statusKehadiran, absen.statusWaktu)}`}
                    >
                      {getStatusText(absen.statusKehadiran, absen.statusWaktu)}
                    </span>
                  </div>

                  {/* Informasi Waktu & Tanggal */}
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <p className="flex items-center gap-1 text-xs text-gray-400">
                        <CalendarDays className="h-3.5 w-3.5" /> Tanggal
                      </p>
                      <p className="mt-0.5 font-medium">
                        {format(new Date(absen.tanggal), "dd MMM yyyy", {
                          locale: localeId,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3.5 w-3.5" /> Waktu Tercatat
                      </p>
                      <p className="mt-0.5 font-medium">
                        {format(new Date(absen.waktuScan), "HH:mm")} WIB
                      </p>
                    </div>
                  </div>

                  {/* Catatan Pelanggaran (Jika ada relasi ke master_pelanggaran)[cite: 1] */}
                  {absen.pelanggaran && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                      <div>
                        <p className="font-semibold">Catatan Pelanggaran</p>
                        <p>
                          {absen.pelanggaran.namaPelanggaran} (Poin:{" "}
                          {absen.pelanggaran.poinMinus})
                        </p>
                        {absen.keterangan && (
                          <p className="mt-1 text-xs text-red-700/80">
                            {absen.keterangan}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {absen.keterangan && !absen.pelanggaran && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-2.5 text-sm text-gray-600">
                      <span className="font-medium">Keterangan:</span>{" "}
                      {absen.keterangan}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
