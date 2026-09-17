// /api/categories — UC-05 Mengelola Kategori.
// GET  (login Owner/Kasir) : daftar kategori (Kasir butuh utk dropdown Produk).
// POST (Owner only)        : tambah kategori; log ACTIVITY_LOGS.
import { prisma } from "@/lib/prisma";
import { requireLogin, requireOwner, ok, fail } from "@/lib/api-auth";
import { validateCategory } from "@/lib/category-api";

// GET /api/categories — list semua kategori + hitungan produk per kategori
export async function GET() {
  const guard = await requireLogin();
  if (guard instanceof Response) return guard;
  // Owner & Kasir boleh GET (Kasir butuh dropdown)

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return ok({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      product_count: c._count.products,
    })),
  });
}

// POST /api/categories — Owner only
export async function POST(request: Request) {
  const guard = await requireOwner();
  if (guard instanceof Response) return guard;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "invalid_json");
  }

  const { data, errors } = validateCategory(body, "create");

  if (Object.keys(errors).length > 0) {
    // Return first error
    const firstError = errors.name;
    return fail(400, firstError!);
  }

  const category = await prisma.category.create({
    data: { name: data.name! },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      user_id: guard.id,
      action: "categoryCreate",
      description: `Tambah kategori ${category.name}`,
    },
  });

  return ok({ category }, 201);
}
