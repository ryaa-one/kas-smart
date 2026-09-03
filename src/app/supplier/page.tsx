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
import { mockSuppliers, type Supplier } from "@/lib/mock/master";

interface FormState {
  name: string;
  phone: string;
  address: string;
}

const emptyForm: FormState = { name: "", phone: "", address: "" };

export default function SupplierPage() {
  const { t } = useLang();
  const { user } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone, address: s.address });
    setErrors({});
    setModalOpen(true);
  };

  const submit = () => {
    const e: Partial<FormState> = {};
    if (!form.name.trim()) e.name = t.supplier.errorNameRequired;
    setErrors(e);
    if (Object.keys(e).length) return;

    if (editing) {
      setSuppliers((ss) =>
        ss.map((s) => (s.id === editing.id ? { ...s, ...form, name: form.name.trim() } : s))
      );
    } else {
      setSuppliers((ss) => [
        ...ss,
        {
          id: `SUP-${String(ss.length + 1).padStart(2, "0")}`,
          ...form,
          name: form.name.trim(),
          product_count: 0,
        },
      ]);
    }
    setModalOpen(false);
  };

  const removeSupplier = (s: Supplier) => {
    if (!window.confirm(t.supplier.deleteConfirm)) return;
    setSuppliers((ss) => ss.filter((x) => x.id !== s.id));
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

        <Table
          empty={t.supplier.empty}
          head={
            <>
              <Th>{t.supplier.tableSupplier}</Th>
              <Th>{t.supplier.tablePhone}</Th>
              <Th>{t.supplier.tableAddress}</Th>
              <Th className="text-center">{t.supplier.tableProductCount}</Th>
              <Th className="text-right">{t.common.actions}</Th>
            </>
          }
        >
          {suppliers.map((s) => (
            <tr key={s.id} className="hover:bg-zinc-50/70">
              <Td className="font-medium text-foreground whitespace-nowrap">{s.name}</Td>
              <Td className="text-muted tabular-nums whitespace-nowrap">{s.phone}</Td>
              <Td className="text-muted max-w-xs truncate">{s.address}</Td>
              <Td className="text-center tabular-nums text-muted">{s.product_count}</Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <button type="button" onClick={() => openEdit(s)} className={actionBtn} title={t.common.edit} aria-label={t.common.edit}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                  <button type="button" onClick={() => removeSupplier(s)} className={actionBtn} title={t.common.delete} aria-label={t.common.delete}>
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
        title={editing ? t.supplier.editTitle : t.supplier.addTitle}
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
