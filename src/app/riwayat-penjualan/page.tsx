"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ReceiptModal } from "@/components/ui/ReceiptModal";
import { Table, Th, Td } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { formatDateTime, formatRupiah } from "@/lib/format";
import type { SerializedSale } from "@/lib/sales-api";

type MethodFilter = "" | "cash" | "qris" | "debt";
type StatusFilter = "" | string;

export default function RiwayatPenjualanPage() {
  return <RiwayatView mineOnly={false} />;
}

// mineOnly=true → halaman Kasir: hanya transaksi milik user login (H-3).
// Di backend, GET /api/sales sudah mengisolasi data Kasir secara otomatis.
export function RiwayatView({ mineOnly = false }: { mineOnly?: boolean }) {
  const { t } = useLang();
  const { user } = useAuth();

  const [sales, setSales] = useState<SerializedSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [method, setMethod] = useState<MethodFilter>("");
  const [status, setStatus] = useState<StatusFilter>("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [detail, setDetail] = useState<SerializedSale | null>(null);
  const [receipt, setReceipt] = useState<SerializedSale | null>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Server-side fetching: search, filter rentang tanggal, metode, status & pagination
  useEffect(() => {
    let active = true;
    async function loadSales() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("page_size", String(pageSize));
        if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (method) params.set("payment_method", method);
        if (status) params.set("status", status);

        const res = await fetch(`/api/sales?${params.toString()}`);
        if (!res.ok) {
          if (active) {
            setSales([]);
            setTotalItems(0);
            setTotalPages(1);
          }
          return;
        }
        const json = await res.json();
        if (active && json?.data) {
          let list: SerializedSale[] = json.data.sales ?? [];
          if (mineOnly && user?.id) {
            list = list.filter((s) => s.user_id === user.id);
          }
          setSales(list);
          if (json.data.pagination) {
            setTotalItems(json.data.pagination.total);
            setTotalPages(json.data.pagination.total_pages);
          } else {
            setTotalItems(list.length);
            setTotalPages(1);
          }
        }
      } catch (err) {
        console.error("Gagal memuat riwayat penjualan:", err);
        if (active) {
          setSales([]);
          setTotalItems(0);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSales();
    return () => {
      active = false;
    };
  }, [page, pageSize, debouncedQuery, from, to, method, status, mineOnly, user?.id]);

  const handleOpenDetail = async (item: SerializedSale) => {
    setDetail(item);
    try {
      const res = await fetch(`/api/sales/${item.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.sale) {
          setDetail(json.data.sale);
        }
      }
    } catch (err) {
      console.error("Gagal memuat detail transaksi:", err);
    }
  };

  const handleResetFilters = () => {
    setQuery("");
    setDebouncedQuery("");
    setFrom("");
    setTo("");
    setMethod("");
    setStatus("");
    setPage(1);
  };

  const hasActiveFilter = Boolean(query || from || to || method || status);

  const methodLabel = (m: string) =>
    m === "cash" ? t.riwayat.methodCash : m === "qris" ? t.riwayat.methodQris : t.riwayat.methodDebt;

  const statusLabel = (s: string) => {
    const lower = s.toLowerCase();
    if (lower === "draft") return t.riwayat.statusDraft;
    if (lower === "menunggu pembayaran" || lower === "waiting_payment") return t.riwayat.statusWaiting;
    if (lower === "lunas" || lower === "paid") return t.riwayat.statusPaid;
    if (lower === "hutang" || lower === "debt") return t.riwayat.statusDebt;
    if (lower === "dibatalkan" || lower === "cancelled") return t.riwayat.statusCancelled;
    return s;
  };

  const statusVariant = (s: string): "primary" | "warning" | "success" | "muted" | "danger" => {
    const lower = s.toLowerCase();
    if (lower === "draft") return "muted";
    if (lower === "menunggu pembayaran" || lower === "waiting_payment") return "warning";
    if (lower === "lunas" || lower === "paid") return "success";
    if (lower === "hutang" || lower === "debt") return "primary";
    if (lower === "dibatalkan" || lower === "cancelled") return "danger";
    return "muted";
  };

  const methodVariant = (m: string): "primary" | "muted" | "warning" =>
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
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className={inputCls}
            />
            <label className="text-xs text-muted whitespace-nowrap">{t.riwayat.dateTo}</label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className={inputCls}
            />
            <select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value as MethodFilter);
                setPage(1);
              }}
              className={inputCls}
            >
              <option value="">{t.riwayat.filterAllMethod}</option>
              <option value="cash">{t.riwayat.methodCash}</option>
              <option value="qris">{t.riwayat.methodQris}</option>
              <option value="debt">{t.riwayat.methodDebt}</option>
            </select>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as StatusFilter);
                setPage(1);
              }}
              className={inputCls}
            >
              <option value="">{t.riwayat.filterAllStatus}</option>
              <option value="Lunas">{t.riwayat.statusPaid}</option>
              <option value="Hutang">{t.riwayat.statusDebt}</option>
              <option value="Menunggu Pembayaran">{t.riwayat.statusWaiting}</option>
              <option value="Dibatalkan">{t.riwayat.statusCancelled}</option>
              <option value="Draft">{t.riwayat.statusDraft}</option>
            </select>
            {hasActiveFilter && (
              <Button size="sm" variant="secondary" onClick={handleResetFilters}>
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Tabel Riwayat */}
        <Table
          empty={
            !loading && sales.length === 0
              ? hasActiveFilter
                ? t.riwayat.emptySearch
                : t.riwayat.empty
              : undefined
          }
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
          {loading ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-muted">
                {t.common.loading}
              </td>
            </tr>
          ) : (
            sales.map((s) => (
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
                    <Button size="sm" variant="secondary" onClick={() => handleOpenDetail(s)}>
                      {t.common.detail}
                    </Button>
                  </div>
                </Td>
              </tr>
            ))
          )}
        </Table>

        {/* Pagination Server-side */}
        {!loading && totalItems > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            pageSizeOptions={[10, 25, 50]}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        )}
      </Card>

      {/* Modal Detail Transaksi (SALE_DETAILS) */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={`${t.riwayat.detailTitle} — ${detail?.invoice_number ?? ""}`}
        footer={
          <>
            {detail && (detail.status.toLowerCase() === "lunas" || detail.status.toLowerCase() === "paid" || detail.status.toLowerCase() === "hutang" || detail.status.toLowerCase() === "debt") && (
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

