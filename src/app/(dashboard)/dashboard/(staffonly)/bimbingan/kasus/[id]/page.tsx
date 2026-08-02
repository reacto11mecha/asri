"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "~/lib/utils";
import { generateKasusPDF } from "~/lib/generate-pdf";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Loader2,
  Plus,
  User,
  MapPin,
  Trash2,
  Save,
} from "lucide-react";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldSet,
  FieldLegend,
} from "~/components/ui/field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

const METODE_MONEV_OPTIONS = [
  "Observasi langsung",
  "Catatan perkembangan mingguan",
  "Laporan guru",
  "Refleksi anak di tiap sesi",
  "Lain-lain",
] as const;

// ==========================================
// ZOD SCHEMA
// ==========================================
const formSchema = z.object({
  masalahUtama: z.string().optional(),
  penyebabMasalah: z.string().optional(),
  dampakBiologis: z.string().optional(),
  dampakPsikologis: z.string().optional(),
  dampakSosial: z.string().optional(),
  dampakSpiritual: z.string().optional(),
  tujuanUmum: z.string().optional(),
  tujuanKhusus: z.array(z.object({ value: z.string() })).optional(),
  rencanaKegiatan: z.array(z.object({ value: z.string() })).optional(),
  intervensi: z.array(z.object({ deskripsi: z.string() })).optional(),
  metodeMonev: z.array(z.string()).optional(),
  hasilMonev: z
    .array(z.object({ mingguKe: z.number(), deskripsi: z.string() }))
    .optional(),
  terminasiBiologis: z.string().optional(),
  terminasiPsikologis: z.string().optional(),
  terminasiSosial: z.string().optional(),
  terminasiSpiritual: z.string().optional(),
  kesimpulan: z.string().optional(),
  tanggalTutup: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

// Step definitions
const steps = [
  { id: "masalah", label: "1. Permasalahan" },
  { id: "rencana", label: "2. Rencana" },
  { id: "intervensi", label: "3. Intervensi" },
  { id: "monev", label: "4. Monev" },
  { id: "terminasi", label: "5. Terminasi" },
] as const;

type StepId = (typeof steps)[number]["id"];

export default function DetailKasusPage() {
  const params = useParams();
  const router = useRouter();
  const kasusId = params.id as string;
  const [activeStep, setActiveStep] = useState<StepId>("masalah");
  const [showTutupDialog, setShowTutupDialog] = useState(false);

  const {
    data: kasus,
    isLoading,
    refetch,
  } = api.bimbingan.getDetailKasus.useQuery({ id: kasusId });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      masalahUtama: "",
      penyebabMasalah: "",
      dampakBiologis: "",
      dampakPsikologis: "",
      dampakSosial: "",
      dampakSpiritual: "",
      tujuanUmum: "",
      tujuanKhusus: [],
      rencanaKegiatan: [],
      intervensi: [],
      metodeMonev: [],
      hasilMonev: [
        { mingguKe: 1, deskripsi: "" },
        { mingguKe: 2, deskripsi: "" },
        { mingguKe: 3, deskripsi: "" },
        { mingguKe: 4, deskripsi: "" },
        { mingguKe: 5, deskripsi: "" },
      ],
      terminasiBiologis: "",
      terminasiPsikologis: "",
      terminasiSosial: "",
      terminasiSpiritual: "",
      kesimpulan: "",
      tanggalTutup: null,
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
  } = useFieldArray({ control: form.control, name: "intervensi" });
  const { fields: hmFields } = useFieldArray({
    control: form.control,
    name: "hasilMonev",
  });

  // Hydrate form saat data kasus tersedia
  useEffect(() => {
    if (kasus) {
      const hmDefault = [1, 2, 3, 4, 5].map((m) => {
        const found = kasus.hasilMonev?.find((x: any) => x.mingguKe === m);
        return { mingguKe: m, deskripsi: found ? found.deskripsi : "" };
      });

      form.reset({
        masalahUtama: kasus.masalahUtama || "",
        penyebabMasalah: kasus.penyebabMasalah || "",
        dampakBiologis: kasus.dampakBiologis || "",
        dampakPsikologis: kasus.dampakPsikologis || "",
        dampakSosial: kasus.dampakSosial || "",
        dampakSpiritual: kasus.dampakSpiritual || "",
        tujuanUmum: kasus.tujuanUmum || "",
        tujuanKhusus: kasus.tujuanKhusus?.length
          ? kasus.tujuanKhusus.map((v) => ({ value: v }))
          : [{ value: "" }],
        rencanaKegiatan: kasus.rencanaKegiatan?.length
          ? kasus.rencanaKegiatan.map((v) => ({ value: v }))
          : [{ value: "" }],
        intervensi: kasus.intervensi?.length
          ? kasus.intervensi.map((v) => ({ deskripsi: v.deskripsi }))
          : [{ deskripsi: "" }],
        metodeMonev: kasus.metodeMonev || [],
        hasilMonev: hmDefault,
        terminasiBiologis: kasus.terminasiBiologis || "",
        terminasiPsikologis: kasus.terminasiPsikologis || "",
        terminasiSosial: kasus.terminasiSosial || "",
        terminasiSpiritual: kasus.terminasiSpiritual || "",
        kesimpulan: kasus.kesimpulan || "",
        tanggalTutup: kasus.tanggalTutup,
      });
    }
  }, [kasus, form]);

  const updateMutation = api.bimbingan.updateKasus.useMutation({
    onSuccess: () => {
      toast.success("Catatan kasus berhasil diperbarui");
      refetch();
    },
    onError: (e) => toast.error(`Gagal menyimpan: ${e.message}`),
  });

  const tutupMutation = api.bimbingan.tutupKasus.useMutation({
    onSuccess: () => {
      toast.success("Kasus berhasil ditutup");
      refetch();
    },
    onError: (e) => toast.error(`Gagal menutup kasus: ${e.message}`),
  });

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate({
      id: kasusId,
      ...values,
      tujuanKhusus: values.tujuanKhusus
        ?.map((t) => t.value)
        .filter((v) => v.trim() !== ""),
      rencanaKegiatan: values.rencanaKegiatan
        ?.map((r) => r.value)
        .filter((v) => v.trim() !== ""),
      intervensi: values.intervensi
        ?.map((i, idx) => ({ aktivitasKe: idx + 1, deskripsi: i.deskripsi }))
        .filter((i) => i.deskripsi.trim() !== ""),
    });
  };

  const handleTutupKasus = () => {
    setShowTutupDialog(false);
    tutupMutation.mutate({ id: kasusId });
  };

  const handleCetakPDF = async () => {
    if (!kasus) return;
    const d = form.getValues();

    await generateKasusPDF({
      pesertaDidik: kasus.pesertaDidik,
      tanggalBuka: kasus.tanggalBuka,
      formValues: d,
    });
  };

  if (isLoading) return <div className="p-6">Memuat detail kasus...</div>;
  if (!kasus) return <div className="p-6">Kasus tidak ditemukan.</div>;

  const isClosed = !!kasus.tanggalTutup;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      {/* HEADER & STATUS */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Kelola Penanganan Kasus
            </h1>
            <Badge
              variant={isClosed ? "secondary" : "destructive"}
              className={
                isClosed ? "mt-1 bg-emerald-100 text-emerald-800" : "mt-1"
              }
            >
              {isClosed
                ? `Selesai (${format(new Date(kasus.tanggalTutup!), "dd MMM yyyy", { locale: localeId })})`
                : "Sedang Aktif"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCetakPDF}>
            <FileText className="mr-2 h-4 w-4" /> Cetak Laporan (PDF)
          </Button>
        </div>
      </div>

      {/* IDENTITAS */}
      <Card className="bg-muted/40">
        <CardContent className="flex items-start gap-4 p-6">
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold">
              {kasus.pesertaDidik.namaLengkap}
            </p>
            <p className="text-muted-foreground text-sm">
              Kelas {kasus.pesertaDidik.kelas.tingkat}{" "}
              {kasus.pesertaDidik.kelas.namaKelas} | Buka:{" "}
              {format(new Date(kasus.tanggalBuka), "dd MMM yyyy", {
                locale: localeId,
              })}
            </p>
            <div className="text-primary mt-2 flex items-center gap-1 text-sm font-medium">
              <MapPin className="h-3.5 w-3.5" />
              Wali Asuh: {kasus.pesertaDidik.waliAsuh?.name || "Belum ada"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* STEPPER NAVIGASI */}
      <div className="flex overflow-x-auto border-b">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setActiveStep(step.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              activeStep === step.id
                ? "border-primary text-primary border-b-2"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {step.label}
          </button>
        ))}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            {/* --- STEP 1: MASALAH --- */}
            {activeStep === "masalah" && (
              <div className="space-y-6">
                <FieldSet disabled={isClosed}>
                  <FieldLegend>Rincian dan Dampak Masalah</FieldLegend>
                  <Controller
                    name="masalahUtama"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>a. Permasalahan Utama</FieldLabel>
                        <Textarea {...field} className="min-h-[80px]" />
                      </Field>
                    )}
                  />
                  <Controller
                    name="penyebabMasalah"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>b. Penyebab Masalah</FieldLabel>
                        <Textarea {...field} className="min-h-[80px]" />
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
                            <FieldLabel>Biologis/ Fisik</FieldLabel>
                            <Input {...field} />
                          </Field>
                        )}
                      />
                      <Controller
                        name="dampakPsikologis"
                        control={form.control}
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Psikologis</FieldLabel>
                            <Input {...field} />
                          </Field>
                        )}
                      />
                      <Controller
                        name="dampakSosial"
                        control={form.control}
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Sosial</FieldLabel>
                            <Input {...field} />
                          </Field>
                        )}
                      />
                      <Controller
                        name="dampakSpiritual"
                        control={form.control}
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Spiritual</FieldLabel>
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
                    Lanjut Rencana &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* --- STEP 2: RENCANA --- */}
            {activeStep === "rencana" && (
              <div className="space-y-8">
                <FieldSet disabled={isClosed}>
                  <FieldLegend>a. Tujuan Umum</FieldLegend>
                  <Controller
                    name="tujuanUmum"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <Textarea {...field} />
                      </Field>
                    )}
                  />
                </FieldSet>
                <FieldSet disabled={isClosed}>
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
                            <Input {...inputField} className="flex-1" />
                          )}
                        />
                        {!isClosed && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => tkRemove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {!isClosed && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 w-fit"
                        onClick={() => tkAppend({ value: "" })}
                      >
                        <Plus className="mr-2 h-4 w-4" /> Tambah Tujuan
                      </Button>
                    )}
                  </FieldGroup>
                </FieldSet>
                <FieldSet disabled={isClosed}>
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
                            <Input {...inputField} className="flex-1" />
                          )}
                        />
                        {!isClosed && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => rkRemove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {!isClosed && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 w-fit"
                        onClick={() => rkAppend({ value: "" })}
                      >
                        <Plus className="mr-2 h-4 w-4" /> Tambah Kegiatan
                      </Button>
                    )}
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
                    Lanjut Intervensi &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* --- STEP 3: INTERVENSI --- */}
            {activeStep === "intervensi" && (
              <div className="space-y-6">
                <FieldSet disabled={isClosed}>
                  <FieldLegend>3. Intervensi yang Dilakukan</FieldLegend>
                  <FieldGroup className="mt-4 gap-4">
                    {intFields.map((field, index) => (
                      <Card key={field.id} className="bg-muted/10">
                        <CardContent className="flex items-start gap-3 p-4">
                          <div className="flex-1 space-y-2">
                            <FieldLabel>
                              Kegiatan/Aktivitas {index + 1}
                            </FieldLabel>
                            <Controller
                              name={`intervensi.${index}.deskripsi`}
                              control={form.control}
                              render={({ field: inputField }) => (
                                <Textarea
                                  {...inputField}
                                  className="min-h-[80px]"
                                />
                              )}
                            />
                          </div>
                          {!isClosed && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="mt-7"
                              onClick={() => intRemove(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {!isClosed && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-fit"
                        onClick={() => intAppend({ deskripsi: "" })}
                      >
                        <Plus className="mr-2 h-4 w-4" /> Tambah Intervensi
                      </Button>
                    )}
                  </FieldGroup>
                </FieldSet>
                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveStep("rencana")}
                  >
                    &larr; Kembali
                  </Button>
                  <Button type="button" onClick={() => setActiveStep("monev")}>
                    Lanjut Monev &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* --- STEP 4: MONEV --- */}
            {activeStep === "monev" && (
              <div className="space-y-8">
                <FieldSet disabled={isClosed}>
                  <FieldLegend>a. Metode Monev</FieldLegend>
                  <Controller
                    name="metodeMonev"
                    control={form.control}
                    render={({ field }) => (
                      <div className="mt-2 flex flex-wrap gap-4">
                        {METODE_MONEV_OPTIONS.map((metode) => (
                          <label
                            key={metode}
                            className="flex items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={field.value?.includes(metode)}
                              onChange={(e) => {
                                const val = e.target.checked
                                  ? [...(field.value || []), metode]
                                  : (field.value || []).filter(
                                      (v) => v !== metode,
                                    );
                                field.onChange(val);
                              }}
                              className="h-4 w-4"
                            />{" "}
                            {metode}
                          </label>
                        ))}
                      </div>
                    )}
                  />
                </FieldSet>
                <FieldSet disabled={isClosed}>
                  <FieldLegend>b. Hasil Monev (Per Minggu)</FieldLegend>
                  <FieldGroup className="gap-4">
                    {hmFields.map((field, index) => (
                      <Controller
                        key={field.id}
                        name={`hasilMonev.${index}.deskripsi`}
                        control={form.control}
                        render={({ field: inputField }) => (
                          <Field>
                            <FieldLabel>Minggu ke-{index + 1}</FieldLabel>
                            <Textarea
                              {...inputField}
                              placeholder={`Catatan perkembangan minggu ke-${index + 1}`}
                              className="min-h-[60px]"
                            />
                          </Field>
                        )}
                      />
                    ))}
                  </FieldGroup>
                </FieldSet>
                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveStep("intervensi")}
                  >
                    &larr; Kembali
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveStep("terminasi")}
                  >
                    Lanjut Terminasi &rarr;
                  </Button>
                </div>
              </div>
            )}

            {/* --- STEP 5: TERMINASI --- */}
            {activeStep === "terminasi" && (
              <div className="space-y-6">
                <FieldSet disabled={isClosed}>
                  <FieldLegend>5. Terminasi (Pengakhiran Kasus)</FieldLegend>
                  <div className="mt-4 space-y-4">
                    <h4 className="text-sm font-semibold">
                      a. Gambaran Umum Kondisi Anak Saat Terminasi
                    </h4>
                    <div className="bg-muted/20 grid grid-cols-1 gap-6 rounded-lg border p-4 md:grid-cols-2">
                      <Controller
                        name="terminasiBiologis"
                        control={form.control}
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Biologis/ Fisik</FieldLabel>
                            <Input {...field} />
                          </Field>
                        )}
                      />
                      <Controller
                        name="terminasiPsikologis"
                        control={form.control}
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Psikologis</FieldLabel>
                            <Input {...field} />
                          </Field>
                        )}
                      />
                      <Controller
                        name="terminasiSosial"
                        control={form.control}
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Sosial</FieldLabel>
                            <Input {...field} />
                          </Field>
                        )}
                      />
                      <Controller
                        name="terminasiSpiritual"
                        control={form.control}
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Spiritual</FieldLabel>
                            <Input {...field} />
                          </Field>
                        )}
                      />
                    </div>
                  </div>
                  <Controller
                    name="kesimpulan"
                    control={form.control}
                    render={({ field }) => (
                      <Field className="mt-4">
                        <FieldLabel>
                          b. Kesimpulan Penanganan Kasus Anak
                        </FieldLabel>
                        <Textarea {...field} className="min-h-[100px]" />
                      </Field>
                    )}
                  />
                </FieldSet>

                {/* AKSI BAWAH */}
                <div className="mt-8 flex flex-col justify-between gap-4 border-t pt-6 md:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveStep("monev")}
                  >
                    &larr; Kembali
                  </Button>
                  <div className="flex gap-2">
                    {!isClosed && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setShowTutupDialog(true)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" /> Tutup & Akhiri
                        Kasus
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending || isClosed}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Simpan Perubahan
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </form>

      {/* AlertDialog untuk konfirmasi tutup kasus */}
      <AlertDialog open={showTutupDialog} onOpenChange={setShowTutupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yakin ingin menutup kasus ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Kasus akan ditandai sebagai selesai per hari ini dan tidak dapat
              diedit lagi. Pastikan semua data telah terisi dengan benar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleTutupKasus}>
              Tutup Kasus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
