"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";
import {
  ArrowLeft,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  Trash2,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateProfile,
  checkHasPassword,
  createPassword,
  changePassword,
  getSessions,
  getCurrentUser,
  revokeSessionAction,
  revokeOtherSessionsAction,
} from "~/server/actions/account";

function getDeviceIcon(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile")) return <Smartphone className="h-5 w-5" />;
  if (ua.includes("tablet") || ua.includes("ipad"))
    return <Tablet className="h-5 w-5" />;
  return <Monitor className="h-5 w-5" />;
}

function SessionList() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const fetchSessions = () => {
    getSessions()
      .then(setSessions)
      .catch((err) => toast.error(err.message || "Gagal memuat sesi"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = (token: string) => {
    startTransition(async () => {
      try {
        await revokeSessionAction(token);
        toast.success("Sesi berhasil dicabut dari perangkat tersebut.");
        fetchSessions(); // Refresh data
      } catch (err: any) {
        toast.error(err.message || "Gagal mencabut sesi.");
      }
    });
  };

  const handleRevokeOthers = () => {
    startTransition(async () => {
      try {
        await revokeOtherSessionsAction();
        toast.success("Berhasil keluar dari semua perangkat lain.");
        fetchSessions(); // Refresh data
      } catch (err: any) {
        toast.error(err.message || "Gagal keluar dari perangkat lain.");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">Tidak ada sesi aktif.</p>
    );
  }

  const hasOtherSessions = sessions.some((s) => !s.isCurrent);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="text-muted-foreground flex-shrink-0">
                {getDeviceIcon(session.userAgent || "")}
              </div>
              <div className="min-w-0 flex-1">
                {/* Pisahkan teks User Agent dan Badge dengan Flexbox */}
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {session.userAgent || "Perangkat tidak dikenal"}
                  </p>
                  {session.isCurrent && (
                    <span className="flex-shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      Saat Ini
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  IP: {session.ipAddress || "Tidak diketahui"} •{" "}
                  {new Date(session.createdAt).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </div>

            {/* Tombol Hapus Sesi Spesifik */}
            {!session.isCurrent && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRevoke(session.token)}
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive flex-shrink-0"
                title="Keluarkan perangkat ini"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Tombol Hapus Semua Sesi Lain (Tampil jika ada lebih dari 1 sesi) */}
      {hasOtherSessions && (
        <Button
          variant="outline"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full"
          disabled={isPending}
          onClick={handleRevokeOthers}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          Keluar dari Semua Perangkat Lain
        </Button>
      )}
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State pengguna
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    nip: string | null;
  } | null>(null);

  const [name, setName] = useState("");
  const [nip, setNip] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  // Password state
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Ambil data user dan status password saat mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [user, pwStatus] = await Promise.all([
          getCurrentUser(),
          checkHasPassword(),
        ]);
        setUserData(user);
        setName(user.name);
        setNip(user.nip || ""); // Prefill NIP (jika null, jadi string kosong)
        setHasPassword(pwStatus);
      } catch (err: any) {
        toast.error(err.message || "Gagal memuat data akun");
      } finally {
        setInitialLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        // Konversi string kosong menjadi null untuk konsistensi database
        const nipValue = nip.trim() === "" ? null : nip.trim();
        await updateProfile(name, nipValue);
        toast.success("Profil berhasil diperbarui");

        // Update data lokal setelah sukses
        setUserData((prev) => (prev ? { ...prev, name, nip: nipValue } : null));
      } catch (err: any) {
        toast.error(err.message || "Gagal memperbarui profil");
      }
    });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi kata sandi tidak cocok");
      return;
    }

    startTransition(async () => {
      try {
        if (hasPassword) {
          if (!oldPassword) {
            toast.error("Kata sandi lama harus diisi");
            return;
          }
          await changePassword(oldPassword, newPassword);
          toast.success("Kata sandi berhasil diubah");
        } else {
          await createPassword(newPassword);
          toast.success("Kata sandi berhasil dibuat");
          setHasPassword(true);
        }
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (err: any) {
        toast.error(err.message || "Operasi gagal");
      }
    });
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Cek apakah ada perubahan pada input Profil agar tombol "Simpan" aktif
  const isProfileChanged =
    name !== userData?.name || nip !== (userData?.nip || "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/aktivitas")}
          className="text-muted-foreground hover:text-foreground -ml-3"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        <h1 className="text-2xl font-bold">Pengaturan Akun</h1>
        <div className="w-16" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Kolom kiri: Profil & Keamanan */}
        <div className="space-y-8">
          {/* Ubah Profil (Nama & NIP) */}
          <Card>
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div>
                <h2 className="text-lg font-semibold">Profil</h2>
                <p className="text-muted-foreground text-sm">
                  Perbarui nama tampilan dan NIP Anda.
                </p>
              </div>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold">
                    Nama Lengkap
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={userData?.name || "Masukkan nama lengkap"}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nip" className="text-sm font-semibold">
                    NIP (Nomor Induk Pegawai)
                  </Label>
                  <Input
                    id="nip"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Contoh: 198001012010011001"
                    className="h-12"
                  />
                  <p className="text-muted-foreground text-sm">
                    Kosongkan jika tidak memiliki NIP. Akan ditampilkan sebagai
                    tanda strip (-) pada dokumen PDF.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isPending || !name.trim() || !isProfileChanged}
                  className="h-12 w-full font-semibold"
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Simpan Profil
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div>
                <h2 className="text-lg font-semibold">Kata Sandi</h2>
                <p className="text-muted-foreground text-sm">
                  {hasPassword === null
                    ? "Memeriksa status akun..."
                    : hasPassword
                      ? "Ubah kata sandi Anda secara berkala."
                      : "Akun Anda belum memiliki kata sandi. Buat sekarang agar bisa login dengan email & sandi."}
                </p>
              </div>

              {hasPassword === null ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                </div>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {hasPassword && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="oldPassword"
                        className="text-sm font-semibold"
                      >
                        Kata Sandi Lama
                      </Label>
                      <Input
                        id="oldPassword"
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Masukkan kata sandi saat ini"
                        required
                        className="h-12"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label
                      htmlFor="newPassword"
                      className="text-sm font-semibold"
                    >
                      {hasPassword ? "Kata Sandi Baru" : "Kata Sandi Baru"}
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan kata sandi baru"
                      required
                      minLength={8}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-semibold"
                    >
                      Konfirmasi Kata Sandi
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi baru"
                      required
                      className="h-12"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="h-12 w-full font-semibold"
                  >
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {hasPassword ? "Perbarui Kata Sandi" : "Buat Kata Sandi"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kolom kanan: Sesi Aktif */}
        <div>
          <Card>
            <CardContent className="p-6 sm:p-8">
              <h2 className="mb-4 text-lg font-semibold">Sesi Aktif</h2>
              <SessionList />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
