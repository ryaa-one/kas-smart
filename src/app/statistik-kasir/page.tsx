"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Select } from "@/components/ui/Select";
import { Table, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime, formatRupiah } from "@/lib/format";
import type { SerializedSale } from "@/lib/sales-api";
import type { SerializedDebtRecord } from "@/lib/debt-api";

interface CashierOption {
  id: string;
  name: string;
  username: string;
  status: string;
}

interface CashierStatsData {
  sales: SerializedSale[];
  txCount: number;
  totalSales: number;
  income: number;
}

// FR-18 / UC-22 / Activity Diagram 20 / DFD 7.3 — Statistik Kasir (Owner only,
// guard via DashboardLayout karena route di luar /kasir/* dan /transaksi).
// Sumber data riil: PostgreSQL via API /api/kasir, /api/sales, dan /api/debts.
export default function StatistikKasirPage() {
  const { t } = useLang();
  const p = t.statistikKasir;

  const [kasirs, setKasirs] = useState<CashierOption[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loadingKasir, setLoadingKasir] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<CashierStatsData>({
    sales: [],
    txCount: 0,
    totalSales: 0,
    income: 0,
  });

  // Ambil daftar akun kasir nyata dari database (/api/kasir)
  useEffect(() => {
    let active = true;

    async function loadCashiers() {
      try {
        const res = await fetch("/api/kasir");
        if (!res.ok) throw new Error("Gagal memuat kasir");
        const json = await res.json();
        const users: CashierOption[] = json?.data?.users ?? [];
        if (active) {
          setKasirs(users);
          if (users.length > 0) {
            setUserId((prev) => prev || users[0].id);
          }
        }
      } catch {
        if (active) {
          setError("Gagal memuat data kasir");
        }
      } finally {
        if (active) {
          setLoadingKasir(false);
        }
      }
    }

    void loadCashiers();

    return () => {
      active = false;
    };
  }, []);

  // Ambil data transaksi penjualan dan pembayaran hutang untuk kasir terpilih
  useEffect(() => {
    if (!userId) return;

    let active = true;

    async function loadStats() {
      setLoadingStats(true);
      setError(null);
      try {
        const query = new URLSearchParams({ cashier_id: userId });
        if (from) query.set("from", from);
        if (to) query.set("to", to);

        const [salesRes, debtsRes] = await Promise.all([
          fetch(`/api/sales?${query.toString()}`),
          fetch("/api/debts"),
        ]);

        if (!salesRes.ok) throw new Error("Gagal memuat data transaksi");
        const salesJson = await salesRes.json();
        const rawSales: SerializedSale[] = salesJson?.data?.sales ?? [];

        let debtIncome = 0;
        if (debtsRes.ok) {
          const debtsJson = await debtsRes.json();
          const rawDebts: SerializedDebtRecord[] = debtsJson?.data?.debts ?? [];
          const inRange = (iso: string) => {
            const day = iso.slice(0, 10);
            return (!from || day >= from) && (!to || day <= to);
          };
          debtIncome = rawDebts
            .flatMap((d) => d.payments ?? [])
            .filter((payment) => payment.user_id === userId && inRange(payment.payment_date))
            .reduce((sum, payment) => sum + payment.amount, 0);
        }

        // Saring transaksi: hanya transaksi valid (bukan dibatalkan, draft, atau menunggu pembayaran)
        const validSales = rawSales.filter((s) => {
          const st = s.status.toLowerCase();
          return (
            st !== "dibatalkan" &&
            st !== "cancelled" &&
            st !== "canceled" &&
            st !== "draft" &&
            st !== "menunggu pembayaran" &&
            st !== "menunggu_pembayaran" &&
            st !== "waiting_payment"
          );
        });

        const txCount = validSales.length;
        const totalSales = validSales.reduce((sum, s) => sum + s.total, 0);
        const paidCash = validSales
          .filter(
            (s) =>
              (s.status.toLowerCase() === "lunas" || s.status.toLowerCase() === "paid") &&
              s.payment_method !== "debt"
          )
          .reduce((sum, s) => sum + s.total, 0);
        const income = paidCash + debtIncome;

        if (active) {
          setStats({
            sales: validSales,
            txCount,
            totalSales,
            income,
          });
        }
      } catch {
        if (active) {
          setError("Gagal memuat data statistik kasir");
          setStats({ sales: [], txCount: 0, totalSales: 0, income: 0 });
        }
      } finally {
        if (active) {
          setLoadingStats(false);
        }
      }
    }

    void loadStats();

    return () => {
      active = false;
    };
  }, [userId, from, to]);

  const methodLabel = (m: string) =>
    m === "cash" ? t.riwayat.methodCash : m === "qris" ? t.riwayat.methodQris : t.riwayat.methodDebt;

  const statusLabel = (s: string) => {
    const lower = s.toLowerCase();
    if (lower === "lunas" || lower === "paid") return t.riwayat.statusPaid;
    if (lower === "hutang" || lower === "debt") return t.riwayat.statusDebt;
    if (lower === "menunggu pembayaran" || lower === "waiting_payment") return t.riwayat.statusWaiting;
    if (lower === "dibatalkan" || lower === "cancelled") return t.riwayat.statusCancelled;
    return s;
  };

  const statusVariant = (s: string): "primary" | "warning" | "success" | "muted" | "danger" => {
    const lower = s.toLowerCase();
    if (lower === "lunas" || lower === "paid") return "success";
    if (lower === "hutang" || lower === "debt") return "primary";
    if (lower === "menunggu pembayaran" || lower === "waiting_payment") return "warning";
    if (lower === "dibatalkan" || lower === "cancelled") return "danger";
    return "muted";
  };

  const inputCls =
    "px-3 py-2 rounded-lg border border-line bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";

  if (!loadingKasir && kasirs.length === 0) {
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
      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {/* Filter: pilih kasir + rentang tanggal (Activity 20) */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label={p.fieldCashier}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={loadingKasir}
          >
            {kasirs.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </Select>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{p.dateFrom}</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{p.dateTo}</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
        </div>
      </Card>

      {/* 3 statistik utama (FR-18) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16v10H4zM9 18h6M12 14v4M8 21h8" />
            </svg>
          }
          label={p.statTransactions}
          value={loadingStats ? "..." : String(stats.txCount)}
        />
        <StatCard
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 21V8M12 21V3M19 21v-9" />
            </svg>
          }
          label={p.statTotalSales}
          value={loadingStats ? "..." : formatRupiah(stats.totalSales)}
          bgColor="bg-blue-600/10"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
          label={p.statIncome}
          value={loadingStats ? "..." : formatRupiah(stats.income)}
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
          empty={loadingStats ? t.common.loading : p.empty}
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
                <Badge variant={statusVariant(s.status)}>{statusLabel(s.status)}</Badge>
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
