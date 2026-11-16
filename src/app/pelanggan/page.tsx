"use client";

import { useState, useEffect, useMemo } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { formatDateTime, formatRupiah } from "@/lib/format";
import type {
  SerializedCustomer,
  SerializedCustomerDetail,
} from "@/lib/customer-api";

interface FormState {
  name: string;
  phone: string;
  address: string;
}

const emptyForm: FormState = { name: "", phone: "", address: "" };

export default function PelangganPage() {
  const { t } = useLang();

  const [customers, setCustomers] = useState<SerializedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState<SerializedCustomerDetail | null>(null);

  const [blockMsg, setBlockMsg] = useState("");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let active = true;
    async function loadCustomers() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/customers", { credentials: "same-origin" });
        if (!res.ok) {
          throw new Error(res.status === 401 ? "unauthorized" : "fetch_failed");
        }
        const json = await res.json();
        if (active) {
          setCustomers(json.data?.customers || []);
        }
      } catch {
        if (active) {
          setError(t.pelanggan.errorLoadFailed);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadCustomers();
    return () => {
      active = false;
    };
  }, [refreshTrigger, t.pelanggan.errorLoadFailed]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const resetFilters = () => {
    setQuery("");
    setCurrentPage(1);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEdit = (c: SerializedCustomer) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      phone: c.phone || "",
      address: c.address || "",
    });
    setFieldErrors({});
    setModalOpen(true);
  };

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setDetail(null);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setDetailError(t.pelanggan.errorDetailFailed);
        return;
      }
      setDetail(json.data.customer);
    } catch {
      setDetailError("Koneksi ke server terganggu");
    } finally {
      setDetailLoading(false);
    }
  };

  const submit = async () => {
    setFieldErrors({});
    const e: Partial<FormState> = {};

    if (!form.name.trim()) {
      e.name = t.pelanggan.errorNameRequired;
    }

    if (Object.keys(e).length > 0) {
      setFieldErrors(e);
      return;
    }

    setSubmitting(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/customers/${editingId}` : "/api/customers";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const errCode = json.error;

        if (errCode === "name_required") {
          setFieldErrors({ name: t.pelanggan.errorNameRequired });
        } else if (errCode === "name_too_long") {
          setFieldErrors({ name: t.pelanggan.errorNameTooLong });
        } else if (errCode === "phone_too_long") {
          setFieldErrors({ phone: t.pelanggan.errorPhoneTooLong });
        } else if (errCode === "address_too_long") {
          setFieldErrors({ address: t.pelanggan.errorAddressTooLong });
        } else if (res.status === 403) {
          setFieldErrors({ name: t.common.forbidden });
        } else {
          setFieldErrors({
            name: editingId
              ? t.pelanggan.errorUpdateFailed
              : t.pelanggan.errorAddFailed,
          });
        }
        return;
      }

      setModalOpen(false);
      setRefreshTrigger((k) => k + 1);
    } catch {
      setFieldErrors({ name: "Koneksi ke server terganggu" });
    } finally {
      setSubmitting(false);
    }
  };

  const removeCustomerGuarded = async (c: SerializedCustomer) => {
    if (c.sales_count > 0 || c.debt_count > 0) {
      setBlockMsg(
        t.pelanggan.errorDeleteInUse
          .replace("{sales}", String(c.sales_count))
          .replace("{debts}", String(c.debt_count))
      );
      return;
    }

    if (!window.confirm(t.pelanggan.deleteConfirm)) return;

    setBlockMsg("");
    try {
      const res = await fetch(`/api/customers/${c.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.error === "customer_in_use") {
          setBlockMsg(
            t.pelanggan.errorDeleteInUse
              .replace("{sales}", String(json.sales_count ?? 0))
              .replace("{debts}", String(json.debt_count ?? 0))
          );
        } else if (res.status === 403) {
          setBlockMsg(t.common.forbidden);
        } else {
          setBlockMsg(t.pelanggan.errorDeleteFailed);
        }
        return;
      }

      setRefreshTrigger((k) => k + 1);
    } catch {
      setBlockMsg("Koneksi ke server terganggu");
    }
  };

  const actionBtn = "p-1.5 rounded-md hover:bg-zinc-100 transition-colors";

  const saleStatusLabel = (s: string) => {
    const lower = s.toLowerCase();
    if (lower === "lunas" || lower === "paid") return t.riwayat.statusPaid;
    if (lower === "hutang" || lower === "debt") return t.riwayat.statusDebt;
    if (lower === "menunggu pembayaran" || lower === "menunggu_pembayaran" || lower === "waiting_payment")
      return t.riwayat.statusWaiting;
    if (lower === "dibatalkan" || lower === "cancelled") return t.riwayat.statusCancelled;
    if (lower === "draft") return t.riwayat.statusDraft;
    return s;
  };

  return (
    <DashboardLayout title={t.pelanggan.title} subtitle={t.pelanggan.subtitle}>
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0 rounded-lg border border-line bg-zinc-50 px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-colors">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-muted shrink-0"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={t.pelanggan.searchPlaceholder}
              className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted/60"
            />
          </div>
          {query.trim() !== "" && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-2 rounded-lg border border-dashed border-line hover:border-danger hover:text-danger text-muted text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto"
            >
              {t.common.resetFilter}
            </button>
          )}
          <div className="sm:ml-auto">
            <Button onClick={openAdd}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t.common.add}
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start justify-between gap-3 rounded-lg bg-danger/10 border border-danger/30 text-danger px-4 py-3 text-sm font-medium"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 text-xs underline underline-offset-2"
            >
              {t.common.close}
            </button>
          </div>
        )}

        {blockMsg && (
          <div
            role="alert"
            className="mb-4 flex items-start justify-between gap-3 rounded-lg bg-danger/10 border border-danger/30 text-danger px-4 py-3 text-sm font-medium"
          >
            <span>{blockMsg}</span>
            <button
              type="button"
              onClick={() => setBlockMsg("")}
              className="shrink-0 text-xs underline underline-offset-2"
            >
              {t.common.close}
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center text-muted py-8">{t.common.loading}</div>
        ) : (
          <>
            <Table
              empty={query.trim() ? t.pelanggan.emptySearch : t.pelanggan.empty}
              head={
                <>
                  <Th>{t.pelanggan.tableCustomer}</Th>
                  <Th>{t.pelanggan.tablePhone}</Th>
                  <Th>{t.pelanggan.tableAddress}</Th>
                  <Th className="text-center">{t.pelanggan.tableSalesCount}</Th>
                  <Th className="text-center">{t.pelanggan.tableDebtCount}</Th>
                  <Th className="text-right">{t.common.actions}</Th>
                </>
              }
            >
              {paginated.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50/70">
                  <Td className="font-medium text-foreground whitespace-nowrap">
                    {c.name}
                  </Td>
                  <Td className="text-muted tabular-nums whitespace-nowrap">
                    {c.phone || "-"}
                  </Td>
                  <Td className="text-muted max-w-xs truncate">
                    {c.address || "-"}
                  </Td>
                  <Td className="text-center tabular-nums text-muted">
                    {c.sales_count}
                  </Td>
                  <Td className="text-center tabular-nums text-muted">
                    {c.debt_count}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openDetail(c.id)}
                      >
                        {t.common.detail}
                      </Button>
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className={actionBtn}
                        title={t.common.edit}
                        aria-label={t.common.edit}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-muted"
                        >
                          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomerGuarded(c)}
                        className={actionBtn}
                        title={t.common.delete}
                        aria-label={t.common.delete}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-muted hover:text-danger"
                        >
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </>
        )}
      </Card>

      {/* Modal Tambah / Ubah Pelanggan */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? t.pelanggan.editTitle : t.pelanggan.addTitle}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? t.common.loading : t.common.save}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t.pelanggan.fieldName}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={fieldErrors.name}
            placeholder={t.pelanggan.fieldNamePlaceholder}
            autoFocus
          />
          <Input
            type="tel"
            label={t.pelanggan.fieldPhone}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            error={fieldErrors.phone}
            placeholder={t.pelanggan.fieldPhonePlaceholder}
          />
          <Textarea
            label={t.pelanggan.fieldAddress}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            error={fieldErrors.address}
            placeholder={t.pelanggan.fieldAddressPlaceholder}
            rows={3}
          />
        </div>
      </Modal>

      {/* Modal Detail Pelanggan */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={t.pelanggan.detailTitle}
        footer={
          <Button variant="secondary" onClick={() => setDetailOpen(false)}>
            {t.common.close}
          </Button>
        }
      >
        {detailLoading ? (
          <div className="py-8 text-center text-sm text-muted">
            {t.common.loading}
          </div>
        ) : detailError ? (
          <div className="rounded-lg bg-danger/10 border border-danger/30 text-danger px-4 py-3 text-sm">
            {detailError}
          </div>
        ) : (
          detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm p-3 rounded-lg bg-zinc-50 border border-line">
                <div>
                  <p className="text-xs text-muted">{t.pelanggan.fieldName}</p>
                  <p className="font-semibold text-foreground">{detail.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">{t.pelanggan.fieldPhone}</p>
                  <p className="font-medium tabular-nums">
                    {detail.phone || "-"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted">{t.pelanggan.fieldAddress}</p>
                  <p className="font-medium">{detail.address || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">
                    {t.pelanggan.tableSalesCount}
                  </p>
                  <p className="font-semibold tabular-nums">
                    {detail.sales_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">
                    {t.pelanggan.tableDebtCount}
                  </p>
                  <p className="font-semibold tabular-nums">
                    {detail.debt_count}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                  {t.pelanggan.recentSalesTitle}
                </h4>
                {detail.recent_sales.length === 0 ? (
                  <p className="text-xs text-muted">
                    {t.pelanggan.noRecentSales}
                  </p>
                ) : (
                  <div className="rounded-lg border border-line overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-zinc-50 text-left text-muted">
                          <th className="px-3 py-2 font-semibold">Invoice</th>
                          <th className="px-3 py-2 font-semibold">Tanggal</th>
                          <th className="px-3 py-2 font-semibold text-center">
                            Status
                          </th>
                          <th className="px-3 py-2 font-semibold text-right">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {detail.recent_sales.map((s) => (
                          <tr key={s.sale_id}>
                            <td className="px-3 py-2 font-medium tabular-nums">
                              {s.invoice_number ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-muted whitespace-nowrap">
                              {formatDateTime(s.transaction_date)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Badge
                                variant={
                                  s.status === "LUNAS" || s.status === "Lunas"
                                    ? "success"
                                    : s.status === "HUTANG" || s.status === "Hutang"
                                    ? "primary"
                                    : s.status === "DIBATALKAN" || s.status === "Dibatalkan"
                                    ? "danger"
                                    : "muted"
                                }
                              >
                                {saleStatusLabel(s.status)}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right font-medium tabular-nums">
                              {formatRupiah(s.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                  {t.pelanggan.debtRecordsTitle}
                </h4>
                {detail.debt_records.length === 0 ? (
                  <p className="text-xs text-muted">
                    {t.pelanggan.noDebtRecords}
                  </p>
                ) : (
                  <div className="rounded-lg border border-line overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-zinc-50 text-left text-muted">
                          <th className="px-3 py-2 font-semibold">Invoice</th>
                          <th className="px-3 py-2 font-semibold text-right">
                            Total
                          </th>
                          <th className="px-3 py-2 font-semibold text-right">
                            Sisa
                          </th>
                          <th className="px-3 py-2 font-semibold text-center">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {detail.debt_records.map((d) => (
                          <tr key={d.debt_id}>
                            <td className="px-3 py-2 font-medium tabular-nums">
                              {d.invoice_number ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatRupiah(d.total_debt)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium tabular-nums">
                              {formatRupiah(d.remaining_debt)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Badge
                                variant={
                                  d.status === "Paid"
                                    ? "success"
                                    : d.status === "Partial"
                                    ? "warning"
                                    : "danger"
                                }
                              >
                                {d.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </Modal>
    </DashboardLayout>
  );
}
