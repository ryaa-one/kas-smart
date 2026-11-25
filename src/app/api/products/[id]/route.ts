// /api/products/[id] — UC-04 detail/ubah/nonaktifkan.
// PATCH  (Owner) : ubah field produk (validasi sama dengan create; patch parsial).
// DELETE (Owner) : HARD DELETE — cek relasi sale_details, purchase_details,
//                  stock_adjustment_details (409 bila ada); hapus fisik jika 0.
import { prisma } from "@/lib/prisma";
import { fail, ok, requireOwner } from "@/lib/api-auth";
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

  const parsed = await parseProductRequest(request);
  if (!parsed.ok) return fail(400, parsed.code);

  const { errors, data } = await validateProductBody(parsed.body, {
    partial: true,
    excludeId: id,
  });
  if (!data || Object.keys(errors).length > 0) {
    const first = Object.values(errors)[0];
    if (!first) return fail(400, "nothing_to_update");
    return fail(first === "barcode_taken" ? 409 : 400, first);
  }

  let validatedImage: Awaited<ReturnType<typeof validateProductImageFile>> | null = null;
  if (parsed.imageFile) {
    validatedImage = await validateProductImageFile(parsed.imageFile);
    if (!validatedImage.ok) return fail(400, validatedImage.code);
  }

  const shouldRemoveImage =
    !validatedImage && parsed.removeImage && current.imagePath !== null;
  if (
    Object.keys(data).length === 0 &&
    !validatedImage &&
    !parsed.removeImage
  ) {
    return fail(400, "nothing_to_update");
  }

  // Upload gambar baru terlebih dahulu sebelum update DB
  let uploadedPath: string | null = null;
  if (validatedImage && validatedImage.ok) {
    try {
      uploadedPath = await uploadProductImage(
        validatedImage.buffer,
        validatedImage.mimeType,
        validatedImage.ext
      );
    } catch (err) {
      console.error("[PATCH /api/products/[id]] Upload gambar gagal:", err);
      return fail(502, "image_upload_failed");
    }
  }

  const updateData = {
    ...data,
    ...(uploadedPath
      ? { imagePath: uploadedPath }
      : shouldRemoveImage
        ? { imagePath: null }
        : {}),
  };

  if (Object.keys(updateData).length === 0) {
    return fail(400, "nothing_to_update");
  }

  const toggleOnly =
    Object.keys(updateData).length === 1 && updateData.is_active !== undefined;

  let updated: Awaited<ReturnType<typeof prisma.product.update>> | null = null;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id },
        data: updateData,
        include: PRODUCT_INCLUDE,
      });

      await tx.activityLog.create({
        data: {
          user_id: guard.id,
          action: toggleOnly && !updateData.is_active ? "productDeactivate" : "productEdit",
          description: toggleOnly
            ? `${updateData.is_active ? "Aktifkan kembali" : "Nonaktifkan"} produk ${prod.name}`
            : `Ubah produk ${prod.name}`,
        },
      });

      return prod;
    });
  } catch (e: unknown) {
    // Jika update DB gagal, hapus gambar baru yang terlanjur diunggah, jangan sentuh gambar lama
    if (uploadedPath) {
      await deleteProductImage(uploadedPath);
    }
    if ((e as { code?: string })?.code === "P2002") {
      return fail(409, "barcode_taken");
    }
    throw e;
  }

  // DB berhasil diperbarui: bersihkan gambar lama bila diganti atau dihapus
  if (
    current.imagePath &&
    (uploadedPath || shouldRemoveImage) &&
    current.imagePath !== uploadedPath
  ) {
    await deleteProductImage(current.imagePath);
  }

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

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          saleDetails: true,
          purchaseDetails: true,
          stockAdjustmentDetails: true,
        },
      },
    },
  });
  if (!product) return fail(404, "product_not_found");

  const salesCount = product._count.saleDetails;
  const purchaseCount = product._count.purchaseDetails;
  const adjustmentCount = product._count.stockAdjustmentDetails;

  // Cek ketiga tabel relasi riwayat: jika salah satu > 0, tolak dengan 409
  if (salesCount > 0 || purchaseCount > 0 || adjustmentCount > 0) {
    let errorCode = "product_in_use";
    let message = "Produk masih digunakan dalam data transaksi dan tidak dapat dihapus.";
    if (salesCount > 0) {
      errorCode = "product_in_use_sales";
      message = "Produk masih digunakan dalam riwayat transaksi penjualan.";
    } else if (purchaseCount > 0) {
      errorCode = "product_in_use_purchases";
      message = "Produk masih digunakan dalam riwayat transaksi pembelian.";
    } else if (adjustmentCount > 0) {
      errorCode = "product_in_use_adjustments";
      message = "Produk masih digunakan dalam riwayat penyesuaian stok.";
    }

    return fail(409, errorCode, {
      message,
      sales_count: salesCount,
      purchase_count: purchaseCount,
      adjustment_count: adjustmentCount,
    });
  }

  // Hard delete dari database + catat activity log secara atomik
  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.delete({
        where: { id },
      });

      await tx.activityLog.create({
        data: {
          user_id: guard.id,
          action: "productDelete",
          description: `Hapus produk ${product.name}`,
        },
      });
    });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2003") {
      return fail(409, "product_in_use", {
        message: "Produk masih digunakan dalam data transaksi lain dan tidak dapat dihapus.",
      });
    }
    throw e;
  }

  // Bersihkan gambar di Storage hanya setelah penghapusan DB berhasil (best-effort)
  if (product.imagePath) {
    await deleteProductImage(product.imagePath);
  }

  return ok({ deleted: true, id: product.id });
}
