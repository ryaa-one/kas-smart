"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Select } from "@/components/ui/Select";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { cashierUsers, cashierStats, useDb, type Sale } from "@/lib/mock/db";

// FR-18 / UC-22 / Activity Diagram 20 / DFD 7.3 — Statistik Kasir (Owner only,
// guard via DashboardLayout karena route di luar /kasir/* dan /transaksi).
// Sumber: store bersama — hanya transaksi selesai (paid/debt) milik kasir terpilih.
export default function StatistikKasirPage() {
  const { t } = useLang();
  const db = useDb(); // subscribe: statistik ikut berubah saat transaksi baru masuk
  const p = t.statistikKasir;

  const kasirs = useMemo(() => cashierUsers(), [db.sales.length]);
  const [userId, setUserId] = useState<string>(kasirs[0]?.id ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const stats = useMemo(
    () => (userId ? cashierStats(userId, from, to) : { sales: [] as Sale[], txCount: 0, totalSales: 0, income: 0 }),
    [userId, from, to, db.sales, db.debts]
  );

  const methodLabel = (m: Sale["payment_method"]) =>
    m === "cash" ? t.riwayat.methodCash : m === "qris" ? t.riwayat.methodQris : t.riwayat.methodDebt;
  const statusLabel = (s: Sale["status"]) =>
    s === "paid" ? t.riwayat.statusPaid : t.riwayat.statusDebt;

  const inputCls =
    "px-3 py-2 rounded-lg border border-line bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";

  if (kasirs.length === 0) {
    return (
      <DashboardLayout title={p.title} subtitle={p.subtitle}>
        <Card>
          <p className="text-sm text-muted py-8 text-center">{p.noCashier}</p>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={p.title} subtitle={p.subtitle}>
      {/* Filter: pilih kasir + rentang tanggal (Activity 20) */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label={p.fieldCashier}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            {kasirs.map((k) => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </Select>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{p.dateFrom}</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{p.dateTo}</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} w-full`} />
          </div>
        </div>
      </Card>

      {/* 3 statistik utama (FR-18) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v10H4zM9 18h6M12 14v4M8 21h8" /></svg>}
          label={p.statTransactions}
          value={String(stats.txCount)}
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V8M12 21V3M19 21v-9" /></svg>}
          label={p.statTotalSales}
          value={formatRupiah(stats.totalSales)}
          bgColor="bg-blue-600/10"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>}
          label={p.statIncome}
          value={formatRupiah(stats.income)}
          bgColor="bg-emerald-600/10"
          iconColor="text-emerald-600"
        />
      </div>

      {/* Riwayat transaksi kasir terpilih pada rentang tanggal */}
      <Card>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">{p.historyTitle}</h3>
          <p className="text-xs text-muted mt-0.5">{p.historySubtitle}</p>
        </div>
        <Table
          empty={p.empty}
          head={
            <>
              <Th>{p.tableInvoice}</Th>
              <Th>{p.tableDate}</Th>
              <Th>{p.tableCustomer}</Th>
              <Th className="text-center">{p.tableMethod}</Th>
              <Th className="text-center">{p.tableStatus}</Th>
              <Th className="text-right">{p.tableTotal}</Th>
            </>
          }
        >
          {stats.sales.map((s) => (
            <tr key={s.id} className="hover:bg-zinc-50/70">
              <Td className="font-medium tabular-nums whitespace-nowrap">{s.invoice_number ?? "—"}</Td>
              <Td className="text-muted whitespace-nowrap">{formatDateTime(s.transaction_date)}</Td>
              <Td className="whitespace-nowrap">{s.customer_name ?? <span className="text-muted">{t.riwayat.noCustomer}</span>}</Td>
              <Td className="text-center">
                <Badge variant={s.payment_method === "cash" ? "primary" : s.payment_method === "qris" ? "warning" : "muted"}>
                  {methodLabel(s.payment_method)}
                </Badge>
              </Td>
              <Td className="text-center">
                <Badge variant={s.status === "paid" ? "success" : "primary"}>{statusLabel(s.status)}</Badge>
              </Td>
              <Td className="text-right tabular-nums font-medium">{formatRupiah(s.total)}</Td>
            </tr>
          ))}
        </Table>
        <p className="text-xs text-muted mt-3">{p.incomeNote}</p>
      </Card>
    </DashboardLayout>
  );
}
