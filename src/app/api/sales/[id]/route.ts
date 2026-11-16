import { requireLogin, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeSale } from "@/lib/sales-api";

// GET /api/sales/[id] — ambil detail satu transaksi penjualan
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireLogin();
  if (session instanceof Response) return session;

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return fail(400, "id_required");
  }

  const sale = await prisma.salesTransaction.findFirst({
    where: {
      OR: [{ sale_id: id }, { invoice_number: id }],
    },
    include: {
      user: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
      details: {
        include: {
          product: { select: { id: true, name: true, barcode: true } },
        },
      },
      debtRecord: true,
    },
  });

  if (!sale) {
    return fail(404, "sale_not_found");
  }

  // ISOLASI AKSES: Kasir TIDAK boleh melihat detail transaksi kasir/user lain
  if (session.role === "Kasir" && sale.user_id !== session.id) {
    return fail(403, "forbidden");
  }

  return ok({ sale: serializeSale(sale) });
}
