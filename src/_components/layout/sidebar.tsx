"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  ScrollText,
  QrCode,
} from "lucide-react";
import { cn } from "~/lib/utils";

export function Sidebar({
  role,
}: {
  role: "SUPERADMIN" | "STAFF" | "SUPPORTER";
}) {
  const pathname = usePathname();

  const mainMenus =
    role === "SUPERADMIN"
      ? [
          { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          {
            name: "Aktivitas Absensi",
            href: "/dashboard/aktivitas",
            icon: ScrollText,
          },
          { name: "Rekap Laporan", href: "/dashboard/rekap", icon: FileText },
          { name: "Data Peserta", href: "/dashboard/peserta", icon: Users },
          {
            name: "Pengaturan Sistem",
            href: "/dashboard/pengaturan",
            icon: Settings,
          },
        ]
      : role === "STAFF"
        ? [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            {
              name: "Aktivitas Absensi",
              href: "/dashboard/aktivitas",
              icon: ScrollText,
            },
            { name: "Rekap Laporan", href: "/dashboard/rekap", icon: FileText },
            { name: "Data Peserta", href: "/dashboard/peserta", icon: Users },
          ]
        : [
            {
              name: "Aktivitas Absensi",
              href: "/dashboard/aktivitas",
              icon: ScrollText,
            },
          ];

  const scannerMenu = { name: "Scanner", href: "/scanner", icon: QrCode };

  const isMenuActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="bg-muted/20 flex h-full flex-col border-r">
      <div className="flex h-14 items-center border-b px-4 lg:px-6">
        <Link
          href="/dashboard"
          className="text-primary flex items-center gap-2 font-bold"
        >
          <span className="text-lg tracking-tight">Sistem Presensi</span>
        </Link>
      </div>

      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start gap-1 px-2 text-sm font-medium lg:px-4">
          {mainMenus.map((menu) => {
            const Icon = menu.icon;
            const isActive = isMenuActive(menu.href);

            return (
              <Link
                key={menu.href}
                href={menu.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {menu.name}
              </Link>
            );
          })}
        </nav>

        {/* Separator dan Scanner di bawah menu utama */}
        <div className="mt-4 px-2 lg:px-4">
          <div className="mb-2 border-t" />
          <Link
            href={scannerMenu.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all",
              isMenuActive(scannerMenu.href)
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-200 hover:bg-emerald-700"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
            )}
          >
            <QrCode className="h-4 w-4" />
            {scannerMenu.name}
          </Link>
        </div>
      </div>
    </div>
  );
}
