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
import { BarcodeScanner } from "@/components/ui/BarcodeScanner";
import { Table, Th, Td } from "@/components/ui/Table";
import { formatRupiah } from "@/lib/format";
import {
  useDb,
  addProduct,
  updateProduct,
  setProductActive,
  barcodeTaken,
  logActivity,
  type Product,
} from "@/lib/mock/db";

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
  const db = useDb(); // store bersama — hasil CRUD terlihat di Transaksi/Laporan/Stok

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [scannerOpen, setScannerOpen] = useState(false);

  const actor = user ? { id: user.id, name: user.name } : null;
  const catName = (id: string) => db.categories.find((c) => c.id === id)?.name ?? "-";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.products.filter(
      (p) =>
        (!categoryFilter || p.category_id === categoryFilter) &&
        (!q || p.name.toLowerCase().includes(q) || (p.barcode ?? "").includes(q))
    );
  }, [db.products, query, categoryFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      barcode: p.barcode ?? "", // null → kosong, BUKAN "-" (H-2)
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
    // H-2: barcode boleh kosong; bila diisi harus UNIQUE (validasi sebelum simpan).
    const bc = form.barcode.trim();
    if (bc && barcodeTaken(bc, editing?.id)) e.barcode = t.produk.errorBarcodeDuplicate;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
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
    if (editing) {
      updateProduct(editing.id, payload);
      if (actor) logActivity(actor, "productEdit", `Ubah produk ${payload.name}`);
    } else {
      addProduct(payload);
      if (actor) logActivity(actor, "productAdd", `Tambah produk ${payload.name}`);
    }
    setModalOpen(false);
  };

  const removeProduct = (p: Product) => {
    if (!window.confirm(t.produk.deleteConfirm)) return;
    setProductActive(p.id, false); // PRD: produk tidak dihapus permanen — nonaktif (UC-04)
    if (actor) logActivity(actor, "productDeactivate", `Nonaktifkan produk ${p.name}`);
  };

  const toggleActive = (p: Product) => {
    setProductActive(p.id, !p.is_active);
    if (actor)
      logActivity(
        actor,
        "productEdit",
        `${p.is_active ? "Nonaktifkan" : "Aktifkan kembali"} produk ${p.name}`
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
            {db.categories.map((c) => (
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
          empty={db.products.length === 0 ? t.produk.empty : t.produk.emptySearch}
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
              <Td className="tabular-nums text-muted whitespace-nowrap">
                {p.barcode ?? <span className="italic">{t.produk.noBarcode}</span>}
              </Td>
              <Td className="font-medium text-foreground">{p.name}</Td>
              <Td className="text-muted">{catName(p.category_id)}</Td>
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
                  <button type="button" onClick={() => removeProduct(p)} className={actionBtn} title={t.produk.deactivateLabel} aria-label={t.produk.deactivateLabel}>
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
          <div>
            <Input
              label={t.produk.fieldBarcode}
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              placeholder={t.produk.fieldBarcodePlaceholder}
              error={errors.barcode}
            />
            <p className="text-[11px] text-muted mt-1">{t.produk.barcodeOptionalHint}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground sm:invisible" aria-hidden="true">
              {t.produk.scanBarcode}
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
              {t.produk.scanBarcode}
            </Button>
          </div>
          <Select
            label={t.produk.fieldCategory}
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            error={errors.category_id}
          >
            <option value="">—</option>
            {db.categories.map((c) => (
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

        <BarcodeScanner
          open={scannerOpen}
          onDetected={(code) => {
            setForm((f) => ({ ...f, barcode: code }));
            setScannerOpen(false);
            window.alert(t.produk.scanDetected.replace("{code}", code));
          }}
          onClose={() => setScannerOpen(false)}
        />
      </Modal>
    </DashboardLayout>
  );
}
