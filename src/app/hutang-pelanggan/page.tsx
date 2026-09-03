"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { mockDebts, type DebtRecord, type DebtStatus } from "@/lib/mock/owner";

const debtBadge = (status: DebtStatus): "danger" | "warning" | "success" =>
  status === "Unpaid" ? "danger" : status === "Partial" ? "warning" : "success";

export default function HutangPelangganPage() {
  const { t } = useLang();
  const { user } = useAuth();

  const [debts, setDebts] = useState<DebtRecord[]>(mockDebts);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DebtStatus | "">("");
  const [paying, setPaying] = useState<DebtRecord | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState(false);

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

  const openPay = (d: DebtRecord) => {
    setPaying(d);
    setAmount("");
    setNote("");
    setPayError("");
    setPaySuccess(false);
  };

  const submitPay = () => {
    if (!paying) return;
    const n = parseInt(amount, 10) || 0;
    if (n <= 0) {
      setPayError(t.hutang.errorAmountMin);
      return;
    }
    if (n > paying.remaining_debt) {
      setPayError(t.hutang.errorAmountOver);
      return;
    }
    setDebts((ds) =>
      ds.map((d) => {
        if (d.id !== paying.id) return d;
        const remaining = d.remaining_debt - n;
        return {
          ...d,
          remaining_debt: remaining,
          status: remaining === 0 ? "Paid" : "Partial",
          payments: [
            ...d.payments,
            {
              id: `DP-${String(d.payments.length + 1).padStart(3, "0")}`,
              payment_date: new Date().toISOString().slice(0, 10),
              amount: n,
              user_name: user?.name ?? "-",
              note,
            },
          ],
        };
      })
    );
    setPaying(null);
    setPaySuccess(true);
  };

  return (
    <DashboardLayout title={t.hutang.title} subtitle={t.hutang.subtitle}>
      {/* Ringkasan hutang */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>}
          label={t.hutang.tableTotal}
          value={formatRupiah(totals.totalDebt)}
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
          label={t.hutang.tablePaid}
          value={formatRupiah(totals.paid)}
          bgColor="bg-success/10"
          iconColor="text-success"
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3l4 4 4-4 3 3-7 7-7-7 3-3zM12 17v4M8 19h8" /></svg>}
          label={t.hutang.tableRemaining}
          value={formatRupiah(totals.remaining)}
          bgColor="bg-rose-600/10"
          iconColor="text-rose-600"
        />
      </div>

      {paySuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-success/10 text-success px-4 py-3 text-sm font-medium">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
          {t.hutang.paySuccess}
        </div>
      )}

      <Card>
        {/* Toolbar: search + filter status */}
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
        </div>

        <Table
          empty={debts.length === 0 ? t.hutang.empty : t.hutang.emptySearch}
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
            <tr key={d.id} className="hover:bg-zinc-50/70">
              <Td className="font-medium text-foreground whitespace-nowrap">{d.customer_name}</Td>
              <Td className="tabular-nums text-muted whitespace-nowrap">{d.sale_id}</Td>
              <Td className="text-muted whitespace-nowrap">{formatDate(d.created_at)}</Td>
              <Td className="text-right tabular-nums">{formatRupiah(d.total_debt)}</Td>
              <Td className={`text-right tabular-nums font-medium ${d.remaining_debt > 0 ? "text-danger" : "text-success"}`}>
                {formatRupiah(d.remaining_debt)}
              </Td>
              <Td className="text-center">
                <Badge variant={debtBadge(d.status)}>{d.status}</Badge>
              </Td>
              <Td>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => openPay(d)}
                    disabled={d.remaining_debt <= 0}
                  >
                    {t.hutang.payButton}
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Modal Bayar Hutang: info total/dibayar/sisa + nominal + riwayat */}
      <Modal
        open={paying !== null}
        onClose={() => setPaying(null)}
        title={t.hutang.payTitle}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaying(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={submitPay} disabled={paying ? paying.remaining_debt <= 0 : false}>
              {t.hutang.payButton}
            </Button>
          </>
        }
      >
        {paying && (
          <div className="space-y-4">
            {/* Informasi hutang (workflow PRD step 3) */}
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
              {paying.payments.length === 0 ? (
                <p className="text-xs text-muted">{t.hutang.payEmptyHistory}</p>
              ) : (
                <div className="space-y-1.5">
                  {paying.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm bg-zinc-50 border border-line rounded-lg px-3 py-2">
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
