export interface SerializedStockAdjustmentDetail {
  id: string;
  adjustment_id: string;
  product_id: string;
  product_name: string;
  quantity_change: number;
}

export interface SerializedStockAdjustment {
  id: string;
  user_id: string;
  user_name: string;
  adjustment_date: string;
  reason: string;
  details: SerializedStockAdjustmentDetail[];
}

export interface CreateStockAdjustmentDetailInput {
  product_id: string;
  quantity_change: number;
}

export interface CreateStockAdjustmentInput {
  reason: string;
  note?: string;
  details: CreateStockAdjustmentDetailInput[];
}

export class StockAdjustmentError extends Error {
  status: number;
  code: string;
  extra?: Record<string, unknown>;

  constructor(status: number, code: string, extra?: Record<string, unknown>) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function validateStockAdjustmentInput(body: unknown): {
  valid: true;
  data: CreateStockAdjustmentInput;
} | {
  valid: false;
  status: number;
  code: string;
  extra?: Record<string, unknown>;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, status: 400, code: "invalid_body" };
  }

  const raw = body as Record<string, unknown>;

  // Validasi reason
  const rawReason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (!rawReason) {
    return { valid: false, status: 400, code: "reason_required" };
  }

  const rawNote = typeof raw.note === "string" ? raw.note.trim() : "";

  // Dukung array `details` atau flat single item `{ product_id, quantity_change }`
  let rawDetails: unknown[] = [];
  if (Array.isArray(raw.details)) {
    rawDetails = raw.details;
  } else if (raw.product_id !== undefined) {
    rawDetails = [{ product_id: raw.product_id, quantity_change: raw.quantity_change }];
  }

  if (rawDetails.length === 0) {
    return { valid: false, status: 400, code: "details_required" };
  }

  const details: CreateStockAdjustmentDetailInput[] = [];
  const seenProductIds = new Set<string>();

  for (let i = 0; i < rawDetails.length; i++) {
    const item = rawDetails[i];
    if (!item || typeof item !== "object") {
      return { valid: false, status: 400, code: "item_invalid", extra: { index: i } };
    }

    const itemObj = item as Record<string, unknown>;
    const productId = typeof itemObj.product_id === "string" ? itemObj.product_id.trim() : "";
    if (!productId) {
      return { valid: false, status: 400, code: "product_required", extra: { index: i } };
    }

    // Cek duplikasi produk dalam 1 adjustment (Section 9)
    if (seenProductIds.has(productId)) {
      return {
        valid: false,
        status: 400,
        code: "duplicate_product_detail",
        extra: { product_id: productId, index: i },
      };
    }
    seenProductIds.add(productId);

    const qtyChange = Number(itemObj.quantity_change);
    if (!Number.isInteger(qtyChange)) {
      return { valid: false, status: 400, code: "quantity_change_invalid", extra: { index: i } };
    }

    // quantity_change = 0 tidak diperbolehkan (Section 2.2 & 9)
    if (qtyChange === 0) {
      return { valid: false, status: 400, code: "quantity_change_zero", extra: { index: i } };
    }

    details.push({
      product_id: productId,
      quantity_change: qtyChange,
    });
  }

  return {
    valid: true,
    data: {
      reason: rawReason,
      note: rawNote,
      details,
    },
  };
}

export interface RawStockAdjustmentDetail {
  id: string;
  adjustment_id: string;
  product_id: string;
  quantity_change: number;
  product?: { id: string; name: string } | null;
}

export interface RawStockAdjustment {
  id: string;
  user_id: string;
  adjustment_date: Date;
  reason: string;
  user?: { id: string; name: string } | null;
  details?: RawStockAdjustmentDetail[];
}

export function serializeStockAdjustment(
  adj: RawStockAdjustment
): SerializedStockAdjustment {
  return {
    id: adj.id,
    user_id: adj.user_id,
    user_name: adj.user?.name ?? "",
    adjustment_date:
      adj.adjustment_date instanceof Date
        ? adj.adjustment_date.toISOString()
        : String(adj.adjustment_date),
    reason: adj.reason,
    details: (adj.details ?? []).map((d) => ({
      id: d.id,
      adjustment_id: d.adjustment_id,
      product_id: d.product_id,
      product_name: d.product?.name ?? "",
      quantity_change: d.quantity_change,
    })),
  };
}
