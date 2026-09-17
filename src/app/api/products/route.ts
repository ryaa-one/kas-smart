// /api/products — UC-04 Mengelola Produk.
// GET  (login Owner/Kasir) : daftar produk — Kasir butuh baca utk transaksi.
// POST (Owner only)        : tambah produk; log ACTIVITY_LOGS (user sesi).
import { prisma } from "@/lib/prisma";
import { fail, ok, requireLogin, requireOwner } from "@/lib/api-auth";
import { PRODUCT_INCLUDE, serializeProduct, validateProductBody } from "@/lib/product-api";

export async function GET() {
  const guard = await requireLogin();
  if (guard instanceof Response) return guard;

  const products = await prisma.product.findMany({
    include: PRODUCT_INCLUDE,
    orderBy: { name: "asc" },
  });
  return ok({ products: products.map(serializeProduct) });
}

export async function POST(request: Request) {
  const guard = await requireOwner();
  if (guard instanceof Response) return guard;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "invalid_json");
  }
  const { errors, data } = await validateProductBody(body, { partial: false });
  if (errors.name) return fail(400, errors.name);
  if (errors.category_id) return fail(400, errors.category_id);
  if (errors.barcode) return fail(errors.barcode === "barcode_taken" ? 409 : 400, errors.barcode);
  for (const k of ["purchase_price", "selling_price", "stock", "minimum_stock"] as const) {
    if (errors[k]) return fail(400, errors[k]);
  }
  if (!data) return fail(400, "validation_failed");

  const created = await prisma.product
    .create({
      data: {
        name: data.name!,
        category_id: data.category_id!,
        barcode: data.barcode ?? null,
        purchase_price: data.purchase_price!,
        selling_price: data.selling_price!,
        stock: data.stock ?? 0,
        minimum_stock: data.minimum_stock ?? 0,
        is_active: data.is_active ?? true,
      },
      include: PRODUCT_INCLUDE,
    })
    .catch((e: unknown) => {
      // Balapan barcode (UNIQUE db tetap penjaga terakhir).
      if ((e as { code?: string })?.code === "P2002") return null;
      throw e;
    });
  if (!created) return fail(409, "barcode_taken");

  await prisma.activityLog.create({
    data: {
      user_id: guard.id,
      action: "productAdd",
      description: `Tambah produk ${created.name}`,
    },
  });
  return ok({ product: serializeProduct(created) }, 201);
}
