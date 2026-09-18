"use client";

// UC-05 Mengelola Kategori — SUMBER DATA: database via API (tanpa fallback mock).
// GET/POST /api/categories | GET/PATCH/DELETE /api/categories/:id
// UI layout/responsif/i18n tetap sama, hanya source data yang berubah.

import { useState, useEffect, useMemo } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";

interface Category {
  id: string;
  name: string;
  product_count: number;
}

export default function KategoriPage() {
  const { t } = useLang();
  const { user } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [blockMsg, setBlockMsg] = useState("");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  // Reset ke halaman 1 saat pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  // Pastikan halaman tetap valid bila total data berkurang
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const resetFilters = () => {
    setQuery("");
    setCurrentPage(1);
  };

  // Fetch categories dari API
  const fetchCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/categories", { credentials: "same-origin" });
      if (!res.ok) {
        if (res.status === 401) throw new Error("unauthorized");
        throw new Error("fetch_failed");
      }
      const json = await res.json();
      setCategories(json.data?.categories || []);
    } catch (err) {
      setError(t.kategori.errorLoadFailed || "Gagal memuat data kategori");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setName("");
    setFieldError("");
    setModalOpen(true);
  };

  const openEdit = (id: string, current: string) => {
    setEditingId(id);
    setName(current);
    setFieldError("");
    setModalOpen(true);
  };

  const submit = async () => {
    setFieldError("");
    if (!name.trim()) {
      setFieldError(t.kategori.errorNameRequired);
      return;
    }

    setSubmitting(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/categories/${editingId}` : "/api/categories";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const errCode = json.error || json.name;
        if (errCode === "name_required") {
          setFieldError(t.kategori.errorNameRequired);
        } else if (errCode === "name_too_long") {
          setFieldError(t.kategori.errorNameTooLong || "Nama terlalu panjang");
        } else if (res.status === 403) {
          setFieldError(t.common.forbidden || "Tidak diizinkan");
        } else {
          setFieldError(
            editingId
              ? t.kategori.errorUpdateFailed || "Gagal mengubah kategori"
              : t.kategori.errorAddFailed || "Gagal menambah kategori"
          );
        }
        return;
      }

      setModalOpen(false);
      await fetchCategories();
    } catch (err) {
      setFieldError("Koneksi ke server terganggu");
    } finally {
      setSubmitting(false);
    }
  };

  const removeCategoryGuarded = async (id: string, catName: string) => {
    const cat = categories.find((c) => c.id === id);
    if (cat && cat.product_count > 0) {
      setBlockMsg(
        (t.kategori.errorDeleteInUse || "Kategori masih digunakan {n} produk")
          .replace("{n}", String(cat.product_count))
      );
      return;
    }

    if (!window.confirm(t.kategori.deleteConfirm)) return;

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.error === "category_in_use") {
          setBlockMsg(
            (t.kategori.errorDeleteInUse || "Kategori masih digunakan {n} produk")
              .replace("{n}", String(json.product_count || 0))
          );
        } else if (res.status === 403) {
          setBlockMsg(t.common.forbidden || "Tidak diizinkan");
        } else {
          setBlockMsg(t.kategori.errorDeleteFailed || "Gagal menghapus kategori");
        }
        return;
      }

      await fetchCategories();
    } catch (err) {
      setBlockMsg("Koneksi ke server terganggu");
    }
  };

  const actionBtn = "p-1.5 rounded-md hover:bg-zinc-100 transition-colors";

  return (
    <DashboardLayout title={t.kategori.title} subtitle={t.kategori.subtitle}>
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0 rounded-lg border border-line bg-zinc-50 px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.kategori.searchPlaceholder || "Cari nama kategori..."}
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
          <div className="text-center text-muted py-8">
            {t.common.loading || "Memuat..."}
          </div>
        ) : (
          <>
            <Table
              empty={query.trim() ? (t.kategori.emptySearch || "Tidak ada kategori yang cocok") : t.kategori.empty}
              head={
                <>
                  <Th>{t.kategori.tableCategory}</Th>
                  <Th className="text-center">{t.kategori.tableProductCount}</Th>
                  <Th className="text-right">{t.common.actions}</Th>
                </>
              }
            >
              {paginated.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50/70">
                  <Td className="font-medium text-foreground">{c.name}</Td>
                  <Td className="text-center tabular-nums text-muted">
                    {c.product_count}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(c.id, c.name)}
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
                        onClick={() => removeCategoryGuarded(c.id, c.name)}
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
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
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
            <Button onClick={submit} disabled={submitting}>
              {submitting ? t.common.loading || "..." : t.common.save}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t.kategori.fieldName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldError}
            placeholder={t.kategori.fieldNamePlaceholder || "Nama kategori"}
            autoFocus
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}
