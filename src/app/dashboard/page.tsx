"use client";

import { useMemo, useState, useEffect } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { BarChart } from "@/components/dashboard/BarChart";
import { DASHBOARD_CHARTS_CONFIG, type DashboardChartPoint } from "@/components/dashboard/chart-config";
import type { PurchaseData } from "@/lib/purchase-api";
import type { OwnerDashboardData } from "@/lib/dashboard-api";

export default function DashboardPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState<OwnerDashboardData | null>(null);
  const [, setLoading] = useState(true);

  // Data pembelian dari backend database (/api/purchases) khusus untuk Grafik Pembelian (Tahap 12)
  const [backendPurchases, setBackendPurchases] = useState<PurchaseData[]>([]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) return;
        const json = await res.json();
        if (active && json?.data?.role === "Owner") {
          setDashboard(json.data);
        }
      } catch (err) {
        console.error("Gagal memuat dashboard:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadBackendPurchases() {
      try {
        const res = await fetch("/api/purchases");
        if (!res.ok) return;
        const json = await res.json();
        if (active && json?.data?.purchases && Array.isArray(json.data.purchases)) {
          setBackendPurchases(json.data.purchases);
        }
      } catch (err) {
        console.error("Gagal memuat data pembelian dari backend:", err);
      }
    }
    loadBackendPurchases();
    return () => {
      active = false;
    };
  }, []);

  // Agregasi mingguan (Senin–Minggu) data pembelian dari backend database untuk Grafik Pembelian
  const backendPurchaseChart = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    const dow = (now.getDay() + 6) % 7; // 0 = Senin
    monday.setDate(now.getDate() - dow);
    monday.setHours(0, 0, 0, 0);

    const buckets = Array.from({ length: 7 }, () => 0);
    const inWeek = (iso: string) => {
      const d = new Date(iso);
      const diff = Math.floor((d.getTime() - monday.getTime()) / 86400000);
      return diff >= 0 && diff < 7 ? diff : -1;
    };

    for (const p of backendPurchases) {
      const i = inWeek(p.purchase_date);
      if (i >= 0) {
        const total =
          typeof p.total === "number"
            ? p.total
            : p.details?.reduce((sum, d) => sum + d.quantity * d.unit_purchase_price, 0) ?? 0;
        buckets[i] += total;
      }
    }

    const points: DashboardChartPoint[] = buckets.map((total, i) => ({
      day: t.dashboard.weekDays[i] ?? `H${i + 1}`,
      value: Number((total / 1e6).toFixed(2)),
      rawAmount: total,
    }));
    return points;
  }, [backendPurchases, t.dashboard.weekDays]);

  const stats = dashboard?.stats ?? {
    salesToday: 0,
    profitToday: 0,
    cashToday: 0,
    qrisToday: 0,
    totalProducts: 0,
    totalSuppliers: 0,
    totalCashiers: 0,
    totalDebt: 0,
  };

  const salesList = dashboard?.charts?.sales;
  const profitList = dashboard?.charts?.profit;
  const weekDays = t.dashboard.weekDays;

  const salesChart = useMemo(() => {
    if (!salesList) return [];
    return salesList.map((pt, i) => ({
      ...pt,
      day: weekDays[i] ?? pt.day,
    }));
  }, [salesList, weekDays]);

  const profitChart = useMemo(() => {
    if (!profitList) return [];
    return profitList.map((pt, i) => ({
      ...pt,
      day: weekDays[i] ?? pt.day,
    }));
  }, [profitList, weekDays]);

  const lowStock = dashboard?.lowStock ?? [];
  const activities = dashboard?.activities ?? [];

  return (
    <DashboardLayout title={t.dashboard.title} subtitle={t.dashboard.subtitle}>
      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>}
          label={t.dashboard.statCashToday}
          value={fmt(stats.cashToday)}
          bgColor="bg-emerald-600/10"
          iconColor="text-emerald-600"
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01"/></svg>}
          label={t.dashboard.statQrisToday}
          value={fmt(stats.qrisToday)}
          bgColor="bg-indigo-600/10"
          iconColor="text-indigo-600"
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

      {/* Charts Row (Recharts BarChart dengan config terpisah) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-foreground mb-4">{t.dashboard.salesChartTitle}</h3>
          <BarChart
            data={salesChart}
            color={DASHBOARD_CHARTS_CONFIG.sales.color}
            unit={DASHBOARD_CHARTS_CONFIG.sales.unit}
            height={DASHBOARD_CHARTS_CONFIG.sales.height}
          />
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-foreground mb-4">{t.dashboard.profitChartTitle}</h3>
          <BarChart
            data={profitChart}
            color={DASHBOARD_CHARTS_CONFIG.profit.color}
            unit={DASHBOARD_CHARTS_CONFIG.profit.unit}
            height={DASHBOARD_CHARTS_CONFIG.profit.height}
          />
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-foreground mb-4">{t.dashboard.purchaseChartTitle}</h3>
          <BarChart
            data={backendPurchaseChart}
            color={DASHBOARD_CHARTS_CONFIG.purchase.color}
            unit={DASHBOARD_CHARTS_CONFIG.purchase.unit}
            height={DASHBOARD_CHARTS_CONFIG.purchase.height}
          />
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
          {activities.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">{t.kasirDashboard.noActivity}</p>
          ) : (
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
                      {a.action_label}
                    </p>
                    <p className="text-xs text-muted">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
