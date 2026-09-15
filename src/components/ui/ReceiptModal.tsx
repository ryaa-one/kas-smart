"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useLang } from "@/lib/i18n/LanguageContext";
import { useDb, type Sale } from "@/lib/mock/db";
import { formatRupiah, formatDateTime } from "@/lib/format";

interface ReceiptModalProps {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
}

// M-4 (FR-11/UC-14): template struk/invoice khusus — bukan cetak seluruh halaman.
// Isi dirender dari SALES_TRANSACTION + SALE_DETAILS store bersama dan
// identitas toko dari STORE_SETTINGS. Area .print-area yang dicetak (lihat globals.css).
export function ReceiptModal({ sale, open, onClose }: ReceiptModalProps) {
  const { t } = useLang();
  const db = useDb(); // STORE_SETTINGS untuk nama/alamat/telepon/info struk

  const s = t.struk;
  const methodLabel =
    sale?.payment_method === "cash"
      ? t.kasir.cash
      : sale?.payment_method === "qris"
        ? t.kasir.qris
        : sale?.payment_method === "debt"
          ? t.kasir.debt
          : "—";

  // Info hutang (DEBT_RECORD terkait) — hanya untuk transaksi Hutang.
  const debt = sale?.payment_method === "debt"
    ? db.debts.find((d) => d.sale_id === sale.id) ?? null
    : null;

  return (
    <Modal
      open={open && sale !== null}
      onClose={onClose}
      title={`${s.title} — ${sale?.invoice_number ?? ""}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t.common.close}
          </Button>
          <Button onClick={() => window.print()}>{s.print}</Button>
        </>
      }
    >
      {sale && (
        <div className="print-area mx-auto max-w-[300px] bg-white text-zinc-900 font-mono text-[12px] leading-snug p-4 rounded-lg border border-line">
          {/* Identitas toko (STORE_SETTINGS) */}
          <div className="text-center space-y-0.5">
            <p className="text-[14px] font-bold tracking-wide">{db.settings.store_name}</p>
            {db.settings.address && <p>{db.settings.address}</p>}
            {db.settings.phone && <p>{db.settings.phone}</p>}
          </div>

          <div className="border-t border-dashed border-zinc-400 my-2" />

          <div className="flex justify-between">
            <span>{s.invoice}</span>
            <span className="font-semibold">{sale.invoice_number}</span>
          </div>
          <div className="flex justify-between">
            <span>{s.date}</span>
            <span>{formatDateTime(sale.transaction_date)}</span>
          </div>
          <div className="flex justify-between">
            <span>{s.cashier}</span>
            <span>{sale.user_name}</span>
          </div>
          {sale.customer_name && (
            <div className="flex justify-between">
              <span>{s.customer}</span>
              <span>{sale.customer_name}</span>
            </div>
          )}

          <div className="border-t border-dashed border-zinc-400 my-2" />

          {/* Daftar produk (SALE_DETAILS) */}
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="font-semibold pb-1">{s.item}</th>
                <th className="font-semibold pb-1 text-center">x{sale.details.reduce((a, d) => a + d.quantity, 0)}</th>
                <th className="font-semibold pb-1 text-right">{s.amount}</th>
              </tr>
            </thead>
            <tbody>
              {sale.details.map((d, i) => (
                <tr key={i} className="align-top">
                  <td className="pr-1">
                    {d.product_name}
                    <div className="text-zinc-500">
                      {d.quantity} × {formatRupiah(d.unit_selling_price)}
                    </div>
                  </td>
                  <td className="text-center">-</td>
                  <td className="text-right tabular-nums whitespace-nowrap">
                    {formatRupiah(d.quantity * d.unit_selling_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-zinc-400 my-2" />

          <div className="flex justify-between">
            <span>{s.subtotal}</span>
            <span className="tabular-nums">{formatRupiah(sale.total)}</span>
          </div>
          <div className="flex justify-between font-bold text-[13px]">
            <span>{s.total}</span>
            <span className="tabular-nums">{formatRupiah(sale.total)}</span>
          </div>
          <div className="flex justify-between">
            <span>{s.method}</span>
            <span>{methodLabel}</span>
          </div>
          {sale.payment_method === "cash" && sale.amount_paid !== null && (
            <>
              <div className="flex justify-between">
                <span>{s.paid}</span>
                <span className="tabular-nums">{formatRupiah(sale.amount_paid)}</span>
              </div>
              <div className="flex justify-between">
                <span>{s.change}</span>
                <span className="tabular-nums">{formatRupiah(sale.change_amount ?? 0)}</span>
              </div>
            </>
          )}
          {sale.payment_method === "qris" && (
            <p className="text-zinc-500">{sale.paid_at ? s.qrisConfirmed : s.qrisWaiting}</p>
          )}
          {debt && (
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span>{s.debtRemaining}</span>
                <span className="tabular-nums">{formatRupiah(debt.remaining_debt)}</span>
              </div>
              <p className="text-zinc-500">{s.debtNote}</p>
            </div>
          )}

          <div className="border-t border-dashed border-zinc-400 my-2" />

          <p className="text-center">{s.thanks}</p>
          {db.settings.receipt_info && (
            <p className="text-center text-zinc-500 mt-1">{db.settings.receipt_info}</p>
          )}
        </div>
      )}
    </Modal>
  );
}
