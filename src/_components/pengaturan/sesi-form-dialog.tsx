"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "~/trpc/react";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { toast } from "sonner";
import { Plus, Edit } from "lucide-react";

// Hapus .default() pada isMandatory dan isActive agar tipe input/output konsisten
const formSchema = z.object({
  namaSesi: z.string().min(1, "Nama sesi wajib diisi"),
  waktuMulai: z.string().optional(),
  waktuSelesai: z.string().optional(),
  isMandatory: z.boolean(),
  targetJenjang: z
    .array(z.enum(["SD", "SMP", "SMA"]))
    .min(1, "Pilih minimal 1 jenjang"),
  poinTepatWaktu: z.coerce.number(),
  poinTelat: z.coerce.number(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function SesiFormDialog({
  kategoriId,
  initialData,
}: {
  kategoriId: string;
  initialData?: any;
}) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();

  const formatTimeForInput = (timeStr?: string) =>
    timeStr ? timeStr.substring(0, 5) : "";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      namaSesi: initialData?.namaSesi || "",
      waktuMulai: formatTimeForInput(initialData?.waktuMulai) || "",
      waktuSelesai: formatTimeForInput(initialData?.waktuSelesai) || "",
      isMandatory: initialData?.isMandatory ?? true,
      targetJenjang: initialData?.targetJenjang || ["SD", "SMP", "SMA"],
      poinTepatWaktu: initialData?.poinTepatWaktu || 0,
      poinTelat: initialData?.poinTelat || 0,
      isActive: initialData?.isActive ?? true,
    },
  });

  const createMutation = api.pengaturan.createSesi.useMutation({
    onSuccess: () => {
      toast.success("Sesi berhasil ditambahkan");
      utils.pengaturan.getKategoriWithSesi.invalidate();
      setOpen(false);
      form.reset();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = api.pengaturan.updateSesi.useMutation({
    onSuccess: () => {
      toast.success("Sesi berhasil diperbarui");
      utils.pengaturan.getKategoriWithSesi.invalidate();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (data: FormValues) => {
    if (initialData) {
      updateMutation.mutate({
        id: initialData.id,
        ...data,
      });
    } else {
      createMutation.mutate({
        kategoriId: kategoriId,
        ...data,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={
          initialData
            ? buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "h-8 w-8 p-0",
              })
            : buttonVariants({ variant: "secondary", size: "sm" })
        }
      >
        {initialData ? (
          <Edit className="h-4 w-4" />
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" /> Tambah Sesi
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Sesi Jadwal" : "Tambah Sesi Baru"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-2 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Sesi</label>
            <Input
              {...form.register("namaSesi")}
              placeholder="Contoh: Apel Pagi"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Waktu Mulai</label>
              <Input type="time" {...form.register("waktuMulai")} />
              <p className="text-muted-foreground text-[10px]">
                Kosongkan jika waktu fleksibel
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Batas Akhir (Selesai)
              </label>
              <Input type="time" {...form.register("waktuSelesai")} />
              <p className="text-muted-foreground text-[10px]">
                Kosongkan jika waktu fleksibel
              </p>
            </div>
          </div>

          <div className="bg-muted/30 space-y-2 rounded-md border p-3">
            <label className="mb-2 block text-sm font-bold">
              Target Jenjang Kelas
            </label>
            <div className="flex gap-6">
              {["SD", "SMP", "SMA"].map((jenjang) => (
                <label
                  key={jenjang}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    value={jenjang}
                    {...form.register("targetJenjang")}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  {jenjang}
                </label>
              ))}
            </div>
            {form.formState.errors.targetJenjang && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.targetJenjang.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Poin Tepat Waktu</label>
              <Input
                type="number"
                {...form.register("poinTepatWaktu")}
                placeholder="10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Poin Telat / Denda</label>
              <Input
                type="number"
                {...form.register("poinTelat")}
                placeholder="-5"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                {...form.register("isMandatory")}
                className="h-4 w-4"
              />
              Kegiatan Wajib (Mandatory)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                {...form.register("isActive")}
                className="h-4 w-4"
              />
              Sesi Aktif
            </label>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending}>
              Simpan Jadwal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
