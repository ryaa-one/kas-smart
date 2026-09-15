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
import {
  useDb,
  addCategory,
  updateCategory,
  deleteCategory,
  productsUsingCategory,
  logActivity,
} from "@/lib/mock/db";

export default function KategoriPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const db = useDb(); // store bersama: CATEGORIES + hitungan pemakaian dari PRODUCTS

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [blockMsg, setBlockMsg] = useState("");

  const actor = user ? { id: user.id, name: user.name } : null;

  const openAdd = () => {
    setEditingId(null);
    setName("");
    setError("");
    setModalOpen(true);
  };

  const openEdit = (id: string, current: string) => {
    setEditingId(id);
    setName(current);
    setError("");
    setModalOpen(true);
  };

  const submit = () => {
    if (!name.trim()) {
      setError(t.kategori.errorNameRequired);
      return;
    }
    if (editingId) {
      updateCategory(editingId, name.trim());
      if (actor) logActivity(actor, "categoryEdit", `Ubah kategori ${name.trim()}`);
    } else {
      addCategory(name.trim());
      if (actor) logActivity(actor, "categoryAdd", `Tambah kategori ${name.trim()}`);
    }
    setModalOpen(false);
  };

  // H-1: kategori yang masih dipakai PRODUCTS tidak boleh dihapus.
  const removeCategoryGuarded = (id: string, catName: string) => {
    const used = productsUsingCategory(id);
    if (used > 0) {
      setBlockMsg(t.kategori.errorDeleteInUse.replace("{n}", String(used)));
      return;
    }
    if (!window.confirm(t.kategori.deleteConfirm)) return;
    deleteCategory(id);
    if (actor) logActivity(actor, "categoryDelete", `Hapus kategori ${catName}`);
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
          empty={t.kategori.empty}
          head={
            <>
              <Th>{t.kategori.tableCategory}</Th>
              <Th className="text-center">{t.kategori.tableProductCount}</Th>
              <Th className="text-right">{t.common.actions}</Th>
            </>
          }
        >
          {db.categories.map((c) => (
            <tr key={c.id} className="hover:bg-zinc-50/70">
              <Td className="font-medium text-foreground">{c.name}</Td>
              <Td className="text-center tabular-nums text-muted">
                {db.products.filter((p) => p.category_id === c.id).length}
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <button type="button" onClick={() => openEdit(c.id, c.name)} className={actionBtn} title={t.common.edit} aria-label={t.common.edit}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                  <button type="button" onClick={() => removeCategoryGuarded(c.id, c.name)} className={actionBtn} title={t.common.delete} aria-label={t.common.delete}>
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
        title={editingId ? t.kategori.editTitle : t.kategori.addTitle}
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
