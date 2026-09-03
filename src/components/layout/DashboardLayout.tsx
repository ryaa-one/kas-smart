"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/LanguageContext";

interface Props {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

// Layout halaman dalam (sidebar+topbar). Punya guard sendiri:
// - belum login -> redirect /login
// - role tidak sesuai area -> tampil 403 (Kasir tidak bisa buka halaman Owner via URL)
// /kasir dan /kasir/* bisa diakses Owner maupun Kasir (PRD: Owner boleh transaksi).
export function DashboardLayout({ children, title, subtitle }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, hydrated } = useAuth();
  const { t } = useLang();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !user) window.location.href = "/login";
  }, [hydrated, user]);

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted">
        {t.common.loading}
      </div>
    );
  }

  const isKasirArea = pathname === "/kasir" || pathname.startsWith("/kasir/");
  const allowed = isKasirArea ? true : user.role === "Owner";

  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-lg font-bold text-danger">403</p>
        <p className="text-sm text-muted">{t.common.forbidden}</p>
        <a
          href={user.role === "Kasir" ? "/kasir/dashboard" : "/dashboard"}
          className="mt-2 text-sm font-medium text-primary underline underline-offset-4"
        >
          {t.common.backToMyHome}
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
