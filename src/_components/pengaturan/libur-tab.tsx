"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, type RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// Skema validasi form (isActive TANPA .default() agar menjadi required)
const liburFormSchema = z.object({
  namaLibur: z.string().min(1, "Nama libur wajib diisi"),
  tanggalMulai: z.string().min(1, "Tanggal mulai harus diisi"),
  tanggalSelesai: z.string().min(1, "Tanggal selesai harus diisi"),
  targetJenjang: z
    .array(z.enum(["SD", "SMP", "SMA"]))
    .min(1, "Pilih minimal satu jenjang"),
  deskripsi: z.string().optional(),
  isActive: z.boolean(),
});

type LiburFormValues = z.infer<typeof liburFormSchema>;
type JenjangType = "SD" | "SMP" | "SMA";

// Tipe untuk data libur dari API
type HariLibur = RouterOutputs["pengaturan"]["getHariLibur"][number] | null;

const JENJANG_OPTIONS = ["SD", "SMP", "SMA"] as JenjangType[];

export function LiburTab() {
  const utils = api.useUtils();
  const [openDialog, setOpenDialog] = useState(false);
  const [editData, setEditData] = useState<HariLibur>(null);

  const { data: hariLiburList, isLoading } =
    api.pengaturan.getHariLibur.useQuery();

  const createMutation = api.pengaturan.createHariLibur.useMutation({
    onSuccess: () => {
      toast.success("Hari libur berhasil ditambahkan");
      utils.pengaturan.getHariLibur.invalidate();
      setOpenDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = api.pengaturan.updateHariLibur.useMutation({
    onSuccess: () => {
      toast.success("Hari libur berhasil diubah");
      utils.pengaturan.getHariLibur.invalidate();
      setOpenDialog(false);
      setEditData(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = api.pengaturan.deleteHariLibur.useMutation({
    onSuccess: () => {
      toast.success("Hari libur berhasil dihapus");
      utils.pengaturan.getHariLibur.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm<LiburFormValues>({
    resolver: zodResolver(liburFormSchema),
    defaultValues: {
      namaLibur: "",
      tanggalMulai: "",
      tanggalSelesai: "",
      targetJenjang: ["SD", "SMP", "SMA"] as JenjangType[],
      deskripsi: "",
      isActive: true,
    },
  });

  const openCreate = () => {
    form.reset({
      namaLibur: "",
      tanggalMulai: "",
      tanggalSelesai: "",
      targetJenjang: ["SD", "SMP", "SMA"],
      deskripsi: "",
      isActive: true,
    });
    setEditData(null);
    setOpenDialog(true);
  };

  const openEdit = (libur: HariLibur) => {
    if (!libur) return;
    form.reset({
      namaLibur: libur.namaLibur,
      tanggalMulai: libur.tanggalMulai,
      tanggalSelesai: libur.tanggalSelesai,
      targetJenjang: libur.targetJenjang as ("SD" | "SMP" | "SMA")[],
      deskripsi: libur.deskripsi ?? "",
      isActive: libur.isActive,
    });
    setEditData(libur);
    setOpenDialog(true);
  };

  const onSubmit = (data: LiburFormValues) => {
    if (editData) {
      updateMutation.mutate({ id: editData.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus hari libur ini?")) {
      deleteMutation.mutate({ id });
    }
  };

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Kalender Hari Libur</h2>
          <p className="text-muted-foreground text-sm">
            Atur tanggal-tanggal libur untuk mencegah perhitungan alfa yang
            salah.
          </p>
        </div>
        <Button onClick={openCreate} disabled={isPending}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Libur
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground animate-pulse text-sm">
          Memuat data...
        </p>
      ) : hariLiburList?.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Belum ada hari libur yang terdaftar.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Libur</TableHead>
                <TableHead>Tanggal Mulai</TableHead>
                <TableHead>Tanggal Selesai</TableHead>
                <TableHead>Jenjang</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hariLiburList?.map((libur) => (
                <TableRow key={libur.id}>
                  <TableCell>
                    <div className="font-medium">{libur.namaLibur}</div>
                    {libur.deskripsi && (
                      <div className="text-muted-foreground max-w-[200px] truncate text-xs">
                        {libur.deskripsi}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(libur.tanggalMulai), "dd MMM yyyy", {
                      locale: localeId,
                    })}
                  </TableCell>
                  <TableCell>
                    {format(new Date(libur.tanggalSelesai), "dd MMM yyyy", {
                      locale: localeId,
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {libur.targetJenjang.map((j) => (
                        <Badge key={j} variant="secondary" className="text-xs">
                          {j}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={libur.isActive ? "default" : "destructive"}>
                      {libur.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(libur)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(libur.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog Tambah/Edit */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editData ? "Edit Hari Libur" : "Tambah Hari Libur"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <Controller
              name="namaLibur"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Nama Libur</FieldLabel>
                  <Input {...field} placeholder="Contoh: Idul Fitri" />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="tanggalMulai"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Tanggal Mulai</FieldLabel>
                    <Input type="date" {...field} />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="tanggalSelesai"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Tanggal Selesai</FieldLabel>
                    <Input type="date" {...field} />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            <Controller
              name="targetJenjang"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Target Jenjang</FieldLabel>
                  <div className="flex flex-wrap gap-3">
                    {JENJANG_OPTIONS.map((jenjang) => {
                      const checked = field.value.includes(jenjang);
                      return (
                        <label
                          key={jenjang}
                          className="flex items-center gap-2 text-sm font-normal"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const newValue = e.target.checked
                                ? [...field.value, jenjang]
                                : field.value.filter((v) => v !== jenjang);
                              field.onChange(newValue);
                            }}
                            className="h-4 w-4"
                          />
                          {jenjang}
                        </label>
                      );
                    })}
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="deskripsi"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Deskripsi (opsional)</FieldLabel>
                  <Textarea {...field} placeholder="Alasan libur..." />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {editData && (
              <Controller
                name="isActive"
                control={form.control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4"
                    />
                    Aktif
                  </label>
                )}
              />
            )}

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
