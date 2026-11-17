"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Table, Th, Td } from "@/components/ui/Table";
import { formatDate } from "@/lib/format";
import type { SerializedStockAdjustment } from "@/lib/stock-adjustment-api";

export type AdjustmentReason = "stok_rusak" | "stok_hilang" | "stok_opname" | "lainnya";

const REASONS: AdjustmentReason[] = ["stok_rusak", "stok_hilang", "stok_opname", "lainnya"];

interface ProductOption {
  id: string;
  name: string;
  stock: number;
  is_active: boolean;
}

// UC-18 (FR-14): quantity_change = SELISIH stok (bukan stok akhir).
// Hasil stok = stok saat ini + selisih; ditolak jika < 0; stok produk update di database (PRODUCTS.stock = Single Source of Truth).
export default function PenyesuaianStokPage() {
  const { t } = useLang();
  const p = t.penyesuaianStok;

  const [adjustments, setAdjustments] = useState<SerializedStockAdjustment[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [change, setChange] = useState("");
  const [reason, setReason] = useState<AdjustmentReason>("stok_rusak");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ product?: string; change?: string }>({});
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [adjRes, prodRes] = await Promise.all([
        fetch("/api/stock-adjustments"),
        fetch("/api/products"),
      ]);

      if (adjRes.ok) {
        const data = await adjRes.json();
        if (data?.data?.adjustments) {
          setAdjustments(data.data.adjustments);
        }
      }

      if (prodRes.ok) {
        const data = await prodRes.json();
        if (data?.data?.products) {
          setProducts(data.data.products);
        }
      }
    } catch (err) {
      console.error("Gagal memuat data penyesuaian stok:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function loadInitial() {
      try {
        const [adjRes, prodRes] = await Promise.all([
          fetch("/api/stock-adjustments"),
          fetch("/api/products"),
        ]);

        if (!active) return;

        if (adjRes.ok) {
          const data = await adjRes.json();
          if (active && data?.data?.adjustments) {
            setAdjustments(data.data.adjustments);
          }
        }

        if (prodRes.ok) {
          const data = await prodRes.json();
          if (active && data?.data?.products) {
            setProducts(data.data.products);
          }
        }
      } catch (err) {
        console.error("Gagal memuat data penyesuaian stok:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInitial();
    return () => {
      active = false;
    };
  }, []);

  const product = products.find((x) => x.id === productId);
  const nChange = parseInt(change, 10);
  const resultStock = product ? product.stock + (Number.isInteger(nChange) ? nChange : 0) : null;

  const reasonLabel = (r: string) => {
    const [baseReason, ...rest] = r.split(" — ");
    const baseLabel =
      ({
        stok_rusak: p.reasonStokRusak,
        stok_hilang: p.reasonStokHilang,
        stok_opname: p.reasonStokOpname,
        lainnya: p.reasonLainnya,
      } as Record<string, string>)[baseReason] || baseReason;

    return rest.length > 0 ? `${baseLabel} — ${rest.join(" — ")}` : baseLabel;
  };

  const rows = useMemo(() => adjustments, [adjustments]);

  const openForm = () => {
    setProductId("");
    setChange("");
    setReason("stok_rusak");
    setNote("");
    setErrors({});
    setFormOpen(true);
  };

  const submit = async () => {
    const e: typeof errors = {};
    if (!productId) e.product = p.errorProductRequired;
    if (!Number.isFinite(nChange) || nChange === 0) e.change = p.errorQuantityZero;
    else if (product && product.stock + nChange < 0) {
      e.change = p.errorNegativeResult
        .replace("{stock}", String(product.stock))
        .replace("{min}", String(-product.stock));
    }
    setErrors(e);
    if (Object.keys(e).length || !product || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/stock-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          note: note.trim(),
          details: [
            {
              product_id: productId,
              quantity_change: nChange,
            },
          ],
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errMsg =
          data?.error === "stock_insufficient"
            ? p.errorNegativeResult
                .replace("{stock}", String(product.stock))
                .replace("{min}", String(-product.stock))
            : data?.message || data?.error || "Gagal menyimpan penyesuaian stok";
        setErrors({ change: errMsg });
        return;
      }

      await loadData();
      setFormOpen(false);
      setNotice(p.successSaved ?? "Penyesuaian stok berhasil disimpan");
      setTimeout(() => setNotice(""), 3000);
    } catch {
      setErrors({ change: "Terjadi kesalahan jaringan" });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          empty={loading ? "Memuat data penyesuaian stok..." : rows.length === 0 ? p.empty : p.empty}
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
                  <div key={d.product_id || d.id} className="tabular-nums font-medium">
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
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={isSubmitting}>
              {t.common.cancel}
            </Button>
            <Button onClick={submit} disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : t.common.save}
            </Button>
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
            {products
              .filter((x) => x.is_active)
              .map((x) => (
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
