"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";
import { toast } from "sonner";
import { Plus, Edit } from "lucide-react";

const formSchema = z.object({
  namaSesi: z.string().min(1, "Nama sesi wajib diisi"),
  waktuMulai: z.string().optional(),
  waktuSelesai: z.string().optional(),
  isMandatory: z.boolean(),
  targetJenjang: z
    .array(z.enum(["SD", "SMP", "SMA"]))
    .min(1, "Pilih minimal 1 jenjang"),
  targetAgama: z
    .array(
      z.enum([
        "ISLAM",
        "KRISTEN",
        "KATOLIK",
        "HINDU",
        "BUDHA",
        "KONGHUCU",
        "LAINNYA",
      ]),
    )
    .min(1, "Pilih minimal 1 agama"),
  poinTepatWaktu: z.coerce.number(),
  poinTelat: z.coerce.number(),
  poinAlfa: z.coerce.number(),
  isLateEnabled: z.boolean(),
  isHaidExempt: z.boolean(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const JENJANG_OPTIONS = ["SD", "SMP", "SMA"] as const;
const AGAMA_OPTIONS = [
  "ISLAM",
  "KRISTEN",
  "KATOLIK",
  "HINDU",
  "BUDHA",
  "KONGHUCU",
  "LAINNYA",
] as const;

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
      targetAgama: initialData?.targetAgama
        ? initialData.targetAgama.map((a: string) => a.toUpperCase())
        : [...AGAMA_OPTIONS],
      poinTepatWaktu: initialData?.poinTepatWaktu || 0,
      poinTelat: initialData?.poinTelat || 0,
      poinAlfa: initialData?.poinAlfa || -20,
      isLateEnabled: initialData?.isLateEnabled ?? true,
      isHaidExempt: initialData?.isHaidExempt ?? false,
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
      updateMutation.mutate({ id: initialData.id, ...data });
    } else {
      createMutation.mutate({ kategoriId, ...data });
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

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-6">
          {/* Nama Sesi */}
          <Controller
            name="namaSesi"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nama Sesi</FieldLabel>
                <Input
                  id={field.name}
                  {...field}
                  placeholder="Contoh: Apel Pagi"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Waktu Mulai & Selesai */}
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="waktuMulai"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Waktu Mulai</FieldLabel>
                  <Input
                    id={field.name}
                    type="time"
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>Kosongkan jika fleksibel</FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="waktuSelesai"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Batas Akhir</FieldLabel>
                  <Input
                    id={field.name}
                    type="time"
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>Kosongkan jika fleksibel</FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          {/* Target Jenjang */}
          <Controller
            name="targetJenjang"
            control={form.control}
            render={({ field, fieldState }) => (
              <FieldSet>
                <FieldLegend>Target Jenjang Kelas</FieldLegend>
                <FieldGroup className="flex flex-wrap gap-4">
                  {JENJANG_OPTIONS.map((jenjang) => {
                    const checked = field.value.includes(jenjang);
                    return (
                      <Field
                        key={jenjang}
                        orientation="horizontal"
                        className="items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          id={`jenjang-${jenjang}`}
                          checked={checked}
                          onChange={(e) => {
                            const newValue = e.target.checked
                              ? [...field.value, jenjang]
                              : field.value.filter((v) => v !== jenjang);
                            field.onChange(newValue);
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                          aria-invalid={fieldState.invalid}
                        />
                        <FieldLabel
                          htmlFor={`jenjang-${jenjang}`}
                          className="font-normal"
                        >
                          {jenjang}
                        </FieldLabel>
                      </Field>
                    );
                  })}
                </FieldGroup>
                {fieldState.invalid && (
                  <p className="mt-1 text-sm text-red-500">
                    {fieldState.error?.message}
                  </p>
                )}
              </FieldSet>
            )}
          />

          {/* Target Agama */}
          <Controller
            name="targetAgama"
            control={form.control}
            render={({ field, fieldState }) => (
              <FieldSet>
                <FieldLegend>Berlaku untuk Agama</FieldLegend>
                <FieldGroup className="flex flex-wrap gap-4">
                  {AGAMA_OPTIONS.map((agama) => {
                    const checked = field.value.includes(agama);
                    return (
                      <Field
                        key={agama}
                        orientation="horizontal"
                        className="items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          id={`agama-${agama}`}
                          value={agama}
                          checked={checked}
                          onChange={(e) => {
                            const newValue = e.target.checked
                              ? [...field.value, agama]
                              : field.value.filter((v) => v !== agama);
                            field.onChange(newValue);
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                          aria-invalid={fieldState.invalid}
                        />
                        <FieldLabel
                          htmlFor={`agama-${agama}`}
                          className="font-normal"
                        >
                          {agama.charAt(0) + agama.slice(1).toLowerCase()}
                        </FieldLabel>
                      </Field>
                    );
                  })}
                </FieldGroup>
                {fieldState.invalid && (
                  <p className="mt-1 text-sm text-red-500">
                    Pilih minimal 1 agama
                  </p>
                )}
              </FieldSet>
            )}
          />

          {/* Poin */}
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="poinTepatWaktu"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Poin Tepat Waktu</FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    {...field}
                    placeholder="10"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="poinTelat"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Poin Telat / Denda
                  </FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    {...field}
                    placeholder="-5"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          {/* Poin Alfa (Tambahan) */}
          <Controller
            name="poinAlfa"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Poin Alfa (Tidak Hadir)
                </FieldLabel>
                <Input
                  id={field.name}
                  type="number"
                  {...field}
                  placeholder="-20"
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>
                  Poin yang diberikan jika peserta tidak hadir (alfa). Biasanya
                  lebih berat dari telat.
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Checkbox Boolean */}
          <Controller
            name="isLateEnabled"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field
                orientation="horizontal"
                data-invalid={fieldState.invalid}
                className="items-center gap-2"
              >
                <input
                  type="checkbox"
                  id="isLateEnabled"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4"
                  aria-invalid={fieldState.invalid}
                />
                <FieldLabel htmlFor="isLateEnabled" className="font-medium">
                  Aktifkan Hitung Telat
                </FieldLabel>
                <FieldDescription className="ml-6 block text-xs">
                  Jika dinonaktifkan, absensi di luar jam hanya akan dihitung
                  Hadir atau Alfa.
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="isHaidExempt"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field
                orientation="horizontal"
                data-invalid={fieldState.invalid}
                className="items-center gap-2"
              >
                <input
                  type="checkbox"
                  id="isHaidExempt"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4"
                  aria-invalid={fieldState.invalid}
                />
                <FieldLabel htmlFor="isHaidExempt" className="font-medium">
                  Gugur Kewajiban Saat Haid
                </FieldLabel>
                <FieldDescription className="ml-6 block text-xs">
                  Jika diaktifkan, sistem bisa otomatis menandai sesi ini
                  sebagai 'Haid' saat ada penginputan status Haid secara masal
                  di hari tersebut.
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="isMandatory"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field
                orientation="horizontal"
                data-invalid={fieldState.invalid}
                className="items-center gap-2"
              >
                <input
                  type="checkbox"
                  id="isMandatory"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4"
                  aria-invalid={fieldState.invalid}
                />
                <FieldLabel htmlFor="isMandatory" className="font-medium">
                  Kegiatan Wajib (Mandatory)
                </FieldLabel>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="isActive"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field
                orientation="horizontal"
                data-invalid={fieldState.invalid}
                className="items-center gap-2"
              >
                <input
                  type="checkbox"
                  id="isActive"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4"
                  aria-invalid={fieldState.invalid}
                />
                <FieldLabel htmlFor="isActive" className="font-medium">
                  Sesi Aktif
                </FieldLabel>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

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
