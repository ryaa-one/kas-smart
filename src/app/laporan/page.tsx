"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Table, Th, Td } from "@/components/ui/Table";
import { formatDate, formatRupiah } from "@/lib/format";
import type { ReportTab, ReportResponseData } from "@/lib/report-api";

export default function LaporanPage() {
  const { t } = useLang();

  const [tab, setTab] = useState<ReportTab>("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reportData, setReportData] = useState<ReportResponseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadReport() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ tab });
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const res = await fetch(`/api/reports?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        if (active && json?.data) {
          setReportData(json.data);
        }
      } catch (err) {
        console.error("Gagal memuat laporan:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadReport();
    return () => {
      active = false;
    };
  }, [tab, from, to]);

  const inputCls =
    "px-3 py-2 rounded-lg border border-line bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";

  const tabs: { key: ReportTab; label: string }[] = [
    { key: "sales", label: t.laporan.tabSales },
    { key: "purchases", label: t.laporan.tabPurchases },
    { key: "profit", label: t.laporan.tabProfit },
    { key: "stock", label: t.laporan.tabStock },
    { key: "suppliers", label: t.laporan.tabSuppliers },
    { key: "debt", label: t.laporan.tabDebt },
    { key: "adjustments", label: t.laporan.tabAdjustments },
  ];

  return (
    <DashboardLayout title={t.laporan.title} subtitle={t.laporan.subtitle}>
      <Card className="mb-4">
        {/* Filter tanggal (FR-15 / UC-19) */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted">{t.laporan.dateFrom}</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={inputCls}
          />
          <label className="text-xs text-muted">{t.laporan.dateTo}</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={inputCls}
          />
          {(from || to) && (
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
              className="px-2.5 py-1.5 text-xs text-muted hover:text-foreground hover:bg-zinc-100 rounded-lg transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </Card>

      {/* Tab 7 laporan */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            type="button"
            onClick={() => setTab(tabItem.key)}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === tabItem.key
                ? "bg-primary/10 text-primary"
                : "text-muted hover:bg-zinc-100 hover:text-foreground"
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* ===== 1. Laporan Penjualan ===== */}
      {tab === "sales" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v10H4zM9 18h6M12 14v4" /></svg>}
              label={t.laporan.salesTotal}
              value={formatRupiah(reportData?.sales?.revenue ?? 0)}
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v8l5 3M12 21a9 9 0 110-18 9 9 0 010 18z" /></svg>}
              label={t.laporan.salesCount}
              value={reportData?.sales?.count ?? 0}
              bgColor="bg-blue-600/10"
              iconColor="text-blue-600"
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3l4 4 4-4 3 3-7 7-7-7 3-3zM12 17v4M8 19h8" /></svg>}
              label={t.laporan.salesDebtCount}
              value={reportData?.sales?.debtCount ?? 0}
              bgColor="bg-rose-600/10"
              iconColor="text-rose-600"
            />
          </div>
          <Card>
            <Table
              empty={t.laporan.empty}
              head={
                <>
                  <Th>{t.laporan.tableInvoice}</Th>
                  <Th>{t.laporan.tableDate}</Th>
                  <Th>{t.laporan.tableCashier}</Th>
                  <Th className="text-right">{t.laporan.tableTotal}</Th>
                </>
              }
            >
              {(reportData?.sales?.rows ?? []).map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50/70">
                  <Td className="font-medium tabular-nums whitespace-nowrap">{s.invoice_number}</Td>
                  <Td className="text-muted whitespace-nowrap">{formatDate(s.transaction_date)}</Td>
                  <Td className="text-muted whitespace-nowrap">{s.user_name}</Td>
                  <Td className="text-right tabular-nums font-medium">{formatRupiah(s.total)}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {/* ===== 2. Laporan Pembelian ===== */}
      {tab === "purchases" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h12v3H6zM4 7h16l1 4H3l1-4zM4 11h16v9H4zM9 14h6" /></svg>}
              label={t.laporan.purchaseTotal}
              value={formatRupiah(reportData?.purchases?.total ?? 0)}
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v8l5 3M12 21a9 9 0 110-18 9 9 0 010 18z" /></svg>}
              label={t.laporan.purchaseCount}
              value={reportData?.purchases?.count ?? 0}
              bgColor="bg-blue-600/10"
              iconColor="text-blue-600"
            />
          </div>
          <Card>
            <Table
              empty={t.laporan.empty}
              head={
                <>
                  <Th>{t.laporan.tableNo}</Th>
                  <Th>{t.laporan.tableSupplier}</Th>
                  <Th>{t.laporan.tableDate}</Th>
                  <Th className="text-center">{t.laporan.tableItems}</Th>
                  <Th className="text-right">{t.laporan.tableTotal}</Th>
                </>
              }
            >
              {(reportData?.purchases?.rows ?? []).map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/70">
                  <Td className="font-medium tabular-nums whitespace-nowrap">{p.id}</Td>
                  <Td className="whitespace-nowrap">{p.supplier_name}</Td>
                  <Td className="text-muted whitespace-nowrap">{formatDate(p.purchase_date)}</Td>
                  <Td className="text-center tabular-nums text-muted">{p.items_count}</Td>
                  <Td className="text-right tabular-nums font-medium">{formatRupiah(p.total)}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {/* ===== 3. Laporan Profit (kotor: penjualan - modal harga beli) ===== */}
      {tab === "profit" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v10H4zM9 18h6M12 14v4" /></svg>}
            label={t.laporan.profitSales}
            value={formatRupiah(reportData?.profit?.salesRevenue ?? 0)}
          />
          <StatCard
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>}
            label={t.laporan.profitCost}
            value={formatRupiah(reportData?.profit?.salesCost ?? 0)}
            bgColor="bg-amber-600/10"
            iconColor="text-amber-600"
          />
          <StatCard
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V8M12 21V3M19 21v-9" /></svg>}
            label={t.laporan.profitGross}
            value={formatRupiah(reportData?.profit?.grossProfit ?? 0)}
            bgColor="bg-success/10"
            iconColor="text-success"
          />
          <StatCard
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v8l5 3M12 21a9 9 0 110-18 9 9 0 010 18z" /></svg>}
            label={t.laporan.margin}
            value={`${reportData?.profit?.margin ?? 0}%`}
            bgColor="bg-purple-600/10"
            iconColor="text-purple-600"
          />
        </div>
      )}

      {/* ===== 4. Laporan Stok (nilai stok per produk, harga beli) ===== */}
      {tab === "stock" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 4v10l-8 4-8-4V7l8-4z" /></svg>}
              label={t.laporan.stockTotalProducts}
              value={reportData?.stock?.totalProducts ?? 0}
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h10M4 12h16M4 17h10" /></svg>}
              label={t.laporan.stockTotalUnits}
              value={reportData?.stock?.totalUnits ?? 0}
              bgColor="bg-blue-600/10"
              iconColor="text-blue-600"
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>}
              label={t.laporan.stockTotalValue}
              value={formatRupiah(reportData?.stock?.totalValue ?? 0)}
              bgColor="bg-amber-600/10"
              iconColor="text-amber-600"
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>}
              label={t.laporan.stockLowCount}
              value={reportData?.stock?.lowCount ?? 0}
              bgColor="bg-rose-600/10"
              iconColor="text-rose-600"
            />
          </div>
          <Card>
            <Table
              empty={t.laporan.empty}
              head={
                <>
                  <Th>{t.laporan.tableProduct}</Th>
                  <Th className="text-center">{t.laporan.tableStock}</Th>
                  <Th className="text-center">{t.laporan.tableMinStock}</Th>
                  <Th className="text-right">{t.laporan.tableUnitValue}</Th>
                </>
              }
            >
              {(reportData?.stock?.rows ?? []).map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/70">
                  <Td className="font-medium text-foreground">{p.name}</Td>
                  <Td className={`text-center tabular-nums ${p.stock <= p.minimum_stock ? "text-danger font-semibold" : ""}`}>
                    {p.stock}
                  </Td>
                  <Td className="text-center tabular-nums text-muted">{p.minimum_stock}</Td>
                  <Td className="text-right tabular-nums">{formatRupiah(p.unit_value)}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {/* ===== 5. Laporan Supplier (agregat pembelian) ===== */}
      {tab === "suppliers" && (
        <Card>
          <Table
            empty={t.laporan.empty}
            head={
              <>
                <Th>{t.laporan.supplierName}</Th>
                <Th className="text-center">{t.laporan.tableTransactions}</Th>
                <Th className="text-right">{t.laporan.tablePurchases}</Th>
              </>
            }
          >
            {(reportData?.suppliers?.rows ?? []).map((s) => (
              <tr key={s.name} className="hover:bg-zinc-50/70">
                <Td className="font-medium text-foreground">{s.name}</Td>
                <Td className="text-center tabular-nums text-muted">{s.count}</Td>
                <Td className="text-right tabular-nums font-medium">{formatRupiah(s.total)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {/* ===== 6. Laporan Hutang Pelanggan ===== */}
      {tab === "debt" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3l4 4 4-4 3 3-7 7-7-7 3-3zM12 17v4M8 19h8" /></svg>}
              label={t.laporan.debtTotal}
              value={formatRupiah(reportData?.debt?.total ?? 0)}
              bgColor="bg-rose-600/10"
              iconColor="text-rose-600"
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
              label={t.laporan.debtPaid}
              value={formatRupiah(reportData?.debt?.paid ?? 0)}
              bgColor="bg-success/10"
              iconColor="text-success"
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>}
              label={t.laporan.debtRemaining}
              value={formatRupiah(reportData?.debt?.remaining ?? 0)}
              bgColor="bg-warning/10"
              iconColor="text-warning"
            />
          </div>
          <Card>
            <Table
              empty={t.laporan.empty}
              head={
                <>
                  <Th>{t.laporan.tableCustomer}</Th>
                  <Th>{t.laporan.tableInvoice}</Th>
                  <Th className="text-right">{t.laporan.debtTotal}</Th>
                  <Th className="text-right">{t.laporan.debtRemaining}</Th>
                </>
              }
            >
              {(reportData?.debt?.rows ?? []).map((d) => (
                <tr key={d.debt_id} className="hover:bg-zinc-50/70">
                  <Td className="font-medium text-foreground whitespace-nowrap">{d.customer_name}</Td>
                  <Td className="tabular-nums text-muted whitespace-nowrap">{d.invoice_number}</Td>
                  <Td className="text-right tabular-nums">{formatRupiah(d.total_debt)}</Td>
                  <Td
                    className={`text-right tabular-nums font-medium ${
                      d.remaining_debt > 0 ? "text-danger" : "text-success"
                    }`}
                  >
                    {formatRupiah(d.remaining_debt)}
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {/* ===== 7. Laporan Penyesuaian Stok ===== */}
      {tab === "adjustments" && (
        <Card>
          <Table
            empty={t.laporan.empty}
            head={
              <>
                <Th>{t.laporan.tableNo}</Th>
                <Th>{t.laporan.tableDate}</Th>
                <Th>{t.laporan.tableProduct}</Th>
                <Th className="text-center">{t.laporan.tableChange}</Th>
                <Th>{t.laporan.tableReason}</Th>
              </>
            }
          >
            {(reportData?.adjustments?.rows ?? []).map((a, i) => (
              <tr key={`${a.id}-${i}`} className="hover:bg-zinc-50/70">
                <Td className="font-medium tabular-nums whitespace-nowrap">{a.id}</Td>
                <Td className="text-muted whitespace-nowrap">{formatDate(a.adjustment_date)}</Td>
                <Td className="text-foreground">{a.product_name}</Td>
                <Td className="text-center">
                  <span
                    className={`tabular-nums font-semibold ${
                      a.quantity_change > 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {a.quantity_change > 0 ? "+" : ""}
                    {a.quantity_change}
                  </span>
                </Td>
                <Td className="text-muted whitespace-nowrap">{a.reason}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </DashboardLayout>
  );
}
