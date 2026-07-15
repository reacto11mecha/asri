// src/app/(dashboard)/dashboard/peserta/edit/[id]/edit-peserta-form.tsx
"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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

const agamaEnum = z.enum([
  "ISLAM",
  "KRISTEN",
  "KATOLIK",
  "HINDU",
  "BUDHA",
  "KONGHUCU",
  "LAINNYA",
]);

const formSchema = z.object({
  id: z.string(),
  nipd: z.string().min(1, "NIPD wajib diisi"),
  namaLengkap: z.string().min(1, "Nama wajib diisi"),
  kelasId: z.string().min(1, "Kelas wajib dipilih"),
  agama: agamaEnum,
  waliAsuhId: z.string().optional(),
  nisn: z.string().optional(),
  jenisKelamin: z.string().optional(),
  tempatLahir: z.string().optional(),
  tanggalLahir: z.string().optional(),
  anakKe: z.string().optional(),
  sekolahAsal: z.string().optional(),
  noAkte: z.string().optional(),
  nik: z.string().optional(),
  noKk: z.string().optional(),
  alamat: z.string().optional(),
  rt: z.string().optional(),
  rw: z.string().optional(),
  kelurahan: z.string().optional(),
  kecamatan: z.string().optional(),
  kodePos: z.string().optional(),
  noTelp: z.string().optional(),
  namaIbu: z.string().optional(),
  tempatLahirIbu: z.string().optional(),
  tanggalLahirIbu: z.string().optional(),
  pendidikanIbu: z.string().optional(),
  pekerjaanIbu: z.string().optional(),
  penghasilanIbu: z.string().optional(),
  nikIbu: z.string().optional(),
  namaAyah: z.string().optional(),
  tempatLahirAyah: z.string().optional(),
  tanggalLahirAyah: z.string().optional(),
  pendidikanAyah: z.string().optional(),
  pekerjaanAyah: z.string().optional(),
  penghasilanAyah: z.string().optional(),
  nikAyah: z.string().optional(),
});

type FieldConfig = {
  name: keyof z.infer<typeof formSchema>;
  label: string;
  type?: string;
  desc?: string;
};

const demoFields: FieldConfig[] = [
  { name: "nisn", label: "NISN" },
  { name: "tempatLahir", label: "Tempat Lahir" },
  { name: "tanggalLahir", label: "Tanggal Lahir", type: "date" },
  { name: "anakKe", label: "Anak Ke-", desc: "Contoh: 1" },
  { name: "sekolahAsal", label: "Sekolah Asal" },
];

const docFields: FieldConfig[] = [
  { name: "noAkte", label: "No Akte Kelahiran" },
  { name: "nik", label: "NIK Peserta Didik" },
  { name: "noKk", label: "No Kartu Keluarga" },
  { name: "noTelp", label: "No Telepon / WA" },
  { name: "alamat", label: "Alamat Lengkap" },
  { name: "rt", label: "RT" },
  { name: "rw", label: "RW" },
  { name: "kelurahan", label: "Kelurahan/Desa" },
  { name: "kecamatan", label: "Kecamatan" },
  { name: "kodePos", label: "Kode Pos" },
];

const ibuFields: FieldConfig[] = [
  { name: "namaIbu", label: "Nama Ibu" },
  { name: "nikIbu", label: "NIK Ibu" },
  { name: "tempatLahirIbu", label: "Tempat Lahir Ibu" },
  { name: "tanggalLahirIbu", label: "Tanggal Lahir Ibu", type: "date" },
  { name: "pendidikanIbu", label: "Pendidikan Ibu" },
  { name: "pekerjaanIbu", label: "Pekerjaan Ibu" },
  { name: "penghasilanIbu", label: "Penghasilan Ibu" },
];

const ayahFields: FieldConfig[] = [
  { name: "namaAyah", label: "Nama Ayah" },
  { name: "nikAyah", label: "NIK Ayah" },
  { name: "tempatLahirAyah", label: "Tempat Lahir Ayah" },
  { name: "tanggalLahirAyah", label: "Tanggal Lahir Ayah", type: "date" },
  { name: "pendidikanAyah", label: "Pendidikan Ayah" },
  { name: "pekerjaanAyah", label: "Pekerjaan Ayah" },
  { name: "penghasilanAyah", label: "Penghasilan Ayah" },
];

const formatDateForInput = (dateStr: string | null | undefined | Date) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toISOString().split("T")[0];
};

