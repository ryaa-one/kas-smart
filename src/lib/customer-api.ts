// Validasi & tipe bersama untuk API Pelanggan (Customer).
// Aturan: name wajib, trim, tidak boleh kosong (maks 100 karakter);
// phone (maks 50) & address (maks 200) opsional.
// DELETE guard: pelanggan yang masih memiliki transaksi atau hutang → 409 customer_in_use.

export interface CustomerInput {
  name?: unknown;
  phone?: unknown;
  address?: unknown;
}

export interface CustomerErrors {
  name?: string;
  phone?: string;
  address?: string;
}

export interface SerializedCustomer {
  id: string;
  name: string;
  phone: string;
  address: string;
  sales_count: number;
  debt_count: number;
}

export interface CustomerDetailSale {
  sale_id: string;
  invoice_number: string | null;
  transaction_date: string;
  total: number;
  payment_method: string;
  status: string;
}

export interface CustomerDetailDebt {
  debt_id: string;
  sale_id: string;
  invoice_number: string | null;
  total_debt: number;
  remaining_debt: number;
  status: string;
  created_at: string;
}

export interface SerializedCustomerDetail extends SerializedCustomer {
  recent_sales: CustomerDetailSale[];
  debt_records: CustomerDetailDebt[];
}

export class CustomerError extends Error {
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
 * Validasi input pelanggan (POST/PATCH).
 * @param body - request body
 * @param mode - 'create' wajib name; 'update' boleh parsial
 * @returns { data, errors } — jika errors kosong maka valid
 */
export function validateCustomer(
  body: CustomerInput,
  mode: "create" | "update" = "create"
): { data: { name?: string; phone?: string; address?: string }; errors: CustomerErrors } {
  const data: { name?: string; phone?: string; address?: string } = {};
  const errors: CustomerErrors = {};

  const has = (key: keyof CustomerInput) =>
    body[key] !== undefined && body[key] !== null;

  // name: trim, wajib saat create, boleh skip saat update parsial
  if (has("name")) {
    const raw = body.name;
    if (typeof raw !== "string") {
      errors.name = "name_invalid";
    } else {
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        errors.name = "name_required";
      } else if (trimmed.length > 100) {
        errors.name = "name_too_long";
      } else {
        data.name = trimmed;
      }
    }
  } else if (mode === "create") {
    errors.name = "name_required";
  }

  // phone: opsional, string biasa
  if (has("phone")) {
    const raw = body.phone;
    if (typeof raw !== "string") {
      errors.phone = "phone_invalid";
    } else {
      const trimmed = raw.trim();
      if (trimmed.length > 50) {
        errors.phone = "phone_too_long";
      } else {
        data.phone = trimmed || "";
      }
    }
  }

  // address: opsional, string biasa
  if (has("address")) {
    const raw = body.address;
    if (typeof raw !== "string") {
      errors.address = "address_invalid";
    } else {
      const trimmed = raw.trim();
      if (trimmed.length > 200) {
        errors.address = "address_too_long";
      } else {
        data.address = trimmed || "";
      }
    }
  }

  return { data, errors };
}
