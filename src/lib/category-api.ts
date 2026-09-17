// Validasi & tipe bersama untuk API Kategori (UC-05).
// Aturan: name wajib, trim, tidak boleh kosong.
// DELETE guard: kategori yang masih dipakai produk → 409 category_in_use.

export interface CategoryInput {
  name?: unknown;
}

export interface CategoryErrors {
  name?: string;
}

/**
 * Validasi input kategori (POST/PATCH).
 * @param body - request body
 * @param mode - 'create' wajib name; 'update' boleh parsial
 * @returns { data, errors } — jika errors kosong maka valid
 */
export function validateCategory(
  body: CategoryInput,
  mode: "create" | "update" = "create"
): { data: { name?: string }; errors: CategoryErrors } {
  const data: { name?: string } = {};
  const errors: CategoryErrors = {};

  const has = (key: keyof CategoryInput) =>
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

  return { data, errors };
}
