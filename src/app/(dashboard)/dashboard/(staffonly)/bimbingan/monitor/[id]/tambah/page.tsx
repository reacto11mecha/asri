// src/app/(dashboard)/dashboard/(staffonly)/bimbingan/monitor/[id]/tambah/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller, type SubmitErrorHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { ArrowLeft, Save, Loader2, User, MapPin } from "lucide-react";
import { cn } from "~/lib/utils";

import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldSet,
  FieldLegend,
} from "~/components/ui/field";

// ==========================================
// DATA KONFIGURASI INDIKATOR
// ==========================================
const indikatorAdl = [
  { key: "bangunTidur", label: "Bangun Tidur" },
  { key: "babBak", label: "BAB-BAK" },
  { key: "mandi", label: "Mandi (termasuk mencuci rambut)" },
  { key: "gosokGigi", label: "Gosok Gigi" },
  { key: "kebersihanDiri", label: "Kebersihan diri (potong kuku, rambut)" },
  { key: "kerapihanPakaian", label: "Kerapihan Pakaian" },
  { key: "makanMinum", label: "Makan dan Minum" },
  { key: "tidur", label: "Tidur (ditempat tidur/diluar)" },
  { key: "menjagaKesehatan", label: "Menjaga Kesehatan Diri" },
];

const indikatorSosial = [
  { key: "tingkatKedekatan", label: "Tingkat kedekatan pergaulan" },
  { key: "empati", label: "Tingkat Empati" },
  { key: "simpati", label: "Tingkat Simpati" },
  { key: "komunikasi", label: "Keakraban berkomunikasi" },
  { key: "keramahan", label: "Keramahan / Kesopanan" },
  { key: "menyesuaikanDiri", label: "Kemampuan menyusaikan diri" },
  { key: "mengungkapkanPerasaan", label: "Kemampuan mengungkapkan perasaan" },
  { key: "memahamiMasalahDiri", label: "Kemampuan memahami masalah diri" },
  { key: "pengambilanKeputusan", label: "Kemampuan Pengambilan Keputusan" },
  { key: "aktivitasBersama", label: "Keterlibatan dalam aktivitas bersama" },
  { key: "aktivitasMasyarakat", label: "Keterlibatan aktivitas masyarakat" },
  { key: "pemahamanOrangtua", label: "Pemahaman terhadap orang tua/keluarga" },
  { key: "pemahamanKelompok", label: "Pemahaman terhadap kelompok" },
];

const indikatorMental = [
  { key: "nilaiAgama", label: "Penghayatan terhadap Nilai Agama" },
  { key: "ibadahSehariHari", label: "Penghayatan Ibadah sehari-hari" },
  { key: "ilmuAgama", label: "Penghayatan Ilmu Agama" },
  { key: "pemahamanHukum", label: "Pemahaman Hukum" },
  { key: "pemahamanPancasila", label: "Pemahaman Pancasila" },
  { key: "pemahamanBermasyarakat", label: "Pemahaman Hidup Bermasyarakat" },
  { key: "stabilitasEmosi", label: "Tingkat Stabilitas Emosional" },
  { key: "dayaIngat", label: "Tingkat Daya Ingat" },
  { key: "penalaran", label: "Tingkat Penalaran" },
  { key: "pengendalianDiri", label: "Tingkat Pengendalian Diri" },
  { key: "disiplinDiri", label: "Tingkat disiplin diri" },
  { key: "tanggungJawabPribadi", label: "Tingkat Tanggung-jawab Pribadi" },
  { key: "tanggungJawabSosial", label: "Tingkat Tanggung-jawab Sosial" },
  { key: "ambangDasar", label: "Tingkat Ambang Dasar (Halusinasi/Ilusi)" },
  { key: "pemahamanDiri", label: "Pemahaman diri sendiri (PD)" },
  { key: "perilaku", label: "Prilaku (Maladaptif, Adaptif)" },
];

