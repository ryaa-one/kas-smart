"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import { mockCategories, type Category } from "@/lib/mock/master";

export default function KategoriPage() {
  const { t } = useLang();
  const { user } = useAuth();

  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const openAdd = () => {
    setEditing(null);
    setName("");
    setError("");
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setError("");
    setModalOpen(true);
  };

  const submit = () => {
    if (!name.trim()) {
      setError(t.kategori.errorNameRequired);
      return;
    }
    if (editing) {
      setCategories((cs) =>
        cs.map((c) => (c.id === editing.id ? { ...c, name: name.trim() } : c))
      );
    } else {
      setCategories((cs) => [
        ...cs,
        { id: `CAT-${String(cs.length + 1).padStart(2, "0")}`, name: name.trim(), product_count: 0 },
      ]);
    }
    setModalOpen(false);
  };

  const removeCategory = (c: Category) => {
    if (!window.confirm(t.kategori.deleteConfirm)) return;
    setCategories((cs) => cs.filter((x) => x.id !== c.id));
  };

  const actionBtn = "p-1.5 rounded-md hover:bg-zinc-100 transition-colors";

  return (
    <DashboardLayout title={t.kategori.title} subtitle={t.kategori.subtitle}>
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
          empty={t.kategori.empty}
          head={
            <>
              <Th>{t.kategori.tableCategory}</Th>
              <Th className="text-center">{t.kategori.tableProductCount}</Th>
              <Th className="text-right">{t.common.actions}</Th>
            </>
          }
        >
          {categories.map((c) => (
            <tr key={c.id} className="hover:bg-zinc-50/70">
              <Td className="font-medium text-foreground">{c.name}</Td>
              <Td className="text-center tabular-nums text-muted">{c.product_count}</Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <button type="button" onClick={() => openEdit(c)} className={actionBtn} title={t.common.edit} aria-label={t.common.edit}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                  <button type="button" onClick={() => removeCategory(c)} className={actionBtn} title={t.common.delete} aria-label={t.common.delete}>
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
        title={editing ? t.kategori.editTitle : t.kategori.addTitle}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={submit}>{t.common.save}</Button>
          </>
        }
      >
        <Input
          label={t.kategori.fieldName}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.kategori.fieldNamePlaceholder}
          error={error}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </Modal>
    </DashboardLayout>
  );
}
