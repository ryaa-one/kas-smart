// /api/products — UC-04 Mengelola Produk.
// GET  (login Owner/Kasir) : daftar produk — Kasir butuh baca utk transaksi.
// POST (Owner only)        : tambah produk; log ACTIVITY_LOGS (user sesi).
import { prisma } from "@/lib/prisma";
import { fail, ok, requireLogin, requireOwner } from "@/lib/api-auth";
import {
  PRODUCT_INCLUDE,
  parseProductRequest,
  serializeProduct,
  validateProductBody,
} from "@/lib/product-api";
import {
  deleteProductImage,
  uploadProductImage,
  validateProductImageFile,
} from "@/lib/product-storage";

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

  const parsed = await parseProductRequest(request);
  if (!parsed.ok) return fail(400, parsed.code);

  const { errors, data } = await validateProductBody(parsed.body, {
    partial: false,
  });
  if (errors.name) return fail(400, errors.name);
  if (errors.category_id) return fail(400, errors.category_id);
  if (errors.barcode)
    return fail(errors.barcode === "barcode_taken" ? 409 : 400, errors.barcode);
  for (const k of [
    "purchase_price",
    "selling_price",
    "stock",
    "minimum_stock",
  ] as const) {
    if (errors[k]) return fail(400, errors[k]);
  }
  if (!data) return fail(400, "validation_failed");

  let uploadedPath: string | null = null;
  if (parsed.imageFile) {
    const imgCheck = await validateProductImageFile(parsed.imageFile);
    if (!imgCheck.ok) return fail(400, imgCheck.code);

    try {
      uploadedPath = await uploadProductImage(
        imgCheck.buffer,
        imgCheck.mimeType,
        imgCheck.ext
      );
    } catch (err) {
      console.error("[POST /api/products] Upload gambar gagal:", err);
      return fail(502, "image_upload_failed");
    }
  }

  let created: Awaited<ReturnType<typeof prisma.product.create>> | null = null;
  try {
    created = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          name: data.name!,
          category_id: data.category_id!,
          barcode: data.barcode ?? null,
          purchase_price: data.purchase_price!,
          selling_price: data.selling_price!,
          stock: data.stock ?? 0,
          minimum_stock: data.minimum_stock ?? 0,
          is_active: data.is_active ?? true,
          imagePath: uploadedPath,
        },
        include: PRODUCT_INCLUDE,
      });

      await tx.activityLog.create({
        data: {
          user_id: guard.id,
          action: "productAdd",
          description: `Tambah produk ${prod.name}`,
        },
      });

      return prod;
    });
  } catch (e: unknown) {
    // Kompensasi: hapus gambar yang baru diunggah jika simpan DB gagal
    if (uploadedPath) {
      await deleteProductImage(uploadedPath);
    }
    if ((e as { code?: string })?.code === "P2002") {
      return fail(409, "barcode_taken");
    }
    throw e;
  }

  return ok({ product: serializeProduct(created) }, 201);
}
