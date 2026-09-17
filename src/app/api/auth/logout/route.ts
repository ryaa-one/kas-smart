// POST /api/auth/logout — UC-02. Bersihkan cookie sesi; catat log bila login.
import { prisma } from "@/lib/prisma";
import {
  clearedSessionCookieHeader,
  fail,
  getSession,
  ok,
} from "@/lib/api-auth";

export async function POST() {
  const session = await getSession();
  if (session) {
    // user mungkin sudah dihapus/nonaktif — jangan gagalkan logout.
    try {
      await prisma.activityLog.create({
        data: {
          user_id: session.id,
          action: "logout",
          description: "Logout dari sistem",
        },
      });
    } catch {
      // FK bisa gagal bila user tak ada — abaikan, sesi tetap dihapus.
    }
  }
  return ok({ loggedOut: true }, 200, [clearedSessionCookieHeader()]);
}
