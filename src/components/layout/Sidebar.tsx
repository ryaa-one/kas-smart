"use client";

import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

// Sidebar per role sesuai PRD:
// 8. Sidebar Kasir: Dashboard, Kasir, Hutang Pelanggan (lihat dan bayar),
//    Riwayat Transaksi, Profil Saya, Logout
// 9. Sidebar Owner: Dashboard, Kasir, Produk, ... (urutan PRD hal. 20-21)
const navByRole = {
  Owner: [
    { key: "dashboard", icon: "M4 5h6v6H4zM14 5h6v3h-6zM14 10h6v9h-6zM4 13h6v6H4zM14 15h6v4h-6z", href: "/dashboard" },
    { key: "kasir", icon: "M4 4h16v10H4zM9 18h6M12 14v4M8 21h8", href: "/kasir" },
    { key: "produk", icon: "M12 3l8 4v10l-8 4-8-4V7l8-4zM12 12l8-5M12 12L4 7M12 12v9", href: "/produk" },
    { key: "kategori", icon: "M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z", href: "/kategori" },
    { key: "supplier", icon: "M12 3a5 5 0 015 5c0 3-2 4-2 4h-6s-2-1-2-4a5 5 0 015-5zM5 15h14v5H5z", href: "/supplier" },
    { key: "pembelian", icon: "M6 4h12v3H6zM4 7h16l1 4H3l1-4zM4 11h16v9H4zM9 14h6", href: "/pembelian" },
    { key: "hutangPelanggan", icon: "M8 3l4 4 4-4 3 3-7 7-7-7 3-3zM12 17v4M8 19h8", href: "/hutang-pelanggan" },
    { key: "penyesuaianStok", icon: "M4 7h10M4 12h16M4 17h10M18 5v6M15 8h6", href: "/penyesuaian-stok" },
    { key: "riwayatPenjualan", icon: "M12 4v8l5 3M12 21a9 9 0 110-18 9 9 0 010 18z", href: "/riwayat-penjualan" },
    { key: "laporan", icon: "M5 21V8M12 21V3M19 21v-9", href: "/laporan" },
    { key: "informasiToko", icon: "M12 3a6 6 0 016 6c0 4-3 6-3 8h-6c0-2-3-4-3-8a6 6 0 016-6zM9 21h6", href: "/informasi-toko" },
    { key: "logAktivitas", icon: "M4 12a8 8 0 0116 0M12 8v4l3 2M3 12h2M19 12h2", href: "/log-aktivitas" },
    { key: "profilSaya", icon: "M12 3a5 5 0 015 5c0 3-2 4-2 4H9s-2-1-2-4a5 5 0 015-5zM5 21h14", href: "/profil-saya" },
  ],
  Kasir: [
    { key: "dashboard", icon: "M4 5h6v6H4zM14 5h6v3h-6zM14 10h6v9h-6zM4 13h6v6H4zM14 15h6v4h-6z", href: "/kasir/dashboard" },
    { key: "kasir", icon: "M4 4h16v10H4zM9 18h6M12 14v4M8 21h8", href: "/kasir/transaksi" },
    { key: "hutangPelanggan", icon: "M8 3l4 4 4-4 3 3-7 7-7-7 3-3zM12 17v4M8 19h8", href: "/kasir/hutang-pelanggan" },
    { key: "riwayatTransaksi", icon: "M12 4v8l5 3M12 21a9 9 0 110-18 9 9 0 010 18z", href: "/kasir/riwayat-transaksi" },
    { key: "profilSaya", icon: "M12 3a5 5 0 015 5c0 3-2 4-2 4H9s-2-1-2-4a5 5 0 015-5zM5 21h14", href: "/kasir/profil-saya" },
  ],
} as const;

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const role = user?.role ?? "Owner";
  const items = navByRole[role];
  const roleLabel = role === "Owner" ? t.common.roleOwner : t.common.roleKasir;

  const handleLogout = () => {
    // UC-02 Logout — backend nanti: panggil API + catat ACTIVITY_LOGS.logout.
    logout();
    window.location.href = "/login";
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 h-screen w-64 shrink-0 bg-white border-r border-line flex flex-col z-40
          transition-transform duration-200 lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="px-5 py-5 border-b border-line flex items-center justify-between">
          <Logo />
          <button
            className="lg:hidden text-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {items.map((item) => {
            const label = t.nav[item.key as keyof typeof t.nav];
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <a
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-zinc-50 hover:text-foreground"
                }`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2 : 1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={item.icon} />
                </svg>
                {label}
              </a>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-line space-y-3">
          <LanguageSwitcher />
          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-primary/10`}>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
              {(user?.name ?? "O").charAt(0).toUpperCase()}
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name ?? "-"}</p>
              <p className="text-[11px] opacity-80">{roleLabel}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-red-50 transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            {t.common.logout}
          </button>
        </div>
      </aside>
    </>
  );
}
