"use client";

// UC-07 Mengelola Pembelian — SUMBER DATA: database via API (tanpa fallback mock).
// GET/POST /api/purchases | GET/PATCH/DELETE /api/purchases/:id
// Stok management: CREATE → stok bertambah, EDIT → adjust stok, DELETE → kembalikan stok.
// Owner: full CRUD. Kasir: read-only (tombol Tambah/Edit/Hapus hidden).
import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import { formatDate, formatRupiah } from "@/lib/format";

interface PurchaseDetail {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_purchase_price: number;
  subtotal: number;
}

interface Purchase {
  id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  user_id: string;
  user_name: string;
  purchase_date: string;
  details: PurchaseDetail[];
  total: number;
  items_count: number;
}

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  purchase_price: number;
}

interface Line {
  product_id: string;
  quantity: string;
  unit_purchase_price: string;
}

// Form Tambah Pembelian (Owner only).
function PurchaseForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { t } = useLang();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ product_id: "", quantity: "", unit_purchase_price: "" }]);
  const [errors, setErrors] = useState<{ lines?: Record<number, { product?: string; quantity?: string }> }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/suppliers").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/products").then((r) => (r.ok ? r.json() : null)),
    ]).then(([supRes, proRes]) => {
      if (supRes?.data?.suppliers) setSuppliers(supRes.data.suppliers);
      if (proRes?.data?.products) setProducts(proRes.data.products);
    });
  }, []);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const pickProduct = (i: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    setLine(i, {
      product_id: productId,
      unit_purchase_price: p ? String(p.purchase_price) : "",
    });
  };

  const total = lines.reduce(
    (s, l) => s + (parseInt(l.quantity, 10) || 0) * (parseInt(l.unit_purchase_price, 10) || 0),
    0
  );

  const submit = async () => {
    const lineErrors: Record<number, { product?: string; quantity?: string }> = {};
    lines.forEach((l, i) => {
      const le: { product?: string; quantity?: string } = {};
      if (!l.product_id) le.product = t.pembelian.errorProductRequired;
      if ((parseInt(l.quantity, 10) || 0) < 1) le.quantity = t.pembelian.errorQuantityMin;
      if (Object.keys(le).length) lineErrors[i] = le;
    });
    setErrors(Object.keys(lineErrors).length ? { lines: lineErrors } : {});
    if (Object.keys(lineErrors).length) return;

    setLoading(true);
    setError("");

    const body = {
      supplier_id: supplierId || null,
      details: lines.map((l) => ({
        product_id: l.product_id,
        quantity: parseInt(l.quantity, 10) || 0,
        unit_purchase_price: parseInt(l.unit_purchase_price, 10) || 0,
      })),
    };

    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.error === "forbidden") {
          setError(t.common.errorForbidden);
        } else if (json.error === "product_not_found") {
          setError(t.pembelian.errorProductNotFound);
        } else if (json.error === "supplier_not_found") {
          setError(t.pembelian.errorSupplierNotFound);
        } else {
          setError(t.pembelian.errorAddFailed);
        }
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Koneksi ke server terganggu");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <Select
        label={`${t.pembelian.fieldSupplier} ${t.pembelian.supplierOptional}`}
        value={supplierId}
        onChange={(e) => setSupplierId(e.target.value)}
        disabled={loading}
      >
        <option value="">{t.pembelian.noSupplier}</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>

      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">{t.pembelian.fieldProduct}</label>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_90px_140px_auto] gap-2 items-start">
            <Select
              value={l.product_id}
              onChange={(e) => pickProduct(i, e.target.value)}
              error={errors.lines?.[i]?.product}
              disabled={loading}
            >
              <option value="">{t.pembelian.selectProduct}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min={1}
              placeholder={t.pembelian.fieldQuantity}
              value={l.quantity}
              onChange={(e) => setLine(i, { quantity: e.target.value })}
              error={errors.lines?.[i]?.quantity}
              disabled={loading}
            />
            <Input
              type="number"
              min={0}
              placeholder={t.pembelian.fieldUnitPrice}
              value={l.unit_purchase_price}
              onChange={(e) => setLine(i, { unit_purchase_price: e.target.value })}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
              disabled={lines.length <= 1 || loading}
              className="p-2.5 rounded-lg text-muted hover:text-danger hover:bg-red-50 disabled:opacity-30 transition-colors self-start"
              aria-label={t.common.delete}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setLines((ls) => [...ls, { product_id: "", quantity: "", unit_purchase_price: "" }])}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80"
          disabled={loading}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t.common.add}
        </button>
      </div>

      <div className="flex justify-between items-center border-t border-line pt-3">
        <span className="text-sm font-semibold text-foreground">{t.kasir.total}</span>
        <span className="text-lg font-bold text-primary">{formatRupiah(total)}</span>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {t.common.cancel}
        </Button>
        <Button onClick={submit} disabled={loading}>
          {loading ? t.common.loading : t.common.save}
        </Button>
      </div>
    </div>
  );
}

