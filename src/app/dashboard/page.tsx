"use client";

import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { BarChart } from "@/components/dashboard/BarChart";
import {
  mockStats,
  mockLowStock,
  mockActivities,
  mockSalesChart,
  mockProfitChart,
  mockPurchaseChart,
} from "@/lib/mock/dashboard";

export default function DashboardPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();

  const fmt = (n: number) =>
    new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  const activityActionLabel = (action: string) => {
    const key = action as keyof typeof t.activity;
    return (t.activity as any)[key] || action;
  };

  return (
    <DashboardLayout title={t.dashboard.title} subtitle={t.dashboard.subtitle}>
      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v10H4zM9 18h6M12 14v4"/></svg>}
          label={t.dashboard.statSalesToday}
          value={fmt(mockStats.salesToday)}
          trend={{ value: "+12%", positive: true }}
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V8M12 21V3M19 21v-9"/></svg>}
          label={t.dashboard.statProfitToday}
          value={fmt(mockStats.profitToday)}
          trend={{ value: "+8%", positive: true }}
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 4v10l-8 4-8-4V7l8-4zM12 12l8-5M12 12L4 7M12 12v9"/></svg>}
          label={t.dashboard.statProducts}
          value={mockStats.totalProducts}
          bgColor="bg-blue-600/10"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a5 5 0 015 5c0 3-2 4-2 4H9s-2-1-2-4a5 5 0 015-5zM5 15h14v5H5z"/></svg>}
          label={t.dashboard.statSuppliers}
          value={mockStats.totalSuppliers}
          bgColor="bg-amber-600/10"
          iconColor="text-amber-600"
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a5 5 0 015 5c0 3-2 4-2 4H9s-2-1-2-4a5 5 0 015-5zM5 21h14"/></svg>}
          label={t.dashboard.statCashiers}
          value={mockStats.totalCashiers}
          bgColor="bg-purple-600/10"
          iconColor="text-purple-600"
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3l4 4 4-4 3 3-7 7-7-7 3-3zM12 17v4M8 19h8"/></svg>}
          label={t.dashboard.statCustomerDebt}
          value={fmt(mockStats.totalDebt)}
          trend={{ value: "-5%", positive: true }}
          bgColor="bg-rose-600/10"
          iconColor="text-rose-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-foreground mb-4">{t.dashboard.salesChartTitle}</h3>
          <BarChart data={mockSalesChart} color="bg-primary" />
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-foreground mb-4">{t.dashboard.profitChartTitle}</h3>
          <BarChart data={mockProfitChart} color="bg-success" />
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-foreground mb-4">{t.dashboard.purchaseChartTitle}</h3>
          <BarChart data={mockPurchaseChart} color="bg-amber-500" />
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
              {mockLowStock.length} {t.common.items}
            </span>
          </div>
          <div className="space-y-2.5">
            {mockLowStock.map((p) => (
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
        </Card>

        {/* Recent Activity */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t.dashboard.recentActivityTitle}</h3>
              <p className="text-xs text-muted mt-0.5">{t.dashboard.recentActivitySubtitle}</p>
            </div>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-xs font-medium text-primary hover:text-primary/80"
            >
              {t.dashboard.viewAllActivity}
            </a>
          </div>
          <div className="space-y-1.5">
            {mockActivities.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    a.role === "Owner"
                      ? "bg-primary text-white"
                      : "bg-zinc-500/10 text-zinc-600"
                  }`}
                >
                  {a.actorInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{a.actor}</span>{" "}
                    {activityActionLabel(a.action)}
                  </p>
                  <p className="text-xs text-muted">{a.time}</p>
                </div>
                <Badge
                  variant={a.role === "Owner" ? "primary" : "muted"}
                >
                  {a.role}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}