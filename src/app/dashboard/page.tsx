"use client";

import { useMemo } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { BarChart } from "@/components/dashboard/BarChart";
import { useDb, isSaleCompleted, cashierUsers, activityLabelAction } from "@/lib/mock/db";
import type { ChartPoint } from "@/lib/mock/dashboard";

// FR-01: ringkasan penjualan, profit, stok, hutang, grafik, aktivitas —
// semuanya DIHITUNG dari store bersama (C-3), bukan mock statis per halaman.
// "Hari ini" = tanggal transaksi terbaru di store (ponytail: ganti DATE(now) saat backend).
export default function DashboardPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const db = useDb();

  const fmt = (n: number) =>
    new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  const today = useMemo(() => {
    const completed = db.sales.filter(isSaleCompleted);
    const latest = completed.reduce(
      (max, s) => (s.transaction_date > max ? s.transaction_date : max),
      ""
    );
    const day = latest.slice(0, 10);
    const todays = completed.filter((s) => s.transaction_date.slice(0, 10) === day);
    const salesToday = todays.reduce((sum, s) => sum + s.total, 0);
    // Profit = penjualan - HPP (unit_purchase_price produk terkait).
    const cogs = todays.reduce(
      (sum, s) =>
        sum +
        s.details.reduce((acc, d) => {
          const p = db.products.find((x) => x.id === d.product_id);
          return acc + d.quantity * (p?.purchase_price ?? 0);
        }, 0),
      0
    );
    return { salesToday, profitToday: salesToday - cogs };
  }, [db.sales, db.products]);

  const stats = {
    salesToday: today.salesToday,
    profitToday: today.profitToday,
    totalProducts: db.products.filter((p) => p.is_active).length,
    totalSuppliers: db.suppliers.length,
    totalCashiers: cashierUsers().length,
    totalDebt: db.debts.reduce((s, d) => s + d.remaining_debt, 0),
  };

  // Grafik mingguan (Senin–Minggu minggu berjalan) dari transaksi selesai.
  const weekAgg = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    const dow = (now.getDay() + 6) % 7; // 0 = Senin
    monday.setDate(now.getDate() - dow);
    monday.setHours(0, 0, 0, 0);
    const buckets = Array.from({ length: 7 }, () => ({ sales: 0, purchase: 0 }));
    const inWeek = (iso: string) => {
      const d = new Date(iso);
      const diff = Math.floor((d.getTime() - monday.getTime()) / 86400000);
      return diff >= 0 && diff < 7 ? diff : -1;
    };
    for (const s of db.sales.filter(isSaleCompleted)) {
      const i = inWeek(s.transaction_date);
      if (i >= 0) buckets[i].sales += s.total;
    }
    for (const p of db.purchases) {
      const i = inWeek(p.purchase_date);
      if (i >= 0) buckets[i].purchase += p.details.reduce((x, d) => x + d.quantity * d.unit_purchase_price, 0);
    }
    const salesChart: ChartPoint[] = buckets.map((b) => ({ label: "", value: b.sales / 1e6 }));
    const purchaseChart: ChartPoint[] = buckets.map((b) => ({ label: "", value: b.purchase / 1e6 }));
    const profitChart: ChartPoint[] = buckets.map((b) => ({ label: "", value: (b.sales - b.purchase) / 1e6 }));
    return { salesChart, profitChart, purchaseChart };
  }, [db.sales, db.purchases]);

  // Stok menipis dari PRODUCTS store (stok <= minimum_stock, aktif).
  const lowStock = useMemo(
    () =>
      db.products
        .filter((p) => p.is_active && p.stock <= p.minimum_stock)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          name: p.name,
          category: db.categories.find((c) => c.id === p.category_id)?.name ?? "-",
          stock: p.stock,
          minimumStock: p.minimum_stock,
        })),
    [db.products, db.categories]
  );

  // Aktivitas terbaru dari ACTIVITY_LOGS store.
  const activities = db.logs.slice(0, 8);

  return (
    <DashboardLayout title={t.dashboard.title} subtitle={t.dashboard.subtitle}>
      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v10H4zM9 18h6M12 14v4"/></svg>}
          label={t.dashboard.statSalesToday}
          value={fmt(stats.salesToday)}
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V8M12 21V3M19 21v-9"/></svg>}
          label={t.dashboard.statProfitToday}
          value={fmt(stats.profitToday)}
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 4v10l-8 4-8-4V7l8-4zM12 12l8-5M12 12L4 7M12 12v9"/></svg>}
          label={t.dashboard.statProducts}
          value={stats.totalProducts}
          bgColor="bg-blue-600/10"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a5 5 0 015 5c0 3-2 4-2 4H9s-2-1-2-4a5 5 0 015-5zM5 15h14v5H5z"/></svg>}
          label={t.dashboard.statSuppliers}
          value={stats.totalSuppliers}
          bgColor="bg-amber-600/10"
          iconColor="text-amber-600"
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a5 5 0 015 5c0 3-2 4-2 4H9s-2-1-2-4a5 5 0 015-5zM5 21h14"/></svg>}
          label={t.dashboard.statCashiers}
          value={stats.totalCashiers}
          bgColor="bg-purple-600/10"
          iconColor="text-purple-600"
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3l4 4 4-4 3 3-7 7-7-7 3-3zM12 17v4M8 19h8"/></svg>}
          label={t.dashboard.statCustomerDebt}
          value={fmt(stats.totalDebt)}
          bgColor="bg-rose-600/10"
          iconColor="text-rose-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-foreground mb-4">{t.dashboard.salesChartTitle}</h3>
          <BarChart data={weekAgg.salesChart} color="bg-primary" />
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-foreground mb-4">{t.dashboard.profitChartTitle}</h3>
          <BarChart data={weekAgg.profitChart} color="bg-success" />
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-foreground mb-4">{t.dashboard.purchaseChartTitle}</h3>
          <BarChart data={weekAgg.purchaseChart} color="bg-amber-500" />
        </Card>
      </div>

      {/* Low Stock + Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Low Stock */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t.dashboard.lowStockTitle}</h3>
              <p className="text-xs text-muted mt-0.5">{t.dashboard.lowStockSubtitle}</p>
            </div>
            <span className="text-xs font-medium text-warning bg-warning/10 px-2.5 py-1 rounded-full">
              {lowStock.length} {t.common.items}
            </span>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">{t.dashboard.noLowStock}</p>
          ) : (
            <div className="space-y-2.5">
              {lowStock.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-50 border border-line"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted">{p.category}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold text-warning">
                      {p.stock}/{p.minimumStock}
                    </p>
                    <p className="text-[10px] text-muted">{t.dashboard.lowStock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t.dashboard.recentActivityTitle}</h3>
              <p className="text-xs text-muted mt-0.5">{t.dashboard.recentActivitySubtitle}</p>
            </div>
            <a
              href="/log-aktivitas"
              className="text-xs font-medium text-primary hover:text-primary/80"
            >
              {t.dashboard.viewAllActivity}
            </a>
          </div>
          <div className="space-y-1.5">
            {activities.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    a.user_name === user?.name && user?.role === "Owner"
                      ? "bg-primary text-white"
                      : "bg-zinc-500/10 text-zinc-600"
                  }`}
                >
                  {a.user_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{a.user_name}</span>{" "}
                    {activityLabelAction(db, a.action)}
                  </p>
                  <p className="text-xs text-muted">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
