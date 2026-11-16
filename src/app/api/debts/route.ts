import { requireLogin, ok } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeDebt } from "@/lib/debt-api";

// GET /api/debts — daftar seluruh data hutang pelanggan (Owner & Kasir)
export async function GET() {
  const session = await requireLogin();
  if (session instanceof Response) return session;

  const debts = await prisma.debtRecord.findMany({
    include: {
      customer: {
        select: { id: true, name: true, phone: true, address: true },
      },
      sale: {
        select: {
          sale_id: true,
          invoice_number: true,
          transaction_date: true,
          total: true,
          payment_method: true,
          status: true,
        },
      },
      payments: {
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { payment_date: "desc" },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return ok({ debts: debts.map(serializeDebt) });
}
