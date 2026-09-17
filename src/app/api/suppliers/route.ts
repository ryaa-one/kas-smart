// /api/suppliers — UC-06 Mengelola Supplier.
// GET  (login Owner/Kasir) : daftar supplier (Kasir butuh utk dropdown Pembelian).
// POST (Owner only)        : tambah supplier; log ACTIVITY_LOGS.
import { prisma } from "@/lib/prisma";
import { requireLogin, requireOwner, ok, fail } from "@/lib/api-auth";
import { validateSupplier } from "@/lib/supplier-api";

// GET /api/suppliers — list semua supplier + hitungan pembelian per supplier
export async function GET() {
  const guard = await requireLogin();
  if (guard instanceof Response) return guard;
  // Owner & Kasir boleh GET (Kasir butuh dropdown)

  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { purchases: true } } },
  });

  return ok({
    suppliers: suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      address: s.address,
      purchase_count: s._count.purchases,
    })),
  });
}

// POST /api/suppliers — Owner only
export async function POST(request: Request) {
  const guard = await requireOwner();
  if (guard instanceof Response) return guard;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "invalid_json");
  }

  const { data, errors } = validateSupplier(body, "create");

  if (Object.keys(errors).length > 0) {
    // Return first error
    const firstError = errors.name || errors.phone || errors.address;
    return fail(400, firstError!);
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: data.name!,
      phone: data.phone || "",
      address: data.address || "",
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      user_id: guard.id,
      action: "supplierCreate",
      description: `Tambah supplier ${supplier.name}`,
    },
  });

  return ok({ supplier }, 201);
}
