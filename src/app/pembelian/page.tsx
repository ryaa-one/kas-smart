"use client";

import { useMemo, useState } from "react";
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
import { mockProducts, mockSuppliers } from "@/lib/mock/master";
import { mockPurchases, purchaseTotal, type Purchase } from "@/lib/mock/owner";

interface Line {
  product_id: string;
  quantity: string;
  unit_purchase_price: string;
}

// Form Tambah Pembelian: workflow PRD = pilih supplier, pilih produk,
// masukkan jumlah + harga beli, simpan.
function PurchaseForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (supplierId: string, lines: Line[]) => void;
}) {
  const { t } = useLang();
  const { user } = useAuth();
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ product_id: "", quantity: "", unit_purchase_price: "" }]);
  const [errors, setErrors] = useState<{ supplier?: string; lines?: Record<number, { product?: string; quantity?: string }> }>({});

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const pickProduct = (i: number, productId: string) => {
    const p = mockProducts.find((x) => x.id === productId);
    setLine(i, {
      product_id: productId,
      unit_purchase_price: p ? String(p.purchase_price) : "",
    });
  };

  const total = lines.reduce(
    (s, l) => s + (parseInt(l.quantity, 10) || 0) * (parseInt(l.unit_purchase_price, 10) || 0),
    0
  );

  const submit = () => {
    const e: typeof errors = {};
    if (!supplierId) e.supplier = t.pembelian.errorSupplierRequired;
    const lineErrors: Record<number, { product?: string; quantity?: string }> = {};
    lines.forEach((l, i) => {
      const le: { product?: string; quantity?: string } = {};
      if (!l.product_id) le.product = t.pembelian.errorProductRequired;
      if ((parseInt(l.quantity, 10) || 0) < 1) le.quantity = t.pembelian.errorQuantityMin;
      if (Object.keys(le).length) lineErrors[i] = le;
    });
    if (Object.keys(lineErrors).length) e.lines = lineErrors;
    setErrors(e);
    if (e.supplier || e.lines) return;
    onSubmit(supplierId, lines);
  };

  return (
    <div className="space-y-4">
      <Select
        label={t.pembelian.fieldSupplier}
        value={supplierId}
        onChange={(e) => setSupplierId(e.target.value)}
        error={errors.supplier}
      >
        <option value="">{t.pembelian.selectSupplier}</option>
        {mockSuppliers.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
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
            >
              <option value="">{t.pembelian.selectProduct}</option>
              {mockProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
            <Input
              type="number"
              min={1}
              placeholder={t.pembelian.fieldQuantity}
              value={l.quantity}
              onChange={(e) => setLine(i, { quantity: e.target.value })}
              error={errors.lines?.[i]?.quantity}
            />
            <Input
              type="number"
              min={0}
              placeholder={t.pembelian.fieldUnitPrice}
              value={l.unit_purchase_price}
              onChange={(e) => setLine(i, { unit_purchase_price: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
              disabled={lines.length <= 1}
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
        <Button variant="secondary" onClick={onClose}>{t.common.cancel}</Button>
        <Button onClick={submit}>{t.common.save}</Button>
      </div>
    </div>
  );
}

export default function PembelianPage() {
  const { t } = useLang();
  const { user } = useAuth();

  const [purchases, setPurchases] = useState<Purchase[]>(mockPurchases);
  const [detail, setDetail] = useState<Purchase | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const supplierNames = useMemo(
    () => Object.fromEntries(mockSuppliers.map((s) => [s.id, s.name])),
    []
  );

  const handleAdd = (supplierId: string, lines: Line[]) => {
    setPurchases((ps) => [
      {
        id: `PO-${String(ps.length + 1).padStart(3, "0")}`,
        supplier_id: supplierId,
        supplier_name: supplierNames[supplierId] ?? "-",
        user_name: user?.name ?? "-",
        purchase_date: new Date().toISOString().slice(0, 10),
        details: lines.map((l) => ({
          product_id: l.product_id,
          product_name: mockProducts.find((p) => p.id === l.product_id)?.name ?? "-",
          quantity: parseInt(l.quantity, 10) || 0,
          unit_purchase_price: parseInt(l.unit_purchase_price, 10) || 0,
        })),
      },
      ...ps,
    ]);
    setAddOpen(false);
  };

  return (
    <DashboardLayout title={t.pembelian.title} subtitle={t.pembelian.subtitle}>
      <Card>
        <div className="flex justify-end mb-4">
          <Button onClick={() => setAddOpen(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t.common.add}
          </Button>
        </div>

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
              <Td className="text-foreground whitespace-nowrap">{p.supplier_name}</Td>
              <Td className="text-muted whitespace-nowrap">{formatDate(p.purchase_date)}</Td>
              <Td className="text-center tabular-nums text-muted">
                {p.details.reduce((s, d) => s + d.quantity, 0)}
              </Td>
              <Td className="text-right tabular-nums font-medium">{formatRupiah(purchaseTotal(p))}</Td>
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
      </Card>

      {/* Modal Tambah Pembelian */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t.pembelian.addTitle} wide>
        <PurchaseForm onClose={() => setAddOpen(false)} onSubmit={handleAdd} />
      </Modal>

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
                <p className="font-medium">{detail.supplier_name}</p>
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
                    <tr key={d.product_id}>
                      <td className="px-3 py-2">{d.product_name}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{d.quantity}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(d.unit_purchase_price)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(d.quantity * d.unit_purchase_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">{t.pembelian.detailTotal}</span>
              <span className="text-lg font-bold text-primary">{formatRupiah(purchaseTotal(detail))}</span>
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
