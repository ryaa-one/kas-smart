"use client";

import { useMemo } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { useAuth } from "@/lib/auth";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { useDb, isSaleCompleted, activityLabelAction } from "@/lib/mock/db";

// Dashboard Kasir (PRD FR-02): Penjualan Hari Ini, Jumlah Transaksi Hari Ini,
// Shortcut Mulai Transaksi, Aktivitas Hari Ini.
// ponytail: "hari ini" = tanggal terakhir di mock — ganti filter DATE(now) saat backend ada.
export default function KasirDashboardPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const db = useDb(); // store bersama: transaksi & log milik kasir login

  // PRD FR-02 (Kasir): statistik hanya dari SALES_TRANSACTIONS milik user login
  // (user_id session — bukan nama hardcoded, H-3).
  const { salesToday, countToday } = useMemo(() => {
  const mine = db.sales.filter((s) => s.user_id === user?.id && isSaleCompleted(s));
  const latestDate = mine.reduce(
  (max, s) => (s.transaction_date > max ? s.transaction_date : max),
  ""
  );
  const todaySales = mine.filter(
  (s) => s.transaction_date.slice(0, 10) === latestDate.slice(0, 10)
  );
  return {
  salesToday: todaySales.reduce((sum, s) => sum + s.total, 0),
  countToday: todaySales.length,
  };
  }, [db.sales, user]);

  const activities = useMemo(
  () => db.logs.filter((l) => l.user_id === user?.id).slice(0, 8),
  [db.logs, user]
  );

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
                    {activityLabelAction(db, a.action)}
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