const indikatorVokasional = [
  { key: "minatKegiatan", label: "Minat terhadap kegiatan / ketrampilan" },
  { key: "kesungguhanKerja", label: "Kesungguhan mengikuti ketrampilan" },
  { key: "semangatKerja", label: "Dorongan dan semangat kerja" },
  { key: "disiplinKerja", label: "Disiplin Kerja" },
  { key: "tanggungJawabKerja", label: "Tanggungjawab Kerja" },
  { key: "keterampilanKerja", label: "Ketrampilan Kerja" },
  { key: "produktivitasKerja", label: "Produktivitas Kerja" },
  { key: "kualitasPekerjaan", label: "Kualitas Pekerjaan" },
  { key: "kecermatanKerja", label: "Kecermatan Kerja" },
  { key: "prosedurKerja", label: "Prosedur Kerja" },
  { key: "ketelitianKerja", label: "Ketelitian Kerja" },
  { key: "kerjaSama", label: "Kerja sama" },
  { key: "prakarsa", label: "Prakarsa" },
  { key: "partisipasiKerja", label: "Partisipasi / Ketertiban Kerja" },
];

// ==========================================
// ZOD SCHEMA
// ==========================================
const validateSkorLength = (len: number) => (val: Record<string, number>) =>
  Object.keys(val).length === len;

