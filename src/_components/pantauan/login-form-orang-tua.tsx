"use client";

import { useState } from "react";
import { Loader2, UserRound, Calendar } from "lucide-react";

import { api } from "~/trpc/react";
// Sesuaikan import UI komponen di bawah ini dengan library yang Anda gunakan (misal: shadcn/ui)
// Jika Anda menggunakan tag HTML standar, Anda bisa mengganti <Button> dengan <button>, dst.
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner"; // Atau library toast yang Anda gunakan

interface LoginFormOrangTuaProps {
  onLoginSuccess: (nipd: string, birthdate: string) => void;
}

export default function LoginFormOrangTua({
  onLoginSuccess,
}: LoginFormOrangTuaProps) {
  const [nipd, setNipd] = useState("");
  const [birthdate, setBirthdate] = useState("");

  const checkAnak = api.pantauan.checkAnak.useMutation({
    onSuccess: (data) => {
      toast.success(`Berhasil! Menampilkan data ${data.namaLengkap}`);
      // Panggil fungsi login dari useParentAuth untuk menyimpan kredensial di localStorage
      onLoginSuccess(nipd, birthdate);
    },
    onError: (error) => {
      toast.error(
        error.message || "Gagal masuk. Periksa kembali NIPD dan Tanggal Lahir.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nipd || !birthdate) {
      toast.error("NIPD dan Tanggal Lahir harus diisi.");
      return;
    }

    checkAnak.mutate({ nipd, tanggalLahir: birthdate });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg ring-1 ring-gray-900/5">
        {/* Header Form */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <UserRound className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">
            Portal Orang Tua
          </h2>
          <p className="mt-1 text-sm font-semibold text-blue-600">
            SRT 1 Kabupaten Bekasi
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Masukkan Nomor Induk Peserta Didik (NIPD) dan Tanggal Lahir anak
            Anda untuk memantau absensi.
          </p>
        </div>

        {/* Formulir */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            {/* Input NIPD */}
            <div className="space-y-1">
              <Label htmlFor="nipd" className="text-gray-700">
                NIPD Anak
              </Label>
              <Input
                id="nipd"
                name="nipd"
                type="text"
                required
                placeholder="Contoh: 12345678"
                value={nipd}
                onChange={(e) => setNipd(e.target.value)}
                disabled={checkAnak.isPending}
                className="w-full"
              />
            </div>

            {/* Input Tanggal Lahir */}
            <div className="space-y-1">
              <Label htmlFor="birthdate" className="text-gray-700">
                Tanggal Lahir
              </Label>
              <div className="relative">
                <Input
                  id="birthdate"
                  name="birthdate"
                  type="date"
                  required
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  disabled={checkAnak.isPending}
                  className="w-full pr-10" // Beri ruang untuk icon jika diperlukan
                />
                <Calendar className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={checkAnak.isPending}
          >
            {checkAnak.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memeriksa Data...
              </>
            ) : (
              "Masuk ke Portal"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
