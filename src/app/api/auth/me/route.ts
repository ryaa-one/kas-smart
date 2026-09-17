// GET /api/auth/me — info user yang sedang login (server-side session check).
import { prisma } from "@/lib/prisma";
import { fail, getSession, hashlessUser, ok } from "@/lib/api-auth";

export async function GET() {
  const session = await getSession();
  if (!session) return fail(401, "unauthorized");

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  // Sesi tetap valid secara tanda tangan, tapi user bisa saja dihapus/nonaktif
  // setelah login — diperlakukan sebagai belum login.
  if (!user || user.status !== "aktif") return fail(401, "unauthorized");

  return ok({ user: hashlessUser(user) });
}
