// Validasi & tipe bersama untuk API Produk (UC-04). Aturan sumber: PRD
// Business Rules + ERD PRODUCTS (barcode NULL boleh, UNIQUE bila diisi;
// harga & stok integer >= 0; harga jual > harga beli; category_id FK wajib).
import { prisma } from "@/lib/prisma";

export interface ProductBody {
  name: string;
  category_id: string;
  barcode: string | null;
  purchase_price: number;
  selling_price: number;
  stock: number;
  minimum_stock: number;
  is_active: boolean;
}

export type FieldErrors = Partial<Record<keyof ProductBody, string>>;

function intOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isInteger(Number(v)))
    return Number(v);
  return null;
}

/**
 * Validasi server-side penuh. partial=false = create (semua field wajib);
 * partial=true = patch (hanya field yang dikirim yang divalidasi).
 * Mengembalikan { errors } atau { data } siap-prisma. Barcode uniqueness
 * dicek via query; error code: name_required, category_required,
 * category_not_found, price_invalid, sell_below_purchase, stock_invalid,
 * minimum_stock_invalid, barcode_invalid, barcode_taken.
 */
export async function validateProductBody(
  body: Record<string, unknown>,
  opts: { partial: boolean; excludeId?: string }
): Promise<{ errors: FieldErrors; data?: Partial<ProductBody> }> {
  const errors: FieldErrors = {};
  const data: Partial<ProductBody> = {};
  const has = (k: string) => body[k] !== undefined;

  // name
  if (!opts.partial || has("name")) {
    const v = typeof body.name === "string" ? body.name.trim() : "";
    if (!v) errors.name = "name_required";
    else data.name = v;
  }
  // category wajib + harus ada di DB
  if (!opts.partial || has("category_id")) {
    const cid = typeof body.category_id === "string" ? body.category_id.trim() : "";
    if (!cid) errors.category_id = "category_required";
    else {
      const exists = await prisma.category.findUnique({
        where: { id: cid },
        select: { id: true },
      });
      if (!exists) errors.category_id = "category_not_found";
      else data.category_id = cid;
    }
  }
  // harga integer >= 0 (Rupiah utuh, tanpa float)
  for (const key of ["purchase_price", "selling_price", "stock", "minimum_stock"] as const) {
    if (opts.partial && !has(key)) continue;
    const n = intOrNull(body[key]);
    if (n === null || n < 0) {
      errors[key] = key === "minimum_stock" ? "minimum_stock_invalid" : key === "stock" ? "stock_invalid" : "price_invalid";
    } else {
      data[key] = n;
    }
  }
  // Aturan jual>beli hanya berlaku bila KEDUA harga diketahui pada request ini
  // (patch parsial tanpa kedua field = tidak dievaluasi ulang).
  if (
    !errors.purchase_price && !errors.selling_price &&
    data.purchase_price !== undefined && data.selling_price !== undefined &&
    data.selling_price <= data.purchase_price
  ) {
    errors.selling_price = "sell_below_purchase"; // PRD: jual > beli
  }
  // barcode: boleh kosong/NULL; kalau diisi → string ringkas & UNIQUE
  if (has("barcode")) {
    const bc = typeof body.barcode === "string" ? body.barcode.trim() : "";
    if (!bc) {
      data.barcode = null;
    } else if (bc.length > 64 || !/^[\x20-\x7e]+$/.test(bc)) {
      errors.barcode = "barcode_invalid";
    } else {
      const dupe = await prisma.product.findFirst({
        where: { barcode: bc, ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}) },
        select: { id: true },
      });
      if (dupe) errors.barcode = "barcode_taken";
      else data.barcode = bc;
    }
  }
  if (has("is_active")) {
    data.is_active = body.is_active === true;
  }
  return { errors, data: Object.keys(errors).length ? undefined : data };
}

/** Seri produk utk response (nama kategori disertakan sbagai read-model). */
export function serializeProduct<T extends {
  id: string;
  name: string;
  category_id: string;
  barcode: string | null;
  purchase_price: number;
  selling_price: number;
  stock: number;
  minimum_stock: number;
  is_active: boolean;
  category?: { name: string } | null;
}>(p: T) {
  return {
    id: p.id,
    name: p.name,
    category_id: p.category_id,
    category_name: p.category?.name ?? null,
    barcode: p.barcode,
    purchase_price: p.purchase_price,
    selling_price: p.selling_price,
    stock: p.stock,
    minimum_stock: p.minimum_stock,
    is_active: p.is_active,
  };
}

export const PRODUCT_INCLUDE = { category: { select: { name: true } } } as const;
