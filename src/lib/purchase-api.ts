// Validasi & tipe bersama untuk API Pembelian (UC-07).
// Aturan: supplier_id opsional (nullable ERD), product_id wajib ada di DB,
// quantity > 0, unit_purchase_price >= 0, total server-calculated.
// Stok management: CREATE → tambah stok, EDIT → adjust stok (revert old + apply new),
// DELETE → kembalikan stok. Transaction atomik purchase+details+stock updates.

export interface PurchaseDetailInput {
  product_id: string;
  quantity: number;
  unit_purchase_price: number;
}

export interface PurchaseInput {
  supplier_id?: string | null;
  details: PurchaseDetailInput[];
}

export interface PurchaseDetail {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_purchase_price: number;
  subtotal: number;
}

export interface PurchaseData {
  id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  user_id: string;
  user_name: string;
  purchase_date: string; // ISO
  details: PurchaseDetail[];
  total: number;
  items_count: number;
}

export interface ValidationError {
  code: string;
  message?: string;
  field?: string;
  index?: number;
}

/**
 * Validasi input pembelian.
 * - details wajib minimal 1 item
 * - setiap detail: product_id required, quantity > 0, unit_purchase_price >= 0
 */
export function validatePurchaseInput(
  body: unknown
): { valid: false; errors: ValidationError[] } | { valid: true; data: PurchaseInput } {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== "object") {
    errors.push({ code: "invalid_body" });
    return { valid: false, errors };
  }

  const input = body as Partial<PurchaseInput>;

  // supplier_id opsional (nullable ERD)
  const supplier_id = input.supplier_id === null || input.supplier_id === "" 
    ? null 
    : input.supplier_id || null;

  // details wajib array minimal 1
  if (!Array.isArray(input.details) || input.details.length === 0) {
    errors.push({ code: "details_required" });
    return { valid: false, errors };
  }

  const details: PurchaseDetailInput[] = [];

  input.details.forEach((d, i) => {
    if (!d || typeof d !== "object") {
      errors.push({ code: "invalid_detail", index: i });
      return;
    }

    const detail = d as Partial<PurchaseDetailInput>;

    if (!detail.product_id || typeof detail.product_id !== "string" || !detail.product_id.trim()) {
      errors.push({ code: "product_required", index: i, field: "product_id" });
    }

    const qty = Number(detail.quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      errors.push({ code: "quantity_min", index: i, field: "quantity", message: "min 1" });
    }

    const price = Number(detail.unit_purchase_price);
    if (!Number.isFinite(price) || price < 0) {
      errors.push({ code: "price_invalid", index: i, field: "unit_purchase_price" });
    }

    if (errors.filter(e => e.index === i).length === 0) {
      details.push({
        product_id: detail.product_id!.trim(),
        quantity: qty,
        unit_purchase_price: Math.floor(price),
      });
    }
  });

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: { supplier_id, details },
  };
}

/**
 * Hitung total pembelian dari detail.
 */
export function calculatePurchaseTotal(details: PurchaseDetailInput[]): number {
  return details.reduce((sum, d) => sum + d.quantity * d.unit_purchase_price, 0);
}
