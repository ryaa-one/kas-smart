// /api/products/[id] — UC-04 detail/ubah/nonaktifkan.
// PATCH  (Owner) : ubah field produk (validasi sama dengan create; patch parsial).
// DELETE (Owner) : SOFT DELETE — is_active=false, BUKAN hapus fisik, karena
//                  sale_details/purchase_details/stock_adjustment_details FK ke produk.
import { prisma } from "@/lib/prisma";
import { fail, ok, requireOwner } from "@/lib/api-auth";
import {
  PRODUCT_INCLUDE,
  serializeProduct,
  validateProductBody,
} from "@/lib/product-api";

function badId(id: string) {
  return id.length === 0 || id.length > 64 || !/^[\w-]+$/.test(id);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guardSession = await requireOwner();
  // GET single dipakai hanya oleh halaman Owner; daftar utk Kasir via GET /api/products.
  if (guardSession instanceof Response) return guardSession;

  const { id } = await params;
  if (badId(id)) return fail(404, "product_not_found");
  const product = await prisma.product.findUnique({
    where: { id },
    include: PRODUCT_INCLUDE,
  });
  if (!product) return fail(404, "product_not_found");
  return ok({ product: serializeProduct(product) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireOwner();
  if (guard instanceof Response) return guard;

  const { id } = await params;
  if (badId(id)) return fail(404, "product_not_found");
  const current = await prisma.product.findUnique({ where: { id } });
  if (!current) return fail(404, "product_not_found");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "invalid_json");
  }
  const { errors, data } = await validateProductBody(body, {
    partial: true,
    excludeId: id,
  });
  if (!data) {
    const first = Object.values(errors)[0];
    if (!first) return fail(400, "nothing_to_update");
    return fail(first === "barcode_taken" ? 409 : 400, first);
  }
  if (Object.keys(data).length === 0) return fail(400, "nothing_to_update");

  const updated = await prisma.product
    .update({ where: { id }, data, include: PRODUCT_INCLUDE })
    .catch((e: unknown) => {
      // Balapan barcode (UNIQUE db penjaga terakhir).
      if ((e as { code?: string })?.code === "P2002") return null;
      throw e;
    });
  if (!updated) return fail(409, "barcode_taken");

  const toggleOnly =
    Object.keys(data).length === 1 && data.is_active !== undefined;
  await prisma.activityLog.create({
    data: {
      user_id: guard.id,
      action: toggleOnly && !data.is_active ? "productDeactivate" : "productEdit",
      description: toggleOnly
        ? `${data.is_active ? "Aktifkan kembali" : "Nonaktifkan"} produk ${updated.name}`
        : `Ubah produk ${updated.name}`,
    },
  });
  return ok({ product: serializeProduct(updated) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireOwner();
  if (guard instanceof Response) return guard;

  const { id } = await params;
  if (badId(id)) return fail(404, "product_not_found");
  const current = await prisma.product.findUnique({ where: { id } });
  if (!current) return fail(404, "product_not_found");

  // PRD UC-04: produk tidak dihapus permanen — nonaktifkan (is_active=false).
  const updated = await prisma.product.update({
    where: { id },
    data: { is_active: false },
    include: PRODUCT_INCLUDE,
  });
  if (current.is_active) {
    await prisma.activityLog.create({
      data: {
        user_id: guard.id,
        action: "productDeactivate",
        description: `Nonaktifkan produk ${updated.name}`,
      },
    });
  }
  return ok({ product: serializeProduct(updated), deactivated: true });
}
