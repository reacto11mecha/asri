// src/app/pantauan/page.tsx
"use client";

import { useParentAuth } from "~/hooks/useParentHooks";
import { Loader2 } from "lucide-react";

// Pastikan path import ini sesuai dengan lokasi Anda menyimpan komponen sebelumnya
import LoginFormOrangTua from "~/_components/pantauan/login-form-orang-tua";
import DasborMiniAnak from "~/_components/pantauan/dashboard-mini-anak";

export default function HalamanPantauanOrangTua() {
  // Mengambil state dan fungsi dari hook yang sudah kita perbaiki dari peringatan ESLint
  const { credentials, isLoaded, login, logout } = useParentAuth();

  // 1. Menunggu siklus asinkron (setTimeout) dari hook selesai untuk menghindari hydration mismatch
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // 2. Jika tidak ada kredensial di localStorage, tampilkan form login
  if (!credentials) {
    return (
      <main className="min-h-screen bg-gray-50">
        <LoginFormOrangTua onLoginSuccess={login} />
      </main>
    );
  }

  // 3. Jika sudah login (kredensial ada), tampilkan dasbor mini
  return (
    <main className="min-h-screen bg-gray-50">
      <DasborMiniAnak onLogout={logout} />
    </main>
  );
}
