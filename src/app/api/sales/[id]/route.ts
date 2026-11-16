import { NextRequest } from "next/server";
import { requireLogin, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { SaleStatus } from "@/generated/prisma/enums";
import { serializeSale, SaleError } from "@/lib/sales-api";

// GET /api/sales/[id] — ambil detail satu transaksi penjualan
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

  const sale = await prisma.salesTransaction.findFirst({
    where: {
      OR: [{ sale_id: id }, { invoice_number: id }],
    },
    include: {
      user: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
      details: {
        include: {
          product: { select: { id: true, name: true, barcode: true } },
        },
      },
      debtRecord: true,
    },
  });

  if (!sale) {
    return fail(404, "sale_not_found");
  }

  // ISOLASI AKSES: Kasir TIDAK boleh melihat detail transaksi kasir/user lain
  if (session.role === "Kasir" && sale.user_id !== session.id) {
    return fail(403, "forbidden");
  }

  return ok({ sale: serializeSale(sale) });
}

// PATCH /api/sales/[id] — batalkan transaksi penjualan & kembalikan stok secara atomik
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireLogin();
  if (session instanceof Response) return session;

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return fail(400, "id_required");
  }

  const body = await req.json().catch(() => null);
  const action = body?.action || body?.status;
  if (action !== "cancel" && action !== "cancelled" && action !== "dibatalkan") {
    return fail(400, "invalid_action");
  }

  // Cari data transaksi awal berdasarkan sale_id atau invoice_number
  const sale = await prisma.salesTransaction.findFirst({
    where: {
      OR: [{ sale_id: id }, { invoice_number: id }],
    },
    include: {
      details: true,
      debtRecord: {
        include: {
          payments: true,
        },
      },
    },
  });

  if (!sale) {
    return fail(404, "sale_not_found");
  }

  // Hak akses: Kasir hanya boleh membatalkan transaksi miliknya sendiri, Owner bebas
  if (session.role === "Kasir" && sale.user_id !== session.id) {
    return fail(403, "forbidden");
  }

  // Idempotency: jika sudah dibatalkan, return sukses langsung tanpa modifikasi stok
  if (sale.status === SaleStatus.DIBATALKAN) {
    return ok({ sale: serializeSale(sale) });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Kunci baris transaksi dengan FOR UPDATE (urutan lock: sales_transactions -> debt_records)
      const locked = await tx.$queryRaw<Array<{ sale_id: string; status: string }>>`
        SELECT sale_id, status FROM sales_transactions WHERE sale_id = ${sale.sale_id} FOR UPDATE
      `;
      if (locked.length === 0) {
        throw new SaleError(404, "sale_not_found");
      }

      if (locked[0].status === "Dibatalkan") {
        const alreadyDone = await tx.salesTransaction.findUnique({
          where: { sale_id: sale.sale_id },
          include: {
            user: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true, phone: true } },
            details: {
              include: {
                product: { select: { id: true, name: true, barcode: true } },
              },
            },
            debtRecord: true,
          },
        });
        return alreadyDone!;
      }

      // 2. Kunci baris debt_records (bila ada) & periksa jumlah cicilan DI DALAM transaksi
      // agar tidak terjadi race condition dengan pembayaran cicilan bersamaan
      const lockedDebt = await tx.$queryRaw<Array<{ debt_id: string }>>`
        SELECT debt_id FROM debt_records WHERE sale_id = ${sale.sale_id} FOR UPDATE
      `;
      const debtId = lockedDebt[0]?.debt_id;
      if (debtId) {
        const paymentCount = await tx.debtPayment.count({
          where: { debt_id: debtId },
        });
        if (paymentCount > 0) {
          throw new SaleError(400, "debt_has_payments_cannot_cancel", {
            payments_count: paymentCount,
          });
        }
      }

      const wasCompleted = locked[0].status === "Lunas" || locked[0].status === "Hutang";

      // 3. PENGEMBALIAN STOK:
      // Hanya jika transaksi sebelumnya berstatus Lunas atau Hutang (karena saat Draft / Menunggu Pembayaran stok belum dipotong)
      if (wasCompleted) {
        const itemsToRestore = await tx.saleDetail.findMany({
          where: { sale_id: sale.sale_id },
        });
        for (const item of itemsToRestore) {
          await tx.product.update({
            where: { id: item.product_id },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // 4. Hapus data hutang jika belum pernah dicicil sama sekali
      if (debtId) {
        await tx.debtRecord.delete({
          where: { debt_id: debtId },
        });
      }

      // Ubah status transaksi menjadi DIBATALKAN
      const res = await tx.salesTransaction.update({
        where: { sale_id: sale.sale_id },
        data: {
          status: SaleStatus.DIBATALKAN,
        },
        include: {
          user: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, phone: true } },
          details: {
            include: {
              product: { select: { id: true, name: true, barcode: true } },
            },
          },
          debtRecord: true,
        },
      });

      // Catat activity log pembatalan
      await tx.activityLog.create({
        data: {
          user_id: session.id,
          action: "saleCancel",
          description: `Pembatalan transaksi ${sale.invoice_number ?? sale.sale_id}`,
        },
      });

      return res;
    });

    return ok({ sale: serializeSale(updated) });
  } catch (err: unknown) {
    if (err instanceof SaleError) {
      return fail(err.status, err.code, err.extra);
    }
    console.error("Cancel sale failed:", err);
    return fail(500, "internal_server_error");
  }
}
