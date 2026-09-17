// /api/suppliers/[id] — UC-06 detail/ubah/hapus supplier.
// GET    (login)     : detail satu supplier + purchase_count.
// PATCH  (Owner)     : ubah data supplier.
// DELETE (Owner)     : hapus supplier (guard: 409 jika masih dipakai purchases).
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLogin, requireOwner, ok, fail } from "@/lib/api-auth";
import { validateSupplier } from "@/lib/supplier-api";

// GET /api/suppliers/:id
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

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { _count: { select: { purchases: true } } },
  });

  if (!supplier) {
    return fail(404, "supplier_not_found");
  }

  return ok({
    supplier: {
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      address: supplier.address,
      purchase_count: supplier._count.purchases,
    },
  });
}

// PATCH /api/suppliers/:id — Owner only
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

  // Cek supplier ada
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) {
    return fail(404, "supplier_not_found");
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "invalid_json");
  }

  const { data, errors } = validateSupplier(body, "update");

  if (Object.keys(errors).length > 0) {
    const firstError = errors.name || errors.phone || errors.address;
    return fail(400, firstError!);
  }

  // Jika tidak ada field yang diubah, skip update
  if (Object.keys(data).length === 0) {
    return ok({
      supplier: {
        id: existing.id,
        name: existing.name,
        phone: existing.phone,
        address: existing.address,
      },
    });
  }

  const updated = await prisma.supplier.update({
    where: { id },
    data,
    include: { _count: { select: { purchases: true } } },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      user_id: guard.id,
      action: "supplierUpdate",
      description: `Ubah supplier ${updated.name}`,
    },
  });

  return ok({
    supplier: {
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      address: updated.address,
      purchase_count: updated._count.purchases,
    },
  });
}

// DELETE /api/suppliers/:id — Owner only
// Guard: supplier yang masih dipakai purchases → 409 supplier_in_use
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

  // Cek supplier ada + hitung purchases
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { _count: { select: { purchases: true } } },
  });

  if (!supplier) {
    return fail(404, "supplier_not_found");
  }

  // Guard: supplier masih dipakai purchases
  if (supplier._count.purchases > 0) {
    return fail(409, "supplier_in_use", { purchase_count: supplier._count.purchases });
  }

  // Aman dihapus
  await prisma.supplier.delete({ where: { id } });

  // Log activity
  await prisma.activityLog.create({
    data: {
      user_id: guard.id,
      action: "supplierDelete",
      description: `Hapus supplier ${supplier.name}`,
    },
  });

  return ok({ deleted: true });
}
