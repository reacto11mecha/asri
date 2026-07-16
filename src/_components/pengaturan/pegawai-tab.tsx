// src/_components/pengaturan/pegawai-tab.tsx
"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "~/trpc/react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import {
  Shield,
  Briefcase,
  Plus,
  UserCheck,
  UserX,
  Edit,
  Clock,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

// --- tipe untuk user yang sedang diproses ---
type PendingUser = RouterOutputs["pengaturan"]["getPendingUsers"][number];
type ApprovedUser = RouterOutputs["pengaturan"]["getApprovedUsers"][number];
type SelectedUser = PendingUser | ApprovedUser | null;

export function PegawaiTab() {
  const utils = api.useUtils();

  // QUERIES
  const { data: jabatans, isLoading: loadingJabatan } =
    api.pengaturan.getJabatans.useQuery();
  const { data: pendingUsers, isLoading: loadingPending } =
    api.pengaturan.getPendingUsers.useQuery();
  const { data: approvedUsers, isLoading: loadingApproved } =
    api.pengaturan.getApprovedUsers.useQuery();

  // MUTATIONS - JABATAN
  const createJabatan = api.pengaturan.createJabatan.useMutation({
    onSuccess: () => {
      toast.success("Jabatan berhasil ditambahkan");
      utils.pengaturan.getJabatans.invalidate();
      setOpenJabatan(false);
    },
    onError: (e) => toast.error(e.message),
  });

  // MUTATIONS - PEGAWAI
  const approveUser = api.pengaturan.approveUser.useMutation({
    onSuccess: () => {
      toast.success("Pegawai berhasil di-approve");
      utils.pengaturan.getPendingUsers.invalidate();
      utils.pengaturan.getApprovedUsers.invalidate();
      setOpenApprove(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectUser = api.pengaturan.rejectUser.useMutation({
    onSuccess: () => {
      toast.success("Akun berhasil ditolak/dihapus");
      utils.pengaturan.getPendingUsers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateJabatanUser = api.pengaturan.updateUserJabatan.useMutation({
    onSuccess: () => {
      toast.success("Jabatan pegawai berhasil diperbarui");
      utils.pengaturan.getApprovedUsers.invalidate();
      setOpenEditPegawai(false);
    },
    onError: (e) => toast.error(e.message),
  });

  // STATES FOR DIALOGS
  const [openJabatan, setOpenJabatan] = useState(false);
  const [formJabatan, setFormJabatan] = useState({
    namaJabatan: "",
    role: "STAFF",
  });

  const [openApprove, setOpenApprove] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SelectedUser>(null);
  const [selectedJabatanId, setSelectedJabatanId] = useState("");

  const [openEditPegawai, setOpenEditPegawai] = useState(false);

  // HANDLERS
  const handleApprove = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!selectedJabatanId)
      return toast.error("Silakan pilih jabatan terlebih dahulu");
    approveUser.mutate({
      userId: selectedUser.id,
      jabatanId: selectedJabatanId,
    });
  };

  const handleUpdateJabatanUser = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!selectedJabatanId) return toast.error("Silakan pilih jabatan");
    updateJabatanUser.mutate({
      userId: selectedUser.id,
      jabatanId: selectedJabatanId,
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pegawai" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pegawai" className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Manajemen Pegawai
            {pendingUsers && pendingUsers.length > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 rounded-full px-1.5 py-0 text-[10px]"
              >
                {pendingUsers.length} Baru
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="jabatan" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Master Jabatan
          </TabsTrigger>
        </TabsList>

        {/* ========================================================
            TAB: MANAJEMEN PEGAWAI
        ======================================================== */}
        <TabsContent value="pegawai" className="space-y-6">
          {/* SEKSI 1: MENUNGGU PERSETUJUAN */}
          <Card className="border-amber-200 shadow-sm">
            <CardHeader className="border-b border-amber-100 bg-amber-50/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-amber-800">
                <Clock className="h-5 w-5 text-amber-500" /> Menunggu
                Persetujuan (Pending)
              </CardTitle>
              <CardDescription>
                Akun baru yang mendaftar dan belum memiliki akses masuk ke
                sistem.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingPending ? (
                <p className="text-muted-foreground animate-pulse text-sm">
                  Memuat data...
                </p>
              ) : pendingUsers?.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  Tidak ada akun baru yang menunggu persetujuan.
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingUsers?.map((u) => (
                    <div
                      key={u.id}
                      className="bg-background flex flex-col justify-between gap-4 rounded-lg border p-4 shadow-sm md:flex-row md:items-center"
                    >
                      <div>
                        <p className="text-base font-bold">{u.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {u.email}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Mendaftar pada:{" "}
                          {format(new Date(u.createdAt), "dd MMM yyyy, HH:mm", {
                            locale: localeId,
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Tolak dan hapus pendaftaran ${u.name}?`,
                              )
                            ) {
                              rejectUser.mutate({ userId: u.id });
                            }
                          }}
                        >
                          <UserX className="mr-2 h-4 w-4" /> Tolak
                        </Button>
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => {
                            setSelectedUser(u);
                            setSelectedJabatanId("");
                            setOpenApprove(true);
                          }}
                        >
                          <UserCheck className="mr-2 h-4 w-4" /> Approve & Beri
                          Jabatan
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SEKSI 2: PEGAWAI AKTIF */}
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg">Daftar Pegawai Aktif</CardTitle>
              <CardDescription>
                Pegawai yang memiliki akses ke dalam sistem ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingApproved ? (
                <p className="text-muted-foreground animate-pulse text-sm">
                  Memuat data...
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-muted-foreground bg-muted/50 border-b text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium">Nama Pegawai</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Jabatan</th>
                        <th className="px-4 py-3 font-medium">
                          Level Akses (Role)
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedUsers?.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/30 border-b">
                          <td className="px-4 py-3 font-semibold">{u.name}</td>
                          <td className="text-muted-foreground px-4 py-3">
                            {u.email}
                          </td>
                          <td className="px-4 py-3">
                            {u.jabatan ? (
                              <Badge
                                variant="outline"
                                className="border-blue-200 bg-blue-50 text-blue-700"
                              >
                                {u.jabatan.namaJabatan}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Belum Diatur</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                u.jabatan
                                  ? u.jabatan.role === "SUPERADMIN"
                                    ? "default"
                                    : u.jabatan.role === "STAFF"
                                      ? "secondary"
                                      : "outline"
                                  : "outline"
                              }
                            >
                              {u.jabatan?.role ?? "UNSET"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(u);
                                setSelectedJabatanId(u.jabatanId || "");
                                setOpenEditPegawai(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Ubah Jabatan
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================
            TAB: MASTER JABATAN
        ======================================================== */}
        <TabsContent value="jabatan" className="space-y-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Daftar Master Jabatan</h2>
              <p className="text-muted-foreground text-sm">
                Kelola penamaan jabatan dan level akses sistemnya.
              </p>
            </div>
            <Button
              onClick={() => {
                setFormJabatan({ namaJabatan: "", role: "STAFF" });
                setOpenJabatan(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Tambah Jabatan
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {loadingJabatan ? (
              <p className="text-muted-foreground col-span-3 animate-pulse text-sm">
                Memuat data...
              </p>
            ) : (
              jabatans?.map((j) => (
                <Card key={j.id} className="border border-slate-200 shadow-sm">
                  <CardContent className="flex h-full flex-col items-start justify-between gap-4 p-5">
                    <div>
                      <h3 className="text-lg font-bold">{j.namaJabatan}</h3>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                          Otoritas Sistem:
                        </span>
                        <Badge
                          variant={
                            j.role === "SUPERADMIN"
                              ? "default"
                              : j.role === "STAFF"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-[10px]"
                        >
                          {j.role}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================================
          DIALOG: TAMBAH JABATAN
      ======================================================== */}
      <Dialog open={openJabatan} onOpenChange={setOpenJabatan}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createJabatan.mutate({
                namaJabatan: formJabatan.namaJabatan,
                role: formJabatan.role as "SUPERADMIN" | "STAFF" | "SUPPORTER",
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Tambah Jabatan Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Jabatan (Contoh: Wali Asuh, Kepala Asrama)</Label>
                <Input
                  required
                  value={formJabatan.namaJabatan}
                  onChange={(e) =>
                    setFormJabatan({
                      ...formJabatan,
                      namaJabatan: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Level Akses Sistem (Role)</Label>
                <Select
                  value={formJabatan.role}
                  onValueChange={(val) =>
                    setFormJabatan({ ...formJabatan, role: val! })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPERADMIN">
                      ADMIN (Akses Penuh ke Pengaturan & Rekap)
                    </SelectItem>
                    <SelectItem value="STAFF">
                      STAFF (Bisa akses semua sistem kecuali pengaturan)
                    </SelectItem>
                    <SelectItem value="SUPPORTER">
                      SUPPORTER (Hanya akses scanner dan aktivitas)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createJabatan.isPending}>
                Simpan Jabatan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          DIALOG: APPROVE USER & BERI JABATAN
      ======================================================== */}
      <Dialog open={openApprove} onOpenChange={setOpenApprove}>
        <DialogContent>
          <form onSubmit={handleApprove}>
            <DialogHeader>
              <DialogTitle>Approve & Beri Jabatan</DialogTitle>
              <CardDescription>
                Berikan akses masuk untuk {selectedUser?.name}.
              </CardDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Pilih Jabatan Penugasan</Label>
                <Select
                  value={selectedJabatanId}
                  onValueChange={(val) => setSelectedJabatanId(val ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {jabatans?.find((j) => j.id === selectedJabatanId)
                        ?.namaJabatan ?? "-- Pilih Jabatan --"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {jabatans?.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.namaJabatan} (Role: {j.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground mt-1 text-xs">
                  Level akses (Admin/Staff) akan otomatis mengikuti jabatan yang
                  dipilih.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenApprove(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={approveUser.isPending}>
                Approve Sekarang
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          DIALOG: UBAH JABATAN PEGAWAI AKTIF
      ======================================================== */}
      <Dialog open={openEditPegawai} onOpenChange={setOpenEditPegawai}>
        <DialogContent>
          <form onSubmit={handleUpdateJabatanUser}>
            <DialogHeader>
              <DialogTitle>Ubah Jabatan Pegawai</DialogTitle>
              <CardDescription>
                Pindahkan posisi/jabatan untuk {selectedUser?.name}.
              </CardDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Pilih Jabatan Baru</Label>
                <Select
                  value={selectedJabatanId}
                  onValueChange={(val) => setSelectedJabatanId(val ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {jabatans?.find((j) => j.id === selectedJabatanId)
                        ?.namaJabatan ?? "-- Pilih Jabatan --"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {jabatans?.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.namaJabatan} (Role: {j.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateJabatanUser.isPending}>
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
