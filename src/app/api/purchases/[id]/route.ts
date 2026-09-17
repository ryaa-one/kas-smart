// /api/purchases/[id] — UC-07 detail/ubah/hapus pembelian.
// GET    (login)     : detail satu pembelian + items.
// PATCH  (Owner)     : ubah pembelian + adjust stok atomik (revert old, apply new).
// DELETE (Owner)     : hapus pembelian + kembalikan stok atomik.
import { NextRequest } from "next/server";
import { requireLogin, requireOwner, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { validatePurchaseInput, calculatePurchaseTotal, type PurchaseData } from "@/lib/purchase-api";

// GET /api/purchases/:id — detail pembelian (Owner/Kasir).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireLogin();
  if (session instanceof Response) return session;
  const { id } = await params;

  if (!id || typeof id !== "string" || id.includes("/") || id.includes("..")) {
    return fail(404, "purchase_not_found");
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      details: {
        include: {
          product: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!purchase) {
    return fail(404, "purchase_not_found");
  }

  const details = purchase.details.map((d) => ({
    id: d.id,
    product_id: d.product_id,
    product_name: d.product.name,
    quantity: d.quantity,
    unit_purchase_price: d.unit_purchase_price,
    subtotal: d.quantity * d.unit_purchase_price,
  }));

  const data: PurchaseData = {
    id: purchase.id,
    supplier_id: purchase.supplier_id,
    supplier_name: purchase.supplier?.name ?? null,
    user_id: purchase.user_id,
    user_name: purchase.user.name,
    purchase_date: purchase.purchase_date.toISOString(),
    details,
    total: details.reduce((sum, d) => sum + d.subtotal, 0),
    items_count: details.reduce((sum, d) => sum + d.quantity, 0),
  };

  return ok({ purchase: data });
}

// PATCH /api/purchases/:id — ubah pembelian (Owner only) + adjust stok atomik.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireOwner();
  if (session instanceof Response) return session;
  const { id } = await params;

  if (!id || typeof id !== "string" || id.includes("/") || id.includes("..")) {
    return fail(404, "purchase_not_found");
  }

  const body = await req.json().catch(() => null);
  const validation = validatePurchaseInput(body);

  if (!validation.valid) {
    return fail(400, validation.errors[0].code, { errors: validation.errors });
  }

  const { supplier_id, details: newDetails } = validation.data;

  // Validasi purchase exists
  const oldPurchase = await prisma.purchase.findUnique({
    where: { id },
    include: { details: true },
  });

  if (!oldPurchase) {
    return fail(404, "purchase_not_found");
  }

  // Validasi supplier_id jika diisi
  if (supplier_id) {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplier_id } });
    if (!supplier) {
      return fail(404, "supplier_not_found");
    }
  }

  // Validasi semua product_id exist
  const productIds = newDetails.map((d) => d.product_id);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, stock: true },
  });

  if (products.length !== productIds.length) {
    const found = new Set(products.map((p) => p.id));
    const missing = productIds.filter((id) => !found.has(id));
    return fail(404, "product_not_found", { missing_products: missing });
  }

  // Cek stok mencukupi untuk revert (tidak boleh negatif setelah adjust)
  const stockMap = new Map(products.map((p) => [p.id, p.stock]));
  
  // Hitung net change per produk (new - old)
  const oldQtyMap = new Map<string, number>();
  oldPurchase.details.forEach((d) => {
    oldQtyMap.set(d.product_id, (oldQtyMap.get(d.product_id) || 0) + d.quantity);
  });

  const newQtyMap = new Map<string, number>();
  newDetails.forEach((d) => {
    newQtyMap.set(d.product_id, (newQtyMap.get(d.product_id) || 0) + d.quantity);
  });

  // Validasi stok tidak negatif setelah adjust
  const allProductIds = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]);
  for (const pid of allProductIds) {
    const oldQty = oldQtyMap.get(pid) || 0;
    const newQty = newQtyMap.get(pid) || 0;
    const netChange = newQty - oldQty; // positif = tambah, negatif = kurang
    const currentStock = stockMap.get(pid) || 0;
    const finalStock = currentStock + netChange;

    if (finalStock < 0) {
      return fail(400, "insufficient_stock", { 
        product_id: pid, 
        current_stock: currentStock,
        required_reduction: Math.abs(netChange),
      });
    }
  }

  // Transaction atomik: update purchase + delete old details + create new details + adjust stock
  const purchase = await prisma.$transaction(async (tx) => {
    // 1. Revert stok lama (kurangi quantity lama)
    for (const d of oldPurchase.details) {
      await tx.product.update({
        where: { id: d.product_id },
        data: { stock: { decrement: d.quantity } },
      });
    }

    // 2. Delete old details
    await tx.purchaseDetail.deleteMany({
      where: { purchase_id: id },
    });

    // 3. Update purchase + create new details
    const p = await tx.purchase.update({
      where: { id },
      data: {
        supplier_id,
        details: {
          create: newDetails.map((d) => ({
            product_id: d.product_id,
            quantity: d.quantity,
            unit_purchase_price: d.unit_purchase_price,
          })),
        },
      },
      include: {
        supplier: { select: { name: true } },
        user: { select: { name: true } },
        details: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    // 4. Apply stok baru (tambah quantity baru)
    for (const d of newDetails) {
      await tx.product.update({
        where: { id: d.product_id },
        data: { stock: { increment: d.quantity } },
      });
    }

    // 5. Activity log
    await tx.activityLog.create({
      data: {
        user_id: session.id,
        action: "purchaseUpdate",
        description: `Pembelian ${id}: ${newDetails.length} item, total Rp${calculatePurchaseTotal(newDetails)}`,
      },
    });

    return p;
  });

  const data: PurchaseData = {
    id: purchase.id,
    supplier_id: purchase.supplier_id,
    supplier_name: purchase.supplier?.name ?? null,
    user_id: purchase.user_id,
    user_name: purchase.user.name,
    purchase_date: purchase.purchase_date.toISOString(),
    details: purchase.details.map((d) => ({
      id: d.id,
      product_id: d.product_id,
      product_name: d.product.name,
      quantity: d.quantity,
      unit_purchase_price: d.unit_purchase_price,
      subtotal: d.quantity * d.unit_purchase_price,
    })),
    total: calculatePurchaseTotal(newDetails),
    items_count: newDetails.reduce((sum, d) => sum + d.quantity, 0),
  };

  return ok({ purchase: data });
}

// DELETE /api/purchases/:id — hapus pembelian (Owner only) + kembalikan stok atomik.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireOwner();
  if (session instanceof Response) return session;
  const { id } = await params;

  if (!id || typeof id !== "string" || id.includes("/") || id.includes("..")) {
    return fail(404, "purchase_not_found");
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { details: true },
  });

  if (!purchase) {
    return fail(404, "purchase_not_found");
  }

  // Transaction atomik: kembalikan stok + delete details + delete purchase
  await prisma.$transaction(async (tx) => {
    // 1. Kembalikan stok (kurangi quantity)
    for (const d of purchase.details) {
      const product = await tx.product.findUnique({ where: { id: d.product_id } });
      if (product) {
        const newStock = product.stock - d.quantity;
        if (newStock < 0) {
          throw new Error(`insufficient_stock:${d.product_id}`);
        }
        await tx.product.update({
          where: { id: d.product_id },
          data: { stock: newStock },
        });
      }
    }

    // 2. Delete details
    await tx.purchaseDetail.deleteMany({
      where: { purchase_id: id },
    });

    // 3. Delete purchase
    await tx.purchase.delete({
      where: { id },
    });

    // 4. Activity log
    await tx.activityLog.create({
      data: {
        user_id: session.id,
        action: "purchaseDelete",
        description: `Pembelian ${id} dihapus, stok ${purchase.details.length} produk dikembalikan`,
      },
    });
  });

  return ok({ deleted: true });
}
