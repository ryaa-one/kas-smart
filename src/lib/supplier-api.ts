// Validasi & tipe bersama untuk API Supplier (UC-06).
// Aturan: name wajib, trim, tidak boleh kosong; phone & address opsional.
// DELETE guard: supplier yang masih dipakai purchases → 409 supplier_in_use.

export interface SupplierInput {
  name?: unknown;
  phone?: unknown;
  address?: unknown;
}

export interface SupplierErrors {
  name?: string;
  phone?: string;
  address?: string;
}

/**
 * Validasi input supplier (POST/PATCH).
 * @param body - request body
 * @param mode - 'create' wajib name; 'update' boleh parsial
 * @returns { data, errors } — jika errors kosong maka valid
 */
export function validateSupplier(
  body: SupplierInput,
  mode: "create" | "update" = "create"
): { data: { name?: string; phone?: string; address?: string }; errors: SupplierErrors } {
  const data: { name?: string; phone?: string; address?: string } = {};
  const errors: SupplierErrors = {};

  const has = (key: keyof SupplierInput) =>
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
        errors.name = "name_too_long"; // database varchar(100)
      } else {
        data.name = trimmed;
      }
    }
  } else if (mode === "create") {
    // create wajib name
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
