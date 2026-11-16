import { SaleStatus, PaymentMethod, DebtStatus } from "@/generated/prisma/enums";

export interface CreateSaleItemInput {
  product_id: string;
  quantity: number;
}

export interface CreateSaleInput {
  items: CreateSaleItemInput[];
  payment_method: "cash" | "qris" | "debt";
  customer_id?: string | null;
  amount_paid?: number | null;
}

export interface SerializedSaleDetail {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_selling_price: number;
  subtotal: number;
}

export interface SerializedDebtRecord {
  debt_id: string;
  sale_id: string;
  customer_id: string;
  total_debt: number;
  remaining_debt: number;
  status: string;
}

export interface SerializedSale {
  id: string;
  sale_id: string;
  invoice_number: string | null;
  user_id: string;
  user_name: string;
  customer_id: string | null;
  customer_name: string | null;
  payment_method: "cash" | "qris" | "debt";
  status: string;
  total: number;
  amount_paid: number | null;
  change_amount: number | null;
  transaction_date: string;
  created_at: string;
  paid_at: string | null;
  details: SerializedSaleDetail[];
  debt_record?: SerializedDebtRecord | null;
}

export interface SalesPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}


export class SaleError extends Error {
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

/**
 * Validasi request body untuk pembuatan transaksi penjualan baru.
 */
export function validateCreateSaleInput(body: unknown): {
  valid: true;
  data: CreateSaleInput;
} | {
  valid: false;
  status: number;
  code: string;
  extra?: Record<string, unknown>;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, status: 400, code: "invalid_body" };
  }

  const raw = body as Partial<CreateSaleInput> & { payment_method?: string };

  // Validasi payment_method
  let method: "cash" | "qris" | "debt" | null = null;
  const pm = String(raw.payment_method || "").toLowerCase();
  if (pm === "cash" || pm === "tunai") method = "cash";
  else if (pm === "qris") method = "qris";
  else if (pm === "debt" || pm === "hutang") method = "debt";

  if (!method) {
    return { valid: false, status: 400, code: "payment_method_invalid" };
  }

  // Validasi items
  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    return { valid: false, status: 400, code: "items_required" };
  }

  const items: CreateSaleItemInput[] = [];
  for (let i = 0; i < raw.items.length; i++) {
    const item = raw.items[i];
    if (!item || typeof item !== "object") {
      return { valid: false, status: 400, code: "item_invalid", extra: { index: i } };
    }

    const pid = typeof item.product_id === "string" ? item.product_id.trim() : "";
    if (!pid) {
      return { valid: false, status: 400, code: "product_required", extra: { index: i } };
    }

    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return { valid: false, status: 400, code: "quantity_invalid", extra: { index: i } };
    }

    items.push({ product_id: pid, quantity: qty });
  }

  // Validasi khusus hutang
  let customer_id: string | null = null;
  if (method === "debt") {
    const cid = typeof raw.customer_id === "string" ? raw.customer_id.trim() : "";
    if (!cid) {
      return { valid: false, status: 400, code: "customer_required" };
    }
    customer_id = cid;
  } else if (typeof raw.customer_id === "string" && raw.customer_id.trim()) {
    customer_id = raw.customer_id.trim();
  }

  // Validasi khusus tunai
  let amount_paid: number | null = null;
  if (method === "cash") {
    const ap = Number(raw.amount_paid);
    if (!Number.isFinite(ap) || ap < 0) {
      return { valid: false, status: 400, code: "amount_paid_invalid" };
    }
    amount_paid = Math.floor(ap);
  }

  return {
    valid: true,
    data: {
      items,
      payment_method: method,
      customer_id,
      amount_paid,
    },
  };
}

/**
 * Format nomor invoice INV/YYYYMMDD/NNN (urutan sequential harian).
 */
export async function generateInvoiceNumber(tx: {
  salesTransaction: {
    findMany: (args: {
      where: { invoice_number: { startsWith: string } };
      select: { invoice_number: true };
    }) => Promise<{ invoice_number: string | null }[]>;
  };
}): Promise<string> {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const prefix = `INV/${stamp}/`;

  const existing = await tx.salesTransaction.findMany({
    where: {
      invoice_number: {
        startsWith: prefix,
      },
    },
    select: {
      invoice_number: true,
    },
  });

  const seqs = existing
    .map((s) => (s.invoice_number ? parseInt(s.invoice_number.slice(-3), 10) : NaN))
    .filter((n) => Number.isFinite(n));

  const next = (seqs.length ? Math.max(...seqs) : 0) + 1;
  return `INV/${stamp}/${String(next).padStart(3, "0")}`;
}

export interface RawSaleRecord {
  sale_id: string;
  user_id: string;
  customer_id: string | null;
  invoice_number: string | null;
  transaction_date: Date;
  payment_method: PaymentMethod | string;
  status: SaleStatus | string;
  total: number;
  amount_paid: number | null;
  change_amount: number | null;
  created_at: Date;
  paid_at: Date | null;
  user?: { id: string; name: string } | null;
  customer?: { id: string; name: string; phone?: string | null } | null;
  details?: Array<{
    id: string;
    sale_id: string;
    product_id: string;
    quantity: number;
    unit_selling_price: number;
    product?: { id: string; name: string; barcode?: string | null } | null;
  }>;
  debtRecord?: {
    debt_id: string;
    sale_id: string;
    customer_id: string;
    total_debt: number;
    remaining_debt: number;
    status: DebtStatus | string;
  } | null;
}

/**
 * Serialisasi data penjualan agar sesuai bentuk kontrak frontend & struk.
 */
export function serializeSale(
  sale: RawSaleRecord,
  debtRecord?: RawSaleRecord["debtRecord"]
): SerializedSale {
  const debt = debtRecord !== undefined ? debtRecord : (sale.debtRecord ?? null);
  const details: SerializedSaleDetail[] = (sale.details ?? []).map((d) => ({
    id: d.id,
    sale_id: d.sale_id,
    product_id: d.product_id,
    product_name: d.product?.name ?? "",
    quantity: d.quantity,
    unit_selling_price: d.unit_selling_price,
    subtotal: d.quantity * d.unit_selling_price,
  }));

  return {
    id: sale.sale_id,
    sale_id: sale.sale_id,
    invoice_number: sale.invoice_number,
    user_id: sale.user_id,
    user_name: sale.user?.name ?? "",
    customer_id: sale.customer_id,
    customer_name: sale.customer?.name ?? null,
    payment_method: sale.payment_method as "cash" | "qris" | "debt",
    status: sale.status,
    total: sale.total,
    amount_paid: sale.amount_paid,
    change_amount: sale.change_amount,
    transaction_date: sale.transaction_date instanceof Date ? sale.transaction_date.toISOString() : String(sale.transaction_date),
    created_at: sale.created_at instanceof Date ? sale.created_at.toISOString() : String(sale.created_at),
    paid_at: sale.paid_at ? (sale.paid_at instanceof Date ? sale.paid_at.toISOString() : String(sale.paid_at)) : null,
    details,
    debt_record: debt
      ? {
          debt_id: debt.debt_id,
          sale_id: debt.sale_id,
          customer_id: debt.customer_id,
          total_debt: debt.total_debt,
          remaining_debt: debt.remaining_debt,
          status: String(debt.status),
        }
      : null,
  };
}
