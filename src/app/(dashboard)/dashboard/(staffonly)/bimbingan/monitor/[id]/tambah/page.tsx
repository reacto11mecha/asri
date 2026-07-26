// src/app/(dashboard)/dashboard/(staffonly)/bimbingan/monitor/[id]/tambah/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

// Import komponen form Shadcn gaya baru
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldSet,
  FieldLegend,
} from "~/components/ui/field";

// ==========================================
// 1. ZOD SCHEMA UNTUK FORM
// ==========================================
const formSchema = z.object({
  monevKe: z.coerce.number().min(1, "Wajib diisi"),
  periodeBulan: z.string().length(2, "Pilih bulan"),
  periodeTahun: z.string().length(4, "Wajib diisi"),
  skorAdl: z.record(z.string(), z.coerce.number().min(1).max(5)),
  skorSosial: z.record(z.string(), z.coerce.number().min(1).max(5)),
  skorMental: z.record(z.string(), z.coerce.number().min(1).max(5)),
  skorVokasional: z.record(z.string(), z.coerce.number().min(1).max(5)),
  masalahKasus: z.string().optional(),
  penyebabKasus: z.string().optional(),
  akibatKasus: z.string().optional(),
  langkahKasus: z.string().optional(),
  rencanaTindakLanjut: z.string().optional(),
  kegiatanPositif: z.string().optional(),
  pelanggaranSanksi: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ==========================================
// 2. DATA KONFIGURASI INDIKATOR (Sesuai PDF Matriks)
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

export default function TambahMonevPage() {
  const params = useParams();
  const router = useRouter();
  const pesertaDidikId = params.id as string;
  const [activeTab, setActiveTab] = useState("adl");

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
    },
  });

  const createMutation = api.bimbingan.createPerkembangan.useMutation({
    onSuccess: () => {
      toast.success("Laporan Monev berhasil disimpan");
      router.push(`/dashboard/bimbingan/monitor/${pesertaDidikId}`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(`Gagal menyimpan: ${error.message}`);
    },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({
      pesertaDidikId,
      ...values,
    });
  };

  // Helper function untuk merender input skor menggunakan arsitektur <Field /> terbaru
  const renderScoreInputs = (
    kategori: "skorAdl" | "skorSosial" | "skorMental" | "skorVokasional",
    indikatorList: { key: string; label: string }[],
  ) => {
    return (
      <FieldGroup className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {indikatorList.map((item) => (
          <Controller
            key={item.key}
            name={`${kategori}.${item.key}`}
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>{item.label}</FieldLabel>
                <Select
                  name={field.name}
                  value={field.value?.toString() || ""}
                  onValueChange={(val) => field.onChange(Number(val))}
                >
                  <SelectTrigger
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Pilih Skor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Sangat Kurang</SelectItem>
                    <SelectItem value="2">2 - Kurang</SelectItem>
                    <SelectItem value="3">3 - Cukup</SelectItem>
                    <SelectItem value="4">4 - Baik</SelectItem>
                    <SelectItem value="5">5 - Sangat Baik</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        ))}
      </FieldGroup>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Tambah Evaluasi Baru
          </h1>
          <p className="text-muted-foreground">
            Isi form monitoring perkembangan secara berkala.
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* --- IDENTITAS LAPORAN --- */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Informasi Periode</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Controller
              name="monevKe"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Monev Ke-</FieldLabel>
                  <Input
                    type="number"
                    min={1}
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

            <Controller
              name="periodeBulan"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Bulan</FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Pilih Bulan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="01">Januari</SelectItem>
                      <SelectItem value="02">Februari</SelectItem>
                      {/* ... Tambahkan bulan lainnya */}
                      <SelectItem value="12">Desember</SelectItem>
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
                  <FieldLabel htmlFor={field.name}>Tahun</FieldLabel>
                  <Input
                    type="text"
                    maxLength={4}
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
          </CardContent>
        </Card>

        {/* --- TAB MATRIKS PENILAIAN --- */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="adl" className="py-2">
              1. ADL
            </TabsTrigger>
            <TabsTrigger value="sosial" className="py-2">
              2. Sosial
            </TabsTrigger>
            <TabsTrigger value="mental" className="py-2">
              3. Mental
            </TabsTrigger>
            <TabsTrigger value="vokasional" className="py-2">
              4. Vokasional
            </TabsTrigger>
            <TabsTrigger value="evaluasi" className="py-2">
              5. Evaluasi
            </TabsTrigger>
          </TabsList>

          <Card className="mt-4 rounded-t-none border-t-0">
            <CardContent className="pt-6">
              {/* TAB 1: ADL */}
              <TabsContent value="adl" className="m-0 space-y-6">
                <FieldSet>
                  <FieldLegend>Activities Daily Living (ADL)</FieldLegend>
                  {renderScoreInputs("skorAdl", indikatorAdl)}
                </FieldSet>
                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={() => setActiveTab("sosial")}>
                    Lanjut ke Sosial &rarr;
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 2: SOSIAL */}
              <TabsContent value="sosial" className="m-0 space-y-6">
                <FieldSet>
                  <FieldLegend>Aspek Sosial</FieldLegend>
                  {renderScoreInputs("skorSosial", indikatorSosial)}
                </FieldSet>
                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("adl")}
                  >
                    &larr; Kembali
                  </Button>
                  <Button type="button" onClick={() => setActiveTab("mental")}>
                    Lanjut ke Mental &rarr;
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 3: MENTAL */}
              <TabsContent value="mental" className="m-0 space-y-6">
                <FieldSet>
                  <FieldLegend>
                    Aspek Mental (Spritual, Psikologis, Idiologi)
                  </FieldLegend>
                  {renderScoreInputs("skorMental", indikatorMental)}
                </FieldSet>
                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("sosial")}
                  >
                    &larr; Kembali
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("vokasional")}
                  >
                    Lanjut ke Vokasional &rarr;
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 4: VOKASIONAL */}
              <TabsContent value="vokasional" className="m-0 space-y-6">
                <FieldSet>
                  <FieldLegend>Aspek Vokasional</FieldLegend>
                  {renderScoreInputs("skorVokasional", indikatorVokasional)}
                </FieldSet>
                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("mental")}
                  >
                    &larr; Kembali
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("evaluasi")}
                  >
                    Lanjut ke Evaluasi Umum &rarr;
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 5: EVALUASI KUALITATIF */}
              <TabsContent value="evaluasi" className="m-0 space-y-6">
                <FieldSet>
                  <FieldLegend>
                    Perkembangan Pemecahan (Masalah/Kasus)
                  </FieldLegend>
                  <FieldGroup className="grid grid-cols-1 gap-6">
                    <Controller
                      name="masalahKasus"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            Permasalahan
                          </FieldLabel>
                          <Textarea
                            {...field}
                            id={field.name}
                            aria-invalid={fieldState.invalid}
                            className="min-h-[100px]"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name="kegiatanPositif"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            Kegiatan Positif & Hadiah
                          </FieldLabel>
                          <Textarea
                            {...field}
                            id={field.name}
                            aria-invalid={fieldState.invalid}
                            className="min-h-[100px]"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </FieldSet>

                <div className="flex justify-between border-t pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("vokasional")}
                  >
                    &larr; Kembali
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Simpan Laporan
                  </Button>
                </div>
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </form>
    </div>
  );
}
