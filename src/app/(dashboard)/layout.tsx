import { UserNav } from "~/_components/layout/user-nav";
import { Sidebar } from "~/_components/layout/sidebar";
import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { Menu } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getSession();

  if (!auth) redirect("/login");

  return (
    <div className="bg-background flex min-h-screen w-full">
      {/* SIDEBAR DESKTOP (Sembunyi di layar kecil) */}
      <aside className="bg-muted/20 hidden w-64 flex-col border-r md:flex">
        <Sidebar />
      </aside>

      {/* AREA KONTEN KANAN */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* HEADER ATAS */}
        <header className="flex h-14 items-center justify-between border-b px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {/* HAMBURGER MENU MOBILE */}
            {/* Hanya muncul di layar kecil (md:hidden) */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger render={<Button variant="ghost" size="icon" />}>
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
                  <Sidebar />
                </SheetContent>
              </Sheet>
            </div>

            <h2 className="hidden text-lg font-semibold sm:block">
              Sistem Presensi
            </h2>
          </div>

          {/* PROFIL KANAN ATAS */}
          <div className="flex items-center gap-4">
            <UserNav />
          </div>
        </header>

        {/* KONTEN HALAMAN EKSKLUSIF */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
