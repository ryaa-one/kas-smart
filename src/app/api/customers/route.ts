import { NextRequest } from "next/server";
import { requireLogin, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET /api/customers — daftar pelanggan (Owner / Kasir)
export async function GET() {
  const session = await requireLogin();
  if (session instanceof Response) return session;

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
  });

  return ok({ customers });
}

// POST /api/customers — tambah pelanggan baru
export async function POST(req: NextRequest) {
  const session = await requireLogin();
  if (session instanceof Response) return session;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return fail(400, "invalid_body");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";

  if (!name) {
    return fail(400, "name_required");
  }

  const customer = await prisma.customer.create({
    data: {
      name,
      phone,
      address,
    },
  });

  await prisma.activityLog.create({
    data: {
      user_id: session.id,
      action: "customerAdd",
      description: `Tambah pelanggan ${customer.name}`,
    },
  });

  return ok({ customer }, 201);
}
