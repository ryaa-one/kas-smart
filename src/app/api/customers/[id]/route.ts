// /api/customers/[id] — Detail, Ubah, dan Hapus Pelanggan.
// GET    (Owner / Kasir) : detail satu pelanggan + jumlah transaksi & hutang + riwayat singkat.
// PATCH  (Owner only)    : ubah data pelanggan; log ACTIVITY_LOGS.
// DELETE (Owner only)    : hapus pelanggan (guard: 409 customer_in_use jika masih memiliki transaksi atau hutang).
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLogin, requireOwner, ok, fail } from "@/lib/api-auth";
import { validateCustomer, CustomerError } from "@/lib/customer-api";

// GET /api/customers/[id] — detail satu pelanggan
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireLogin();
  if (guard instanceof Response) return guard;

  const { id } = await params;
  if (!id || id.includes("..") || id.includes("/")) {
    return fail(400, "invalid_id");
  }

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          sales: true,
          debtRecords: true,
        },
      },
      sales: {
        select: {
          sale_id: true,
          invoice_number: true,
          transaction_date: true,
          total: true,
          payment_method: true,
          status: true,
        },
        orderBy: { transaction_date: "desc" },
        take: 10,
      },
      debtRecords: {
        select: {
          debt_id: true,
          sale_id: true,
          total_debt: true,
          remaining_debt: true,
          status: true,
          created_at: true,
          sale: {
            select: { invoice_number: true },
          },
        },
        orderBy: { created_at: "desc" },
        take: 10,
      },
    },
  });

  if (!customer) {
    return fail(404, "customer_not_found");
  }

  return ok({
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      sales_count: customer._count.sales,
      debt_count: customer._count.debtRecords,
      recent_sales: customer.sales.map((s) => ({
        sale_id: s.sale_id,
        invoice_number: s.invoice_number,
        transaction_date: s.transaction_date.toISOString(),
        total: s.total,
        payment_method: String(s.payment_method),
        status: String(s.status),
      })),
      debt_records: customer.debtRecords.map((d) => ({
        debt_id: d.debt_id,
        sale_id: d.sale_id,
        invoice_number: d.sale?.invoice_number ?? null,
        total_debt: d.total_debt,
        remaining_debt: d.remaining_debt,
        status: String(d.status),
        created_at: d.created_at.toISOString(),
      })),
    },
  });
}

// PATCH /api/customers/[id] — Owner only
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

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "invalid_json");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail(400, "invalid_body");
  }

  const { data, errors } = validateCustomer(body, "update");
  if (Object.keys(errors).length > 0) {
    const firstError = errors.name || errors.phone || errors.address;
    return fail(400, firstError!);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findUnique({
        where: { id },
        include: {
          _count: { select: { sales: true, debtRecords: true } },
        },
      });

      if (!existing) {
        throw new CustomerError(404, "customer_not_found");
      }

      if (Object.keys(data).length === 0) {
        return existing;
      }

      const saved = await tx.customer.update({
        where: { id },
        data,
        include: {
          _count: { select: { sales: true, debtRecords: true } },
        },
      });

      await tx.activityLog.create({
        data: {
          user_id: guard.id,
          action: "customerUpdate",
          description: `Ubah pelanggan ${saved.name}`,
        },
      });

      return saved;
    });

    return ok({
      customer: {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        address: updated.address,
        sales_count: updated._count.sales,
        debt_count: updated._count.debtRecords,
      },
    });
  } catch (err: unknown) {
    if (err instanceof CustomerError) {
      return fail(err.status, err.code, err.extra);
    }
    console.error("Update customer failed:", err);
    return fail(500, "internal_server_error");
  }
}

// DELETE /api/customers/[id] — Owner only
// Guard: pelanggan yang masih memiliki transaksi atau hutang → 409 customer_in_use
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireOwner();
  if (guard instanceof Response) return guard;

  const { id } = await params;
  if (!id || id.includes("..") || id.includes("/")) {
    return fail(400, "invalid_id");
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Kunci baris pelanggan untuk mencegah race condition saat ada transaksi baru atau delete bersamaan
      const locked = await tx.$queryRaw<Array<{ id: string; name: string }>>`
        SELECT id, name FROM customers WHERE id = ${id} FOR UPDATE
      `;

      const customer = locked[0];
      if (!customer) {
        throw new CustomerError(404, "customer_not_found");
      }

      const [salesCount, debtCount] = await Promise.all([
        tx.salesTransaction.count({ where: { customer_id: id } }),
        tx.debtRecord.count({ where: { customer_id: id } }),
      ]);

      if (salesCount > 0 || debtCount > 0) {
        throw new CustomerError(409, "customer_in_use", {
          sales_count: salesCount,
          debt_count: debtCount,
        });
      }

      await tx.customer.delete({ where: { id } });

      await tx.activityLog.create({
        data: {
          user_id: guard.id,
          action: "customerDelete",
          description: `Hapus pelanggan ${customer.name}`,
        },
      });
    });

    return ok({ deleted: true });
  } catch (err: unknown) {
    if (err instanceof CustomerError) {
      return fail(err.status, err.code, err.extra);
    }
    // Tangani foreign key constraint violation (P2003) bila terjadi race condition saat delete
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2003"
    ) {
      return fail(409, "customer_in_use");
    }
    console.error("Delete customer failed:", err);
    return fail(500, "internal_server_error");
  }
}