export default function PembelianPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const isOwner = user?.role === "Owner";

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [detail, setDetail] = useState<Purchase | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPurchases = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/purchases");
      const json = await res.json();

      if (!res.ok) {
        if (json.error === "unauthorized") {
          setError(t.common.errorUnauthorized);
        } else {
          setError(t.pembelian.errorLoadFailed);
        }
        setLoading(false);
        return;
      }

      setPurchases(json.data.purchases || []);
      setLoading(false);
    } catch {
      setError("Koneksi ke server terganggu");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  const handleSuccess = () => {
    loadPurchases();
  };

  return (
    <DashboardLayout title={t.pembelian.title} subtitle={t.pembelian.subtitle}>
      <Card>
        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {isOwner && (
          <div className="flex justify-end mb-4">
            <Button onClick={() => setAddOpen(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t.common.add}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-muted">{t.common.loading}</div>
        ) : (
          <Table
            empty={t.pembelian.empty}
            head={
              <>
                <Th>{t.pembelian.tableInvoice}</Th>
                <Th>{t.pembelian.tableSupplier}</Th>
                <Th>{t.pembelian.tableDate}</Th>
                <Th className="text-center">{t.pembelian.tableItems}</Th>
                <Th className="text-right">{t.pembelian.tableTotal}</Th>
                <Th>{t.pembelian.tableCashier}</Th>
                <Th className="text-right">{t.common.actions}</Th>
              </>
            }
          >
            {purchases.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50/70">
                <Td className="font-medium tabular-nums whitespace-nowrap">{p.id}</Td>
                <Td className="text-foreground whitespace-nowrap">
                  {p.supplier_name || t.pembelian.noSupplier}
                </Td>
                <Td className="text-muted whitespace-nowrap">{formatDate(p.purchase_date)}</Td>
                <Td className="text-center tabular-nums text-muted">{p.items_count}</Td>
                <Td className="text-right tabular-nums font-medium">{formatRupiah(p.total)}</Td>
                <Td className="text-muted whitespace-nowrap">{p.user_name}</Td>
                <Td>
                  <div className="flex justify-end">
                    <Button size="sm" variant="secondary" onClick={() => setDetail(p)}>
                      {t.common.detail}
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Modal Tambah Pembelian (Owner only) */}
      {isOwner && (
        <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t.pembelian.addTitle} wide>
          {addOpen && <PurchaseForm onClose={() => setAddOpen(false)} onSuccess={handleSuccess} />}
        </Modal>
      )}

      {/* Modal Detail Pembelian */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={`${t.pembelian.detailTitle} — ${detail?.id ?? ""}`}
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            {t.common.close}
          </Button>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted text-xs">{t.pembelian.tableSupplier}</p>
                <p className="font-medium">{detail.supplier_name || t.pembelian.noSupplier}</p>
              </div>
              <div>
                <p className="text-muted text-xs">{t.pembelian.tableDate}</p>
                <p className="font-medium">{formatDate(detail.purchase_date)}</p>
              </div>
            </div>
            <div className="rounded-lg border border-line overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-left text-[11px] uppercase tracking-wider text-muted">
                    <th className="px-3 py-2 font-semibold">{t.pembelian.detailItem}</th>
                    <th className="px-3 py-2 font-semibold text-center">{t.pembelian.detailQty}</th>
                    <th className="px-3 py-2 font-semibold text-right">{t.pembelian.detailPrice}</th>
                    <th className="px-3 py-2 font-semibold text-right">{t.pembelian.detailSubtotal}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {detail.details.map((d) => (
                    <tr key={d.id}>
                      <td className="px-3 py-2">{d.product_name}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{d.quantity}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(d.unit_purchase_price)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(d.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">{t.pembelian.detailTotal}</span>
              <span className="text-lg font-bold text-primary">{formatRupiah(detail.total)}</span>
            </div>
            <p className="text-xs text-muted bg-primary/10 text-primary rounded-lg px-3 py-2">
              {t.pembelian.stockNote}
            </p>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
