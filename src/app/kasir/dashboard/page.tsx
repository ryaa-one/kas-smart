"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { formatRupiah, formatDateTime } from "@/lib/format";
import type { KasirDashboardData } from "@/lib/dashboard-api";

// Dashboard Kasir (PRD FR-02): Penjualan Hari Ini, Jumlah Transaksi Hari Ini,
// Shortcut Mulai Transaksi, Aktivitas Hari Ini.
// Terintegrasi penuh dengan backend database (GET /api/dashboard).
export default function KasirDashboardPage() {
  const { t } = useLang();

  const [dashboard, setDashboard] = useState<KasirDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadKasirDashboard() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) return;
        const json = await res.json();
        if (active && json?.data?.role === "Kasir") {
          setDashboard(json.data);
        }
      } catch (err) {
        console.error("Gagal memuat dashboard kasir:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadKasirDashboard();
    return () => {
      active = false;
    };
  }, []);

  const salesToday = dashboard?.stats?.salesToday ?? 0;
  const countToday = dashboard?.stats?.countToday ?? 0;
  const activities = dashboard?.activities ?? [];

  return (
    <DashboardLayout title={t.kasirDashboard.title} subtitle={t.kasirDashboard.subtitle}>
      {/* Stat Hari Ini (PRD 2a, 2b) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v10H4zM9 18h6M12 14v4M8 21h8" /></svg>}
          label={t.kasirDashboard.statSalesToday}
          value={formatRupiah(salesToday)}
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v8l5 3M12 21a9 9 0 110-18 9 9 0 010 18z" /></svg>}
          label={t.kasirDashboard.statTransactions}
          value={`${countToday} ${t.kasirDashboard.transactions}`}
          bgColor="bg-blue-600/10"
          iconColor="text-blue-600"
        />
      </div>

      {/* Shortcut Mulai Transaksi (PRD 2c) */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16v10H4zM9 18h6M12 14v4M8 21h8" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              {t.kasirDashboard.shortcutTitle}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {t.kasirDashboard.shortcutSubtitle}
            </p>
          </div>
          <a
            href="/kasir/transaksi"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t.kasirDashboard.shortcutButton}
          </a>
        </div>
      </Card>

      {/* Aktivitas Hari Ini (PRD 2d) */}
      <Card>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            {t.kasirDashboard.activityTitle}
          </h3>
          <p className="text-xs text-muted mt-0.5">
            {t.kasirDashboard.activitySubtitle}
          </p>
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-muted">{t.kasirDashboard.noActivity}</p>
        ) : (
          <div className="space-y-2.5">
            {activities.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-zinc-50 border border-line"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {a.action_label}
                  </p>
                  <p className="text-xs text-muted truncate">{a.description}</p>
                </div>
                <span className="text-xs text-muted whitespace-nowrap shrink-0">
                  {formatDateTime(a.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
