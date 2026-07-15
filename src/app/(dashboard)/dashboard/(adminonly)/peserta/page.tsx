import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { KelasTable } from "~/_components/kelas/kelas-table";
import { PesertaTable } from "~/_components/peserta/peserta-table";

export default function ManajemenAkademikPage() {
  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Manajemen Akademik
        </h2>
        <p className="text-muted-foreground">
          Kelola data kelas operasional dan peserta didik Sekolah Rakyat.
        </p>
      </div>

      {/* Tabs Container */}
      <Tabs defaultValue="peserta" className="flex h-full w-full flex-col">
        <TabsList className="grid w-full max-w-100 grid-cols-2">
          <TabsTrigger value="peserta">Data Peserta</TabsTrigger>
          <TabsTrigger value="kelas">Data Kelas</TabsTrigger>
        </TabsList>

        {/* Tambahkan h-full dan overflow-hidden agar konten tidak meluap */}
        <TabsContent value="peserta" className="h-full overflow-hidden">
          <PesertaTable />
        </TabsContent>
        <TabsContent value="kelas" className="h-full overflow-hidden">
          <KelasTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
