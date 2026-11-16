import { NextRequest } from "next/server";
import { requireLogin, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { formatActivityAction } from "@/lib/dashboard-api";

// GET /api/activity-logs — Daftar log aktivitas sistem
// Owner: seluruh aktivitas toko (UC-23)
// Kasir: hanya aktivitas miliknya sendiri (isolasi role)
export async function GET(req: NextRequest) {
  const session = await requireLogin();
  if (session instanceof Response) return session;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || searchParams.get("q");
  const userParam = searchParams.get("user_id") || searchParams.get("user");
  const actionParam = searchParams.get("action");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("page_size") || searchParams.get("pageSize") || searchParams.get("limit");

  const andConditions: Prisma.ActivityLogWhereInput[] = [];

  // 1. ISOLASI AKSES: Kasir HANYA boleh membaca aktivitas miliknya sendiri!
  if (session.role === "Kasir") {
    andConditions.push({ user_id: session.id });
  } else if (session.role === "Owner" && userParam) {
    andConditions.push({
      OR: [{ user_id: userParam }, { user: { name: userParam } }],
    });
  }

  // 2. Filter Pencarian (deskripsi atau nama pengguna)
  if (search && search.trim()) {
    const s = search.trim();
    andConditions.push({
      OR: [
        { description: { contains: s, mode: "insensitive" } },
        { user: { name: { contains: s, mode: "insensitive" } } },
      ],
    });
  }

  // 3. Filter Jenis Aktivitas (action)
  if (actionParam && actionParam.trim()) {
    andConditions.push({ action: actionParam.trim() });
  }

  // 4. Filter Rentang Tanggal (server-side, satu hari penuh)
  if (from || to) {
    const dateRange: { gte?: Date; lte?: Date } = {};
    if (from) {
      const d = new Date(`${from}T00:00:00.000Z`);
      if (isNaN(d.getTime())) return fail(400, "invalid_from_date");
      dateRange.gte = d;
    }
    if (to) {
      const d = new Date(`${to}T23:59:59.999Z`);
      if (isNaN(d.getTime())) return fail(400, "invalid_to_date");
      dateRange.lte = d;
    }
    andConditions.push({ created_at: dateRange });
  }

  const where: Prisma.ActivityLogWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  // 5. Pagination
  const parsedPage = pageParam ? parseInt(pageParam, 10) : 1;
  const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const parsedPageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : 10;
  const pageSize = isNaN(parsedPageSize) || parsedPageSize < 1 ? 10 : Math.min(100, parsedPageSize);
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const total = await prisma.activityLog.count({ where });

  const logs = await prisma.activityLog.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, role: true },
      },
    },
    orderBy: { created_at: "desc" },
    skip,
    take,
  });

  // Opsi dropdown pengguna (Owner melihat semua, Kasir hanya dirinya)
  let usersList: Array<{ id: string; name: string; role: string }> = [];
  if (session.role === "Owner") {
    const dbUsers = await prisma.user.findMany({
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
    usersList = dbUsers;
  } else {
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { name: true },
    });
    usersList = [
      {
        id: session.id,
        name: currentUser?.name ?? "Kasir",
        role: "Kasir",
      },
    ];
  }

  // Opsi dropdown jenis aktivitas yang tercatat
  const distinctActions = await prisma.activityLog.findMany({
    where: session.role === "Kasir" ? { user_id: session.id } : {},
    select: { action: true },
    distinct: ["action"],
  });

  const actionsList = distinctActions.map((a) => ({
    action: a.action,
    label: formatActivityAction(a.action),
  }));

  const totalPages = Math.ceil(total / pageSize) || 1;

  return ok({
    logs: logs.map((l) => ({
      id: l.id,
      user_id: l.user_id,
      user_name: l.user?.name ?? "Pengguna",
      user_role: l.user?.role ?? "—",
      action: l.action,
      action_label: formatActivityAction(l.action),
      description: l.description,
      created_at: l.created_at.toISOString(),
    })),
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages,
    },
    users: usersList,
    actions: actionsList,
  });
}
