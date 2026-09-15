"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ReceiptModal } from "@/components/ui/ReceiptModal";
import { Table, Th, Td } from "@/components/ui/Table";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { useDb, type Sale, type SaleStatus } from "@/lib/mock/db";

type MethodFilter = "" | "cash" | "qris" | "debt";
type StatusFilter = "" | SaleStatus;

export default function RiwayatPenjualanPage() {
  return <RiwayatView mineOnly={false} />;
}

// mineOnly=true → halaman Kasir: hanya transaksi milik user login (H-3).
export function RiwayatView({ mineOnly = false }: { mineOnly?: boolean }) {
  const { t } = useLang();
  const { user } = useAuth();
  const db = useDb();

  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [method, setMethod] = useState<MethodFilter>("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [detail, setDetail] = useState<Sale | null>(null);
  const [receipt, setReceipt] = useState<Sale | null>(null); // M-4: cetak struk dari riwayat

  // PRD FR-12 + UC-15: riwayat dari store bersama; Kasir hanya miliknya
  // (user_id session login, bukan nama hardcoded). Draft & batal tetap tercatat.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.sales.filter((s) => {
      if (mineOnly && s.user_id !== user?.id) return false;
      if (q && !(s.invoice_number ?? "").toLowerCase().includes(q)) return false;
      if (method && s.payment_method !== method) return false;
      if (status && s.status !== status) return false;
      if (from && s.transaction_date.slice(0, 10) < from) return false;
      if (to && s.transaction_date.slice(0, 10) > to) return false;
      return true;
    });
  }, [db.sales, mineOnly, user, query, from, to, method, status]);

  const methodLabel = (m: Sale["payment_method"]) =>
    m === "cash" ? t.riwayat.methodCash : m === "qris" ? t.riwayat.methodQris : t.riwayat.methodDebt;

  const statusLabel = (s: SaleStatus) =>
    ({
      draft: t.riwayat.statusDraft,
      waiting_payment: t.riwayat.statusWaiting,
      paid: t.riwayat.statusPaid,
      debt: t.riwayat.statusDebt,
      cancelled: t.riwayat.statusCancelled,
    } as Record<SaleStatus, string>)[s];

  const statusVariant = (s: SaleStatus) =>
    ({
      draft: "muted",
      waiting_payment: "warning",
      paid: "success",
      debt: "primary",
      cancelled: "danger",
    } as Record<SaleStatus, "primary" | "warning" | "success" | "muted" | "danger">)[s];

  const methodVariant = (m: Sale["payment_method"]): "primary" | "muted" | "warning" =>
    m === "cash" ? "primary" : m === "qris" ? "warning" : "muted";

  const inputCls =
    "px-3 py-2 rounded-lg border border-line bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";

  return (
    <DashboardLayout
      title={t.riwayat.title}
      subtitle={mineOnly ? t.riwayat.subtitleKasir : t.riwayat.subtitle}
    >
      <Card>
        {/* Toolbar: cari invoice + rentang tanggal + metode + status */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-2 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0 rounded-lg border border-line bg-zinc-50 px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.riwayat.searchPlaceholder}
              className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted/60"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted whitespace-nowrap">{t.riwayat.dateFrom}</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
            <label className="text-xs text-muted whitespace-nowrap">{t.riwayat.dateTo}</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            <select value={method} onChange={(e) => setMethod(e.target.value as MethodFilter)} className={inputCls}>
              <option value="">{t.riwayat.filterAllMethod}</option>
              <option value="cash">{t.riwayat.methodCash}</option>
              <option value="qris">{t.riwayat.methodQris}</option>
              <option value="debt">{t.riwayat.methodDebt}</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={inputCls}>
              <option value="">{t.riwayat.filterAllStatus}</option>
              <option value="waiting_payment">{t.riwayat.statusWaiting}</option>
              <option value="paid">{t.riwayat.statusPaid}</option>
              <option value="debt">{t.riwayat.statusDebt}</option>
              <option value="cancelled">{t.riwayat.statusCancelled}</option>
            </select>
          </div>
        </div>

        <Table
          empty={filtered.length === 0 ? (db.sales.length === 0 ? t.riwayat.empty : t.riwayat.emptySearch) : undefined}
          head={
            <>
              <Th>{t.riwayat.tableInvoice}</Th>
              <Th>{t.riwayat.tableDate}</Th>
              <Th>{t.riwayat.tableCashier}</Th>
              <Th>{t.riwayat.tableCustomer}</Th>
              <Th className="text-center">{t.riwayat.tableMethod}</Th>
              <Th className="text-center">{t.riwayat.tableStatus}</Th>
              <Th className="text-right">{t.riwayat.tableTotal}</Th>
              <Th className="text-right">{t.common.actions}</Th>
            </>
          }
        >
          {filtered.map((s) => (
            <tr key={s.id} className="hover:bg-zinc-50/70">
              <Td className="font-medium tabular-nums whitespace-nowrap">{s.invoice_number ?? <span className="text-muted">—</span>}</Td>
              <Td className="text-muted whitespace-nowrap">{formatDateTime(s.transaction_date)}</Td>
              <Td className="text-muted whitespace-nowrap">{s.user_name}</Td>
              <Td className="whitespace-nowrap">{s.customer_name ?? <span className="text-muted">{t.riwayat.noCustomer}</span>}</Td>
              <Td className="text-center">
                <Badge variant={methodVariant(s.payment_method)}>{methodLabel(s.payment_method)}</Badge>
              </Td>
              <Td className="text-center">
                <Badge variant={statusVariant(s.status)}>{statusLabel(s.status)}</Badge>
              </Td>
              <Td className="text-right tabular-nums font-medium">{formatRupiah(s.total)}</Td>
              <Td>
                <div className="flex justify-end">
                  <Button size="sm" variant="secondary" onClick={() => setDetail(s)}>
                    {t.common.detail}
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Modal Detail Transaksi (SALE_DETAILS) */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={`${t.riwayat.detailTitle} — ${detail?.invoice_number ?? ""}`}
        footer={
          <>
            {/* M-4: struk dapat dicetak ulang dari riwayat (transaksi selesai saja). */}
            {detail && (detail.status === "paid" || detail.status === "debt") && (
              <Button variant="secondary" onClick={() => setReceipt(detail)}>
                {t.struk.print}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setDetail(null)}>
              {t.common.close}
            </Button>
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted text-xs">{t.riwayat.tableDate}</p>
                <p className="font-medium">{formatDateTime(detail.transaction_date)}</p>
              </div>
              <div>
                <p className="text-muted text-xs">{t.riwayat.tableCashier}</p>
                <p className="font-medium">{detail.user_name}</p>
              </div>
              <div>
                <p className="text-muted text-xs">{t.riwayat.tableCustomer}</p>
                <p className="font-medium">{detail.customer_name ?? t.riwayat.noCustomer}</p>
              </div>
              <div>
                <p className="text-muted text-xs">{t.riwayat.tableMethod}</p>
                <p className="font-medium">{methodLabel(detail.payment_method)}</p>
              </div>
              {detail.paid_at && (
                <div>
                  <p className="text-muted text-xs">{t.riwayat.paidAt}</p>
                  <p className="font-medium">{formatDateTime(detail.paid_at)}</p>
                </div>
              )}
            </div>
            <div className="rounded-lg border border-line overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-left text-[11px] uppercase tracking-wider text-muted">
                    <th className="px-3 py-2 font-semibold">{t.riwayat.detailItem}</th>
                    <th className="px-3 py-2 font-semibold text-center">{t.riwayat.detailQty}</th>
                    <th className="px-3 py-2 font-semibold text-right">{t.riwayat.detailPrice}</th>
                    <th className="px-3 py-2 font-semibold text-right">{t.riwayat.detailSubtotal}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {detail.details.map((d, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{d.product_name}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{d.quantity}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(d.unit_selling_price)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(d.quantity * d.unit_selling_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">{t.riwayat.tableTotal}</span>
              <span className="text-lg font-bold text-primary">{formatRupiah(detail.total)}</span>
            </div>
          </div>
        )}
      </Modal>

      <ReceiptModal sale={receipt} open={receipt !== null} onClose={() => setReceipt(null)} />
    </DashboardLayout>
  );
}
