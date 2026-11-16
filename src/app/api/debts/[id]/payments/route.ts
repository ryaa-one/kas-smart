import { NextRequest } from "next/server";
import { requireLogin, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { DebtStatus, SaleStatus } from "@/generated/prisma/enums";
import { serializeDebt, serializePayment, DebtError } from "@/lib/debt-api";

// POST /api/debts/[id]/payments — mencatat pembayaran hutang pelanggan (Owner & Kasir, UC-17)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireLogin();
  if (session instanceof Response) return session;

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return fail(400, "id_required");
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return fail(400, "invalid_body");
  }

  const amount = Number(body.amount);
  if (
    body.amount === undefined ||
    body.amount === null ||
    Number.isNaN(amount) ||
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return fail(400, "invalid_amount");
  }

  const note = typeof body.note === "string" ? body.note.trim() : "";

  // Cari data hutang awal berdasarkan debt_id, sale_id, atau invoice_number
  const debt = await prisma.debtRecord.findFirst({
    where: {
      OR: [
        { debt_id: id },
        { sale_id: id },
        { sale: { invoice_number: id } },
      ],
    },
    include: {
      customer: { select: { name: true } },
      sale: { select: { invoice_number: true } },
    },
  });

  if (!debt) {
    return fail(404, "debt_not_found");
  }

  if (debt.remaining_debt <= 0 || debt.status === "Paid") {
    return fail(409, "debt_already_paid");
  }

  if (amount > debt.remaining_debt) {
    return fail(409, "amount_exceeds_remaining", {
      remaining_debt: debt.remaining_debt,
    });
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Kunci baris dengan FOR UPDATE di dalam transaksi untuk mencegah race condition (Section 14)
        const locked = await tx.$queryRaw<
          Array<{
            debt_id: string;
            sale_id: string;
            total_debt: number;
            remaining_debt: number;
            status: string;
          }>
        >`SELECT debt_id, sale_id, total_debt, remaining_debt, status FROM debt_records WHERE debt_id = ${debt.debt_id} FOR UPDATE`;

        const freshDebt = locked[0];

        if (!freshDebt) {
          throw new DebtError(404, "debt_not_found");
        }

        if (freshDebt.remaining_debt <= 0 || freshDebt.status === "Paid") {
          throw new DebtError(409, "debt_already_paid");
        }

        if (amount > freshDebt.remaining_debt) {
          throw new DebtError(409, "amount_exceeds_remaining", {
            remaining_debt: freshDebt.remaining_debt,
          });
        }

        const newRemaining = freshDebt.remaining_debt - amount;
        const newStatus: DebtStatus =
          newRemaining === 0 ? DebtStatus.Paid : DebtStatus.Partial;

        // 1. Buat record DEBT_PAYMENTS
        const payment = await tx.debtPayment.create({
          data: {
            debt_id: freshDebt.debt_id,
            user_id: session.id,
            amount,
            note,
          },
          include: {
            user: { select: { id: true, name: true } },
          },
        });

        // 2. Sinkronisasi status penjualan: jika utang telah lunas (newRemaining === 0),
        // update sales_transactions status menjadi LUNAS dan catat paid_at.
        if (newRemaining === 0) {
          await tx.salesTransaction.update({
            where: { sale_id: freshDebt.sale_id },
            data: {
              status: SaleStatus.LUNAS,
              paid_at: new Date(),
            },
          });
        }

        // 3. Perbarui DEBT_RECORDS (remaining_debt & status)
        const updatedDebt = await tx.debtRecord.update({
          where: { debt_id: freshDebt.debt_id },
          data: {
            remaining_debt: newRemaining,
            status: newStatus,
          },
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
              include: { user: { select: { id: true, name: true } } },
              orderBy: { payment_date: "desc" },
            },
          },
        });

        // 4. Catat ACTIVITY_LOGS (user dari session)
        const invoiceNo = debt.sale?.invoice_number || debt.sale_id;
        const custName = debt.customer?.name || "Pelanggan";
        await tx.activityLog.create({
          data: {
            user_id: session.id,
            action: "debtPayment",
            description: `Pembayaran hutang ${invoiceNo} sebesar Rp${amount.toLocaleString("id-ID")} dari pelanggan ${custName}`,
          },
        });

        return { updatedDebt, payment };
      },
      { timeout: 15000, maxWait: 10000 }
    );

    return ok(
      {
        debt: serializeDebt(result.updatedDebt),
        payment: serializePayment(result.payment),
      },
      201
    );
  } catch (err: unknown) {
    if (err instanceof DebtError) {
      return fail(err.status, err.code, err.extra);
    }
    console.error("[POST /api/debts/[id]/payments] Error:", err);
    return fail(500, "internal_error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
