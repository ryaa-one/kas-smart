"use client";

// UC-06 Mengelola Supplier — SUMBER DATA: database via API (tanpa fallback mock).
// GET/POST /api/suppliers | GET/PATCH/DELETE /api/suppliers/:id
// UI layout/responsif/i18n tetap sama, hanya source data yang berubah.

import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";

interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  purchase_count: number;
}

interface FormState {
  name: string;
  phone: string;
  address: string;
}

const emptyForm: FormState = { name: "", phone: "", address: "" };

export default function SupplierPage() {
  const { t } = useLang();
  const { user } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);

  const [blockMsg, setBlockMsg] = useState("");

  // Fetch suppliers dari API
  const fetchSuppliers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/suppliers", { credentials: "same-origin" });
      if (!res.ok) {
        if (res.status === 401) throw new Error("unauthorized");
        throw new Error("fetch_failed");
      }
      const json = await res.json();
      setSuppliers(json.data?.suppliers || []);
    } catch (err) {
      setError(t.supplier.errorLoadFailed || "Gagal memuat data supplier");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({ name: s.name, phone: s.phone, address: s.address });
    setFieldErrors({});
    setModalOpen(true);
  };

  const submit = async () => {
    setFieldErrors({});
    const e: Partial<FormState> = {};
    
    if (!form.name.trim()) {
      e.name = t.supplier.errorNameRequired;
    }
    
    if (Object.keys(e).length > 0) {
      setFieldErrors(e);
      return;
    }

    setSubmitting(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/suppliers/${editingId}` : "/api/suppliers";
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
          setFieldErrors({ name: t.supplier.errorNameRequired });
        } else if (errCode === "name_too_long") {
          setFieldErrors({ name: t.supplier.errorNameTooLong || "Nama terlalu panjang" });
        } else if (errCode === "phone_too_long") {
          setFieldErrors({ phone: t.supplier.errorPhoneTooLong || "Nomor telepon terlalu panjang" });
        } else if (errCode === "address_too_long") {
          setFieldErrors({ address: t.supplier.errorAddressTooLong || "Alamat terlalu panjang" });
        } else if (res.status === 403) {
          setFieldErrors({ name: t.common.forbidden || "Tidak diizinkan" });
        } else {
          setFieldErrors({
            name: editingId
              ? t.supplier.errorUpdateFailed || "Gagal mengubah supplier"
              : t.supplier.errorAddFailed || "Gagal menambah supplier"
          });
        }
        return;
      }

      setModalOpen(false);
      await fetchSuppliers();
    } catch (err) {
      setFieldErrors({ name: "Koneksi ke server terganggu" });
    } finally {
      setSubmitting(false);
    }
  };

  const removeSupplierGuarded = async (id: string, supName: string) => {
    const sup = suppliers.find((s) => s.id === id);
    if (sup && sup.purchase_count > 0) {
      setBlockMsg(
        (t.supplier.errorDeleteInUse || "Supplier masih digunakan {n} pembelian")
          .replace("{n}", String(sup.purchase_count))
      );
      return;
    }

    if (!window.confirm(t.supplier.deleteConfirm)) return;

    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.error === "supplier_in_use") {
          setBlockMsg(
            (t.supplier.errorDeleteInUse || "Supplier masih digunakan {n} pembelian")
              .replace("{n}", String(json.purchase_count || 0))
          );
        } else if (res.status === 403) {
          setBlockMsg(t.common.forbidden || "Tidak diizinkan");
        } else {
          setBlockMsg(t.supplier.errorDeleteFailed || "Gagal menghapus supplier");
        }
        return;
      }

      await fetchSuppliers();
    } catch (err) {
      setBlockMsg("Koneksi ke server terganggu");
    }
  };

  const actionBtn = "p-1.5 rounded-md hover:bg-zinc-100 transition-colors";

  return (
    <DashboardLayout title={t.supplier.title} subtitle={t.supplier.subtitle}>
      <Card>
        <div className="flex justify-end mb-4">
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
          <div className="text-center text-muted py-8">
            {t.common.loading || "Memuat..."}
          </div>
        ) : (
          <Table
            empty={t.supplier.empty}
            head={
              <>
                <Th>{t.supplier.tableSupplier}</Th>
                <Th>{t.supplier.tablePhone}</Th>
                <Th>{t.supplier.tableAddress}</Th>
                <Th className="text-center">{t.supplier.tablePurchaseCount}</Th>
                <Th className="text-right">{t.common.actions}</Th>
              </>
            }
          >
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-zinc-50/70">
                <Td className="font-medium text-foreground whitespace-nowrap">{s.name}</Td>
                <Td className="text-muted tabular-nums whitespace-nowrap">{s.phone}</Td>
                <Td className="text-muted max-w-xs truncate">{s.address}</Td>
                <Td className="text-center tabular-nums text-muted">{s.purchase_count}</Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
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
                      onClick={() => removeSupplierGuarded(s.id, s.name)}
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
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? t.supplier.editTitle : t.supplier.addTitle}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? t.common.loading || "..." : t.common.save}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t.supplier.fieldName}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={fieldErrors.name}
            placeholder={t.supplier.fieldNamePlaceholder || "Nama supplier"}
            autoFocus
          />
          <Input
            label={t.supplier.fieldPhone}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            error={fieldErrors.phone}
            placeholder={t.supplier.fieldPhonePlaceholder || "Nomor telepon"}
          />
          <Textarea
            label={t.supplier.fieldAddress}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            error={fieldErrors.address}
            placeholder={t.supplier.fieldAddressPlaceholder || "Alamat lengkap"}
            rows={3}
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}
