"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import type { SerializedDebtRecord } from "@/lib/debt-api";

type DebtStatus = "Unpaid" | "Partial" | "Paid";

const debtBadge = (status: DebtStatus): "danger" | "warning" | "success" =>
  status === "Unpaid" ? "danger" : status === "Partial" ? "warning" : "success";

// UC-16 (kelola data hutang) = Owner only; UC-17 (pembayaran hutang) = Owner & Kasir.
// Sumber data: PostgreSQL melalui Prisma API — hutang dari transaksi Hutang (C-3) muncul di sini.
export default function HutangPelangganPage() {
  return <HutangView mineOnly={false} />;
}

function HutangView({ mineOnly = false }: { mineOnly?: boolean }) {
  const { t } = useLang();
  const { user } = useAuth();
  const isOwner = user?.role === "Owner";

  const [debts, setDebts] = useState<SerializedDebtRecord[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DebtStatus | "">("");

  // Modal bayar (UC-17)
  const [paying, setPaying] = useState<SerializedDebtRecord | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState(false);
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Modal ubah (UC-16, Owner) — KONTRAK-5: tidak ada tambah hutang manual;
  // seluruh hutang berasal dari transaksi metode Hutang (UC-13).
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SerializedDebtRecord | null>(null);
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formTotal, setFormTotal] = useState("");
  const [formErrors, setFormErrors] = useState<{ customer?: string; total?: string }>({});
  const [formSuccess, setFormSuccess] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [debtsRes, custRes] = await Promise.all([
        fetch("/api/debts"),
        fetch("/api/customers"),
      ]);
      if (debtsRes.ok) {
        const data = await debtsRes.json();
        if (data?.debts) setDebts(data.debts);
      }
      if (custRes.ok) {
        const data = await custRes.json();
        if (data?.customers) setCustomers(data.customers);
      }
    } catch (err) {
      console.error("Failed to load debts data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totals = useMemo(() => {
    const totalDebt = debts.reduce((s, d) => s + d.total_debt, 0);
    const remaining = debts.reduce((s, d) => s + d.remaining_debt, 0);
    return { totalDebt, paid: totalDebt - remaining, remaining };
  }, [debts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return debts.filter(
      (d) =>
        (!statusFilter || d.status === statusFilter) &&
        (!q || d.customer_name.toLowerCase().includes(q))
    );
  }, [debts, query, statusFilter]);

  const invoiceLabel = (d: SerializedDebtRecord) => d.invoice_number || d.sale_id;

  const openPay = async (d: SerializedDebtRecord) => {
    setPaying(d);
    setAmount("");
    setNote("");
    setPayError("");
    setPaySuccess(false);

    try {
      const res = await fetch(`/api/debts/${d.debt_id}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.debt) {
          setPaying(data.debt);
        }
      }
    } catch {
      // keep fallback to current d
    }
  };

  const submitPay = async () => {
    if (!paying || isSubmittingPay) return;
    const n = parseInt(amount, 10) || 0;
    if (n <= 0) {
      setPayError(t.hutang.errorAmountMin);
      return;
    }
    if (n > paying.remaining_debt) {
      setPayError(t.hutang.errorAmountOver);
      return;
    }

    setIsSubmittingPay(true);
    setPayError("");
    try {
      const res = await fetch(`/api/debts/${paying.debt_id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: n, note: note.trim() }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setPayError(
          data?.error === "amount_exceeds_remaining"
            ? t.hutang.errorAmountOver
            : data?.error === "debt_already_paid"
            ? "Hutang sudah lunas"
            : data?.error || "Gagal mencatat pembayaran"
        );
        return;
      }

      await loadData();
      setPaying(null);
      setPaySuccess(true);
      setTimeout(() => setPaySuccess(false), 3000);
    } catch {
      setPayError("Terjadi kesalahan jaringan saat mencatat pembayaran");
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // ===== UC-16: kelola data hutang (Owner only) =====
  // KONTRAK-5: tidak ada aksi "Tambah" manual — hutang hanya lahir dari
  // transaksi metode Hutang (UC-13). Owner tetap dapat mengubah/menghapus.
  const openEdit = (d: SerializedDebtRecord) => {
    setEditing(d);
    setFormCustomerId(d.customer_id);
    setFormTotal(String(d.total_debt));
    setFormErrors({});
    setFormOpen(true);
  };

  const submitForm = async () => {
    if (!editing || isSubmittingEdit) return;
    const e: typeof formErrors = {};
    // Customer WAJIB untuk data hutang (aturan PRD/ERD).
    if (!formCustomerId) e.customer = t.hutang.errorCustomerRequired;
    const total = parseInt(formTotal, 10) || 0;
    if (total <= 0) e.total = t.hutang.errorTotalMin;
    else {
      const paid = editing.total_debt - editing.remaining_debt;
      if (total < paid) e.total = t.hutang.errorTotalBelowPaid;
    }
    setFormErrors(e);
    if (Object.keys(e).length) return;

    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`/api/debts/${editing.debt_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total_debt: total, customer_id: formCustomerId }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFormErrors({ total: data?.error || "Gagal memperbarui data hutang" });
        return;
      }

      await loadData();
      setFormOpen(false);
      setFormSuccess(t.hutang.successSaved);
      setTimeout(() => setFormSuccess(""), 3000);
    } catch {
      setFormErrors({ total: "Terjadi kesalahan jaringan saat menyimpan" });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const removeDebt = async (d: SerializedDebtRecord) => {
    if (!isOwner) return;
    if (!window.confirm(t.hutang.deleteConfirm)) return;

    try {
      const res = await fetch(`/api/debts/${d.debt_id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Gagal menghapus data hutang");
        return;
      }

      await loadData();
      setFormSuccess(t.hutang.successDeleted);
      setTimeout(() => setFormSuccess(""), 3000);
    } catch (err) {
      console.error("Gagal menghapus hutang:", err);
      alert("Terjadi kesalahan jaringan saat menghapus hutang");
    }
  };

  return (
    <DashboardLayout
      title={t.hutang.title}
      subtitle={mineOnly ? t.riwayat.subtitleKasir : t.hutang.subtitle}
    >
      {/* Ringkasan hutang */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatDebt label={t.hutang.tableTotal} value={formatRupiah(totals.totalDebt)} icon="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        <StatDebt label={t.hutang.tablePaid} value={formatRupiah(totals.paid)} icon="M20 6L9 17l-5-5" bg="bg-success/10" color="text-success" />
        <StatDebt label={t.hutang.tableRemaining} value={formatRupiah(totals.remaining)} icon="M8 3l4 4 4-4 3 3-7 7-7-7 3-3zM12 17v4M8 19h8" bg="bg-rose-600/10" color="text-rose-600" />
      </div>

      {paySuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-success/10 text-success px-4 py-3 text-sm font-medium" role="status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
          {t.hutang.paySuccess}
        </div>
      )}
      {formSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-success/10 text-success px-4 py-3 text-sm font-medium" role="status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
          {formSuccess}
        </div>
      )}

      <Card>
        {/* Toolbar: search + filter status + tambah (Owner) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0 rounded-lg border border-line bg-zinc-50 px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.hutang.searchPlaceholder}
              className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted/60"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DebtStatus | "")}
            className="px-3 py-2 rounded-lg border border-line bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <option value="">{t.hutang.filterAllStatus}</option>
            <option value="Unpaid">{t.hutang.filterUnpaid}</option>
            <option value="Partial">{t.hutang.filterPartial}</option>
            <option value="Paid">{t.hutang.filterPaid}</option>
          </select>
          {/* KONTRAK-5: tombol Tambah hutang manual DIHAPUS — hutang hanya
              berasal dari transaksi metode Hutang (UC-13) via halaman Kasir. */}
        </div>

        <Table
          empty={loading ? "Memuat data hutang..." : debts.length === 0 ? t.hutang.empty : t.hutang.emptySearch}
          head={
            <>
              <Th>{t.hutang.tableCustomer}</Th>
              <Th>{t.hutang.tableInvoice}</Th>
              <Th>{t.hutang.tableDate}</Th>
              <Th className="text-right">{t.hutang.tableTotal}</Th>
              <Th className="text-right">{t.hutang.tableRemaining}</Th>
              <Th className="text-center">{t.hutang.tableStatus}</Th>
              <Th className="text-right">{t.common.actions}</Th>
            </>
          }
        >
          {filtered.map((d) => (
            <tr key={d.debt_id} className="hover:bg-zinc-50/70">
              <Td className="font-medium text-foreground whitespace-nowrap">{d.customer_name}</Td>
              <Td className="tabular-nums text-muted whitespace-nowrap">{invoiceLabel(d)}</Td>
              <Td className="text-muted whitespace-nowrap">{formatDate(d.transaction_date || d.created_at)}</Td>
              <Td className="text-right tabular-nums">{formatRupiah(d.total_debt)}</Td>
              <Td className={`text-right tabular-nums font-medium ${d.remaining_debt > 0 ? "text-danger" : "text-success"}`}>
                {formatRupiah(d.remaining_debt)}
              </Td>
              <Td className="text-center">
                <Badge variant={debtBadge(d.status)}>{d.status}</Badge>
              </Td>
              <Td>
                <div className="flex justify-end items-center gap-1">
                  <Button
                    size="sm"
                    onClick={() => openPay(d)}
                    disabled={d.remaining_debt <= 0}
                  >
                    {t.hutang.payButton}
                  </Button>
                  {isOwner && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEdit(d)}
                        className="p-1.5 rounded-md hover:bg-zinc-100 transition-colors"
                        title={t.hutang.editButton}
                        aria-label={t.hutang.editButton}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDebt(d)}
                        className="p-1.5 rounded-md hover:bg-zinc-100 transition-colors"
                        title={t.hutang.deleteButton}
                        aria-label={t.hutang.deleteButton}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-muted hover:text-danger">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Modal Ubah Data Hutang (UC-16 — Owner; tanpa tambah manual, KONTRAK-5) */}
      <Modal
        open={formOpen && editing !== null}
        onClose={() => setFormOpen(false)}
        title={t.hutang.editTitle}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={isSubmittingEdit}>
              {t.common.cancel}
            </Button>
            <Button onClick={submitForm} disabled={isSubmittingEdit}>
              {isSubmittingEdit ? "Menyimpan..." : t.common.save}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label={t.hutang.fieldCustomer}
            value={formCustomerId}
            onChange={(e) => setFormCustomerId(e.target.value)}
            error={formErrors.customer}
          >
            <option value="">{t.hutang.selectCustomer}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Input
            type="number"
            min={1}
            label={t.hutang.fieldTotalDebt}
            value={formTotal}
            onChange={(e) => setFormTotal(e.target.value)}
            error={formErrors.total}
            placeholder="0"
          />
        </div>
      </Modal>

      {/* Modal Bayar Hutang: info total/dibayar/sisa + nominal + riwayat (UC-17) */}
      <Modal
        open={paying !== null}
        onClose={() => setPaying(null)}
        title={t.hutang.payTitle}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaying(null)} disabled={isSubmittingPay}>
              {t.common.cancel}
            </Button>
            <Button onClick={submitPay} disabled={isSubmittingPay || (paying ? paying.remaining_debt <= 0 : false)}>
              {isSubmittingPay ? "Memproses..." : t.hutang.payButton}
            </Button>
          </>
        }
      >
        {paying && (
          <div className="space-y-4">
            {/* Informasi hutang (workflow PRD step 3) — baca data terkini */}
            <div className="rounded-lg bg-zinc-50 border border-line p-3 space-y-1.5">
              <p className="text-sm font-semibold text-foreground">{t.hutang.payInfo}</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t.hutang.payTotal}</span>
                <span className="font-medium tabular-nums">{formatRupiah(paying.total_debt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t.hutang.payAlreadyPaid}</span>
                <span className="font-medium tabular-nums">{formatRupiah(paying.total_debt - paying.remaining_debt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">{t.hutang.payRemaining}</span>
                <span className="font-bold text-danger tabular-nums">{formatRupiah(paying.remaining_debt)}</span>
              </div>
            </div>

            <Input
              type="number"
              min={1}
              max={paying.remaining_debt}
              label={t.hutang.payAmount}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setPayError("");
              }}
              error={payError || undefined}
              placeholder="0"
            />
            <Input
              label={t.hutang.payNote}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.hutang.payNotePlaceholder}
            />

            {/* Riwayat pembayaran (DEBT_PAYMENTS) */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">{t.hutang.payHistory}</p>
              {(!paying.payments || paying.payments.length === 0) ? (
                <p className="text-xs text-muted">{t.hutang.payEmptyHistory}</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {paying.payments.map((p) => (
                    <div key={p.payment_id} className="flex items-center justify-between text-sm bg-zinc-50 border border-line rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <p className="tabular-nums font-medium">{formatRupiah(p.amount)}</p>
                        <p className="text-xs text-muted">
                          {formatDateTime(p.payment_date)} · {p.user_name}
                          {p.note ? ` · ${p.note}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

function StatDebt({
  label,
  value,
  icon,
  bg = "bg-primary/10",
  color = "text-primary",
}: {
  label: string;
  value: string;
  icon: string;
  bg?: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-line">
      <div className={`w-10 h-10 rounded-lg ${bg} ${color} flex items-center justify-center shrink-0`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-lg font-bold text-foreground tabular-nums truncate">{value}</p>
      </div>
    </div>
  );
}
