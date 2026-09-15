"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import {
  useDb,
  addSupplier,
  updateSupplier,
  deleteSupplier,
  purchasesUsingSupplier,
  logActivity,
} from "@/lib/mock/db";

interface FormState {
  name: string;
  phone: string;
  address: string;
}

const emptyForm: FormState = { name: "", phone: "", address: "" };

export default function SupplierPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const db = useDb(); // store bersama: SUPPLIERS + pemakaian dari PURCHASES

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [blockMsg, setBlockMsg] = useState("");

  const actor = user ? { id: user.id, name: user.name } : null;

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (s: { id: string; name: string; phone: string; address: string }) => {
    setEditingId(s.id);
    setForm({ name: s.name, phone: s.phone, address: s.address });
    setErrors({});
    setModalOpen(true);
  };

  const submit = () => {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = t.supplier.errorNameRequired;
    setErrors(e);
    if (Object.keys(e).length) return;

    if (editingId) {
      updateSupplier(editingId, { ...form, name: form.name.trim() });
      if (actor) logActivity(actor, "supplierEdit", `Ubah supplier ${form.name.trim()}`);
    } else {
      addSupplier({ ...form, name: form.name.trim() });
      if (actor) logActivity(actor, "supplierAdd", `Tambah supplier ${form.name.trim()}`);
    }
    setModalOpen(false);
  };

  // H-1: supplier yang masih dipakai PURCHASES tidak boleh dihapus.
  const removeSupplierGuarded = (id: string, supName: string) => {
    const used = purchasesUsingSupplier(id);
    if (used > 0) {
      setBlockMsg(t.supplier.errorDeleteInUse.replace("{n}", String(used)));
      return;
    }
    if (!window.confirm(t.supplier.deleteConfirm)) return;
    deleteSupplier(id);
    if (actor) logActivity(actor, "supplierDelete", `Hapus supplier ${supName}`);
  };

  const actionBtn = "p-1.5 rounded-md hover:bg-zinc-100 transition-colors";

  return (
    <DashboardLayout title={t.supplier.title} subtitle={t.supplier.subtitle}>
      <Card>
        <div className="flex justify-end mb-4">
          <Button onClick={openAdd}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t.common.add}
          </Button>
        </div>

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
          {db.suppliers.map((s) => (
            <tr key={s.id} className="hover:bg-zinc-50/70">
              <Td className="font-medium text-foreground whitespace-nowrap">{s.name}</Td>
              <Td className="text-muted tabular-nums whitespace-nowrap">{s.phone}</Td>
              <Td className="text-muted max-w-xs truncate">{s.address}</Td>
              <Td className="text-center tabular-nums text-muted">
                {db.purchases.filter((p) => p.supplier_id === s.id).length}
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <button type="button" onClick={() => openEdit(s)} className={actionBtn} title={t.common.edit} aria-label={t.common.edit}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                  <button type="button" onClick={() => removeSupplierGuarded(s.id, s.name)} className={actionBtn} title={t.common.delete} aria-label={t.common.delete}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-muted hover:text-danger">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                    </svg>
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
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
            <Button onClick={submit}>{t.common.save}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t.supplier.fieldName}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t.supplier.fieldNamePlaceholder}
            error={errors.name}
          />
          <Input
            type="tel"
            label={t.supplier.fieldPhone}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder={t.supplier.fieldPhonePlaceholder}
          />
          <Textarea
            label={t.supplier.fieldAddress}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder={t.supplier.fieldAddressPlaceholder}
            rows={3}
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}
