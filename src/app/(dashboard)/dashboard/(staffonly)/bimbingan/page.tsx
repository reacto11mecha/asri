import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";
import { buttonVariants } from "~/components/ui/button";
import { LineChart, FolderOpen, ArrowRight } from "lucide-react";
import { cn } from "~/lib/utils";

export default function BimbinganIndexPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bimbingan & Evaluasi
        </h1>
        <p className="text-muted-foreground mt-2">
          Pilih modul manajemen bimbingan konseling (BK) yang ingin Anda akses.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* KARTU MENU MONITORING */}
        <Card className="hover:border-primary/50 flex flex-col justify-between transition-colors">
          <CardHeader>
            <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
              <LineChart className="text-primary h-6 w-6" />
            </div>
            <CardTitle>Monitoring Perkembangan</CardTitle>
            <CardDescription className="mt-2 text-sm">
              Lakukan evaluasi bulanan (Monev) untuk menilai aspek ADL, Sosial,
              Mental, dan Vokasional peserta didik.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/bimbingan/monitor"
              className={cn(
                buttonVariants({ variant: "default" }),
                "group w-full",
              )}
            >
              Buka Modul Monitoring
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </CardContent>
        </Card>

        {/* KARTU MENU KASUS */}
        <Card className="hover:border-primary/50 flex flex-col justify-between transition-colors">
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
              <FolderOpen className="h-6 w-6 text-emerald-600" />
            </div>
            <CardTitle>Penanganan Kasus</CardTitle>
            <CardDescription className="mt-2 text-sm">
              Catat, kelola, dan tindak lanjuti kasus khusus atau permasalahan
              yang dialami oleh peserta didik secara mendalam.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/bimbingan/kasus"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "group w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50",
              )}
            >
              Buka Modul Kasus
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
