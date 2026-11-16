import { DebtStatus } from "@/generated/prisma/enums";

export interface SerializedDebtPayment {
  payment_id: string;
  debt_id: string;
  user_id: string;
  user_name: string;
  payment_date: string;
  amount: number;
  note: string;
  created_at: string;
}

export interface SerializedDebtRecord {
  debt_id: string;
  sale_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  invoice_number: string;
  transaction_date: string;
  total_debt: number;
  remaining_debt: number;
  status: "Unpaid" | "Partial" | "Paid";
  created_at: string;
  updated_at: string;
  payments: SerializedDebtPayment[];
}

export class DebtError extends Error {
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

export interface RawDebtPayment {
  payment_id: string;
  debt_id: string;
  user_id: string;
  payment_date: Date;
  amount: number;
  note: string;
  created_at: Date;
  user?: { id: string; name: string } | null;
}

export interface RawDebtRecord {
  debt_id: string;
  sale_id: string;
  customer_id: string;
  total_debt: number;
  remaining_debt: number;
  status: DebtStatus | string;
  created_at: Date;
  updated_at: Date;
  customer?: { id: string; name: string; phone?: string | null; address?: string | null } | null;
  sale?: {
    sale_id: string;
    invoice_number: string | null;
    transaction_date: Date;
    total: number;
    payment_method: string;
    status: string;
  } | null;
  payments?: RawDebtPayment[];
}

export function serializePayment(p: RawDebtPayment): SerializedDebtPayment {
  return {
    payment_id: p.payment_id,
    debt_id: p.debt_id,
    user_id: p.user_id,
    user_name: p.user?.name ?? "",
    payment_date: p.payment_date instanceof Date ? p.payment_date.toISOString() : String(p.payment_date),
    amount: p.amount,
    note: p.note || "",
    created_at: p.created_at instanceof Date ? p.created_at.toISOString() : String(p.created_at),
  };
}

export function serializeDebt(d: RawDebtRecord): SerializedDebtRecord {
  const payments = (d.payments ?? []).map(serializePayment);
  return {
    debt_id: d.debt_id,
    sale_id: d.sale_id,
    customer_id: d.customer_id,
    customer_name: d.customer?.name ?? "",
    customer_phone: d.customer?.phone ?? "",
    customer_address: d.customer?.address ?? "",
    invoice_number: d.sale?.invoice_number ?? d.sale_id,
    transaction_date: d.sale?.transaction_date
      ? (d.sale.transaction_date instanceof Date ? d.sale.transaction_date.toISOString() : String(d.sale.transaction_date))
      : (d.created_at instanceof Date ? d.created_at.toISOString() : String(d.created_at)),
    total_debt: d.total_debt,
    remaining_debt: d.remaining_debt,
    status: d.status as "Unpaid" | "Partial" | "Paid",
    created_at: d.created_at instanceof Date ? d.created_at.toISOString() : String(d.created_at),
    updated_at: d.updated_at instanceof Date ? d.updated_at.toISOString() : String(d.updated_at),
    payments,
  };
}
