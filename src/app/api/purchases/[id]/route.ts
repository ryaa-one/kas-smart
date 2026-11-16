// /api/purchases/[id] — UC-07 detail/ubah/hapus pembelian.
// GET    (login)     : detail satu pembelian + items.
// PATCH  (Owner)     : ubah pembelian + adjust stok atomik (revert old, apply new).
// DELETE (Owner)     : hapus pembelian + kembalikan stok atomik.
import { NextRequest } from "next/server";
import { requireLogin, requireOwner, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { validatePurchaseInput, calculatePurchaseTotal, PurchaseError, type PurchaseData } from "@/lib/purchase-api";

// GET /api/purchases/:id — detail pembelian (Owner/Kasir).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireLogin();
  if (session instanceof Response) return session;
  const { id } = await params;

  if (!id || typeof id !== "string" || id.includes("/") || id.includes("..")) {
    return fail(404, "purchase_not_found");
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      details: {
        include: {
          product: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!purchase) {
    return fail(404, "purchase_not_found");
  }

  const details = purchase.details.map((d) => ({
    id: d.id,
    product_id: d.product_id,
    product_name: d.product.name,
    quantity: d.quantity,
    unit_purchase_price: d.unit_purchase_price,
    subtotal: d.quantity * d.unit_purchase_price,
  }));

  const data: PurchaseData = {
    id: purchase.id,
    supplier_id: purchase.supplier_id,
    supplier_name: purchase.supplier?.name ?? null,
    user_id: purchase.user_id,
    user_name: purchase.user.name,
    purchase_date: purchase.purchase_date.toISOString(),
    details,
    total: details.reduce((sum, d) => sum + d.subtotal, 0),
    items_count: details.reduce((sum, d) => sum + d.quantity, 0),
  };

  return ok({ purchase: data });
}

// PATCH /api/purchases/:id — ubah pembelian (Owner only) + adjust stok atomik.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireOwner();
  if (session instanceof Response) return session;
  const { id } = await params;

  if (!id || typeof id !== "string" || id.includes("/") || id.includes("..")) {
    return fail(404, "purchase_not_found");
  }

  const body = await req.json().catch(() => null);
  const validation = validatePurchaseInput(body);

  if (!validation.valid) {
    return fail(400, validation.errors[0].code, { errors: validation.errors });
  }

  const { supplier_id, purchase_date, details: newDetails } = validation.data;

  const newQtyMap = new Map<string, number>();
  for (const d of newDetails) {
    newQtyMap.set(d.product_id, (newQtyMap.get(d.product_id) ?? 0) + d.quantity);
  }
  const newProductIds = Array.from(newQtyMap.keys());

  try {
    // Transaction atomik dengan row locking agar konsisten terhadap edit/hapus/penjualan bersamaan
    const purchase = await prisma.$transaction(async (tx) => {
      // 1. Kunci baris pembelian dengan FOR UPDATE
      const lockedPurchase = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM purchases WHERE id = ${id} FOR UPDATE
      `;
      if (lockedPurchase.length === 0) {
        throw new PurchaseError(404, "purchase_not_found");
      }

      const oldPurchase = await tx.purchase.findUnique({
        where: { id },
        include: { details: true },
      });
      if (!oldPurchase) {
        throw new PurchaseError(404, "purchase_not_found");
      }

      // 2. Validasi supplier_id jika diisi (FOR SHARE untuk cegah race dengan delete supplier)
      if (supplier_id) {
        const lockedSup = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM suppliers WHERE id = ${supplier_id} FOR SHARE
        `;
        if (lockedSup.length === 0) {
          throw new PurchaseError(404, "supplier_not_found");
        }
      }

      // 3. Gabungkan product_id dari detail LAMA dan detail BARU secara unik & terurut (cegah deadlock)
      const oldQtyMap = new Map<string, number>();
      for (const d of oldPurchase.details) {
        oldQtyMap.set(d.product_id, (oldQtyMap.get(d.product_id) ?? 0) + d.quantity);
      }

      const allProductIds = Array.from(
        new Set([...oldQtyMap.keys(), ...newQtyMap.keys()])
      ).sort();

      // 4. Kunci & ambil data stok terbaru seluruh produk terkait (lama maupun baru)
      const productMap = new Map<string, { id: string; name: string; stock: number }>();
      for (const pid of allProductIds) {
        const rows = await tx.$queryRaw<Array<{ id: string; name: string; stock: number }>>`
          SELECT id, name, stock FROM products WHERE id = ${pid} FOR UPDATE
        `;
        if (rows[0]) {
          productMap.set(pid, rows[0]);
        }
      }

      // Pastikan seluruh produk pada detail baru eksis di database
      const missingNew = newProductIds.filter((pid) => !productMap.has(pid));
      if (missingNew.length > 0) {
        throw new PurchaseError(404, "product_not_found", {
          missing_products: missingNew,
        });
      }

      // 5. Validasi dampak stok (netChange = new - old) untuk seluruh produk lama + baru
      const netChanges = new Map<string, number>();
      for (const pid of allProductIds) {
        const oldQty = oldQtyMap.get(pid) ?? 0;
        const newQty = newQtyMap.get(pid) ?? 0;
        const netChange = newQty - oldQty;
        const prod = productMap.get(pid);
        if (!prod) continue;

        const finalStock = prod.stock + netChange;
        if (finalStock < 0) {
          throw new PurchaseError(409, "insufficient_stock", {
            product_id: pid,
            product_name: prod.name,
            current_stock: prod.stock,
            required_reduction: Math.abs(netChange),
          });
        }
        if (netChange !== 0) {
          netChanges.set(pid, netChange);
        }
      }

      // 6. Ganti detail pembelian & perbarui data pembelian
      await tx.purchaseDetail.deleteMany({
        where: { purchase_id: id },
      });

      const p = await tx.purchase.update({
        where: { id },
        data: {
          supplier_id,
          ...(purchase_date ? { purchase_date: new Date(purchase_date) } : {}),
          details: {
            create: newDetails.map((d) => ({
              product_id: d.product_id,
              quantity: d.quantity,
              unit_purchase_price: d.unit_purchase_price,
            })),
          },
        },
        include: {
          supplier: { select: { name: true } },
          user: { select: { name: true } },
          details: {
            include: {
              product: { select: { name: true } },
            },
          },
        },
      });

      // 7. Terapkan perubahan stok bersih secara atomik
      for (const [pid, delta] of netChanges.entries()) {
        await tx.product.update({
          where: { id: pid },
          data: delta > 0 ? { stock: { increment: delta } } : { stock: { decrement: Math.abs(delta) } },
        });
      }

      // 8. Activity log
      await tx.activityLog.create({
        data: {
          user_id: session.id,
          action: "purchaseUpdate",
          description: `Pembelian ${id}: ${newDetails.length} item, total Rp${calculatePurchaseTotal(newDetails)}`,
        },
      });

      return p;
    });

    const data: PurchaseData = {
      id: purchase.id,
      supplier_id: purchase.supplier_id,
      supplier_name: purchase.supplier?.name ?? null,
      user_id: purchase.user_id,
      user_name: purchase.user.name,
      purchase_date: purchase.purchase_date.toISOString(),
      details: purchase.details.map((d) => ({
        id: d.id,
        product_id: d.product_id,
        product_name: d.product.name,
        quantity: d.quantity,
        unit_purchase_price: d.unit_purchase_price,
        subtotal: d.quantity * d.unit_purchase_price,
      })),
      total: calculatePurchaseTotal(newDetails),
      items_count: newDetails.reduce((sum, d) => sum + d.quantity, 0),
    };

    return ok({ purchase: data });
  } catch (err: unknown) {
    if (err instanceof PurchaseError) {
      return fail(err.status, err.code, err.extra);
    }
    console.error("Update purchase failed:", err);
    return fail(500, "internal_server_error");
  }
}

