// PATCH /api/kasir/:id — UC-21 (Owner only): ubah data akun Kasir
// (nama/username/telepon/email/password/status aktif-nonaktif).
// Role tidak dapat diubah lewat endpoint ini (tetap Kasir); tidak ada hapus.
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { fail, hashlessUser, hashPassword, ok, requireOwner } from "@/lib/api-auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireOwner();
  if (guard instanceof Response) return guard;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "invalid_json");
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return fail(404, "user_not_found");
  if (target.role !== UserRole.Kasir) return fail(400, "not_a_kasir");

  const patch: {
    name?: string;
    username?: string;
    phone_number?: string;
    email?: string | null;
    password?: string;
    status?: "aktif" | "nonaktif";
  } = {};

  if (body.name !== undefined) {
    const v = typeof body.name === "string" ? body.name.trim() : "";
    if (!v) return fail(400, "name_required");
    patch.name = v;
  }
  if (body.username !== undefined) {
    const v = typeof body.username === "string" ? body.username.trim() : "";
    if (!v) return fail(400, "username_required");
    patch.username = v;
  }
  if (body.phone_number !== undefined) {
    const v =
      typeof body.phone_number === "string" ? body.phone_number.trim() : "";
    if (!v) return fail(400, "phone_number_required");
    patch.phone_number = v;
  }
  if (body.email !== undefined) {
    const v = typeof body.email === "string" ? body.email.trim() : "";
    if (v && !EMAIL_RE.test(v)) return fail(400, "email_invalid");
    patch.email = v || null; // K3: kosong = NULL
  }
  if (body.password !== undefined) {
    const v = typeof body.password === "string" ? body.password : "";
    if (v === "") return fail(400, "password_min_8");
    if (v.length < 8) return fail(400, "password_min_8");
    patch.password = await hashPassword(v);
  }
  if (body.status !== undefined) {
    if (body.status !== "aktif" && body.status !== "nonaktif")
      return fail(400, "status_invalid");
    patch.status = body.status;
  }
  if (Object.keys(patch).length === 0) return fail(400, "nothing_to_update");

  // Pengecekan unik eksplisit terhadap akun LAIN (bukan diri sendiri).
  if (patch.username) {
    const dupe = await prisma.user.findFirst({
      where: { username: patch.username, id: { not: id } },
      select: { id: true },
    });
    if (dupe) return fail(409, "username_taken");
  }
  if (patch.email) {
    const dupe = await prisma.user.findFirst({
      where: { email: patch.email, id: { not: id } },
      select: { id: true },
    });
    if (dupe) return fail(409, "email_taken");
  }

  const updated = await prisma.user.update({ where: { id }, data: patch });

  const action = patch.status
    ? patch.status === "nonaktif"
      ? "cashierDeactivate"
      : "cashierActivate"
    : "cashierEdit";
  await prisma.activityLog.create({
    data: {
      user_id: guard.id,
      action,
      description: `Ubah akun kasir ${updated.name}`,
    },
  });

  return ok({ user: hashlessUser(updated) });
}
