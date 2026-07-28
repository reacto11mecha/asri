// src/app/(dashboard)/dashboard/(staffonly)/bimbingan/kasus/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button, buttonVariants } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import {
  Plus,
  Search,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "~/lib/utils";

export default function KasusListPage() {
  const [statusFilter, setStatusFilter] = useState<
    "semua" | "aktif" | "selesai"
  >("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = api.bimbingan.getDaftarKasus.useQuery({
    status: statusFilter,
    search: searchQuery || undefined,
    page,
    limit,
  });

  const statusLabel =
    statusFilter === "semua"
      ? "Semua"
      : statusFilter === "aktif"
        ? "Aktif"
        : "Selesai";
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Penanganan Kasus
          </h1>
          <p className="text-muted-foreground">
            Daftar seluruh kasus anak yang sedang atau telah ditangani.
          </p>
        </div>
        {/* Tombol Buka Kasus Baru menggunakan buttonVariants */}
        <Link
          href="/dashboard/bimbingan/kasus/tambah"
          className={cn(buttonVariants(), "gap-2")}
        >
          <Plus className="h-4 w-4" data-icon="inline-start" />
          Buka Kasus Baru
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Cari nama peserta..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val as typeof statusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              {/* Tampilkan label kapital */}
              <SelectValue>{statusLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua</SelectItem>
              <SelectItem value="aktif">Aktif</SelectItem>
              <SelectItem value="selesai">Selesai</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabel */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 py-3">Tanggal Buka</TableHead>
                <TableHead className="px-6 py-3">Nama Peserta</TableHead>
                <TableHead className="px-6 py-3">Masalah Utama</TableHead>
                <TableHead className="px-6 py-3">Wali Asuh</TableHead>
                <TableHead className="px-6 py-3">Status</TableHead>
                <TableHead className="px-6 py-3 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 px-6 text-center">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 px-6 text-center">
                    Tidak ada kasus ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((kasus) => (
                  <TableRow key={kasus.id}>
                    <TableCell className="text-muted-foreground px-6 py-3 whitespace-nowrap">
                      {format(new Date(kasus.tanggalBuka), "dd MMM yyyy", {
                        locale: localeId,
                      })}
                    </TableCell>
                    <TableCell className="px-6 py-3 font-medium">
                      {kasus.namaPeserta}
                      <div className="text-muted-foreground text-xs">
                        Kelas {kasus.tingkatKelas} {kasus.namaKelas}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate px-6 py-3">
                      {kasus.masalahUtama || "-"}
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      {kasus.namaWaliAsuh || "Belum Ditugaskan"}
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <Badge
                        variant={
                          kasus.tanggalTutup ? "secondary" : "destructive"
                        }
                        className={
                          kasus.tanggalTutup
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                            : ""
                        }
                      >
                        {kasus.tanggalTutup ? "Selesai" : "Aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-3 text-right">
                      <Link
                        href={`/dashboard/bimbingan/kasus/${kasus.id}`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "sm" }),
                          "gap-2",
                        )}
                      >
                        <FolderOpen
                          className="h-4 w-4"
                          data-icon="inline-start"
                        />
                        Kelola
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Menampilkan {data?.data.length ?? 0} dari {data?.totalCount ?? 0}{" "}
            kasus
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" data-icon="inline-start" />
              Sebelumnya
            </Button>
            <span className="text-sm">
              Halaman {page} dari {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Selanjutnya
              <ChevronRight className="h-4 w-4" data-icon="inline-end" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
