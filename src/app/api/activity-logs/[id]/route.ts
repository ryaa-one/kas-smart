import { requireLogin, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { formatActivityAction } from "@/lib/dashboard-api";

// GET /api/activity-logs/[id] — Detail satu entri log aktivitas
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

  const log = await prisma.activityLog.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, role: true },
      },
    },
  });

  if (!log) {
    return fail(404, "log_not_found");
  }

  // ISOLASI AKSES: Kasir TIDAK boleh melihat detail log aktivitas pengguna lain
  if (session.role === "Kasir" && log.user_id !== session.id) {
    return fail(403, "forbidden");
  }

  return ok({
    log: {
      id: log.id,
      user_id: log.user_id,
      user_name: log.user?.name ?? "Pengguna",
      user_role: log.user?.role ?? "—",
      action: log.action,
      action_label: formatActivityAction(log.action),
      description: log.description,
      created_at: log.created_at.toISOString(),
    },
  });
}
