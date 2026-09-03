"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import { formatRupiah } from "@/lib/format";
import { mockCategories, mockProducts, type Product } from "@/lib/mock/master";

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

  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!categoryFilter || p.category_id === categoryFilter) &&
        (!q || p.name.toLowerCase().includes(q) || p.barcode.includes(q))
    );
  }, [products, query, categoryFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      barcode: p.barcode,
      name: p.name,
      category_id: p.category_id,
      purchase_price: String(p.purchase_price),
      selling_price: String(p.selling_price),
      stock: String(p.stock),
      minimum_stock: String(p.minimum_stock),
      is_active: p.is_active,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    const purchase = parseInt(form.purchase_price, 10) || 0;
    const selling = parseInt(form.selling_price, 10) || 0;
    if (!form.name.trim()) e.name = t.produk.errorNameRequired;
    if (!form.category_id) e.category_id = t.produk.errorCategoryRequired;
    if (purchase < 0 || selling < 0) e.purchase_price = t.produk.errorPriceNegative;
    else if (selling <= purchase) e.selling_price = t.produk.errorSellBelowPurchase;
    if ((parseInt(form.stock, 10) || 0) < 0) e.stock = t.produk.errorStockNegative;
    if ((parseInt(form.minimum_stock, 10) || 0) < 0) e.minimum_stock = t.produk.errorStockNegative;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const category = mockCategories.find((c) => c.id === form.category_id);
    if (editing) {
      setProducts((ps) =>
        ps.map((p) =>
          p.id === editing.id
            ? {
                ...p,
                barcode: form.barcode || p.barcode,
                name: form.name,
                category_id: form.category_id,
                category: category?.name ?? p.category,
                purchase_price: parseInt(form.purchase_price, 10) || 0,
                selling_price: parseInt(form.selling_price, 10) || 0,
                stock: parseInt(form.stock, 10) || 0,
                minimum_stock: parseInt(form.minimum_stock, 10) || 0,
                is_active: form.is_active,
              }
            : p
        )
      );
    } else {
      setProducts((ps) => [
        ...ps,
        {
          id: `P-${String(ps.length + 1).padStart(3, "0")}`,
          barcode: form.barcode || "-",
          name: form.name,
          category_id: form.category_id,
          category: category?.name ?? "-",
          purchase_price: parseInt(form.purchase_price, 10) || 0,
          selling_price: parseInt(form.selling_price, 10) || 0,
          stock: parseInt(form.stock, 10) || 0,
          minimum_stock: parseInt(form.minimum_stock, 10) || 0,
          is_active: form.is_active,
        },
      ]);
    }
    setModalOpen(false);
  };

  const removeProduct = (p: Product) => {
    if (!window.confirm(t.produk.deleteConfirm)) return;
    setProducts((ps) => ps.filter((x) => x.id !== p.id));
  };

  const toggleActive = (p: Product) => {
    setProducts((ps) =>
      ps.map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x))
    );
  };

  const actionBtn =
    "p-1.5 rounded-md hover:bg-zinc-100 transition-colors shrink-0";

  return (
    <DashboardLayout title={t.produk.title} subtitle={t.produk.subtitle}>
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
              placeholder={t.produk.searchPlaceholder}
              className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted/60"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-line bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <option value="">{t.produk.filterAllCategories}</option>
            {mockCategories.map((c) => (
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

        <Table
          empty={products.length === 0 ? t.produk.empty : t.produk.emptySearch}
          head={
            <>
              <Th>{t.produk.tableBarcode}</Th>
              <Th>{t.produk.tableProduct}</Th>
              <Th>{t.produk.tableCategory}</Th>
              <Th className="text-right">{t.produk.tablePurchasePrice}</Th>
              <Th className="text-right">{t.produk.tableSellingPrice}</Th>
              <Th className="text-center">{t.produk.tableStock}</Th>
              <Th className="text-center">{t.produk.tableStatus}</Th>
              <Th className="text-right">{t.common.actions}</Th>
            </>
          }
        >
          {filtered.map((p) => (
            <tr key={p.id} className="hover:bg-zinc-50/70">
              <Td className="tabular-nums text-muted whitespace-nowrap">{p.barcode}</Td>
              <Td className="font-medium text-foreground">{p.name}</Td>
              <Td className="text-muted">{p.category}</Td>
              <Td className="text-right tabular-nums">{formatRupiah(p.purchase_price)}</Td>
              <Td className="text-right tabular-nums font-medium">{formatRupiah(p.selling_price)}</Td>
              <Td className="text-center">
                <span className={`tabular-nums font-medium ${p.stock <= p.minimum_stock ? "text-danger" : "text-foreground"}`}>
                  {p.stock}
                </span>
              </Td>
              <Td className="text-center">
                <Badge variant={p.is_active ? "success" : "muted"}>
                  {p.is_active ? t.status.active : t.status.inactive}
                </Badge>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <button type="button" onClick={() => openEdit(p)} className={actionBtn} title={t.common.edit} aria-label={t.common.edit}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(p)}
                    className={actionBtn}
                    title={p.is_active ? t.produk.deactivateLabel : t.produk.activateLabel}
                    aria-label={p.is_active ? t.produk.deactivateLabel : t.produk.activateLabel}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={p.is_active ? "text-danger" : "text-success"}>
                      {p.is_active ? (
                        <path d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10" />
                      ) : (
                        <path d="M20 6L9 17l-5-5" />
                      )}
                    </svg>
                  </button>
                  <button type="button" onClick={() => removeProduct(p)} className={actionBtn} title={t.common.delete} aria-label={t.common.delete}>
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

      {/* Modal Tambah/Ubah Produk */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t.produk.editTitle : t.produk.addTitle}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={submit}>{t.common.save}</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t.produk.fieldBarcode}
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            placeholder={t.produk.fieldBarcodePlaceholder}
          />
          <Select
            label={t.produk.fieldCategory}
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            error={errors.category_id}
          >
            <option value="">—</option>
            {mockCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <div className="sm:col-span-2">
            <Input
              label={t.produk.fieldName}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t.produk.fieldNamePlaceholder}
              error={errors.name}
            />
          </div>
          <Input
            type="number"
            min={0}
            label={t.produk.fieldPurchasePrice}
            value={form.purchase_price}
            onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
            error={errors.purchase_price}
          />
          <Input
            type="number"
            min={0}
            label={t.produk.fieldSellingPrice}
            value={form.selling_price}
            onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
            error={errors.selling_price}
          />
          <Input
            type="number"
            min={0}
            label={t.produk.fieldStock}
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            error={errors.stock}
          />
          <Input
            type="number"
            min={0}
            label={t.produk.fieldMinimumStock}
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
            <span className="text-sm text-foreground">{t.produk.fieldActive}</span>
          </label>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
