// PATCH /api/auth/profile — UC-24 Profil Saya (Owner & Kasir).
// Identitas SELALU dari sesi (cookie), bukan dari body. Field boleh diubah:
// name, phone_number, email, password (opsional, wajib password lama).
// id / username / role / status TIDAK dapat diubah lewat endpoint ini.
import { prisma } from "@/lib/prisma";
import {
  fail,
  getSession,
  hashlessUser,
  hashPassword,
  ok,
  verifyPassword,
} from "@/lib/api-auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return fail(401, "unauthorized");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "invalid_json");
  }

  const current = await prisma.user.findUnique({ where: { id: session.id } });
  if (!current || current.status !== "aktif") return fail(401, "unauthorized");

  const data: {
    name?: string;
    phone_number?: string;
    email?: string | null;
    password?: string;
  } = {};

  if (body.name !== undefined) {
    const v = typeof body.name === "string" ? body.name.trim() : "";
    if (!v) return fail(400, "name_required");
    data.name = v;
  }
  if (body.phone_number !== undefined) {
    // Kolom NOT NULL — isi kosong berarti string kosong, bukan null.
    const v = typeof body.phone_number === "string" ? body.phone_number.trim() : "";
    data.phone_number = v;
  }
  if (body.email !== undefined) {
    const v = typeof body.email === "string" ? body.email.trim() : "";
    if (v && !EMAIL_RE.test(v)) return fail(400, "email_invalid");
    data.email = v || null; // K3: kosong = NULL (multi-NULL ok)
  }
  if (body.password !== undefined && body.password !== "") {
    const newPw = typeof body.password === "string" ? body.password : "";
    const oldPw =
      typeof body.current_password === "string" ? body.current_password : "";
    if (!oldPw) return fail(400, "current_password_required");
    const validOld = await verifyPassword(oldPw, current.password);
    if (!validOld) return fail(403, "current_password_incorrect");
    if (newPw.length < 8) return fail(400, "password_min_8");
    data.password = await hashPassword(newPw); // hash hanya di server
  }
  if (Object.keys(data).length === 0) return fail(400, "nothing_to_update");

  if (data.email) {
    const dupe = await prisma.user.findFirst({
      where: { email: data.email, id: { not: current.id } },
      select: { id: true },
    });
    if (dupe) return fail(409, "email_taken");
  }

  const updated = await prisma.user
    .update({ where: { id: current.id }, data })
    .catch((e: unknown) => {
      // Balapan email (P2002): kembalikan null, ditangani di bawah.
      if ((e as { code?: string })?.code === "P2002") return null;
      throw e;
    });
  if (!updated) return fail(409, "email_taken");

  await prisma.activityLog.create({
    data: {
      user_id: current.id,
      action: "profileChange",
      description: "Perbarui profil saya",
    },
  });

  return ok({ user: hashlessUser(updated) });
}
