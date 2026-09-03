"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Table, Th, Td } from "@/components/ui/Table";
import { formatDate, formatRupiah } from "@/lib/format";
import { mockProducts, mockSuppliers } from "@/lib/mock/master";
import { mockDebts, mockPurchases, mockSales, mockAdjustments, purchaseTotal } from "@/lib/mock/owner";

type Tab = "sales" | "purchases" | "profit" | "stock" | "suppliers" | "debt" | "adjustments";

// FR-15: 7 laporan, difilter berdasarkan tanggal. Data dihitung dari mock sales/purchases/adjustments.
export default function LaporanPage() {
  const { t } = useLang();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const inRange = (iso: string) => {
    const d = iso.slice(0, 10);
    return (!from || d >= from) && (!to || d <= to);
  };

  const sales = useMemo(() => mockSales.filter((s) => inRange(s.transaction_date)), [from, to]);
  const purchases = useMemo(() => mockPurchases.filter((p) => inRange(p.purchase_date)), [from, to]);

  // Profit kotor = penjualan (status paid) - modal dari harga beli produk.
  const paidSales = sales.filter((s) => s.status === "paid");
  const salesRevenue = paidSales.reduce((s, x) => s + x.total, 0);
  const salesCost = paidSales.reduce(
    (s, x) =>
      s +
      x.details.reduce((d, item) => {
        const p = mockProducts.find((mp) => mp.name === item.product_name);
        return d + (p?.purchase_price ?? 0) * item.quantity;
      }, 0),
    0
  );
  const grossProfit = salesRevenue - salesCost;

  const inputCls =
    "px-3 py-2 rounded-lg border border-line bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";

  const tabs: { key: Tab; label: string }[] = [
    { key: "sales", label: t.laporan.tabSales },
    { key: "purchases", label: t.laporan.tabPurchases },
    { key: "profit", label: t.laporan.tabProfit },
    { key: "stock", label: t.laporan.tabStock },
    { key: "suppliers", label: t.laporan.tabSuppliers },
    { key: "debt", label: t.laporan.tabDebt },
    { key: "adjustments", label: t.laporan.tabAdjustments },
  ];

  const debtTotals = useMemo(() => {
    const total = mockDebts.reduce((s, d) => s + d.total_debt, 0);
    const remaining = mockDebts.reduce((s, d) => s + d.remaining_debt, 0);
    return { total, remaining, paid: total - remaining };
  }, []);

  const supplierRows = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    purchases.forEach((p) => {
      const cur = map.get(p.supplier_name) ?? { count: 0, total: 0 };
      map.set(p.supplier_name, { count: cur.count + 1, total: cur.total + purchaseTotal(p) });
    });
    return [...map.entries()].map(([name, v]) => ({ name, ...v }));
  }, [purchases]);

  return (
    <DashboardLayout title={t.laporan.title} subtitle={t.laporan.subtitle}>
      <Card className="mb-4">
        {/* Filter tanggal (FR-15) */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted">{t.laporan.dateFrom}</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          <label className="text-xs text-muted">{t.laporan.dateTo}</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
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

      {/* ===== Laporan Penjualan ===== */}
      {tab === "sales" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v10H4zM9 18h6M12 14v4" /></svg>}
              label={t.laporan.salesTotal}
              value={formatRupiah(salesRevenue)}
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v8l5 3M12 21a9 9 0 110-18 9 9 0 010 18z" /></svg>}
              label={t.laporan.salesCount}
              value={sales.length}
              bgColor="bg-blue-600/10"
              iconColor="text-blue-600"
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3l4 4 4-4 3 3-7 7-7-7 3-3zM12 17v4M8 19h8" /></svg>}
              label={t.laporan.salesDebtCount}
              value={sales.filter((s) => s.payment_method === "debt").length}
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
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50/70">
                  <Td className="font-medium tabular-nums whitespace-nowrap">{s.invoice_number}</Td>
                  <Td className="text-muted whitespace-nowrap">{formatDate(s.transaction_date)}</Td>
                  <Td className="text-muted whitespace-nowrap">{s.cashier_name}</Td>
                  <Td className="text-right tabular-nums font-medium">{formatRupiah(s.total)}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {/* ===== Laporan Pembelian ===== */}
      {tab === "purchases" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h12v3H6zM4 7h16l1 4H3l1-4zM4 11h16v9H4zM9 14h6" /></svg>}
              label={t.laporan.purchaseTotal}
              value={formatRupiah(purchases.reduce((s, p) => s + purchaseTotal(p), 0))}
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v8l5 3M12 21a9 9 0 110-18 9 9 0 010 18z" /></svg>}
              label={t.laporan.purchaseCount}
              value={purchases.length}
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
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/70">
                  <Td className="font-medium tabular-nums whitespace-nowrap">{p.id}</Td>
                  <Td className="whitespace-nowrap">{p.supplier_name}</Td>
                  <Td className="text-muted whitespace-nowrap">{formatDate(p.purchase_date)}</Td>
                  <Td className="text-center tabular-nums text-muted">
                    {p.details.reduce((s, d) => s + d.quantity, 0)}
                  </Td>
                  <Td className="text-right tabular-nums font-medium">{formatRupiah(purchaseTotal(p))}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {/* ===== Laporan Profit (kotor: penjualan - modal harga beli) ===== */}
      {tab === "profit" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v10H4zM9 18h6M12 14v4" /></svg>}
            label={t.laporan.profitSales}
            value={formatRupiah(salesRevenue)}
          />
          <StatCard
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>}
            label={t.laporan.profitCost}
            value={formatRupiah(salesCost)}
            bgColor="bg-amber-600/10"
            iconColor="text-amber-600"
          />
          <StatCard
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V8M12 21V3M19 21v-9" /></svg>}
            label={t.laporan.profitGross}
            value={formatRupiah(grossProfit)}
            bgColor="bg-success/10"
            iconColor="text-success"
          />
          <StatCard
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v8l5 3M12 21a9 9 0 110-18 9 9 0 010 18z" /></svg>}
            label={t.laporan.margin}
            value={`${salesRevenue > 0 ? Math.round((grossProfit / salesRevenue) * 100) : 0}%`}
            bgColor="bg-purple-600/10"
            iconColor="text-purple-600"
          />
        </div>
      )}

      {/* ===== Laporan Stok (nilai stok per produk, harga beli) ===== */}
      {tab === "stock" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 4v10l-8 4-8-4V7l8-4z" /></svg>}
              label={t.laporan.stockTotalProducts}
              value={mockProducts.length}
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h10M4 12h16M4 17h10" /></svg>}
              label={t.laporan.stockTotalUnits}
              value={mockProducts.reduce((s, p) => s + p.stock, 0)}
              bgColor="bg-blue-600/10"
              iconColor="text-blue-600"
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>}
              label={t.laporan.stockTotalValue}
              value={formatRupiah(mockProducts.reduce((s, p) => s + p.stock * p.purchase_price, 0))}
              bgColor="bg-amber-600/10"
              iconColor="text-amber-600"
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>}
              label={t.laporan.stockLowCount}
              value={mockProducts.filter((p) => p.stock <= p.minimum_stock).length}
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
              {mockProducts.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/70">
                  <Td className="font-medium text-foreground">{p.name}</Td>
                  <Td className={`text-center tabular-nums ${p.stock <= p.minimum_stock ? "text-danger font-semibold" : ""}`}>
                    {p.stock}
                  </Td>
                  <Td className="text-center tabular-nums text-muted">{p.minimum_stock}</Td>
                  <Td className="text-right tabular-nums">{formatRupiah(p.stock * p.purchase_price)}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {/* ===== Laporan Supplier (agregat pembelian) ===== */}
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
            {supplierRows.map((s) => (
              <tr key={s.name} className="hover:bg-zinc-50/70">
                <Td className="font-medium text-foreground">{s.name}</Td>
                <Td className="text-center tabular-nums text-muted">{s.count}</Td>
                <Td className="text-right tabular-nums font-medium">{formatRupiah(s.total)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {/* ===== Laporan Hutang Pelanggan ===== */}
      {tab === "debt" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3l4 4 4-4 3 3-7 7-7-7 3-3zM12 17v4M8 19h8" /></svg>}
              label={t.laporan.debtTotal}
              value={formatRupiah(debtTotals.total)}
              bgColor="bg-rose-600/10"
              iconColor="text-rose-600"
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
              label={t.laporan.debtPaid}
              value={formatRupiah(debtTotals.paid)}
              bgColor="bg-success/10"
              iconColor="text-success"
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>}
              label={t.laporan.debtRemaining}
              value={formatRupiah(debtTotals.remaining)}
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
              {mockDebts.map((d) => (
                <tr key={d.id} className="hover:bg-zinc-50/70">
                  <Td className="font-medium text-foreground whitespace-nowrap">{d.customer_name}</Td>
                  <Td className="tabular-nums text-muted whitespace-nowrap">{d.sale_id}</Td>
                  <Td className="text-right tabular-nums">{formatRupiah(d.total_debt)}</Td>
                  <Td className={`text-right tabular-nums font-medium ${d.remaining_debt > 0 ? "text-danger" : "text-success"}`}>
                    {formatRupiah(d.remaining_debt)}
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {/* ===== Laporan Penyesuaian Stok ===== */}
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
            {mockAdjustments.flatMap((a) =>
              a.details.map((d) => (
                <tr key={`${a.id}-${d.product_id}`} className="hover:bg-zinc-50/70">
                  <Td className="font-medium tabular-nums whitespace-nowrap">{a.id}</Td>
                  <Td className="text-muted whitespace-nowrap">{formatDate(a.adjustment_date)}</Td>
                  <Td className="text-foreground">{d.product_name}</Td>
                  <Td className="text-center">
                    <span
                      className={`tabular-nums font-semibold ${
                        d.quantity_change > 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {d.quantity_change > 0 ? "+" : ""}
                      {d.quantity_change}
                    </span>
                  </Td>
                  <Td className="text-muted whitespace-nowrap">{a.reason}</Td>
                </tr>
              ))
            )}
          </Table>
        </Card>
      )}
    </DashboardLayout>
  );
}
