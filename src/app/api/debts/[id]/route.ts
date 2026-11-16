import { NextRequest } from "next/server";
import { requireLogin, requireOwner, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { DebtStatus, SaleStatus } from "@/generated/prisma/enums";
import { serializeDebt } from "@/lib/debt-api";

// GET /api/debts/[id] — detail satu data hutang pelanggan (Owner & Kasir)
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

  const debt = await prisma.debtRecord.findFirst({
    where: {
      OR: [
        { debt_id: id },
        { sale_id: id },
        { sale: { invoice_number: id } },
      ],
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
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { payment_date: "desc" },
      },
    },
  });

  if (!debt) {
    return fail(404, "debt_not_found");
  }

  return ok({ debt: serializeDebt(debt) });
}

// PATCH /api/debts/[id] — ubah data hutang (Owner only, UC-16)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireOwner();
  if (session instanceof Response) return session;

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return fail(400, "id_required");
  }

  const debt = await prisma.debtRecord.findUnique({
    where: { debt_id: id },
    include: {
      customer: true,
      sale: true,
    },
  });

  if (!debt) {
    return fail(404, "debt_not_found");
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return fail(400, "invalid_body");
  }

  let newCustomerId = debt.customer_id;
  if (body.customer_id !== undefined) {
    const cid = typeof body.customer_id === "string" ? body.customer_id.trim() : "";
    if (!cid) return fail(400, "customer_required");
    const customer = await prisma.customer.findUnique({ where: { id: cid } });
    if (!customer) return fail(404, "customer_not_found");
    newCustomerId = cid;
  }

  let newTotalDebt = debt.total_debt;
  let newRemainingDebt = debt.remaining_debt;
  let newStatus = debt.status;

  if (body.total_debt !== undefined) {
    const total = Number(body.total_debt);
    if (!Number.isInteger(total) || total <= 0) {
      return fail(400, "total_debt_invalid");
    }
    const alreadyPaid = debt.total_debt - debt.remaining_debt;
    if (total < alreadyPaid) {
      return fail(400, "total_below_paid", { already_paid: alreadyPaid });
    }
    newTotalDebt = total;
    newRemainingDebt = total - alreadyPaid;
    newStatus = newRemainingDebt === 0 ? DebtStatus.Paid : (alreadyPaid > 0 ? DebtStatus.Partial : DebtStatus.Unpaid);
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Sinkronkan sales_transactions jika customer berubah atau status lunas berubah
    await tx.salesTransaction.update({
      where: { sale_id: debt.sale_id },
      data: {
        customer_id: newCustomerId,
        status: newRemainingDebt === 0 ? SaleStatus.LUNAS : SaleStatus.HUTANG,
        paid_at: newRemainingDebt === 0 ? (debt.sale?.paid_at ?? new Date()) : null,
      },
    });

    const d = await tx.debtRecord.update({
      where: { debt_id: id },
      data: {
        customer_id: newCustomerId,
        total_debt: newTotalDebt,
        remaining_debt: newRemainingDebt,
        status: newStatus,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, address: true } },
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

    await tx.activityLog.create({
      data: {
        user_id: session.id,
        action: "debtEdit",
        description: `Ubah data hutang ${id}`,
      },
    });

    return d;
  });

  return ok({ debt: serializeDebt(updated) });
}

// DELETE /api/debts/[id] — hapus data hutang (Owner only, UC-16)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireOwner();
  if (session instanceof Response) return session;

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return fail(400, "id_required");
  }

  const debt = await prisma.debtRecord.findUnique({
    where: { debt_id: id },
  });

  if (!debt) {
    return fail(404, "debt_not_found");
  }

  await prisma.$transaction(async (tx) => {
    // Hapus payment terkait terlebih dahulu
    await tx.debtPayment.deleteMany({
      where: { debt_id: id },
    });
    // Hapus debt record
    await tx.debtRecord.delete({
      where: { debt_id: id },
    });
    // Catat log
    await tx.activityLog.create({
      data: {
        user_id: session.id,
        action: "debtDelete",
        description: `Hapus data hutang ${id}`,
      },
    });
  });

  return ok({ deleted: true });
}
