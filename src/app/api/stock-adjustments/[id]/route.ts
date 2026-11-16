import { requireOwner, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeStockAdjustment } from "@/lib/stock-adjustment-api";

// GET /api/stock-adjustments/[id] — detail satu penyesuaian stok (Owner only)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireOwner();
  if (session instanceof Response) return session;

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return fail(400, "id_required");
  }

  const adjustment = await prisma.stockAdjustment.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      details: {
        include: {
          product: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!adjustment) {
    return fail(404, "stock_adjustment_not_found");
  }

  return ok({ adjustment: serializeStockAdjustment(adjustment) });
}
