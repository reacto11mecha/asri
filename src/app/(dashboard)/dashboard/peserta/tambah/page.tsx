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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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

// 1. Skema Validasi Ekstensif
const formSchema = z.object({
  nipd: z.string().min(1, "NIPD wajib diisi"),
  namaLengkap: z.string().min(1, "Nama wajib diisi"),
  kelasId: z.string().min(1, "Kelas wajib dipilih"),
  waliAsuhId: z.string().optional(),
  nisn: z.string().optional(),
  jenisKelamin: z.string().optional(),
  tempatLahir: z.string().optional(),
  tanggalLahir: z.string().optional(),
  agama: z.string().optional(),
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

// 2. Definisi Array Konfigurasi Field agar DRY (Don't Repeat Yourself)
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
  { name: "agama", label: "Agama" },
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

export default function TambahPesertaPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: daftarKelas = [], isLoading: loadingKelas } =
    api.peserta.getAllKelas.useQuery();
  const { data: daftarWali = [], isLoading: loadingWali } =
    api.peserta.getWaliAsuh.useQuery();

  const createPesertaMutation = api.peserta.createPeserta.useMutation({
    onSuccess: async () => {
      await utils.peserta.getAll.invalidate();

      router.push("/dashboard/peserta");
      toast.success("Berhasil menambahkan peserta!");
    },
    onError: (error) =>
      toast.error("Gagal menambahkan peserta", {
        description: error.message,
      }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      waliAsuhId: "unassigned",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    createPesertaMutation.mutate(data);
  }

  // Helper render input teks & tanggal secara dinamis
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
            Tambah Peserta Didik
          </h2>
          <p className="text-muted-foreground">
            Isi form di bawah ini. Kolom selain identitas utama bersifat
            opsional.
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* KARTU 1: WAJIB */}
        <Card className="border-l-primary border-l-4">
          <CardHeader>
            <CardTitle>Identitas Utama (Wajib)</CardTitle>
            <CardDescription>
              Informasi pokok dan penempatan kelas.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
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
                  <FieldDescription>
                    Digunakan untuk scan QR Code.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

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

            <Controller
              name="waliAsuhId"
              control={form.control}
              render={({ field, fieldState }) => {
                // Cari data wali asuh yang cocok dengan ID yang sedang dipilih
                const selectedWali = daftarWali.find(
                  (w) => w.id === field.value,
                );

                return (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Pilih Wali Asuh (Opsional)
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
                        {/* Sisipkan logika manual ke dalam SelectValue */}
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
                    <FieldDescription>
                      User yang akan bertanggung jawab pada anak ini.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                );
              }}
            />
          </CardContent>
        </Card>

        {/* KARTU 2: DEMOGRAFI */}
        <Card>
          <CardHeader>
            <CardTitle>Demografi & Asal</CardTitle>
            <CardDescription>Informasi tambahan profil anak.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
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
          <Button type="submit" disabled={createPesertaMutation.isPending}>
            {createPesertaMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Simpan Data Anak
          </Button>
        </div>
      </form>
    </div>
  );
}
