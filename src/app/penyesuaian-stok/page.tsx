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
import { mockProducts } from "@/lib/mock/master";
import {
  mockAdjustments,
  type AdjustmentReason,
  type StockAdjustment,
} from "@/lib/mock/owner";

const reasonLabels = {
  stok_rusak: "reasonStokRusak",
  stok_hilang: "reasonStokHilang",
  stok_opname: "reasonStokOpname",
  lainnya: "reasonLainnya",
} as const;

export default function PenyesuaianStokPage() {
  const { t } = useLang();
  const { user } = useAuth();

  const [adjustments, setAdjustments] = useState<StockAdjustment[]>(mockAdjustments);
  const [addOpen, setAddOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantityChange, setQuantityChange] = useState("");
  const [reason, setReason] = useState<AdjustmentReason>("stok_opname");
  const [errors, setErrors] = useState<{ product_id?: string; quantity_change?: string }>({});

  const selectedProduct = mockProducts.find((p) => p.id === productId);

  const rows = useMemo(
    () =>
      adjustments.flatMap((a) =>
        a.details.map((d) => ({
          adjustment: a,
          detail: d,
        }))
      ),
    [adjustments]
  );

  const openAdd = () => {
    setProductId("");
    setQuantityChange("");
    setReason("stok_opname");
    setErrors({});
    setAddOpen(true);
  };

  const submit = () => {
    const e: typeof errors = {};
    if (!productId) e.product_id = t.penyesuaianStok.errorProductRequired;
    const change = parseInt(quantityChange, 10);
    if (!quantityChange || !change) e.quantity_change = t.penyesuaianStok.errorQuantityZero;
    if (e.product_id || e.quantity_change) {
      setErrors(e);
      return;
    }
    setAdjustments((as) => [
      {
        id: `SA-${String(as.length + 1).padStart(3, "0")}`,
        user_name: user?.name ?? "-",
        adjustment_date: new Date().toISOString().slice(0, 10),
        reason,
        details: [
          {
            product_id: productId,
            product_name: selectedProduct?.name ?? "-",
            quantity_change: change,
          },
        ],
      },
      ...as,
    ]);
    setAddOpen(false);
  };

  return (
    <DashboardLayout title={t.penyesuaianStok.title} subtitle={t.penyesuaianStok.subtitle}>
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
          empty={t.penyesuaianStok.empty}
          head={
            <>
              <Th>{t.penyesuaianStok.tableId}</Th>
              <Th>{t.penyesuaianStok.tableDate}</Th>
              <Th>{t.penyesuaianStok.tableProduct}</Th>
              <Th className="text-center">{t.penyesuaianStok.tableChange}</Th>
              <Th>{t.penyesuaianStok.tableReason}</Th>
              <Th>{t.penyesuaianStok.tableBy}</Th>
            </>
          }
        >
          {rows.map(({ adjustment, detail }) => (
            <tr key={`${adjustment.id}-${detail.product_id}`} className="hover:bg-zinc-50/70">
              <Td className="font-medium tabular-nums whitespace-nowrap">{adjustment.id}</Td>
              <Td className="text-muted whitespace-nowrap">{formatDate(adjustment.adjustment_date)}</Td>
              <Td className="text-foreground">{detail.product_name}</Td>
              <Td className="text-center">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums ${
                    detail.quantity_change > 0
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-red-700"
                  }`}
                >
                  {detail.quantity_change > 0 ? "+" : ""}
                  {detail.quantity_change}
                </span>
              </Td>
              <Td className="text-muted whitespace-nowrap">
                {t.penyesuaianStok[reasonLabels[adjustment.reason]]}
              </Td>
              <Td className="text-muted whitespace-nowrap">{adjustment.user_name}</Td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Modal Tambah Penyesuaian: produk, quantity_change (selisih), alasan */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t.penyesuaianStok.addTitle}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={submit}>{t.common.save}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label={t.penyesuaianStok.fieldProduct}
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setErrors((er) => ({ ...er, product_id: undefined }));
            }}
            error={errors.product_id}
          >
            <option value="">{t.penyesuaianStok.selectProduct}</option>
            {mockProducts.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>

          {selectedProduct && (
            <p className="text-xs text-muted -mt-2">
              {t.penyesuaianStok.currentStock}:{" "}
              <span className="font-semibold text-foreground tabular-nums">{selectedProduct.stock}</span>
            </p>
          )}

          <div className="space-y-1.5">
            <Input
              type="number"
              label={t.penyesuaianStok.fieldQuantityChange}
              value={quantityChange}
              onChange={(e) => {
                setQuantityChange(e.target.value);
                setErrors((er) => ({ ...er, quantity_change: undefined }));
              }}
              placeholder="0"
              error={errors.quantity_change}
            />
            <p className="text-xs text-muted">{t.penyesuaianStok.quantityChangeHint}</p>
          </div>

          <Select
            label={t.penyesuaianStok.fieldReason}
            value={reason}
            onChange={(e) => setReason(e.target.value as AdjustmentReason)}
          >
            <option value="stok_rusak">{t.penyesuaianStok.reasonStokRusak}</option>
            <option value="stok_hilang">{t.penyesuaianStok.reasonStokHilang}</option>
            <option value="stok_opname">{t.penyesuaianStok.reasonStokOpname}</option>
            <option value="lainnya">{t.penyesuaianStok.reasonLainnya}</option>
          </Select>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
