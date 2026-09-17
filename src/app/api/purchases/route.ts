// /api/purchases — UC-07 Mengelola Pembelian.
// GET  (login Owner/Kasir) : daftar pembelian dengan detail + total.
// POST (Owner only)        : tambah pembelian + stok bertambah atomik; log purchaseCreate.
import { NextRequest } from "next/server";
import { requireLogin, requireOwner, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { validatePurchaseInput, calculatePurchaseTotal, type PurchaseData } from "@/lib/purchase-api";

// GET /api/purchases — list semua pembelian (Owner/Kasir).
export async function GET() {
  const session = await requireLogin();
  if (session instanceof Response) return session;

  const purchases = await prisma.purchase.findMany({
    include: {
      supplier: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      details: {
        include: {
          product: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { purchase_date: "desc" },
  });

  const data: PurchaseData[] = purchases.map((p) => {
    const details = p.details.map((d) => ({
      id: d.id,
      product_id: d.product_id,
      product_name: d.product.name,
      quantity: d.quantity,
      unit_purchase_price: d.unit_purchase_price,
      subtotal: d.quantity * d.unit_purchase_price,
    }));

    const total = details.reduce((sum, d) => sum + d.subtotal, 0);

    return {
      id: p.id,
      supplier_id: p.supplier_id,
      supplier_name: p.supplier?.name ?? null,
      user_id: p.user_id,
      user_name: p.user.name,
      purchase_date: p.purchase_date.toISOString(),
      details,
      total,
      items_count: details.reduce((sum, d) => sum + d.quantity, 0),
    };
  });

  return ok({ purchases: data });
}

// POST /api/purchases — tambah pembelian (Owner only) + stok bertambah atomik.
export async function POST(req: NextRequest) {
  const session = await requireOwner();
  if (session instanceof Response) return session;

  const body = await req.json().catch(() => null);
  const validation = validatePurchaseInput(body);

  if (!validation.valid) {
    return fail(400, validation.errors[0].code, { errors: validation.errors });
  }

  const { supplier_id, details } = validation.data;

  // Validasi supplier_id jika diisi
  if (supplier_id) {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplier_id } });
    if (!supplier) {
      return fail(404, "supplier_not_found");
    }
  }

  // Validasi semua product_id exist
  const productIds = details.map((d) => d.product_id);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, stock: true },
  });

  if (products.length !== productIds.length) {
    const found = new Set(products.map((p) => p.id));
    const missing = productIds.filter((id) => !found.has(id));
    return fail(404, "product_not_found", { missing_products: missing });
  }

  // Transaction atomik: create purchase + details + update stock
  const purchase = await prisma.$transaction(async (tx) => {
    // 1. Create purchase
    const p = await tx.purchase.create({
      data: {
        supplier_id,
        user_id: session.id,
        details: {
          create: details.map((d) => ({
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

    // 2. Update stock (tambah)
    for (const d of details) {
      await tx.product.update({
        where: { id: d.product_id },
        data: { stock: { increment: d.quantity } },
      });
    }

    // 3. Activity log
    await tx.activityLog.create({
      data: {
        user_id: session.id,
        action: "purchaseCreate",
        description: `Pembelian ${p.id}: ${details.length} item, total Rp${calculatePurchaseTotal(details)}`,
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
    total: calculatePurchaseTotal(details),
    items_count: details.reduce((sum, d) => sum + d.quantity, 0),
  };

  return ok({ purchase: data }, 201);
}
