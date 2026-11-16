import { NextRequest } from "next/server";
import { requireLogin, ok, fail } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { SaleStatus, DebtStatus, PaymentMethod } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  validateCreateSaleInput,
  generateInvoiceNumber,
  serializeSale,
  SaleError,
} from "@/lib/sales-api";

// GET /api/sales — daftar transaksi penjualan (Owner: seluruh toko; Kasir: hanya miliknya)
export async function GET(req: NextRequest) {
  const session = await requireLogin();
  if (session instanceof Response) return session;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const payment_method = searchParams.get("payment_method");
  const status = searchParams.get("status");
  const search = searchParams.get("search") || searchParams.get("q");
  const cashierFilter = searchParams.get("cashier_id") || searchParams.get("user_id");
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("page_size") || searchParams.get("pageSize") || searchParams.get("limit");

  const andConditions: Prisma.SalesTransactionWhereInput[] = [];

  // ISOLASI AKSES: Kasir HANYA boleh melihat transaksi miliknya sendiri di backend!
  if (session.role === "Kasir") {
    andConditions.push({ user_id: session.id });
  } else if (session.role === "Owner" && cashierFilter) {
    andConditions.push({ user_id: cashierFilter });
  }

  // Filter pencarian (nomor invoice atau nama customer)
  if (search && search.trim()) {
    const s = search.trim();
    andConditions.push({
      OR: [
        { invoice_number: { contains: s, mode: "insensitive" } },
        { customer: { name: { contains: s, mode: "insensitive" } } },
      ],
    });
  }

  // Filter rentang tanggal (server-side, satu hari penuh)
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
    andConditions.push({ transaction_date: dateRange });
  }

  // Filter metode pembayaran
  if (payment_method) {
    const pm = payment_method.toLowerCase();
    if (pm === "cash" || pm === "tunai") {
      andConditions.push({ payment_method: PaymentMethod.cash });
    } else if (pm === "qris") {
      andConditions.push({ payment_method: PaymentMethod.qris });
    } else if (pm === "debt" || pm === "hutang") {
      andConditions.push({ payment_method: PaymentMethod.debt });
    }
  }

  // Filter status transaksi
  if (status) {
    const statusMap: Record<string, SaleStatus> = {
      lunas: SaleStatus.LUNAS,
      paid: SaleStatus.LUNAS,
      hutang: SaleStatus.HUTANG,
      debt: SaleStatus.HUTANG,
      "menunggu pembayaran": SaleStatus.MENUNGGU_PEMBAYARAN,
      menunggu_pembayaran: SaleStatus.MENUNGGU_PEMBAYARAN,
      waiting_payment: SaleStatus.MENUNGGU_PEMBAYARAN,
      dibatalkan: SaleStatus.DIBATALKAN,
      cancelled: SaleStatus.DIBATALKAN,
      canceled: SaleStatus.DIBATALKAN,
      draft: SaleStatus.DRAFT,
    };
    const mapped = statusMap[status.toLowerCase()];
    if (mapped) {
      andConditions.push({ status: mapped });
    } else if (Object.values(SaleStatus).includes(status as SaleStatus)) {
      andConditions.push({ status: status as SaleStatus });
    }
  }

  const where: Prisma.SalesTransactionWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  // Pagination logic
  let page: number | undefined = undefined;
  let pageSize: number | undefined = undefined;
  let skip: number | undefined = undefined;
  let take: number | undefined = undefined;

  if (pageParam) {
    const parsedPage = parseInt(pageParam, 10);
    page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const parsedPageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : 10;
    pageSize = isNaN(parsedPageSize) || parsedPageSize < 1 ? 10 : Math.min(100, parsedPageSize);
    skip = (page - 1) * pageSize;
    take = pageSize;
  } else if (pageSizeParam) {
    const parsedLimit = parseInt(pageSizeParam, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      take = parsedLimit;
    }
  }

  const total = await prisma.salesTransaction.count({ where });

  const sales = await prisma.salesTransaction.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
      details: {
        include: {
          product: { select: { id: true, name: true, barcode: true, purchase_price: true } },
        },
      },
      debtRecord: true,
    },
    orderBy: { transaction_date: "desc" },
    skip,
    take,
  });

  const currentPage = page ?? 1;
  const effectivePageSize = pageSize ?? (take ?? sales.length);
  const totalPages = Math.ceil(total / (pageSize ?? (take || (total || 1)))) || 1;

  return ok({
    sales: sales.map((s) => serializeSale(s)),
    pagination: {
      page: currentPage,
      page_size: effectivePageSize,
      total,
      total_pages: totalPages,
    },
  });
}


