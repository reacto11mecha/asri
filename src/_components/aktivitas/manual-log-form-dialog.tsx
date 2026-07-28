// src/_components/aktivitas/manual-log-form-dialog.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";
import { toast } from "sonner";
import { PlusCircle, Search } from "lucide-react";
import { format } from "date-fns";

const statusMap: Record<string, string> = {
  HADIR: "Hadir / Mengikuti",
  SAKIT: "Sakit",
  IZIN: "Izin",
  ALFA: "Alfa (Tanpa Keterangan)",
  LAINNYA: "Lain-lainnya",
};

const formSchema = z
  .object({
    pesertaDidikId: z.string().min(1, "Siswa wajib dipilih"),
    tipeLog: z.enum(["SESI", "PELANGGARAN"]),
    kategoriId: z.string().optional(),
    sesiId: z.string().optional(),
    pelanggaranId: z.string().optional(),
    statusKehadiran: z.enum([
      "HADIR",
      "TIDAK_HADIR",
      "IZIN",
      "SAKIT",
      "ALFA",
      "LAINNYA",
    ]),
    keterangan: z.string().optional(),
    tanggal: z.string().min(1, "Tanggal wajib diisi"),
    poinOverride: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipeLog === "SESI" && (!data.sesiId || data.sesiId === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sesi wajib dipilih",
        path: ["sesiId"],
      });
    }
    if (
      data.tipeLog === "PELANGGARAN" &&
      (!data.pelanggaranId || data.pelanggaranId === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Jenis pelanggaran wajib dipilih",
        path: ["pelanggaranId"],
      });
    }
    if (
      data.tipeLog === "SESI" &&
      ["IZIN", "LAINNYA"].includes(data.statusKehadiran)
    ) {
      if (!data.keterangan || data.keterangan.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Keterangan wajib diisi untuk status Izin atau Lain-lainnya",
          path: ["keterangan"],
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

export function ManualLogFormDialog() {
  const [open, setOpen] = useState(false);
  const [searchSiswa, setSearchSiswa] = useState("");

  const utils = api.useUtils();
  const { data: options, isLoading } = api.aktivitas.getFormOptions.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pesertaDidikId: "",
      tipeLog: "SESI",
      kategoriId: "",
      sesiId: "",
      pelanggaranId: "",
      statusKehadiran: "HADIR",
      tanggal: format(new Date(), "yyyy-MM-dd"),
      poinOverride: "",
      keterangan: "",
    },
  });

  const tipeLog = form.watch("tipeLog");
  const selectedKategoriId = form.watch("kategoriId");
  const selectedSesiId = form.watch("sesiId");
  const selectedPelanggaranId = form.watch("pelanggaranId");
  const selectedPesertaDidikId = form.watch("pesertaDidikId");
  const selectedStatus = form.watch("statusKehadiran");

  const isKeteranganWajib =
    tipeLog === "SESI" &&
    (selectedStatus === "IZIN" || selectedStatus === "LAINNYA");

  const selectedKategori = options?.kategori.find(
    (k) => k.id === selectedKategoriId,
  );
  const selectedSesi = selectedKategori?.sesi.find(
    (s) => s.id === selectedSesiId,
  );
  const selectedPelanggaran = options?.pelanggaran.find(
    (p) => p.id === selectedPelanggaranId,
  );
  const selectedPeserta = options?.peserta.find(
    (p) => p.id === selectedPesertaDidikId,
  );

  const filteredSesi = selectedKategori?.sesi || [];

  const filteredPeserta =
    options?.peserta.filter((p) => {
      const searchLower = searchSiswa.toLowerCase();
      const namaMatch = p.namaLengkap.toLowerCase().includes(searchLower);
      const kelasMatch = `${p.kelas.tingkat} ${p.kelas.namaKelas}`
        .toLowerCase()
        .includes(searchLower);
      return namaMatch || kelasMatch;
    }) || [];

  const mutation = api.aktivitas.createLogManual.useMutation({
    onSuccess: () => {
      toast.success("Catatan aktivitas berhasil disimpan");
      utils.aktivitas.getRecentLogs.invalidate();
      setOpen(false);
      form.reset();
      setSearchSiswa("");
    },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate({
      pesertaDidikId: data.pesertaDidikId,
      tipeLog: data.tipeLog,
      sesiId: data.sesiId,
      pelanggaranId: data.pelanggaranId,
      statusKehadiran: data.statusKehadiran,
      keterangan: data.keterangan,
      tanggal: data.tanggal,
      poinOverride: data.poinOverride ? Number(data.poinOverride) : undefined,
    });
  };

  // Helper untuk menampilkan waktu sesi dengan aman
  const formatSessionTime = (time?: string | null) => {
    if (!time) return "";
    return ` (${time.substring(0, 5)})`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <PlusCircle className="mr-2 h-4 w-4" /> Input Manual
      </DialogTrigger>

      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] flex-col overflow-y-auto p-4 sm:max-w-3xl sm:p-6 md:max-w-5xl lg:max-w-7xl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Input Manual Aktivitas / Pelanggaran
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-muted-foreground animate-pulse py-8 text-center">
            Memuat data referensi...
          </p>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-2 flex flex-1 flex-col space-y-6"
          >
            {/* Pilih Siswa */}
            <Controller
              name="pesertaDidikId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Peserta Didik <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      className="h-12 w-full text-base"
                    >
                      <SelectValue placeholder="Pilih Siswa (Bisa dicari...)">
                        {selectedPeserta
                          ? `${selectedPeserta.namaLengkap} (${selectedPeserta.kelas.tingkat} ${selectedPeserta.kelas.namaKelas})`
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[350px]">
                      <div className="bg-popover sticky top-0 z-10 mb-1 border-b p-2 shadow-sm">
                        <div className="relative">
                          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                          <Input
                            placeholder="Ketik nama atau kelas..."
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
                            {p.namaLengkap} ({p.kelas.tingkat}{" "}
                            {p.kelas.namaKelas})
                          </SelectItem>
                        ))
                      ) : (
                        <div className="text-muted-foreground py-6 text-center text-sm">
                          Tidak ada siswa yang cocok dengan pencarian &quot;
                          {searchSiswa}&quot;
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

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Kolom Kiri */}
              <div className="space-y-6">
                {/* Tipe Pencatatan */}
                <FieldSet>
                  <FieldLegend>Tipe Pencatatan</FieldLegend>
                  <FieldGroup className="xs:flex-row xs:gap-3 flex flex-col gap-2">
                    <FieldLabel htmlFor="tipeLog-sesi" className="w-full">
                      <Field
                        orientation="horizontal"
                        className="hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5 cursor-pointer rounded-lg border-2 p-3 transition-all"
                      >
                        <input
                          type="radio"
                          id="tipeLog-sesi"
                          value="SESI"
                          {...form.register("tipeLog")}
                          className="accent-primary h-4 w-4"
                        />
                        <FieldContent>
                          <span className="text-sm font-medium">
                            Kegiatan Rutin
                          </span>
                        </FieldContent>
                      </Field>
                    </FieldLabel>
                    <FieldLabel
                      htmlFor="tipeLog-pelanggaran"
                      className="w-full"
                    >
                      <Field
                        orientation="horizontal"
                        className="hover:bg-muted cursor-pointer rounded-lg border-2 p-3 transition-all has-[:checked]:border-red-500 has-[:checked]:bg-red-50"
                      >
                        <input
                          type="radio"
                          id="tipeLog-pelanggaran"
                          value="PELANGGARAN"
                          {...form.register("tipeLog")}
                          className="h-4 w-4 accent-red-500"
                        />
                        <FieldContent>
                          <span className="text-sm font-medium">
                            Pelanggaran
                          </span>
                        </FieldContent>
                      </Field>
                    </FieldLabel>
                  </FieldGroup>
                </FieldSet>

                {tipeLog === "SESI" && (
                  <FieldSet>
                    <FieldLegend>Detail Kegiatan Rutin</FieldLegend>
                    <FieldGroup>
                      <Controller
                        name="kategoriId"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name}>
                              Kategori Kegiatan
                            </FieldLabel>
                            <Select
                              name={field.name}
                              value={field.value}
                              onValueChange={(val) => {
                                field.onChange(val);
                                form.setValue("sesiId", "");
                              }}
                            >
                              <SelectTrigger
                                id={field.name}
                                aria-invalid={fieldState.invalid}
                                className="w-full"
                              >
                                <SelectValue placeholder="Pilih Kategori">
                                  {selectedKategori?.namaKategori ?? undefined}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {options?.kategori.map((k) => (
                                  <SelectItem key={k.id} value={k.id}>
                                    {k.namaKategori}
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
                        name="sesiId"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name}>
                              Sesi Jadwal{" "}
                              <span className="text-red-500">*</span>
                            </FieldLabel>
                            <Select
                              name={field.name}
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={!selectedKategoriId}
                            >
                              <SelectTrigger
                                id={field.name}
                                aria-invalid={fieldState.invalid}
                                className="w-full"
                              >
                                <SelectValue placeholder="Pilih Sesi">
                                  {selectedSesi
                                    ? `${selectedSesi.namaSesi}${formatSessionTime(selectedSesi.waktuMulai)}`
                                    : undefined}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {filteredSesi.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.namaSesi}
                                    {formatSessionTime(s.waktuMulai)}
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
                        name="statusKehadiran"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name}>
                              Status Kehadiran
                            </FieldLabel>
                            <Select
                              name={field.name}
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger
                                id={field.name}
                                aria-invalid={fieldState.invalid}
                                className="w-full"
                              >
                                <SelectValue placeholder="Pilih Status">
                                  {selectedStatus && statusMap[selectedStatus]}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(statusMap).map(
                                  ([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                            {fieldState.invalid && (
                              <FieldError errors={[fieldState.error]} />
                            )}
                          </Field>
                        )}
                      />
                    </FieldGroup>
                  </FieldSet>
                )}

                {tipeLog === "PELANGGARAN" && (
                  <FieldSet>
                    <FieldLegend>Detail Pelanggaran</FieldLegend>
                    <FieldGroup>
                      <Controller
                        name="pelanggaranId"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name}>
                              Tingkat Pelanggaran{" "}
                              <span className="text-red-500">*</span>
                            </FieldLabel>
                            <Select
                              name={field.name}
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger
                                id={field.name}
                                aria-invalid={fieldState.invalid}
                                className="w-full border-red-300 bg-white"
                              >
                                <SelectValue placeholder="Pilih Tingkat Pelanggaran">
                                  {selectedPelanggaran
                                    ? `${selectedPelanggaran.namaPelanggaran} (${selectedPelanggaran.poinMinus} Poin)`
                                    : undefined}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {options?.pelanggaran.map((p) => (
                                  <SelectItem
                                    key={p.id}
                                    value={p.id}
                                    className="py-2"
                                  >
                                    {p.namaPelanggaran} ({p.poinMinus} Poin)
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
                    </FieldGroup>
                  </FieldSet>
                )}
              </div>

              {/* Kolom Kanan */}
              <div className="space-y-6">
                <FieldSet>
                  <FieldLegend>Detail Tambahan</FieldLegend>
                  <FieldGroup>
                    <Controller
                      name="tanggal"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            Tanggal Berlaku{" "}
                            <span className="text-red-500">*</span>
                          </FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            type="date"
                            aria-invalid={fieldState.invalid}
                            className="bg-muted/10 w-full"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name="poinOverride"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            Override Poin
                          </FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            type="number"
                            placeholder="Cth: -20"
                            aria-invalid={fieldState.invalid}
                            className="w-full"
                          />
                          <FieldDescription>
                            Kosongkan untuk gunakan nilai default.
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
                          <FieldLabel htmlFor={field.name}>
                            Keterangan / Kronologi
                            {/* Bintang merah dinamis muncul jika wajib */}
                            {isKeteranganWajib && (
                              <span className="ml-1 text-red-500">*</span>
                            )}
                          </FieldLabel>
                          <Textarea
                            {...field}
                            id={field.name}
                            // Placeholder dinamis
                            placeholder={
                              isKeteranganWajib
                                ? "Wajib diisi dengan alasan izin atau keterangan spesifik..."
                                : "Tulis alasan sakit atau kronologi pelanggaran secara detail di sini..."
                            }
                            aria-invalid={fieldState.invalid}
                            className="bg-muted/10 h-32 w-full resize-none"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </FieldSet>
              </div>
            </div>

            <div className="flex justify-end border-t pt-4 sm:pt-6">
              <Button
                type="button"
                variant="ghost"
                className="mr-3"
                onClick={() => setOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="px-8"
              >
                {mutation.isPending ? "Menyimpan..." : "Simpan Pencatatan"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
