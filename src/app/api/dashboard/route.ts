import { requireLogin, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { formatActivityAction } from "@/lib/dashboard-api";
import type { DashboardChartPoint } from "@/components/dashboard/chart-config";

export async function GET() {
  const session = await requireLogin();
  if (session instanceof Response) return session;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // ========================================================
  // 1. KASIR DASHBOARD (Scope terbatas hanya transaksi & aktivitas kasir)
  // ========================================================
  if (session.role === "Kasir") {
    const todaySales = await prisma.salesTransaction.findMany({
      where: {
        user_id: session.id,
        status: { not: "DIBATALKAN" },
        transaction_date: { gte: startOfDay, lte: endOfDay },
      },
      select: { total: true },
    });

    const salesToday = todaySales.reduce((sum, s) => sum + s.total, 0);
    const countToday = todaySales.length;

    const activities = await prisma.activityLog.findMany({
      where: { user_id: session.id },
      orderBy: { created_at: "desc" },
      take: 8,
    });

    const kasirUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { name: true },
    });
    const kasirName = kasirUser?.name ?? "Kasir";

    return ok({
      role: "Kasir",
      stats: {
        salesToday,
        countToday,
      },
      activities: activities.map((a) => ({
        id: a.id,
        user_id: a.user_id,
        user_name: kasirName,
        user_role: "Kasir",
        action: a.action,
        action_label: formatActivityAction(a.action),
        description: a.description,
        created_at: a.created_at.toISOString(),
      })),
    });
  }

  // ========================================================
  // 2. OWNER DASHBOARD (Scope seluruh toko)
  // ========================================================
  try {
    // Stat 1: Penjualan & Profit Hari Ini
    const todaySales = await prisma.salesTransaction.findMany({
      where: {
        status: { not: "DIBATALKAN" },
        transaction_date: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        details: {
          include: {
            product: { select: { purchase_price: true } },
          },
        },
      },
    });

    const salesToday = todaySales.reduce((sum, s) => sum + s.total, 0);
    const cogsToday = todaySales.reduce(
      (sum, s) =>
        sum +
        s.details.reduce(
          (acc, d) => acc + d.quantity * (d.product?.purchase_price ?? 0),
          0
        ),
      0
    );
    const profitToday = salesToday - cogsToday;

    // Pembayaran Tunai & QRIS yang sah (lunas) hari ini (exclude draft, dibatalkan, hutang)
    const isLunas = (st: string) => {
      const lower = st.toLowerCase();
      return lower === "lunas" || lower === "paid";
    };

    const cashToday = todaySales
      .filter((s) => s.payment_method === "cash" && isLunas(s.status))
      .reduce((sum, s) => sum + s.total, 0);

    const qrisToday = todaySales
      .filter((s) => s.payment_method === "qris" && isLunas(s.status))
      .reduce((sum, s) => sum + s.total, 0);

    // Stat 2: Total Master Data & Hutang
    const totalProducts = await prisma.product.count({ where: { is_active: true } });
    const totalSuppliers = await prisma.supplier.count();
    const totalCashiers = await prisma.user.count({
      where: { role: "Kasir", status: "aktif" },
    });
    const debtAgg = await prisma.debtRecord.aggregate({
      _sum: { remaining_debt: true },
    });
    const totalDebt = debtAgg._sum.remaining_debt ?? 0;

    // Stat 3: Agregasi Mingguan (Senin–Minggu minggu berjalan)
    const monday = new Date(now);
    const dow = (now.getDay() + 6) % 7; // 0 = Senin
    monday.setDate(now.getDate() - dow);
    monday.setHours(0, 0, 0, 0);
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);

    const weekSales = await prisma.salesTransaction.findMany({
      where: {
        status: { not: "DIBATALKAN" },
        transaction_date: { gte: monday, lt: nextMonday },
      },
      include: {
        details: {
          include: {
            product: { select: { purchase_price: true } },
          },
        },
      },
    });

    const weekPurchases = await prisma.purchase.findMany({
      where: {
        purchase_date: { gte: monday, lt: nextMonday },
      },
      include: {
        details: true,
      },
    });

    const buckets = Array.from({ length: 7 }, () => ({
      sales: 0,
      cogs: 0,
      purchase: 0,
    }));

    for (const s of weekSales) {
      const diff = Math.floor((s.transaction_date.getTime() - monday.getTime()) / 86400000);
      if (diff >= 0 && diff < 7) {
        buckets[diff].sales += s.total;
        const itemCogs = s.details.reduce(
          (acc, d) => acc + d.quantity * (d.product?.purchase_price ?? 0),
          0
        );
        buckets[diff].cogs += itemCogs;
      }
    }

    for (const p of weekPurchases) {
      const diff = Math.floor((p.purchase_date.getTime() - monday.getTime()) / 86400000);
      if (diff >= 0 && diff < 7) {
        const pTotal = p.details.reduce(
          (acc, d) => acc + d.quantity * d.unit_purchase_price,
          0
        );
        buckets[diff].purchase += pTotal;
      }
    }

    const weekDayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
    const salesChart: DashboardChartPoint[] = buckets.map((b, i) => ({
      day: weekDayNames[i],
      value: Number((b.sales / 1e6).toFixed(2)),
      rawAmount: b.sales,
    }));

    const profitChart: DashboardChartPoint[] = buckets.map((b, i) => {
      const profit = b.sales - b.cogs;
      return {
        day: weekDayNames[i],
        value: Number((profit / 1e6).toFixed(2)),
        rawAmount: profit,
      };
    });

    const purchaseChart: DashboardChartPoint[] = buckets.map((b, i) => ({
      day: weekDayNames[i],
      value: Number((b.purchase / 1e6).toFixed(2)),
      rawAmount: b.purchase,
    }));

    // Stat 4: Stok Menipis (stok <= minimum_stock, aktif)
    const activeProducts = await prisma.product.findMany({
      where: { is_active: true },
      include: { category: { select: { name: true } } },
    });

    const lowStock = activeProducts
      .filter((p) => p.stock <= p.minimum_stock)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category?.name ?? "-",
        stock: p.stock,
        minimumStock: p.minimum_stock,
      }));

    // Stat 5: Aktivitas Terbaru Toko
    const activities = await prisma.activityLog.findMany({
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { created_at: "desc" },
      take: 8,
    });

    return ok({
      role: "Owner",
      stats: {
        salesToday,
        profitToday,
        cashToday,
        qrisToday,
        totalProducts,
        totalSuppliers,
        totalCashiers,
        totalDebt,
      },
      charts: {
        sales: salesChart,
        profit: profitChart,
        purchase: purchaseChart,
      },
      lowStock,
      activities: activities.map((a) => ({
        id: a.id,
        user_id: a.user_id,
        user_name: a.user?.name ?? "Pengguna",
        user_role: a.user?.role ?? "Owner",
        action: a.action,
        action_label: formatActivityAction(a.action),
        description: a.description,
        created_at: a.created_at.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[GET /api/dashboard] Error:", err);
    return fail(500, "internal_error");
  }
}
