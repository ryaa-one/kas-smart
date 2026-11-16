import { NextRequest } from "next/server";
import { requireOwner, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import type { ReportTab, ReportResponseData } from "@/lib/report-api";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  // Laporan adalah fitur khusus Owner (UC-19). Kasir forbidden (403).
  const session = await requireOwner();
  if (session instanceof Response) return session;

  const { searchParams } = new URL(req.url);
  const tab = (searchParams.get("tab") || "sales") as ReportTab;
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  if (from && !DATE_REGEX.test(from)) {
    return fail(400, "invalid_from_date");
  }
  if (to && !DATE_REGEX.test(to)) {
    return fail(400, "invalid_to_date");
  }

  // Siapkan rentang tanggal
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) dateFilter.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) dateFilter.lte = new Date(`${to}T23:59:59.999Z`);
  const hasDateFilter = Boolean(from || to);

  const response: ReportResponseData = { tab, from, to };

  try {
    // ----------------------------------------------------
    // TAB 1: PENJUALAN
    // ----------------------------------------------------
    if (tab === "sales") {
      const sales = await prisma.salesTransaction.findMany({
        where: {
          status: { not: "DIBATALKAN" },
          ...(hasDateFilter ? { transaction_date: dateFilter } : {}),
        },
        include: {
          user: { select: { name: true } },
        },
        orderBy: { transaction_date: "desc" },
      });

      const revenue = sales.reduce((sum, s) => sum + s.total, 0);
      const count = sales.length;
      const debtCount = sales.filter((s) => s.payment_method === "debt").length;

      response.sales = {
        revenue,
        count,
        debtCount,
        rows: sales.map((s) => ({
          id: s.sale_id,
          invoice_number: s.invoice_number ?? "—",
          transaction_date: s.transaction_date.toISOString(),
          user_name: s.user.name,
          total: s.total,
        })),
      };
    }

    // ----------------------------------------------------
    // TAB 2: PEMBELIAN
    // ----------------------------------------------------
    else if (tab === "purchases") {
      const purchases = await prisma.purchase.findMany({
        where: hasDateFilter ? { purchase_date: dateFilter } : {},
        include: {
          supplier: { select: { name: true } },
          details: true,
        },
        orderBy: { purchase_date: "desc" },
      });

      const rows = purchases.map((p) => {
        const items_count = p.details.reduce((sum, d) => sum + d.quantity, 0);
        const total = p.details.reduce(
          (sum, d) => sum + d.quantity * d.unit_purchase_price,
          0
        );
        return {
          id: p.id,
          supplier_name: p.supplier?.name ?? "-",
          purchase_date: p.purchase_date.toISOString(),
          items_count,
          total,
        };
      });

      const total = rows.reduce((sum, r) => sum + r.total, 0);

      response.purchases = {
        total,
        count: purchases.length,
        rows,
      };
    }

    // ----------------------------------------------------
    // TAB 3: PROFIT
    // ----------------------------------------------------
    else if (tab === "profit") {
      const sales = await prisma.salesTransaction.findMany({
        where: {
          status: { not: "DIBATALKAN" },
          ...(hasDateFilter ? { transaction_date: dateFilter } : {}),
        },
        include: {
          details: {
            include: {
              product: { select: { purchase_price: true } },
            },
          },
        },
      });

      const salesRevenue = sales.reduce((sum, s) => sum + s.total, 0);
      const salesCost = sales.reduce(
        (sum, s) =>
          sum +
          s.details.reduce(
            (itemSum, d) => itemSum + d.quantity * (d.product?.purchase_price ?? 0),
            0
          ),
        0
      );
      const grossProfit = salesRevenue - salesCost;
      const margin = salesRevenue > 0 ? Math.round((grossProfit / salesRevenue) * 100) : 0;

      response.profit = {
        salesRevenue,
        salesCost,
        grossProfit,
        margin,
      };
    }

    // ----------------------------------------------------
    // TAB 4: STOK
    // ----------------------------------------------------
    else if (tab === "stock") {
      const products = await prisma.product.findMany({
        orderBy: { name: "asc" },
      });

      const totalProducts = products.length;
      const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
      const totalValue = products.reduce((sum, p) => sum + p.stock * p.purchase_price, 0);
      const lowCount = products.filter((p) => p.stock <= p.minimum_stock).length;

      response.stock = {
        totalProducts,
        totalUnits,
        totalValue,
        lowCount,
        rows: products.map((p) => ({
          id: p.id,
          name: p.name,
          stock: p.stock,
          minimum_stock: p.minimum_stock,
          unit_value: p.stock * p.purchase_price,
        })),
      };
    }

    // ----------------------------------------------------
    // TAB 5: SUPPLIER
    // ----------------------------------------------------
    else if (tab === "suppliers") {
      const purchases = await prisma.purchase.findMany({
        where: {
          supplier_id: { not: null },
          ...(hasDateFilter ? { purchase_date: dateFilter } : {}),
        },
        include: {
          supplier: { select: { name: true } },
          details: true,
        },
      });

      const map = new Map<string, { count: number; total: number }>();
      for (const p of purchases) {
        const name = p.supplier?.name;
        if (!name) continue;
        const cur = map.get(name) ?? { count: 0, total: 0 };
        const pTotal = p.details.reduce(
          (sum, d) => sum + d.quantity * d.unit_purchase_price,
          0
        );
        map.set(name, { count: cur.count + 1, total: cur.total + pTotal });
      }

      response.suppliers = {
        rows: [...map.entries()].map(([name, val]) => ({
          name,
          count: val.count,
          total: val.total,
        })),
      };
    }

    // ----------------------------------------------------
    // TAB 6: HUTANG
    // ----------------------------------------------------
    else if (tab === "debt") {
      const debts = await prisma.debtRecord.findMany({
        include: {
          customer: { select: { name: true } },
          sale: { select: { invoice_number: true, sale_id: true } },
        },
        orderBy: { created_at: "desc" },
      });

      const total = debts.reduce((sum, d) => sum + d.total_debt, 0);
      const remaining = debts.reduce((sum, d) => sum + d.remaining_debt, 0);
      const paid = total - remaining;

      response.debt = {
        total,
        remaining,
        paid,
        rows: debts.map((d) => ({
          debt_id: d.debt_id,
          customer_name: d.customer?.name ?? "-",
          invoice_number: d.sale?.invoice_number ?? d.sale?.sale_id ?? "-",
          total_debt: d.total_debt,
          remaining_debt: d.remaining_debt,
        })),
      };
    }

    // ----------------------------------------------------
    // TAB 7: PENYESUAIAN STOK
    // ----------------------------------------------------
    else if (tab === "adjustments") {
      const adjustments = await prisma.stockAdjustment.findMany({
        where: hasDateFilter ? { adjustment_date: dateFilter } : {},
        include: {
          details: {
            include: {
              product: { select: { name: true } },
            },
          },
        },
        orderBy: { adjustment_date: "desc" },
      });

      const rows = adjustments.flatMap((a) =>
        a.details.map((d) => ({
          id: a.id,
          adjustment_date: a.adjustment_date.toISOString(),
          product_name: d.product?.name ?? "-",
          quantity_change: d.quantity_change,
          reason: a.reason,
        }))
      );

      response.adjustments = { rows };
    }

    return ok(response);
  } catch (err) {
    console.error("[GET /api/reports] Error:", err);
    return fail(500, "internal_error");
  }
}
