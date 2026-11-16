import { NextRequest } from "next/server";
import { requireLogin, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { validateCustomer } from "@/lib/customer-api";

// GET /api/customers — daftar pelanggan (Owner / Kasir)
export async function GET() {
  const session = await requireLogin();
  if (session instanceof Response) return session;

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          sales: true,
          debtRecords: true,
        },
      },
    },
  });

  return ok({
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      address: c.address,
      sales_count: c._count.sales,
      debt_count: c._count.debtRecords,
    })),
  });
}

// POST /api/customers — tambah pelanggan baru (Owner / Kasir via POS)
export async function POST(req: NextRequest) {
  const session = await requireLogin();
  if (session instanceof Response) return session;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return fail(400, "invalid_body");
  }

  const { data, errors } = validateCustomer(body as Record<string, unknown>, "create");
  if (Object.keys(errors).length > 0) {
    const firstError = errors.name || errors.phone || errors.address;
    return fail(400, firstError!);
  }

  const customer = await prisma.$transaction(async (tx) => {
    const created = await tx.customer.create({
      data: {
        name: data.name!,
        phone: data.phone || "",
        address: data.address || "",
      },
    });

    await tx.activityLog.create({
      data: {
        user_id: session.id,
        action: "customerAdd",
        description: `Tambah pelanggan ${created.name}`,
      },
    });

    return created;
  });

  return ok(
    {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        sales_count: 0,
        debt_count: 0,
      },
    },
    201
  );
}
