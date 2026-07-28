// src/app/(dashboard)/dashboard/(staffonly)/bimbingan/kasus/tambah/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { ArrowLeft, Save, Loader2, Plus, Trash2, Search } from "lucide-react";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldDescription,
} from "~/components/ui/field";
import { cn } from "~/lib/utils";

// ==========================================
// 1. ZOD SCHEMA (Sesuai Lampiran 7 PDF)
// ==========================================
const formSchema = z.object({
  pesertaDidikId: z.string().min(1, "Peserta didik wajib dipilih"),
  tanggalBuka: z.string().min(1, "Tanggal buka wajib diisi"),
  masalahUtama: z
    .string()
    .min(5, "Permasalahan utama wajib diisi (min 5 karakter)"),
  penyebabMasalah: z.string().optional(),
  dampakBiologis: z.string().optional(),
  dampakPsikologis: z.string().optional(),
  dampakSosial: z.string().optional(),
  dampakSpiritual: z.string().optional(),
  tujuanUmum: z.string().optional(),
  tujuanKhusus: z.array(z.object({ value: z.string() })).optional(),
  rencanaKegiatan: z.array(z.object({ value: z.string() })).optional(),
  intervensiAwal: z.array(z.object({ deskripsi: z.string() })).optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Step definitions
const steps = [
  { id: "masalah", label: "1. Permasalahan" },
  { id: "rencana", label: "2. Rencana Intervensi" },
  { id: "intervensi", label: "3. Intervensi Awal" },
] as const;

type StepId = (typeof steps)[number]["id"];

export default function TambahKasusPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<StepId>("masalah");
  const [searchSiswa, setSearchSiswa] = useState("");

  const { data: daftarPeserta = [], isLoading: isLoadingPeserta } =
    api.peserta.getAll.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pesertaDidikId: "",
      tanggalBuka: new Date().toISOString().split("T")[0],
      masalahUtama: "",
      penyebabMasalah: "",
      dampakBiologis: "",
      dampakPsikologis: "",
      dampakSosial: "",
      dampakSpiritual: "",
      tujuanUmum: "",
      tujuanKhusus: [{ value: "" }],
      rencanaKegiatan: [{ value: "" }],
      intervensiAwal: [{ deskripsi: "" }],
    },
  });

  const {
    fields: tkFields,
    append: tkAppend,
    remove: tkRemove,
  } = useFieldArray({ control: form.control, name: "tujuanKhusus" });

  const {
    fields: rkFields,
    append: rkAppend,
    remove: rkRemove,
  } = useFieldArray({ control: form.control, name: "rencanaKegiatan" });

  const {
    fields: intFields,
    append: intAppend,
    remove: intRemove,
  } = useFieldArray({ control: form.control, name: "intervensiAwal" });

  const createKasusMutation = api.bimbingan.createKasus.useMutation({
    onSuccess: () => {
      toast.success("Catatan penanganan kasus berhasil dibuka");
      router.push("/dashboard/bimbingan/kasus");
      router.refresh();
    },
    onError: (error) => {
      toast.error(`Gagal menyimpan: ${error.message}`);
    },
  });

  const onSubmit = (values: FormValues) => {
    createKasusMutation.mutate({
      pesertaDidikId: values.pesertaDidikId,
      tanggalBuka: values.tanggalBuka,
      masalahUtama: values.masalahUtama,
      penyebabMasalah: values.penyebabMasalah,
      dampakBiologis: values.dampakBiologis,
      dampakPsikologis: values.dampakPsikologis,
      dampakSosial: values.dampakSosial,
      dampakSpiritual: values.dampakSpiritual,
      tujuanUmum: values.tujuanUmum,
      tujuanKhusus: values.tujuanKhusus
        ?.map((t) => t.value)
        .filter((v) => v.trim() !== ""),
      rencanaKegiatan: values.rencanaKegiatan
        ?.map((r) => r.value)
        .filter((v) => v.trim() !== ""),
      intervensiAwal: values.intervensiAwal
        ?.map((i, idx) => ({ aktivitasKe: idx + 1, deskripsi: i.deskripsi }))
        .filter((i) => i.deskripsi.trim() !== ""),
    });
  };

  // Filter peserta berdasarkan search
  const filteredPeserta = daftarPeserta.filter((p) => {
    if (!searchSiswa) return true;
    const lower = searchSiswa.toLowerCase();
    return (
      p.namaLengkap.toLowerCase().includes(lower) ||
      `${p.kelas?.jenjang ?? ""} ${p.kelas?.tingkat ?? ""} ${p.kelas?.namaKelas ?? ""}`
        .toLowerCase()
        .includes(lower)
    );
  });

  // Tentukan siswa terpilih untuk ditampilkan di SelectValue
  const selectedPeserta = daftarPeserta.find(
    (p) => p.id === form.watch("pesertaDidikId"),
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buka Kasus Baru</h1>
          <p className="text-muted-foreground">
            Formulir Catatan Penanganan Kasus Anak di Sekolah Rakyat.
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* IDENTITAS UTAMA */}
        <Card>
          <CardContent className="pt-6">
            <FieldGroup className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Pilih Anak dengan Search */}
              <Controller
                name="pesertaDidikId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Nama Anak</FieldLabel>
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isLoadingPeserta}
                    >
                      <SelectTrigger
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                        className="h-12 w-full"
                      >
                        <SelectValue
                          placeholder={
                            isLoadingPeserta ? "Memuat data..." : "Pilih Anak"
                          }
                        >
                          {selectedPeserta
                            ? `${selectedPeserta.namaLengkap} - ${selectedPeserta.kelas?.jenjang} ${selectedPeserta.kelas?.tingkat} ${selectedPeserta.kelas?.namaKelas}`
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[350px]">
                        {/* Search bar */}
                        <div className="bg-popover sticky top-0 z-10 mb-1 border-b p-2 shadow-sm">
                          <div className="relative">
                            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                            <Input
                              placeholder="Cari nama atau kelas..."
                              value={searchSiswa}
                              onChange={(e) => setSearchSiswa(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="h-9 pl-9"
                            />
                          </div>
                        </div>
                        {filteredPeserta.length > 0 ? (
                          filteredPeserta.map((p) => (
                            <SelectItem
                              key={p.id}
                              value={p.id}
                              className="cursor-pointer py-3"
                            >
                              {p.namaLengkap} - {p.kelas?.jenjang}{" "}
                              {p.kelas?.tingkat} {p.kelas?.namaKelas}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="text-muted-foreground py-6 text-center text-sm">
                            Tidak ada siswa yang cocok
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Tanggal */}
              <Controller
                name="tanggalBuka"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Tanggal Pembukaan Kasus
                    </FieldLabel>
                    <Input
                      type="date"
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        {/* STEPPER NAVIGASI */}
        <div className="flex border-b">
          {steps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(step.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                activeStep === step.id
                  ? "border-primary text-primary border-b-2"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {step.label}
            </button>
          ))}
        </div>

        {/* KONTEN LANGKAH */}
        <Card>
          <CardContent className="pt-6">
            {/* STEP 1: MASALAH */}
            {activeStep === "masalah" && (
              <div className="space-y-6">
                <FieldSet>
                  <FieldLegend>Rincian dan Dampak Masalah</FieldLegend>
                  <Controller
                    name="masalahUtama"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>
                          a. Permasalahan Utama dan Gejala Masalah
                        </FieldLabel>
                        <Textarea
                          {...field}
                          id={field.name}
                          aria-invalid={fieldState.invalid}
                          className="min-h-[80px]"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  <Controller
                    name="penyebabMasalah"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>
                          b. Penyebab Masalah
                        </FieldLabel>
                        <Textarea
                          {...field}
                          id={field.name}
                          aria-invalid={fieldState.invalid}
                          className="min-h-[80px]"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  <div className="mt-6 space-y-4">
                    <h4 className="text-sm font-semibold">
                      c. Dampak terhadap Anak
                    </h4>
                    <div className="bg-muted/20 grid grid-cols-1 gap-6 rounded-lg border p-4 md:grid-cols-2">
                      <Controller
                        name="dampakBiologis"
                        control={form.control}
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>
                              Kondisi Biologis/ Fisik Anak
                            </FieldLabel>
                            <Input {...field} />
                          </Field>
                        )}
                      />
                      <Controller
                        name="dampakPsikologis"
                        control={form.control}
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Kondisi Psikologis Anak</FieldLabel>
                            <Input {...field} />
                          </Field>
                        )}
                      />
                      <Controller
                        name="dampakSosial"
                        control={form.control}
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Kondisi Sosial Anak</FieldLabel>
                            <Input {...field} />
                          </Field>
                        )}
                      />
                      <Controller
                        name="dampakSpiritual"
                        control={form.control}
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Kondisi Spiritual Anak</FieldLabel>
                            <Input {...field} />
                          </Field>
                        )}
                      />
                    </div>
                  </div>
                </FieldSet>
                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={() => setActiveStep("rencana")}
                  >
                    Lanjut Rencana Intervensi &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: RENCANA */}
            {activeStep === "rencana" && (
              <div className="space-y-8">
                <FieldSet>
                  <FieldLegend>a. Tujuan Umum</FieldLegend>
                  <Controller
                    name="tujuanUmum"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <Textarea
                          {...field}
                          placeholder="Tujuan besar dari penanganan kasus ini..."
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                </FieldSet>

                <FieldSet>
                  <FieldLegend>b. Tujuan Khusus</FieldLegend>
                  <FieldGroup className="gap-3">
                    {tkFields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <span className="w-4 text-sm font-medium">
                          {index + 1}.
                        </span>
                        <Controller
                          name={`tujuanKhusus.${index}.value`}
                          control={form.control}
                          render={({ field: inputField }) => (
                            <Input
                              {...inputField}
                              placeholder={`Tujuan khusus ke-${index + 1}`}
                              className="flex-1"
                            />
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => tkRemove(index)}
                          disabled={tkFields.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 w-fit"
                      onClick={() => tkAppend({ value: "" })}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Tambah Tujuan Khusus
                    </Button>
                  </FieldGroup>
                </FieldSet>

                <FieldSet>
                  <FieldLegend>c. Rencana Kegiatan</FieldLegend>
                  <FieldGroup className="gap-3">
                    {rkFields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <span className="w-4 text-sm font-medium">
                          {index + 1}.
                        </span>
                        <Controller
                          name={`rencanaKegiatan.${index}.value`}
                          control={form.control}
                          render={({ field: inputField }) => (
                            <Input
                              {...inputField}
                              placeholder={`Rencana kegiatan ke-${index + 1}`}
                              className="flex-1"
                            />
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => rkRemove(index)}
                          disabled={rkFields.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 w-fit"
                      onClick={() => rkAppend({ value: "" })}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Tambah Rencana Kegiatan
                    </Button>
                  </FieldGroup>
                </FieldSet>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveStep("masalah")}
                  >
                    &larr; Kembali
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveStep("intervensi")}
                  >
                    Lanjut Intervensi Awal &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: INTERVENSI */}
            {activeStep === "intervensi" && (
              <div className="space-y-6">
                <FieldSet>
                  <FieldLegend>3. Intervensi yang Dilakukan</FieldLegend>
                  <FieldDescription>
                    Catat tindakan atau kegiatan awal yang langsung dilakukan
                    saat pembukaan kasus (Opsional).
                  </FieldDescription>
                  <FieldGroup className="mt-4 gap-4">
                    {intFields.map((field, index) => (
                      <Card key={field.id} className="bg-muted/10">
                        <CardContent className="flex items-start gap-3 p-4">
                          <div className="flex-1 space-y-2">
                            <FieldLabel>
                              Kegiatan/Aktivitas {index + 1}
                            </FieldLabel>
                            <Controller
                              name={`intervensiAwal.${index}.deskripsi`}
                              control={form.control}
                              render={({ field: inputField }) => (
                                <Textarea
                                  {...inputField}
                                  placeholder="Deskripsikan intervensi yang dilakukan..."
                                  className="min-h-[80px]"
                                />
                              )}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mt-7"
                            onClick={() => intRemove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() => intAppend({ deskripsi: "" })}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Tambah Aktivitas
                      Intervensi
                    </Button>
                  </FieldGroup>
                </FieldSet>

                <div className="mt-8 flex justify-between border-t pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveStep("rencana")}
                  >
                    &larr; Kembali
                  </Button>
                  <Button
                    type="submit"
                    disabled={createKasusMutation.isPending}
                  >
                    {createKasusMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Simpan & Buka Kasus
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
