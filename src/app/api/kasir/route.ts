// /api/kasir — UC-21 Mengelola Data Kasir (Owner only).
// GET  = daftar akun Kasir (role disaring server-side, tanpa hash).
// POST = tambah akun Kasir (password di-hash; role dipaksa Kasir).
// Tidak ada DELETE — nonaktif menggantikan hapus (PRD/ERD/UC-21).
import { UserRole, UserStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  fail,
  hashlessUser,
  hashPassword,
  ok,
  requireOwner,
} from "@/lib/api-auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const guard = await requireOwner();
  if (guard instanceof Response) return guard;

  const users = await prisma.user.findMany({
    where: { role: UserRole.Kasir },
    orderBy: { id: "asc" },
  });
  return ok({ users: users.map(hashlessUser) });
}

export async function POST(request: Request) {
  const guard = await requireOwner();
  if (guard instanceof Response) return guard;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "invalid_json");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const phone_number =
    typeof body.phone_number === "string" ? body.phone_number.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const status =
    body.status === UserStatus.nonaktif
      ? UserStatus.nonaktif
      : UserStatus.aktif;

  if (!name) return fail(400, "name_required");
  if (!username) return fail(400, "username_required");
  if (!phone_number) return fail(400, "phone_number_required");
  if (!password || password.length < 8) return fail(400, "password_min_8");
  if (email && !EMAIL_RE.test(email)) return fail(400, "email_invalid");

  // Pengecekan unik eksplisit (pesan granular), P2002 tetap jaring pengaman.
  const dupeUser = await prisma.user.findFirst({
    where: { username },
    select: { id: true },
  });
  if (dupeUser) return fail(409, "username_taken");
  if (email) {
    const dupeEmail = await prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    if (dupeEmail) return fail(409, "email_taken");
  }

  const created = await prisma.user
    .create({
      data: {
        name,
        username,
        phone_number,
        email: email || null, // K3: kosong = NULL
        password: await hashPassword(password),
        role: UserRole.Kasir, // endpoint ini khusus akun Kasir (UC-21)
        status,
      },
    })
    .catch((e: unknown) => {
      // Balapan antar-request: P2002 tetap mungkin terjadi walau sudah dicek.
      if ((e as { code?: string })?.code === "P2002") return null;
      throw e;
    });
  if (!created) return fail(409, "username_or_email_taken");

  await prisma.activityLog.create({
    data: {
      user_id: guard.id,
      action: "cashierAdd",
      description: `Tambah akun kasir ${name}`,
    },
  });
  return ok({ user: hashlessUser(created) }, 201);
}
