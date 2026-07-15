"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "~/trpc/react";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "~/components/ui/field";
import { toast } from "sonner";
import { Edit2 } from "lucide-react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

type LogEntry = RouterOutputs["aktivitas"]["getRecentLogs"][number];

const formSchema = z.object({
  statusKehadiran: z
    .enum(["HADIR", "IZIN", "SAKIT", "ALFA", "LAINNYA"])
    .optional(),
  statusWaktu: z.enum(["TEPAT_WAKTU", "TELAT"]).optional().nullable(),
  poinDidapat: z.coerce.number().optional(),
  keterangan: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function EditLogDialog({ log }: { log: LogEntry }) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      statusKehadiran:
        log.statusKehadiran === "TIDAK_HADIR" ? "ALFA" : log.statusKehadiran,
      statusWaktu: log.statusWaktu,
      poinDidapat: log.poinDidapat,
      keterangan: log.keterangan ?? "",
    },
  });

  const updateMutation = api.aktivitas.updateLogManual.useMutation({
    onSuccess: () => {
      toast.success("Log berhasil diperbarui");
      utils.aktivitas.getRecentLogs.invalidate();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (data: FormValues) => {
    // Jangan kirim field yang tidak berubah? Tapi untuk simplicity kita kirim semua
    updateMutation.mutate({ id: log.id, ...data });
  };

  const isPending = updateMutation.isPending;

  // Hanya tampilkan form status/waktu jika log adalah sesi (ada sesiId)
  const isSesiLog = !!log.sesi;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "h-8 w-8 p-0",
        })}
      >
        <Edit2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Log</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
          {isSesiLog && (
            <Controller
              name="statusKehadiran"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Status Kehadiran</FieldLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HADIR">Hadir</SelectItem>
                      <SelectItem value="IZIN">Izin</SelectItem>
                      <SelectItem value="SAKIT">Sakit</SelectItem>
                      <SelectItem value="ALFA">Alfa</SelectItem>
                      <SelectItem value="LAINNYA">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}

          {isSesiLog && form.watch("statusKehadiran") === "HADIR" && (
            <Controller
              name="statusWaktu"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Ketepatan Waktu</FieldLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) =>
                      field.onChange(v === "null" ? null : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEPAT_WAKTU">Tepat Waktu</SelectItem>
                      <SelectItem value="TELAT">Telat</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}

          <Controller
            name="poinDidapat"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Poin</FieldLabel>
                <Input
                  type="number"
                  {...field}
                  placeholder="0"
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>
                  Mengubah poin akan menandai log sebagai "Diedit Manual".
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="keterangan"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Keterangan</FieldLabel>
                <Input
                  {...field}
                  placeholder="Opsional"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isPending}>
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
