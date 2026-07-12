"use client";

import { useState, useMemo } from "react";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/react";
import { DataTable } from "~/_components/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Loader2, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "~/components/ui/dropdown-menu";
import { Field, FieldLabel, FieldError } from "~/components/ui/field";

type Kelas = RouterOutputs["peserta"]["getAllKelas"][number];

const formSchema = z.object({
  jenjang: z.enum(["SD", "SMP", "SMA"], { required_error: "Pilih jenjang" }),
  tingkat: z.string().min(1, "Tingkat wajib diisi"),
  namaKelas: z.string().min(1, "Nama kelas wajib diisi"),
});

export function KelasTable() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // State penyimpan ID saat Edit
  const utils = api.useUtils();

  const { data = [], isLoading } = api.peserta.getAllKelas.useQuery();

  // === MUTASI TRPC ===
  const createKelasMutation = api.peserta.createKelas.useMutation({
    onSuccess: () => {
      closeDialog();
      void utils.peserta.getAllKelas.invalidate();
      toast.success("Berhasil membuat kelas!");
    },
    onError: (error) =>
      toast.error("Gagal membuat kelas", { description: error.message }),
  });

  const updateKelasMutation = api.peserta.updateKelas.useMutation({
    onSuccess: () => {
      closeDialog();
      utils.peserta.getAllKelas.invalidate();
      toast.success("Berhasil mengupdate kelas!");
    },
    onError: (error) =>
      toast.error("Gagal mengupdate kelas", { description: error.message }),
  });

  const deleteKelasMutation = api.peserta.deleteKelas.useMutation({
    onSuccess: () => {
      void utils.peserta.getAllKelas.invalidate();
      toast.success("Berhasil menghapus kelas");
    },
    onError: (error) => {
      toast.error("Gagal menghapus kelas", { description: error.message });
      console.error("Detail error hapus kelas:", error);
    },
  });

  // === HOOK FORM ===
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tingkat: "",
      namaKelas: "",
    },
  });

  // === HANDLER AKSI ===
  const openCreateDialog = () => {
    setEditingId(null);
    form.reset({ tingkat: "", namaKelas: "", jenjang: undefined as any });
    setIsOpen(true);
  };

  const handleEdit = (rowData: Kelas) => {
    setEditingId(rowData.id);
    form.reset({
      jenjang: rowData.jenjang,
      tingkat: rowData.tingkat,
      namaKelas: rowData.namaKelas,
    });
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    setTimeout(() => {
      setEditingId(null);
      form.reset();
    }, 200); // Tunggu animasi tutup selesai
  };

  const handleDelete = (id: string) => {
    if (confirm("Yakin ingin menghapus kelas ini?")) {
      deleteKelasMutation.mutate({ id });
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingId) {
      updateKelasMutation.mutate({ id: editingId, ...values });
    } else {
      createKelasMutation.mutate(values);
    }
  };

  const isPending =
    createKelasMutation.isPending || updateKelasMutation.isPending;

  // === DEFINISI KOLOM (Dimasukkan ke useMemo agar bisa baca fungsi Handle) ===
  const columns = useMemo<ColumnDef<Kelas>[]>(
    () => [
      { accessorKey: "id", header: "ID" },
      { accessorKey: "jenjang", header: "Jenjang" },
      { accessorKey: "tingkat", header: "Tingkat" },
      { accessorKey: "namaKelas", header: "Nama Kelas" },
      {
        id: "actions",
        cell: ({ row }) => {
          const kelas = row.original;
          return (
            <DropdownMenu>
              {/* 2. Ubah asChild menjadi render={...} sesuai standar Base UI */}
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Buka menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
              />

              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Aksi</DropdownMenuLabel>

                  <DropdownMenuItem onClick={() => handleEdit(kelas)}>
                    <Edit className="mr-2 h-4 w-4 text-blue-600" /> Edit
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => handleDelete(kelas.id)}
                    className="text-red-600 focus:bg-red-50 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Hapus
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="mt-4 space-y-4">
      <div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Kelas
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Data Kelas" : "Tambah Data Kelas"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Ubah rincian kelas di bawah ini."
                : "Masukkan jenjang, tingkat, dan nama kelas baru."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 pt-2"
          >
            <Controller
              name="jenjang"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Jenjang</FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Pilih jenjang sekolah" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SD">SD</SelectItem>
                      <SelectItem value="SMP">SMP</SelectItem>
                      <SelectItem value="SMA">SMA</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="tingkat"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Tingkat</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    placeholder="Contoh: 1, 7, atau 10"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="namaKelas"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Nama Kelas / Jurusan
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    placeholder="Contoh: A, B, atau Reguler"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={closeDialog}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Simpan Perubahan" : "Simpan Kelas"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DataTable
        searchKey="namaKelas"
        searchPlaceholder="Cari nama atau rincian kelas..."
        columns={columns}
        data={data}
        isLoading={isLoading}
      />
    </div>
  );
}
