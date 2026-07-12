"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { type RouterOutputs } from "~/trpc/react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import Link from "next/link";
import { Trash2, MoreHorizontal, Edit } from "lucide-react";
import { Button } from "~/components/ui/button";

type Peserta = RouterOutputs["peserta"]["getAll"][number];
type WaliAsuh = RouterOutputs["peserta"]["getWaliAsuh"][number];

interface GetColumnsProps {
  daftarWali: WaliAsuh[];
  loadWali: boolean;
  isAssigningWali: boolean;
  onAssignWali: (pesertaId: string, waliAsuhId: string | null) => void;
  onDelete: (id: string) => void;
}

export const getPesertaColumns = ({
  daftarWali,
  loadWali,
  isAssigningWali,
  onAssignWali,
  onDelete,
}: GetColumnsProps): ColumnDef<Peserta>[] => [
  {
    id: "actions",
    cell: ({ row }) => {
      const peserta = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Buka menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Aksi</DropdownMenuLabel>
              {/* Tombol Edit me-routing ke halaman khusus */}
              <DropdownMenuItem
                render={
                  <Link href={`/dashboard/peserta/edit/${peserta.id}`}>
                    <Edit className="mr-2 h-4 w-4 text-blue-600" /> Edit Data
                  </Link>
                }
              />
              <DropdownMenuItem
                onClick={() => onDelete(peserta.id)}
                className="text-red-600 focus:bg-red-50 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Hapus
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  {
    accessorKey: "nipd",
    header: "NIPD",
    cell: ({ row }) => <span className="font-mono">{row.original.nipd}</span>,
  },
  { accessorKey: "namaLengkap", header: "Nama Lengkap" },
  {
    accessorKey: "kelas",
    header: "Kelas",
    cell: ({ row }) => (
      <span className="font-mono">
        {`${row.original.kelas.jenjang} | ${row.original.kelas.tingkat} | ${row.original.kelas.namaKelas}`}
      </span>
    ),
  },
  {
    id: "waliAsuh",
    header: "Wali Asuh",
    cell: ({ row }) => {
      const anak = row.original;
      const currentWaliId = anak.waliAsuhId || "unassigned";
      const selectedWali =
        daftarWali.find((w) => w.id === currentWaliId) || anak.waliAsuh;

      return (
        <div className="w-32">
          <Select
            disabled={isAssigningWali}
            defaultValue={currentWaliId}
            onValueChange={(val) => onAssignWali(anak.id, val)}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder={loadWali ? "Memuat..." : "Pilih Wali"}>
                {currentWaliId !== "unassigned" && selectedWali ? (
                  <div className="flex items-center gap-2 text-left">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={selectedWali.image || ""} />
                      <AvatarFallback>
                        {selectedWali.name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-32.5 truncate font-medium">
                      {selectedWali.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    Belum ditugaskan
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="unassigned"
                className="text-muted-foreground py-2 text-xs"
              >
                -- Belum ditugaskan --
              </SelectItem>
              {daftarWali.map((w) => (
                <SelectItem key={w.id} value={w.id} className="py-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={w.image || ""} />
                      <AvatarFallback>
                        {w.name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-left">
                      <span className="mb-1 text-sm leading-none font-medium">
                        {w.name}
                      </span>
                      <span className="text-muted-foreground text-[10px] leading-none">
                        {w.email}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
        {row.original.status}
      </span>
    ),
  },
  { accessorKey: "nisn", header: "NISN" },
  { accessorKey: "jenisKelamin", header: "L/P" },
  { accessorKey: "tempatLahir", header: "Tempat Lahir" },
  { accessorKey: "tanggalLahir", header: "Tanggal Lahir" },
  { accessorKey: "agama", header: "Agama" },
  { accessorKey: "alamat", header: "Alamat" },
  { accessorKey: "noTelp", header: "No. Telp" },
  { accessorKey: "namaIbu", header: "Nama Ibu" },
  { accessorKey: "namaAyah", header: "Nama Ayah" },
];