// DELETE /api/purchases/:id — hapus pembelian (Owner only) + kembalikan stok atomik.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireOwner();
  if (session instanceof Response) return session;
  const { id } = await params;

  if (!id || typeof id !== "string" || id.includes("/") || id.includes("..")) {
    return fail(404, "purchase_not_found");
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Kunci baris pembelian dengan FOR UPDATE
      const lockedPurchase = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM purchases WHERE id = ${id} FOR UPDATE
      `;
      if (lockedPurchase.length === 0) {
        throw new PurchaseError(404, "purchase_not_found");
      }

      const purchase = await tx.purchase.findUnique({
        where: { id },
        include: { details: true },
      });
      if (!purchase) {
        throw new PurchaseError(404, "purchase_not_found");
      }

      // 2. Agregasi jumlah pengurangan stok per product_id & kunci seluruh produk terurut
      const qtyMap = new Map<string, number>();
      for (const d of purchase.details) {
        qtyMap.set(d.product_id, (qtyMap.get(d.product_id) ?? 0) + d.quantity);
      }
      const productIds = Array.from(qtyMap.keys()).sort();

      const productMap = new Map<string, { id: string; name: string; stock: number }>();
      for (const pid of productIds) {
        const rows = await tx.$queryRaw<Array<{ id: string; name: string; stock: number }>>`
          SELECT id, name, stock FROM products WHERE id = ${pid} FOR UPDATE
        `;
        if (rows[0]) {
          productMap.set(pid, rows[0]);
        }
      }

      // 3. Validasi stok cukup untuk dikurangi sebelum memodifikasi apa pun
      for (const [pid, qty] of qtyMap.entries()) {
        const prod = productMap.get(pid);
        if (prod && prod.stock - qty < 0) {
          throw new PurchaseError(409, "insufficient_stock", {
            product_id: pid,
            product_name: prod.name,
            current_stock: prod.stock,
            required_reduction: qty,
          });
        }
      }

      // 4. Kembalikan stok (kurangi quantity pembelian yang dihapus)
      for (const [pid, qty] of qtyMap.entries()) {
        if (productMap.has(pid)) {
          await tx.product.update({
            where: { id: pid },
            data: { stock: { decrement: qty } },
          });
        }
      }

      // 5. Hapus detail & record pembelian
      await tx.purchaseDetail.deleteMany({
        where: { purchase_id: id },
      });

      await tx.purchase.delete({
        where: { id },
      });

      // 6. Activity log
      await tx.activityLog.create({
        data: {
          user_id: session.id,
          action: "purchaseDelete",
          description: `Pembelian ${id} dihapus, stok ${purchase.details.length} item dikembalikan`,
        },
      });
    });

    return ok({ deleted: true });
  } catch (err: unknown) {
    if (err instanceof PurchaseError) {
      return fail(err.status, err.code, err.extra);
    }
    console.error("Delete purchase failed:", err);
    return fail(500, "internal_server_error");
  }
}
