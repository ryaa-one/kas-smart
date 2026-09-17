// /api/categories/[id] — UC-05 detail/ubah/hapus kategori.
// GET    (login)     : detail satu kategori + product_count.
// PATCH  (Owner)     : ubah nama kategori.
// DELETE (Owner)     : hapus kategori (guard: 409 jika masih dipakai produk).
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLogin, requireOwner, ok, fail } from "@/lib/api-auth";
import { validateCategory } from "@/lib/category-api";

// GET /api/categories/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireLogin();
  if (guard instanceof Response) return guard;

  const { id } = await params;
  if (!id || id.includes("..") || id.includes("/")) {
    return fail(400, "invalid_id");
  }

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!category) {
    return fail(404, "category_not_found");
  }

  return ok({
    category: {
      id: category.id,
      name: category.name,
      product_count: category._count.products,
    },
  });
}

// PATCH /api/categories/:id — Owner only
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireOwner();
  if (guard instanceof Response) return guard;

  const { id } = await params;
  if (!id || id.includes("..") || id.includes("/")) {
    return fail(400, "invalid_id");
  }

  // Cek kategori ada
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return fail(404, "category_not_found");
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "invalid_json");
  }

  const { data, errors } = validateCategory(body, "update");

  if (Object.keys(errors).length > 0) {
    const firstError = errors.name;
    return fail(400, firstError!);
  }

  // Jika tidak ada field yang diubah, skip update
  if (Object.keys(data).length === 0) {
    return ok({ category: { id: existing.id, name: existing.name } });
  }

  const updated = await prisma.category.update({
    where: { id },
    data,
    include: { _count: { select: { products: true } } },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      user_id: guard.id,
      action: "categoryUpdate",
      description: `Ubah kategori ${updated.name}`,
    },
  });

  return ok({
    category: {
      id: updated.id,
      name: updated.name,
      product_count: updated._count.products,
    },
  });
}

// DELETE /api/categories/:id — Owner only
// Guard: kategori yang masih dipakai produk → 409 category_in_use
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireOwner();
  if (guard instanceof Response) return guard;

  const { id } = await params;
  if (!id || id.includes("..") || id.includes("/")) {
    return fail(400, "invalid_id");
  }

  // Cek kategori ada + hitung produk
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!category) {
    return fail(404, "category_not_found");
  }

  // Guard: kategori masih dipakai produk
  if (category._count.products > 0) {
    return fail(409, "category_in_use", { product_count: category._count.products });
  }

  // Aman dihapus
  await prisma.category.delete({ where: { id } });

  // Log activity
  await prisma.activityLog.create({
    data: {
      user_id: guard.id,
      action: "categoryDelete",
      description: `Hapus kategori ${category.name}`,
    },
  });

  return ok({ deleted: true });
}
