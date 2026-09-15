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
import { formatDate } from "@/lib/format";
import {
  useDb,
  addAdjustment,
  type AdjustmentReason,
} from "@/lib/mock/db";

const REASONS: AdjustmentReason[] = ["stok_rusak", "stok_hilang", "stok_opname", "lainnya"];

// UC-18 (FR-14): quantity_change = SELISIH stok (bukan stok akhir).
// Hasil stok = stok saat ini + selisih; ditolak jika < 0; stok produk update (store bersama).
export default function PenyesuaianStokPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const db = useDb();
  const p = t.penyesuaianStok;

  const [formOpen, setFormOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [change, setChange] = useState("");
  const [reason, setReason] = useState<AdjustmentReason>("stok_rusak");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ product?: string; change?: string }>({});
  const [notice, setNotice] = useState("");

  const product = db.products.find((x) => x.id === productId);
  const nChange = parseInt(change, 10);
  const resultStock = product ? product.stock + (nChange || 0) : null;

  const reasonLabel = (r: AdjustmentReason) =>
    ({
      stok_rusak: p.reasonStokRusak,
      stok_hilang: p.reasonStokHilang,
      stok_opname: p.reasonStokOpname,
      lainnya: p.reasonLainnya,
    } as Record<AdjustmentReason, string>)[r];

  const rows = useMemo(() => [...db.adjustments].reverse(), [db.adjustments]);

  const openForm = () => {
    setProductId("");
    setChange("");
    setReason("stok_rusak");
    setNote("");
    setErrors({});
    setFormOpen(true);
  };

  const submit = () => {
    const e: typeof errors = {};
    if (!productId) e.product = p.errorProductRequired;
    if (!Number.isFinite(nChange) || nChange === 0) e.change = p.errorQuantityZero;
    else if (product && product.stock + nChange < 0)
      e.change = p.errorNegativeResult
        .replace("{stock}", String(product.stock))
        .replace("{min}", String(-product.stock));
    setErrors(e);
    if (Object.keys(e).length || !user || !product) return;

    addAdjustment({ id: user.id, name: user.name }, productId, nChange, reason, note.trim());
    setFormOpen(false);
    setNotice(p.successSaved ?? "OK");
    setTimeout(() => setNotice(""), 3000);
  };

  const inputCls =
    "px-3 py-2 rounded-lg border border-line bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";

  return (
    <DashboardLayout title={p.title} subtitle={p.subtitle}>
      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-success/10 text-success px-4 py-3 text-sm font-medium" role="status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
          {notice}
        </div>
      )}

      <Card>
        <div className="flex justify-end mb-4">
          <Button onClick={openForm}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {p.addTitle}
          </Button>
        </div>

        <Table
          empty={p.empty}
          head={
            <>
              <Th>{p.tableId}</Th>
              <Th>{p.tableDate}</Th>
              <Th>{p.tableProduct}</Th>
              <Th className="text-center">{p.tableChange}</Th>
              <Th>{p.tableReason}</Th>
              <Th className="text-muted">{p.tableBy}</Th>
            </>
          }
        >
          {rows.map((a) => (
            <tr key={a.id} className="hover:bg-zinc-50/70">
              <Td className="font-medium tabular-nums whitespace-nowrap">{a.id}</Td>
              <Td className="text-muted whitespace-nowrap">{formatDate(a.adjustment_date)}</Td>
              <Td className="whitespace-nowrap">{a.details.map((d) => d.product_name).join(", ")}</Td>
              <Td className="text-center">
                {a.details.map((d) => (
                  <div key={d.product_id} className="tabular-nums font-medium">
                    <span className={d.quantity_change >= 0 ? "text-success" : "text-danger"}>
                      {d.quantity_change >= 0 ? `+${d.quantity_change}` : d.quantity_change}
                    </span>
                  </div>
                ))}
              </Td>
              <Td className="text-muted">{reasonLabel(a.reason)}</Td>
              <Td className="text-muted whitespace-nowrap">{a.user_name}</Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={p.addTitle}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={submit}>{t.common.save}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label={p.fieldProduct}
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setErrors((x) => ({ ...x, product: undefined }));
            }}
            error={errors.product}
          >
            <option value="">{p.selectProduct}</option>
            {db.products.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </Select>

          {product && (
            <p className="text-sm text-muted -mt-2">
              {p.currentStock}: <span className="font-medium text-foreground tabular-nums">{product.stock}</span>
            </p>
          )}

          <Input
            type="number"
            label={p.fieldQuantityChange}
            value={change}
            onChange={(e) => {
              setChange(e.target.value);
              setErrors((x) => ({ ...x, change: undefined }));
            }}
            error={errors.change}
            placeholder="contoh: -5"
          />
          <p className="text-xs text-muted -mt-2">{p.quantityChangeHint}</p>

          {resultStock !== null && (
            <p className="text-sm text-muted -mt-2">
              {p.resultStock}:{" "}
              <span className={`font-medium tabular-nums ${resultStock < 0 ? "text-danger" : "text-foreground"}`}>
                {resultStock}
              </span>
            </p>
          )}

          <Select label={p.fieldReason} value={reason} onChange={(e) => setReason(e.target.value as AdjustmentReason)}>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {reasonLabel(r)}
              </option>
            ))}
          </Select>

          <Input
            label={p.fieldNote}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}
