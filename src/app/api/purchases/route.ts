// /api/purchases — UC-07 Mengelola Pembelian.
// GET  (login Owner/Kasir) : daftar pembelian dengan detail + total.
// POST (Owner only)        : tambah pembelian + stok bertambah atomik; log purchaseCreate.
import { NextRequest } from "next/server";
import { requireLogin, requireOwner, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { validatePurchaseInput, calculatePurchaseTotal, PurchaseError, type PurchaseData } from "@/lib/purchase-api";

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

  const { supplier_id, purchase_date, details } = validation.data;

  // Validasi supplier_id jika diisi
  if (supplier_id) {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplier_id } });
    if (!supplier) {
      return fail(404, "supplier_not_found");
    }
  }

  // Validasi semua product_id exist (support multi-line produk yang sama via Set)
  const uniqueProductIds = Array.from(new Set(details.map((d) => d.product_id))).sort();
  const products = await prisma.product.findMany({
    where: { id: { in: uniqueProductIds } },
    select: { id: true, name: true, stock: true },
  });

  if (products.length !== uniqueProductIds.length) {
    const found = new Set(products.map((p) => p.id));
    const missing = uniqueProductIds.filter((id) => !found.has(id));
    return fail(404, "product_not_found", { missing_products: missing });
  }

  // Agregasi kuantitas per produk untuk update stok yang konsisten
  const qtyByProduct = new Map<string, number>();
  for (const d of details) {
    qtyByProduct.set(d.product_id, (qtyByProduct.get(d.product_id) ?? 0) + d.quantity);
  }

  try {
    // Transaction atomik: lock supplier/products + create purchase + details + update stock
    const purchase = await prisma.$transaction(async (tx) => {
      if (supplier_id) {
        const lockedSup = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM suppliers WHERE id = ${supplier_id} FOR SHARE
        `;
        if (lockedSup.length === 0) {
          throw new PurchaseError(404, "supplier_not_found");
        }
      }

      for (const pid of uniqueProductIds) {
        const lockedProd = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM products WHERE id = ${pid} FOR UPDATE
        `;
        if (lockedProd.length === 0) {
          throw new PurchaseError(404, "product_not_found", { missing_products: [pid] });
        }
      }

      // 1. Create purchase
      const p = await tx.purchase.create({
        data: {
          supplier_id,
          user_id: session.id,
          ...(purchase_date ? { purchase_date: new Date(purchase_date) } : {}),
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
      for (const [pid, qty] of qtyByProduct.entries()) {
        await tx.product.update({
          where: { id: pid },
          data: { stock: { increment: qty } },
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
  } catch (err: unknown) {
    if (err instanceof PurchaseError) {
      return fail(err.status, err.code, err.extra);
    }
    console.error("Create purchase failed:", err);
    return fail(500, "internal_server_error");
  }
}