export function EditPesertaForm({ initialData }: { initialData: any }) {
  const router = useRouter();
  const utils = api.useUtils();

  const { data: daftarKelas = [], isLoading: loadingKelas } =
    api.peserta.getAllKelas.useQuery();
  const { data: daftarWali = [], isLoading: loadingWali } =
    api.peserta.getWaliAsuh.useQuery();

  const updatePesertaMutation = api.peserta.updatePeserta.useMutation({
    onSuccess: async () => {
      await utils.peserta.getAll.invalidate();
      router.push("/dashboard/peserta");
      toast.success("Berhasil memperbarui data peserta!");
    },
    onError: (error) =>
      toast.error("Gagal memperbarui data peserta", {
        description: error.message,
      }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: initialData.id,
      nipd: initialData.nipd || "",
      namaLengkap: initialData.namaLengkap || "",
      kelasId: initialData.kelasId || "",
      agama: initialData.agama ?? "ISLAM",
      waliAsuhId: initialData.waliAsuhId || "unassigned",
      jenisKelamin: initialData.jenisKelamin || "",
      nisn: initialData.nisn || "",
      tempatLahir: initialData.tempatLahir || "",
      tanggalLahir: formatDateForInput(initialData.tanggalLahir),
      anakKe: initialData.anakKe || "",
      sekolahAsal: initialData.sekolahAsal || "",
      noAkte: initialData.noAkte || "",
      nik: initialData.nik || "",
      noKk: initialData.noKk || "",
      alamat: initialData.alamat || "",
      rt: initialData.rt || "",
      rw: initialData.rw || "",
      kelurahan: initialData.kelurahan || "",
      kecamatan: initialData.kecamatan || "",
      kodePos: initialData.kodePos || "",
      noTelp: initialData.noTelp || "",
      namaIbu: initialData.namaIbu || "",
      tempatLahirIbu: initialData.tempatLahirIbu || "",
      tanggalLahirIbu: formatDateForInput(initialData.tanggalLahirIbu),
      pendidikanIbu: initialData.pendidikanIbu || "",
      pekerjaanIbu: initialData.pekerjaanIbu || "",
      penghasilanIbu: initialData.penghasilanIbu || "",
      nikIbu: initialData.nikIbu || "",
      namaAyah: initialData.namaAyah || "",
      tempatLahirAyah: initialData.tempatLahirAyah || "",
      tanggalLahirAyah: formatDateForInput(initialData.tanggalLahirAyah),
      pendidikanAyah: initialData.pendidikanAyah || "",
      pekerjaanAyah: initialData.pekerjaanAyah || "",
      penghasilanAyah: initialData.penghasilanAyah || "",
      nikAyah: initialData.nikAyah || "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    updatePesertaMutation.mutate(data);
  }

  const renderFields = (fields: FieldConfig[]) =>
    fields.map((f) => (
      <Controller
        key={f.name}
        name={f.name}
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={f.name}>{f.label}</FieldLabel>
            <Input
              {...field}
              value={(field.value as string) || ""}
              id={f.name}
              type={f.type || "text"}
              autoComplete="off"
              aria-invalid={fieldState.invalid}
            />
            {f.desc && <FieldDescription>{f.desc}</FieldDescription>}
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    ));

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          render={
            <Link href="/dashboard/peserta">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          }
          nativeButton={false}
        />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Edit Peserta Didik
          </h2>
          <p className="text-muted-foreground">
            Ubah rincian identitas anak asuh di bawah ini.
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-l-primary border-l-4">
          <CardHeader>
            <CardTitle>Identitas Utama (Wajib)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {/* NIPD */}
            <Controller
              name="nipd"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    NIPD (Nomor Induk) *
                  </FieldLabel>
                  <Input
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

            {/* Nama Lengkap */}
            <Controller
              name="namaLengkap"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Nama Lengkap *</FieldLabel>
                  <Input
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

            {/* Kelas */}
            <Controller
              name="kelasId"
              control={form.control}
              render={({ field, fieldState }) => {
                const selectedKelas = daftarKelas.find(
                  (k) => k.id === field.value,
                );
                return (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Penempatan Kelas *
                    </FieldLabel>
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue
                          placeholder={
                            loadingKelas ? "Memuat..." : "Pilih Kelas"
                          }
                        >
                          {selectedKelas
                            ? `${selectedKelas.jenjang} - ${selectedKelas.tingkat} ${selectedKelas.namaKelas}`
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {daftarKelas.map((k) => (
                          <SelectItem key={k.id} value={k.id}>
                            {k.jenjang} - {k.tingkat} {k.namaKelas}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                );
              }}
            />

            {/* AGAMA (WAJIB, dropdown) */}
            <Controller
              name="agama"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Agama *</FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Pilih Agama" />
                    </SelectTrigger>
                    <SelectContent>
                      {agamaEnum.options.map((agama) => (
                        <SelectItem key={agama} value={agama}>
                          {agama.charAt(0) + agama.slice(1).toLowerCase()}
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
          </CardContent>
        </Card>

        {/* KARTU 2: DEMOGRAFI & ASAL – wali asuh dipindah ke sini */}
        <Card>
          <CardHeader>
            <CardTitle>Demografi & Asal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {/* Jenis Kelamin */}
            <Controller
              name="jenisKelamin"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Jenis Kelamin</FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Pilih Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki (L)</SelectItem>
                      <SelectItem value="P">Perempuan (P)</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Wali Asuh (dipindah dari Kartu 1) */}
            <Controller
              name="waliAsuhId"
              control={form.control}
              render={({ field, fieldState }) => {
                const selectedWali = daftarWali.find(
                  (w) => w.id === field.value,
                );
                return (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Wali Asuh (Opsional)
                    </FieldLabel>
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue
                          placeholder={
                            loadingWali ? "Memuat..." : "Pilih Wali Asuh"
                          }
                        >
                          {field.value === "unassigned"
                            ? "-- Belum ditugaskan --"
                            : selectedWali?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="unassigned"
                          className="text-muted-foreground font-medium"
                        >
                          -- Belum ditugaskan --
                        </SelectItem>
                        {daftarWali.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                );
              }}
            />

            {/* Field demografi lainnya – agama sudah tidak di sini */}
            {renderFields(demoFields)}
          </CardContent>
        </Card>

        {/* KARTU 3: DOKUMEN & ALAMAT */}
        <Card>
          <CardHeader>
            <CardTitle>Dokumen & Alamat</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {renderFields(docFields)}
          </CardContent>
        </Card>

        {/* KARTU 4: ORANG TUA */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Data Ibu</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              {renderFields(ibuFields)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Data Ayah</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              {renderFields(ayahFields)}
            </CardContent>
          </Card>
        </div>

        {/* TOMBOL AKSI */}
        <div className="bg-background/80 sticky bottom-4 flex justify-end gap-4 rounded-lg border p-4 shadow-sm backdrop-blur">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={updatePesertaMutation.isPending}>
            {updatePesertaMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </div>
  );
}