// POST /api/sales — simpan transaksi baru secara atomik (Draft, Menunggu Pembayaran QRIS, Lunas/Hutang)
export async function POST(req: NextRequest) {
  const session = await requireLogin();
  if (session instanceof Response) return session;

  const body = await req.json().catch(() => null);
  const validation = validateCreateSaleInput(body);

  if (!validation.valid) {
    return fail(validation.status, validation.code, validation.extra);
  }

  const { sale_id, items, payment_method, customer_id, amount_paid, status = "completed" } = validation.data;

  // 1. Validasi produk & stok di database
  const productIds = items.map((i) => i.product_id);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  if (products.length !== new Set(productIds).size) {
    const found = new Set(products.map((p) => p.id));
    const missing = productIds.filter((id) => !found.has(id));
    return fail(404, "product_not_found", { missing_products: missing });
  }

  // Validasi produk aktif
  const inactive = products.filter((p) => !p.is_active);
  if (inactive.length > 0) {
    return fail(400, "product_inactive", {
      inactive_products: inactive.map((p) => ({ id: p.id, name: p.name })),
    });
  }

  // Gabungkan quantity per produk
  const qtyMap = new Map<string, number>();
  for (const item of items) {
    qtyMap.set(item.product_id, (qtyMap.get(item.product_id) ?? 0) + item.quantity);
  }

  // Hitung total harga server-side
  const productMap = new Map(products.map((p) => [p.id, p]));
  let calculatedTotal = 0;
  const detailsData: {
    product_id: string;
    quantity: number;
    unit_selling_price: number;
  }[] = [];

  for (const [pid, qty] of qtyMap.entries()) {
    const p = productMap.get(pid)!;
    calculatedTotal += p.selling_price * qty;
    detailsData.push({
      product_id: p.id,
      quantity: qty,
      unit_selling_price: p.selling_price,
    });
  }

  // =========================================================================
  // KASUS 1: DRAFT (Persistensi Keranjang Tanpa Potong Stok & Tanpa Invoice)
  // =========================================================================
  if (status === "draft") {
    try {
      const draftMethod = (payment_method as PaymentMethod) || PaymentMethod.cash;

      // Jika sale_id disediakan, periksa apakah transaksi sudah lunas
      if (sale_id) {
        const existing = await prisma.salesTransaction.findUnique({
          where: { sale_id },
        });
        if (existing && (existing.status === SaleStatus.LUNAS || existing.status === SaleStatus.HUTANG)) {
          return fail(409, "cannot_edit_completed_sale");
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        if (sale_id) {
          const existing = await tx.salesTransaction.findUnique({
            where: { sale_id },
          });
          if (existing) {
            // Hapus detail lama dan ganti baru
            await tx.saleDetail.deleteMany({ where: { sale_id } });
            const updated = await tx.salesTransaction.update({
              where: { sale_id },
              data: {
                total: calculatedTotal,
                payment_method: draftMethod,
                customer_id: customer_id || null,
                status: SaleStatus.DRAFT,
                amount_paid: null,
                change_amount: null,
                details: {
                  create: detailsData.map((d) => ({
                    product_id: d.product_id,
                    quantity: d.quantity,
                    unit_selling_price: d.unit_selling_price,
                  })),
                },
              },
              include: {
                user: { select: { id: true, name: true } },
                customer: { select: { id: true, name: true, phone: true } },
                details: {
                  include: {
                    product: { select: { id: true, name: true, barcode: true } },
                  },
                },
              },
            });
            return updated;
          }
        }

        // Buat record draft baru
        const created = await tx.salesTransaction.create({
          data: {
            user_id: session.id,
            customer_id: customer_id || null,
            invoice_number: null,
            status: SaleStatus.DRAFT,
            payment_method: draftMethod,
            total: calculatedTotal,
            amount_paid: null,
            change_amount: null,
            paid_at: null,
            details: {
              create: detailsData.map((d) => ({
                product_id: d.product_id,
                quantity: d.quantity,
                unit_selling_price: d.unit_selling_price,
              })),
            },
          },
          include: {
            user: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true, phone: true } },
            details: {
              include: {
                product: { select: { id: true, name: true, barcode: true } },
              },
            },
          },
        });
        return created;
      });

      return ok({ sale: serializeSale(result) }, 201);
    } catch (err) {
      console.error("Draft transaction failed:", err);
      return fail(500, "internal_server_error");
    }
  }

  // =========================================================================
  // KASUS 2: MENUNGGU PEMBAYARAN QRIS (Persistensi Tanpa Potong Stok)
  // =========================================================================
  if (status === "waiting_payment") {
    try {
      if (sale_id) {
        const existing = await prisma.salesTransaction.findUnique({
          where: { sale_id },
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
        // Jika sudah Lunas, return langsung (idempotent)
        if (existing && (existing.status === SaleStatus.LUNAS || existing.status === SaleStatus.HUTANG)) {
          return ok({ sale: serializeSale(existing) }, 200);
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        if (sale_id) {
          const existing = await tx.salesTransaction.findUnique({
            where: { sale_id },
          });
          if (existing) {
            await tx.saleDetail.deleteMany({ where: { sale_id } });
            const updated = await tx.salesTransaction.update({
              where: { sale_id },
              data: {
                total: calculatedTotal,
                payment_method: PaymentMethod.qris,
                customer_id: customer_id || null,
                status: SaleStatus.MENUNGGU_PEMBAYARAN,
                amount_paid: null,
                change_amount: null,
                details: {
                  create: detailsData.map((d) => ({
                    product_id: d.product_id,
                    quantity: d.quantity,
                    unit_selling_price: d.unit_selling_price,
                  })),
                },
              },
              include: {
                user: { select: { id: true, name: true } },
                customer: { select: { id: true, name: true, phone: true } },
                details: {
                  include: {
                    product: { select: { id: true, name: true, barcode: true } },
                  },
                },
              },
            });
            return updated;
          }
        }

        const created = await tx.salesTransaction.create({
          data: {
            user_id: session.id,
            customer_id: customer_id || null,
            invoice_number: null,
            status: SaleStatus.MENUNGGU_PEMBAYARAN,
            payment_method: PaymentMethod.qris,
            total: calculatedTotal,
            amount_paid: null,
            change_amount: null,
            paid_at: null,
            details: {
              create: detailsData.map((d) => ({
                product_id: d.product_id,
                quantity: d.quantity,
                unit_selling_price: d.unit_selling_price,
              })),
            },
          },
          include: {
            user: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true, phone: true } },
            details: {
              include: {
                product: { select: { id: true, name: true, barcode: true } },
              },
            },
          },
        });
        return created;
      });

      return ok({ sale: serializeSale(result) }, 201);
    } catch (err) {
      console.error("Waiting payment transaction failed:", err);
      return fail(500, "internal_server_error");
    }
  }

  // =========================================================================
  // KASUS 3: PENYELESAIAN TRANSAKSI (LUNAS / HUTANG)
  // =========================================================================

  // Validasi ketersediaan stok sebelum transaksi dijalankan
  for (const p of products) {
    const requestedQty = qtyMap.get(p.id) ?? 0;
    if (p.stock < requestedQty) {
      return fail(409, "stock_insufficient", {
        product_id: p.id,
        product_name: p.name,
        available_stock: p.stock,
        requested_quantity: requestedQty,
      });
    }
  }

  // Validasi metode & nilai pembayaran
  let finalAmountPaid: number | null = null;
  let finalChangeAmount: number | null = null;
  let saleStatus: SaleStatus = SaleStatus.LUNAS;
  let paidAt: Date | null = new Date();
  let customerName: string | null = null;

  if (payment_method === "cash") {
    if (amount_paid === null || amount_paid === undefined || amount_paid < calculatedTotal) {
      return fail(400, "cash_insufficient", {
        total: calculatedTotal,
        amount_paid,
      });
    }
    finalAmountPaid = amount_paid;
    finalChangeAmount = amount_paid - calculatedTotal;
    saleStatus = SaleStatus.LUNAS;
    paidAt = new Date();
  } else if (payment_method === "qris") {
    finalAmountPaid = calculatedTotal;
    finalChangeAmount = 0;
    saleStatus = SaleStatus.LUNAS;
    paidAt = new Date();
  } else if (payment_method === "debt") {
    if (!customer_id) {
      return fail(400, "customer_required");
    }
    const customer = await prisma.customer.findUnique({
      where: { id: customer_id },
    });
    if (!customer) {
      return fail(404, "customer_not_found");
    }
    customerName = customer.name;
    finalAmountPaid = null;
    finalChangeAmount = null;
    saleStatus = SaleStatus.HUTANG;
    paidAt = null;
  }

  if (customer_id && !customerName) {
    const c = await prisma.customer.findUnique({ where: { id: customer_id } });
    if (c) customerName = c.name;
  }

  // PROTEKSI IDEMPOTENCY SEBELUM MEMBUKA TRANSAKSI:
  // Jika sale_id disediakan dan transaksi sudah LUNAS / HUTANG, kembalikan transaksi lama langsung!
  if (sale_id) {
    const existingSale = await prisma.salesTransaction.findUnique({
      where: { sale_id },
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

    if (existingSale && (existingSale.status === SaleStatus.LUNAS || existingSale.status === SaleStatus.HUTANG)) {
      return ok({ sale: serializeSale(existingSale) }, 200);
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // KUNCI IDEMPOTENCY DI DALAM TRANSAKSI DENGAN ROW LOCK:
      if (sale_id) {
        const locked = await tx.$queryRaw<Array<{ sale_id: string; status: string }>>`
          SELECT sale_id, status FROM sales_transactions WHERE sale_id = ${sale_id} FOR UPDATE
        `;
        if (locked.length > 0 && (locked[0].status === "Lunas" || locked[0].status === "Hutang")) {
          const alreadyDone = await tx.salesTransaction.findUnique({
            where: { sale_id },
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
          return { sale: alreadyDone!, debtRecord: alreadyDone?.debtRecord };
        }
      }

      // 1. Potong stok produk secara atomik
      for (const d of detailsData) {
        const updated = await tx.product.update({
          where: { id: d.product_id },
          data: { stock: { decrement: d.quantity } },
        });
        if (updated.stock < 0) {
          throw new SaleError(409, "stock_insufficient", {
            product_id: d.product_id,
          });
        }
      }

      // 2. Generate invoice number sequential harian di dalam transaksi
      const invoiceNumber = await generateInvoiceNumber(tx);

      // 3. Update transaksi yang ada (dari Draft / Menunggu Pembayaran) atau buat baru
      let sale;
      if (sale_id) {
        const existing = await tx.salesTransaction.findUnique({
          where: { sale_id },
        });
        if (existing) {
          await tx.saleDetail.deleteMany({ where: { sale_id } });
          sale = await tx.salesTransaction.update({
            where: { sale_id },
            data: {
              customer_id: customer_id || null,
              invoice_number: invoiceNumber,
              transaction_date: new Date(),
              payment_method: payment_method as PaymentMethod,
              status: saleStatus,
              total: calculatedTotal,
              amount_paid: finalAmountPaid,
              change_amount: finalChangeAmount,
              paid_at: paidAt,
              details: {
                create: detailsData.map((d) => ({
                  product_id: d.product_id,
                  quantity: d.quantity,
                  unit_selling_price: d.unit_selling_price,
                })),
              },
            },
            include: {
              user: { select: { id: true, name: true } },
              customer: { select: { id: true, name: true, phone: true } },
              details: {
                include: {
                  product: { select: { id: true, name: true, barcode: true } },
                },
              },
            },
          });
        }
      }

      if (!sale) {
        sale = await tx.salesTransaction.create({
          data: {
            user_id: session.id,
            customer_id: customer_id || null,
            invoice_number: invoiceNumber,
            transaction_date: new Date(),
            payment_method: payment_method as PaymentMethod,
            status: saleStatus,
            total: calculatedTotal,
            amount_paid: finalAmountPaid,
            change_amount: finalChangeAmount,
            paid_at: paidAt,
            details: {
              create: detailsData.map((d) => ({
                product_id: d.product_id,
                quantity: d.quantity,
                unit_selling_price: d.unit_selling_price,
              })),
            },
          },
          include: {
            user: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true, phone: true } },
            details: {
              include: {
                product: { select: { id: true, name: true, barcode: true } },
              },
            },
          },
        });
      }

      // 4. Jika hutang, buat record DEBT_RECORDS
      let debtRecord = null;
      if (payment_method === "debt") {
        debtRecord = await tx.debtRecord.create({
          data: {
            sale_id: sale.sale_id,
            customer_id: customer_id!,
            total_debt: calculatedTotal,
            remaining_debt: calculatedTotal,
            status: DebtStatus.Unpaid,
          },
        });
      }

      // 5. Catat activity log
      if (payment_method === "cash") {
        await tx.activityLog.create({
          data: {
            user_id: session.id,
            action: "sale",
            description: `Transaksi ${invoiceNumber} (Tunai)`,
          },
        });
      } else if (payment_method === "qris") {
        await tx.activityLog.create({
          data: {
            user_id: session.id,
            action: "qrisConfirm",
            description: `Konfirmasi Lunas QRIS ${invoiceNumber}`,
          },
        });
        await tx.activityLog.create({
          data: {
            user_id: session.id,
            action: "sale",
            description: `Transaksi ${invoiceNumber} (QRIS)`,
          },
        });
      } else if (payment_method === "debt") {
        await tx.activityLog.create({
          data: {
            user_id: session.id,
            action: "debtAdd",
            description: `Hutang baru ${invoiceNumber} (${customerName ?? "-"})`,
          },
        });
        await tx.activityLog.create({
          data: {
            user_id: session.id,
            action: "sale",
            description: `Transaksi ${invoiceNumber} (Hutang - ${customerName ?? "-"})`,
          },
        });
      }

      return { sale, debtRecord };
    });

    return ok({ sale: serializeSale(result.sale, result.debtRecord) }, 201);
  } catch (err: unknown) {
    if (err instanceof SaleError) {
      return fail(err.status, err.code, err.extra);
    }
    console.error("Sale transaction failed:", err);
    return fail(500, "internal_server_error");
  }
}
