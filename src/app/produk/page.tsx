"use client";

// UC-04 Mengelola Produk — SUMBER DATA: database via API (tanpa fallback mock).
// GET/POST /api/products | PATCH /api/products/:id | DELETE (soft: is_active=false)
// UI (layout, search, filter, modal, scanner ZXing, i18n) dipertahankan 1:1.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { BarcodeScanner } from "@/components/ui/BarcodeScanner";
import { Table, Th, Td } from "@/components/ui/Table";
import { formatRupiah } from "@/lib/format";

interface ApiProduct {
  id: string;
  name: string;
  category_id: string;
  category_name: string | null;
  barcode: string | null;
  purchase_price: number;
  selling_price: number;
  stock: number;
  minimum_stock: number;
  is_active: boolean;
}
interface ApiCategory {
  id: string;
  name: string;
}

interface FormState {
  barcode: string;
  name: string;
  category_id: string;
  purchase_price: string;
  selling_price: string;
  stock: string;
  minimum_stock: string;
  is_active: boolean;
}

const emptyForm: FormState = {
  barcode: "",
  name: "",
  category_id: "",
  purchase_price: "",
  selling_price: "",
  stock: "",
  minimum_stock: "",
  is_active: true,
};

export default function ProdukPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const p = t.produk;

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ApiProduct | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [scannerOpen, setScannerOpen] = useState(false);

  const msg = (code: string): string => {
    switch (code) {
      case "name_required": return p.errorNameRequired;
      case "category_required": return p.errorCategoryRequired;
      case "category_not_found": return p.errorCategoryNotFound;
      case "price_invalid": return p.errorPriceInvalid;
      case "sell_below_purchase": return p.errorSellBelowPurchase;
      case "stock_invalid":
      case "minimum_stock_invalid": return p.errorStockNegative;
      case "barcode_taken": return p.errorBarcodeDuplicate;
      case "barcode_invalid": return p.errorBarcodeInvalid;
      default: return p.errorLoad;
    }
  };

  const showErr = (code: string, field?: keyof FormState) => {
    const text = msg(code);
    if (field) setErrors((e) => ({ ...e, [field]: text }));
    else setToast({ kind: "error", text });
  };

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/products", { credentials: "same-origin" });
      const json = (await res.json().catch(() => null)) as
        | { data?: { products?: ApiProduct[] } }
        | null;
      if (res.ok && json?.data?.products) {
        setProducts(json.data.products);
        setLoadError(null);
      } else {
        setLoadError(p.errorLoad);
      }
    } catch {
      setLoadError(p.errorLoad);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kategori dropdown dari DATABASE (read-only; CRUD kategori tahap tersendiri).
  const refreshCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories", { credentials: "same-origin" });
      if (res.ok) {
        const json = (await res.json()) as { data?: { categories?: ApiCategory[] } };
        setCategories(json.data?.categories ?? []);
      }
    } catch {
      // dropdown tetap kosong; error utama tampil saat submit
    }
  }, []);

  useEffect(() => {
    void refresh();
    void refreshCategories();
  }, [refresh, refreshCategories]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const catName = (id: string) =>
    products.find((x) => x.category_id === id)?.category_name ??
    categories.find((c) => c.id === id)?.name ??
    "-";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (pr) =>
        (!categoryFilter || pr.category_id === categoryFilter) &&
        (!q || pr.name.toLowerCase().includes(q) || (pr.barcode ?? "").includes(q))
    );
  }, [products, query, categoryFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (pr: ApiProduct) => {
    setEditing(pr);
    setForm({
      barcode: pr.barcode ?? "", // null → kosong, BUKAN "-" (H-2)
      name: pr.name,
      category_id: pr.category_id,
      purchase_price: String(pr.purchase_price),
      selling_price: String(pr.selling_price),
      stock: String(pr.stock),
      minimum_stock: String(pr.minimum_stock),
      is_active: pr.is_active,
    });
    setErrors({});
    setModalOpen(true);
  };

  // Validasi utama di SERVER; cek cepat client-side sebatas field wajib
  // agar UX tetap responsif (tanpa menggandakan aturan unik/barcode).
  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = p.errorNameRequired;
    if (!form.category_id) e.category_id = p.errorCategoryRequired;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate() || !user) return;
    const payload = {
      barcode: form.barcode.trim() || null, // null = tanpa barcode (ERD)
      name: form.name.trim(),
      category_id: form.category_id,
      purchase_price: parseInt(form.purchase_price, 10) || 0,
      selling_price: parseInt(form.selling_price, 10) || 0,
      stock: parseInt(form.stock, 10) || 0,
      minimum_stock: parseInt(form.minimum_stock, 10) || 0,
      is_active: form.is_active,
    };
    setSaving(true);
    setErrors({});
    try {
      const res = await fetch(
        editing ? `/api/products/${editing.id}` : "/api/products",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        }
      );
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (res.ok) {
        setModalOpen(false);
        await refresh();
        setToast({
          kind: "success",
          text: editing ? p.successUpdated : p.successAdded,
        });
      } else {
        const code = json?.error ?? "server";
        const fieldMap: Record<string, keyof FormState | undefined> = {
          name_required: "name",
          category_required: "category_id",
          category_not_found: "category_id",
          price_invalid: "purchase_price",
          sell_below_purchase: "selling_price",
          stock_invalid: "stock",
          minimum_stock_invalid: "minimum_stock",
          barcode_taken: "barcode",
          barcode_invalid: "barcode",
        };
        showErr(code, fieldMap[code]);
      }
    } catch {
      setToast({ kind: "error", text: p.errorLoad });
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (pr: ApiProduct) => {
    if (!window.confirm(p.deleteConfirm)) return;
    try {
      const res = await fetch(`/api/products/${pr.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.ok) {
        await refresh();
        setToast({ kind: "success", text: p.successDeactivated });
      } else {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setToast({ kind: "error", text: msg(json?.error ?? "server") });
      }
    } catch {
      setToast({ kind: "error", text: p.errorLoad });
    }
  };

  const toggleActive = async (pr: ApiProduct) => {
    try {
      const res = await fetch(`/api/products/${pr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ is_active: !pr.is_active }),
      });
      if (res.ok) {
        await refresh();
        setToast({
          kind: "success",
          text: pr.is_active ? p.successDeactivated : p.successActivated,
        });
      } else {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setToast({ kind: "error", text: msg(json?.error ?? "server") });
      }
    } catch {
      setToast({ kind: "error", text: p.errorLoad });
    }
  };

  const actionBtn =
    "p-1.5 rounded-md hover:bg-zinc-100 transition-colors shrink-0";

  return (
    <DashboardLayout title={p.title} subtitle={p.subtitle}>
      <Card>
        {/* Toolbar: search + filter kategori + tombol tambah */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0 rounded-lg border border-line bg-zinc-50 px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={p.searchPlaceholder}
              className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted/60"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-line bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <option value="">{p.filterAllCategories}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Button onClick={openAdd}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t.common.add}
          </Button>
        </div>

        {toast && (
          <div
            className={`mb-3 px-3 py-2 rounded-lg text-sm font-medium border ${
              toast.kind === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-danger"
            }`}
            role="status"
          >
            {toast.text}
          </div>
        )}

        {loadError ? (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-danger">
            {loadError}
          </div>
        ) : loading ? (
          <p className="text-center text-sm text-muted py-10">{t.common.loading}</p>
        ) : (
          <Table
            empty={query ? p.emptySearch : p.empty}
            head={
              <>
                <Th>{p.tableBarcode}</Th>
                <Th>{p.tableProduct}</Th>
                <Th>{p.tableCategory}</Th>
                <Th className="text-right">{p.tablePurchasePrice}</Th>
                <Th className="text-right">{p.tableSellingPrice}</Th>
                <Th className="text-center">{p.tableStock}</Th>
                <Th className="text-center">{p.tableStatus}</Th>
                <Th className="text-right">{t.common.actions}</Th>
              </>
            }
          >
            {filtered.map((pr) => (
              <tr key={pr.id} className="hover:bg-zinc-50/70">
                <Td className="tabular-nums text-muted whitespace-nowrap">
                  {pr.barcode ?? <span className="italic">{p.noBarcode}</span>}
                </Td>
                <Td className="font-medium text-foreground">{pr.name}</Td>
                <Td className="text-muted">{catName(pr.category_id)}</Td>
                <Td className="text-right tabular-nums">{formatRupiah(pr.purchase_price)}</Td>
                <Td className="text-right tabular-nums font-medium">{formatRupiah(pr.selling_price)}</Td>
                <Td className="text-center">
                  <span className={`tabular-nums font-medium ${pr.stock <= pr.minimum_stock ? "text-danger" : "text-foreground"}`}>
                    {pr.stock}
                  </span>
                </Td>
                <Td className="text-center">
                  <Badge variant={pr.is_active ? "success" : "muted"}>
                    {pr.is_active ? t.status.active : t.status.inactive}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => openEdit(pr)} className={actionBtn} title={t.common.edit} aria-label={t.common.edit}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(pr)}
                      className={actionBtn}
                      title={pr.is_active ? p.deactivateLabel : p.activateLabel}
                      aria-label={pr.is_active ? p.deactivateLabel : p.activateLabel}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={pr.is_active ? "text-danger" : "text-success"}>
                        {pr.is_active ? (
                          <path d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10" />
                        ) : (
                          <path d="M20 6L9 17l-5-5" />
                        )}
                      </svg>
                    </button>
                    <button type="button" onClick={() => removeProduct(pr)} className={actionBtn} title={p.deactivateLabel} aria-label={p.deactivateLabel}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-muted hover:text-danger">
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

      {/* Modal Tambah/Ubah Produk */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? p.editTitle : p.addTitle}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={submit} disabled={saving}>
              {t.common.save}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input
              label={p.fieldBarcode}
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              placeholder={p.fieldBarcodePlaceholder}
              error={errors.barcode}
            />
            <p className="text-[11px] text-muted mt-1">{p.barcodeOptionalHint}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground sm:invisible" aria-hidden="true">
              {p.scanBarcode}
            </span>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setScannerOpen(true)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 12h10" />
              </svg>
              {p.scanBarcode}
            </Button>
          </div>
          <Select
            label={p.fieldCategory}
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            error={errors.category_id}
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <div className="sm:col-span-2">
            <Input
              label={p.fieldName}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={p.fieldNamePlaceholder}
              error={errors.name}
            />
          </div>
          <Input
            type="number"
            min={0}
            label={p.fieldPurchasePrice}
            value={form.purchase_price}
            onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
            error={errors.purchase_price}
          />
          <Input
            type="number"
            min={0}
            label={p.fieldSellingPrice}
            value={form.selling_price}
            onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
            error={errors.selling_price}
          />
          <Input
            type="number"
            min={0}
            label={p.fieldStock}
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            error={errors.stock}
          />
          <Input
            type="number"
            min={0}
            label={p.fieldMinimumStock}
            value={form.minimum_stock}
            onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })}
            error={errors.minimum_stock}
          />
          <label className="sm:col-span-2 flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-foreground">{p.fieldActive}</span>
          </label>
        </div>

        <BarcodeScanner
          open={scannerOpen}
          onDetected={(code) => {
            setForm((f) => ({ ...f, barcode: code }));
            setScannerOpen(false);
            window.alert(p.scanDetected.replace("{code}", code));
          }}
          onClose={() => setScannerOpen(false)}
        />
      </Modal>
    </DashboardLayout>
  );
}