const formSchema = z.object({
  monevKe: z.coerce.number().min(1, "Wajib diisi"),
  periodeBulan: z.string().length(2, "Pilih bulan"),
  periodeTahun: z.string().length(4, "Wajib diisi"),
  skorAdl: z
    .record(z.string(), z.coerce.number().min(1).max(5))
    .refine(
      validateSkorLength(indikatorAdl.length),
      "Semua indikator ADL wajib dinilai",
    ),
  skorSosial: z
    .record(z.string(), z.coerce.number().min(1).max(5))
    .refine(
      validateSkorLength(indikatorSosial.length),
      "Semua indikator Sosial wajib dinilai",
    ),
  skorMental: z
    .record(z.string(), z.coerce.number().min(1).max(5))
    .refine(
      validateSkorLength(indikatorMental.length),
      "Semua indikator Mental wajib dinilai",
    ),
  skorVokasional: z
    .record(z.string(), z.coerce.number().min(1).max(5))
    .refine(
      validateSkorLength(indikatorVokasional.length),
      "Semua indikator Vokasional wajib dinilai",
    ),
  masalahKasus: z.string().optional(),
  penyebabKasus: z.string().optional(),
  akibatKasus: z.string().optional(),
  langkahKasus: z.string().optional(),
  rencanaTindakLanjut: z.string().optional(),
  kegiatanPositif: z.string().optional(),
  pelanggaranSanksi: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function TambahMonevPage() {
  const params = useParams();
  const router = useRouter();
  const pesertaDidikId = params.id as string;

  const [activeStep, setActiveStep] = useState("info");

  const utils = api.useUtils();
  const { data: profil } = api.peserta.getById.useQuery({ id: pesertaDidikId });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      monevKe: 1,
      periodeBulan: (new Date().getMonth() + 1).toString().padStart(2, "0"),
      periodeTahun: new Date().getFullYear().toString(),
      skorAdl: {},
      skorSosial: {},
      skorMental: {},
      skorVokasional: {},
      masalahKasus: "",
      penyebabKasus: "",
      akibatKasus: "",
      langkahKasus: "",
      rencanaTindakLanjut: "",
      kegiatanPositif: "",
      pelanggaranSanksi: "",
    },
  });

  const createMutation = api.bimbingan.createPerkembangan.useMutation({
    onSuccess: () => {
      toast.success("Laporan Monev berhasil disimpan");
      utils.bimbingan.getDetailRiwayat.invalidate();
      router.push(`/dashboard/bimbingan/monitor/${pesertaDidikId}`);
      router.refresh();
    },
    onError: (error) => toast.error(`Gagal menyimpan: ${error.message}`),
  });

  const onSubmit = (values: FormValues) =>
    createMutation.mutate({ pesertaDidikId, ...values });

  const onInvalid: SubmitErrorHandler<FormValues> = (errors) => {
    if (errors.monevKe || errors.periodeBulan || errors.periodeTahun) {
      setActiveStep("info");
      toast.error("Gagal menyimpan: Lengkapi Informasi Periode Evaluasi");
    } else if (errors.skorAdl) {
      setActiveStep("adl");
      toast.error("Gagal menyimpan: Terdapat indikator ADL yang belum dinilai");
    } else if (errors.skorSosial) {
      setActiveStep("sosial");
      toast.error(
        "Gagal menyimpan: Terdapat indikator Sosial yang belum dinilai",
      );
    } else if (errors.skorMental) {
      setActiveStep("mental");
      toast.error(
        "Gagal menyimpan: Terdapat indikator Mental yang belum dinilai",
      );
    } else if (errors.skorVokasional) {
      setActiveStep("vokasional");
      toast.error(
        "Gagal menyimpan: Terdapat indikator Vokasional yang belum dinilai",
      );
    } else {
      toast.error(
        "Mohon periksa kembali form Anda, terdapat isian yang belum lengkap.",
      );
    }
  };

  const renderScoreInputs = (
    kategori: "skorAdl" | "skorSosial" | "skorMental" | "skorVokasional",
    indikatorList: { key: string; label: string }[],
  ) => {
    return (
      <div className="bg-card space-y-0 divide-y overflow-hidden rounded-lg border">
        {indikatorList.map((item) => (
          <Controller
            key={item.key}
            name={`${kategori}.${item.key}`}
            control={form.control}
            render={({ field, fieldState }) => (
              <div
                className={cn(
                  "flex flex-col justify-between gap-4 p-4 transition-colors md:flex-row md:items-center",
                  fieldState.invalid
                    ? "bg-destructive/10"
                    : "hover:bg-muted/30",
                )}
              >
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  {fieldState.invalid && (
                    <p className="text-destructive text-xs font-semibold">
                      Nilai wajib dipilih
                    </p>
                  )}
                </div>

                {/* Container Skala 1 - 5 (Penyesuaian gap untuk mobile) */}
                <div className="md:bg-muted/30 flex items-center justify-between gap-2 sm:gap-3 md:justify-end md:rounded-xl md:border md:px-4 md:py-2">
                  {[1, 2, 3, 4, 5].map((skor) => (
                    <label
                      key={skor}
                      className="group relative flex shrink-0 cursor-pointer items-center justify-center"
                    >
                      {/* Radio button disembunyikan */}
                      <input
                        type="radio"
                        name={field.name}
                        value={skor}
                        checked={field.value === skor}
                        onChange={() => field.onChange(skor)}
                        className="peer sr-only"
                      />
                      {/* Desain Lingkaran Angka (Ditambah shrink-0 dan ukuran di-lock) */}
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-200 select-none md:h-12 md:w-12",
                          field.value === skor
                            ? "border-primary bg-primary text-primary-foreground scale-110 shadow-md"
                            : "border-muted-foreground/30 bg-background text-muted-foreground peer-hover:border-primary/60 peer-hover:bg-primary/10 peer-focus-visible:ring-ring peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2",
                        )}
                      >
                        {skor}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          />
        ))}
      </div>
    );
  };

  const steps = [
    { id: "info", label: "Informasi" },
    { id: "adl", label: "1. ADL" },
    { id: "sosial", label: "2. Sosial" },
    { id: "mental", label: "3. Mental" },
    { id: "vokasional", label: "4. Vokasional" },
    { id: "evaluasi", label: "5. Evaluasi" },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tambah Evaluasi</h1>
          <p className="text-muted-foreground">
            Formulir penilaian perkembangan peserta didik per bulan.
          </p>
        </div>
      </div>

      {profil && (
        <Card className="bg-muted/40">
          <CardContent className="flex items-start gap-4 p-6">
            <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold">{profil.namaLengkap}</p>
              <p className="text-muted-foreground text-sm">
                Kelas {profil.kelas?.tingkat} {profil.kelas?.namaKelas} (
                {profil.kelas?.jenjang})
              </p>
              <div className="text-primary mt-2 flex items-center gap-1 text-sm font-medium">
                <MapPin className="h-3.5 w-3.5" /> Wali Asuh:{" "}
                {profil.waliAsuh?.name || "Belum ada"}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className="space-y-6"
      >
        <Card>
          {/* STEPPER NAVIGASI */}
          <div className="bg-muted/20 flex overflow-x-auto border-b whitespace-nowrap">
            {steps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={cn(
                  "px-6 py-3 text-sm font-medium transition-colors outline-none",
                  activeStep === step.id
                    ? "border-primary text-primary bg-background border-b-2"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                {step.label}
              </button>
            ))}
          </div>

          <CardContent className="pt-6">
            {activeStep === "info" && (
              <div className="animate-in fade-in-0 space-y-6">
                <FieldSet>
                  <FieldLegend>Informasi Periode Evaluasi</FieldLegend>
                  <FieldGroup className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <Controller
                      name="monevKe"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Monev Ke-</FieldLabel>
                          <Input type="number" min={1} {...field} />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                    <Controller
                      name="periodeBulan"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Bulan</FieldLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Bulan" />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                "01",
                                "02",
                                "03",
                                "04",
                                "05",
                                "06",
                                "07",
                                "08",
                                "09",
                                "10",
                                "11",
                                "12",
                              ].map((b) => (
                                <SelectItem key={b} value={b}>
                                  {new Date(0, parseInt(b) - 1).toLocaleString(
                                    "id-ID",
                                    { month: "long" },
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                    <Controller
                      name="periodeTahun"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Tahun</FieldLabel>
                          <Input maxLength={4} {...field} />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </FieldSet>
                <div className="mt-8 flex justify-end border-t pt-6">
                  <Button type="button" onClick={() => setActiveStep("adl")}>
                    Mulai Penilaian ADL &rarr;
                  </Button>
                </div>
              </div>
            )}

            {activeStep === "adl" && (
              <div className="animate-in fade-in-0 space-y-6">
                <FieldSet>
                  <FieldLegend>Activities Daily Living (ADL)</FieldLegend>
                  <CardDescription className="mb-4">
                    Skala Penilaian: 1 (Sangat Kurang) hingga 5 (Sangat Baik)
                  </CardDescription>
                  {renderScoreInputs("skorAdl", indikatorAdl)}
                  {form.formState.errors.skorAdl && (
                    <p className="text-destructive mt-2 text-sm font-medium">
                      {
                        (form.formState.errors.skorAdl as { message?: string })
                          .message
                      }
                    </p>
                  )}
                </FieldSet>
                <div className="mt-8 flex justify-between gap-4 border-t pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveStep("info")}
                  >
                    &larr; Kembali
                  </Button>
                  <Button type="button" onClick={() => setActiveStep("sosial")}>
                    Lanjut ke Sosial &rarr;
                  </Button>
                </div>
              </div>
            )}

            {activeStep === "sosial" && (
              <div className="animate-in fade-in-0 space-y-6">
                <FieldSet>
                  <FieldLegend>Aspek Sosial</FieldLegend>
                  {renderScoreInputs("skorSosial", indikatorSosial)}
                  {form.formState.errors.skorSosial && (
                    <p className="text-destructive mt-2 text-sm font-medium">
                      {
                        (
                          form.formState.errors.skorSosial as {
                            message?: string;
                          }
                        ).message
                      }
                    </p>
                  )}
                </FieldSet>
                <div className="mt-8 flex justify-between gap-4 border-t pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveStep("adl")}
                  >
                    &larr; Kembali
                  </Button>
                  <Button type="button" onClick={() => setActiveStep("mental")}>
                    Lanjut ke Mental &rarr;
                  </Button>
                </div>
              </div>
            )}

            {activeStep === "mental" && (
              <div className="animate-in fade-in-0 space-y-6">
                <FieldSet>
                  <FieldLegend>
                    Aspek Mental (Psikologis, Spiritual, Idiologi)
                  </FieldLegend>
                  {renderScoreInputs("skorMental", indikatorMental)}
                  {form.formState.errors.skorMental && (
                    <p className="text-destructive mt-2 text-sm font-medium">
                      {
                        (
                          form.formState.errors.skorMental as {
                            message?: string;
                          }
                        ).message
                      }
                    </p>
                  )}
                </FieldSet>
                <div className="mt-8 flex justify-between gap-4 border-t pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveStep("sosial")}
                  >
                    &larr; Kembali
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveStep("vokasional")}
                  >
                    Lanjut ke Vokasional &rarr;
                  </Button>
                </div>
              </div>
            )}

            {activeStep === "vokasional" && (
              <div className="animate-in fade-in-0 space-y-6">
                <FieldSet>
                  <FieldLegend>Aspek Vokasional</FieldLegend>
                  {renderScoreInputs("skorVokasional", indikatorVokasional)}
                  {form.formState.errors.skorVokasional && (
                    <p className="text-destructive mt-2 text-sm font-medium">
                      {
                        (
                          form.formState.errors.skorVokasional as {
                            message?: string;
                          }
                        ).message
                      }
                    </p>
                  )}
                </FieldSet>
                <div className="mt-8 flex justify-between gap-4 border-t pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveStep("mental")}
                  >
                    &larr; Kembali
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveStep("evaluasi")}
                  >
                    Lanjut ke Evaluasi Umum &rarr;
                  </Button>
                </div>
              </div>
            )}

            {activeStep === "evaluasi" && (
              <div className="animate-in fade-in-0 space-y-8">
                {/* BAGIAN E: PERKEMBANGAN MASALAH */}
                <FieldSet>
                  <FieldLegend>
                    E. Perkembangan Pemecahan Masalah / Kasus
                  </FieldLegend>
                  <FieldGroup className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Controller
                      name="masalahKasus"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Masalah Kasus</FieldLabel>
                          <Textarea {...field} className="min-h-[80px]" />
                        </Field>
                      )}
                    />
                    <Controller
                      name="penyebabKasus"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Penyebab Kasus</FieldLabel>
                          <Textarea {...field} className="min-h-[80px]" />
                        </Field>
                      )}
                    />
                    <Controller
                      name="akibatKasus"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Akibat Kasus</FieldLabel>
                          <Textarea {...field} className="min-h-[80px]" />
                        </Field>
                      )}
                    />
                    <Controller
                      name="langkahKasus"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Langkah Penanganan</FieldLabel>
                          <Textarea {...field} className="min-h-[80px]" />
                        </Field>
                      )}
                    />
                    <Controller
                      name="rencanaTindakLanjut"
                      control={form.control}
                      render={({ field }) => (
                        <Field className="md:col-span-2">
                          <FieldLabel>Rencana Tindak Lanjut</FieldLabel>
                          <Textarea {...field} className="min-h-[80px]" />
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </FieldSet>

                {/* BAGIAN F: PENILAIAN UMUM */}
                <FieldSet>
                  <FieldLegend>F. Penilaian Secara Umum</FieldLegend>
                  <FieldGroup className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Controller
                      name="kegiatanPositif"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Kegiatan Positif & Hadiah</FieldLabel>
                          <Textarea {...field} className="min-h-[80px]" />
                        </Field>
                      )}
                    />
                    <Controller
                      name="pelanggaranSanksi"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Pelanggaran & Sanksi</FieldLabel>
                          <Textarea {...field} className="min-h-[80px]" />
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </FieldSet>

                <div className="mt-8 flex flex-col justify-between gap-4 border-t pt-6 md:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveStep("vokasional")}
                  >
                    &larr; Kembali
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Simpan Laporan Evaluasi
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
