import { NextRequest } from "next/server";
import { requireOwner, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  validateStockAdjustmentInput,
  serializeStockAdjustment,
  StockAdjustmentError,
} from "@/lib/stock-adjustment-api";

// GET /api/stock-adjustments — list histori penyesuaian stok (Owner only)
export async function GET() {
  const session = await requireOwner();
  if (session instanceof Response) return session;

  const adjustments = await prisma.stockAdjustment.findMany({
    include: {
      user: { select: { id: true, name: true } },
      details: {
        include: {
          product: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { adjustment_date: "desc" },
  });

  return ok({ adjustments: adjustments.map(serializeStockAdjustment) });
}

// POST /api/stock-adjustments — buat penyesuaian stok baru (Owner only, UC-18)
export async function POST(req: NextRequest) {
  const session = await requireOwner();
  if (session instanceof Response) return session;

  const body = await req.json().catch(() => null);
  const validation = validateStockAdjustmentInput(body);

  if (!validation.valid) {
    return fail(validation.status, validation.code, validation.extra);
  }

  const { reason, note, details } = validation.data;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Urutkan product_id secara deterministik untuk mencegah potensi deadlock
        const sortedProductIds = [...new Set(details.map((d) => d.product_id))].sort();

        // Kunci baris produk dengan SELECT ... FOR UPDATE di PostgreSQL
        const lockedProducts = await tx.$queryRaw<
          Array<{
            id: string;
            name: string;
            stock: number;
            is_active: boolean;
          }>
        >`SELECT id, name, stock, is_active FROM products WHERE id = ANY(${sortedProductIds}) FOR UPDATE`;

        if (lockedProducts.length !== sortedProductIds.length) {
          const found = new Set(lockedProducts.map((p) => p.id));
          const missing = sortedProductIds.filter((id) => !found.has(id));
          throw new StockAdjustmentError(404, "product_not_found", { missing_products: missing });
        }

        const productMap = new Map(lockedProducts.map((p) => [p.id, p]));

        // Validasi produk aktif dan hasil stok >= 0 (PRODUCTS.stock = Single Source of Truth)
        for (const d of details) {
          const prod = productMap.get(d.product_id)!;
          if (!prod.is_active) {
            throw new StockAdjustmentError(400, "product_inactive", {
              product_id: prod.id,
              product_name: prod.name,
            });
          }

          const resultingStock = prod.stock + d.quantity_change;
          if (resultingStock < 0) {
            throw new StockAdjustmentError(409, "stock_insufficient", {
              product_id: prod.id,
              product_name: prod.name,
              current_stock: prod.stock,
              quantity_change: d.quantity_change,
              message: `Stok tidak mencukupi untuk ${prod.name}. Stok saat ini: ${prod.stock}, perubahan: ${d.quantity_change}`,
            });
          }

          prod.stock = resultingStock;
        }

        // 1. Simpan STOCK_ADJUSTMENTS
        const finalReason = note ? `${reason} — ${note}` : reason;

        const adjustment = await tx.stockAdjustment.create({
          data: {
            user_id: session.id,
            adjustment_date: new Date(),
            reason: finalReason,
            details: {
              create: details.map((d) => ({
                product_id: d.product_id,
                quantity_change: d.quantity_change,
              })),
            },
          },
          include: {
            user: { select: { id: true, name: true } },
            details: {
              include: {
                product: { select: { id: true, name: true } },
              },
            },
          },
        });

        // 2. Perbarui PRODUCTS.stock (Satu-satunya sumber kebenaran stok aktual)
        for (const d of details) {
          await tx.product.update({
            where: { id: d.product_id },
            data: {
              stock: {
                increment: d.quantity_change,
              },
            },
          });
        }

        // 3. Catat ACTIVITY_LOGS (user dari session)
        const logDesc =
          details.length === 1
            ? `Penyesuaian stok ${adjustment.details[0].product.name} (${details[0].quantity_change > 0 ? "+" : ""}${details[0].quantity_change})${note ? ` — ${note}` : ""}`
            : `Penyesuaian stok (${details.length} produk): ${adjustment.details.map((d) => `${d.product.name} (${d.quantity_change > 0 ? "+" : ""}${d.quantity_change})`).join(", ")}`;

        await tx.activityLog.create({
          data: {
            user_id: session.id,
            action: "stockAdjustment",
            description: logDesc,
          },
        });

        return adjustment;
      },
      { timeout: 15000, maxWait: 10000 }
    );

    return ok({ adjustment: serializeStockAdjustment(result) }, 201);
  } catch (err: unknown) {
    if (err instanceof StockAdjustmentError) {
      return fail(err.status, err.code, err.extra);
    }
    console.error("[POST /api/stock-adjustments] Error:", err);
    return fail(500, "internal_error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
